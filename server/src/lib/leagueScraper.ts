import { parse, HTMLElement as NHTMLElement } from 'node-html-parser';
import { db } from '../db';

export interface ImportSummary {
  divisions_found: number;
  teams_imported: number;
  errors: string[];
}

interface DivisionInfo {
  name: string;
  url: string;
  gender: string | null;
  age_group: string | null;
  division: string | null;
}

interface StandingRow {
  team_name: string;
  points: number;
  games_played: number;
  wins: number;
  losses: number;
  ties: number;
  goals_for: number;
  goals_against: number;
  finish_place: number;
}

function inferGenderFromName(name: string): string | null {
  const m = name.trim().match(/^([BG])U?\d/i);
  if (!m) return null;
  return m[1].toUpperCase() === 'B' ? 'Boys' : 'Girls';
}

function inferAgeGroupFromName(name: string): string | null {
  const m = name.trim().match(/^[BG]U\d+/i);
  return m ? m[0].toUpperCase() : null;
}

function parseDivisionMeta(name: string) {
  const age_group = inferAgeGroupFromName(name);
  const gender = inferGenderFromName(name);
  const division = age_group ? name.slice(age_group.length).trim() || null : null;
  return { age_group, gender, division };
}

function buildAbsoluteUrl(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

async function fetchHtml(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TryoutManager/1.0)' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return resp.text();
}

// Walk up from a node to find the nearest ancestor with the given tag.
function closestTag(el: NHTMLElement, tag: string): NHTMLElement | null {
  let node: NHTMLElement = el;
  while (node.parentNode) {
    node = node.parentNode as NHTMLElement;
    if (node.tagName?.toLowerCase() === tag) return node;
  }
  return null;
}

// Generic words that appear as link text but are NOT division names.
const LINK_TEXT_BLACKLIST = new Set([
  'standings', 'schedule', 'results', 'scores', 'view', 'click here',
  'details', 'more', 'info', 'information', 'bracket',
]);

// Extract the division name from context around a <a> standings link.
// On SportsAffinity the link text is often just "Standings" and the actual
// division name sits in a sibling <td> in the same <tr>.
function extractDivisionName(linkEl: NHTMLElement): string | null {
  // 1. Use link text if it looks like a real division name.
  const linkText = linkEl.text.trim();
  if (
    linkText.length >= 3 &&
    !LINK_TEXT_BLACKLIST.has(linkText.toLowerCase()) &&
    inferAgeGroupFromName(linkText)   // has BU*/GU* prefix → definitely a division name
  ) {
    return linkText;
  }

  // 2. Walk up to the nearest <tr> and inspect sibling cells.
  const row = closestTag(linkEl, 'tr');
  if (row) {
    const cells = row.querySelectorAll('td');

    // 2a. Prefer a cell that has the BU*/GU* age-group prefix.
    for (const cell of cells) {
      const text = cell.text.trim();
      if (inferAgeGroupFromName(text)) return text;
    }

    // 2b. First non-link, non-numeric, non-blacklisted cell with substance.
    for (const cell of cells) {
      if (cell.querySelector('a')) continue;  // skip cells that contain links
      const text = cell.text.trim();
      if (
        text.length >= 3 &&
        !/^\d[\d\s%]*$/.test(text) &&
        !LINK_TEXT_BLACKLIST.has(text.toLowerCase())
      ) {
        return text;
      }
    }
  }

  // 3. Accept link text if it's non-trivial (even if it doesn't have a BU*/GU* prefix).
  if (linkText.length >= 3 && !LINK_TEXT_BLACKLIST.has(linkText.toLowerCase())) {
    return linkText;
  }

  return null;
}

// ─── Direct-child helpers (avoid descending into nested tables) ───────────────

// Returns only <td>/<th> elements whose immediate parent is `row`
// (not cells from any nested table inside this row).
function getDirectCells(row: NHTMLElement): NHTMLElement[] {
  return (row.querySelectorAll('td, th') as NHTMLElement[]).filter(
    cell => (cell.parentNode as NHTMLElement) === row
  );
}

// ─── Standings table parser ───────────────────────────────────────────────────

// Headers that represent numeric/stat columns — never a team name column.
const NUMERIC_HEADERS = new Set([
  'pos', 'rank', 'place', '#', 'no', 'gp', 'mp', 'played',
  'w', 'l', 't', 'd', 'pts', 'p', 'pt', 'pnt', 'pnts', 'points',
  'gf', 'gs', 'ga', 'gd', 'pf', 'pa',
  'win', 'wins', 'loss', 'losses', 'tie', 'ties', 'draw', 'draws',
  'goalsfor', 'goalsagainst', 'goaldiff',
]);

// Normalize a header cell's text for matching. Also checks img[alt] fallback.
function normalizeHeader(cell: NHTMLElement): string {
  let text = cell.text.trim().toLowerCase();
  if (!text) {
    // Some older sites use images for column headers.
    const img = cell.querySelector('img');
    if (img) {
      text = (img.getAttribute('alt') ?? '').toLowerCase();
      if (!text) {
        // Derive from image filename: /images/pts.gif → "pts"
        const src = img.getAttribute('src') ?? '';
        text = src.replace(/.*[/\\]/, '').replace(/\.\w+$/, '').toLowerCase();
      }
    }
  }
  // Remove everything that isn't a letter or digit.
  return text.replace(/[^a-z0-9]/g, '');
}

// Headers that are icon/image columns — never a team name.
const ICON_HEADERS = new Set(['clubinfo', 'logo', 'icon', 'crest', 'badge', 'flag']);

function parseStandingsTable(html: string): StandingRow[] {
  const doc = parse(html);
  const tables = doc.querySelectorAll('table');

  let best: StandingRow[] = [];

  for (const table of tables) {
    // Use querySelectorAll('tr') rather than getDirectRows because SportsAffinity
    // pages have malformed HTML with unclosed <tr> tags, which causes node-html-parser
    // to nest all data rows inside the first (header) row. querySelectorAll descends
    // into all nested rows so we still find them.
    const rows = table.querySelectorAll('tr') as NHTMLElement[];
    if (rows.length < 2) continue;

    // Try the first three rows as the potential header, in case the table
    // starts with a title or section row before the column labels.
    for (let hIdx = 0; hIdx < Math.min(3, rows.length - 1); hIdx++) {
      // getDirectCells prevents cells from nested rows bleeding into sibling rows.
      const hCells = getDirectCells(rows[hIdx]);
      if (hCells.length < 3) continue;

      const headers = hCells.map(normalizeHeader);

      // Locate the team name column.
      // Exclude "clubinfo" — it's a SportsAffinity icon column, not the team name.
      let teamIdx = headers.findIndex(h =>
        !ICON_HEADERS.has(h) && (
          h.includes('team') || h.includes('club') || h === 'flight' ||
          h === 'name' || h === 'teamname' || h === 'clubname' || h === 'flightname'
        )
      );
      // Fallback: first non-numeric, non-icon column with substance.
      if (teamIdx === -1) {
        teamIdx = headers.findIndex(h => !NUMERIC_HEADERS.has(h) && !ICON_HEADERS.has(h) && h.length > 1);
      }
      if (teamIdx === -1) continue;

      const findCol = (...terms: string[]) => headers.findIndex(h => terms.includes(h));

      const ptsIdx = findCol('pts', 'points', 'p', 'pt', 'pnt', 'pnts', 'totalpoints');
      const gpIdx  = findCol('gp', 'mp', 'g', 'games', 'played', 'gamesplayed');
      const wIdx   = findCol('w', 'win', 'wins', 'won');
      const lIdx   = findCol('l', 'loss', 'losses', 'lost');
      const tIdx   = findCol('t', 'tie', 'ties', 'd', 'draw', 'draws');
      const gfIdx  = findCol('gf', 'gs', 'goalsfor', 'for', 'gscored', 'goalsscored', 'gf1');
      const gaIdx  = findCol('ga', 'goalsagainst', 'against', 'gconceded', 'ga1');

      // If almost every stat column is missing, try positional fallback based
      // on the most common SportsAffinity column order:
      //   [rank/pos] team GP W L T GF GA [GD] Pts
      const statsFound = [ptsIdx, gpIdx, wIdx, lIdx].filter(i => i !== -1).length;
      let resolvedPts = ptsIdx, resolvedGp = gpIdx, resolvedW = wIdx,
          resolvedL = lIdx, resolvedT = tIdx, resolvedGf = gfIdx, resolvedGa = gaIdx;

      if (statsFound === 0 && headers.length >= 5) {
        // Positional fallback: assign columns relative to teamIdx.
        const after = headers.length - teamIdx - 1;
        if (after >= 7) {
          resolvedGp  = teamIdx + 1;
          resolvedW   = teamIdx + 2;
          resolvedL   = teamIdx + 3;
          resolvedT   = teamIdx + 4;
          resolvedGf  = teamIdx + 5;
          resolvedGa  = teamIdx + 6;
          resolvedPts = teamIdx + after; // last column is usually Pts
        } else if (after >= 4) {
          resolvedW   = teamIdx + 1;
          resolvedL   = teamIdx + 2;
          resolvedT   = teamIdx + 3;
          resolvedGp  = teamIdx + after;
          resolvedPts = teamIdx + after; // best guess
        }
      }

      const standings: StandingRow[] = [];

      for (let i = hIdx + 1; i < rows.length; i++) {
        const cells = getDirectCells(rows[i]);
        if (cells.length < 2) continue;

        const getText = (idx: number) =>
          idx >= 0 && idx < cells.length ? cells[idx].text.trim() : '';
        const getNum = (idx: number): number => {
          const t = getText(idx);
          if (!t || t === '-' || t === '—') return 0;
          // parseInt stops at first non-digit: "12 pts" → 12
          const n = parseInt(t, 10);
          return isNaN(n) ? 0 : n;
        };

        const teamName = getText(teamIdx);
        if (!teamName) continue;
        if (/^\d+$/.test(teamName)) continue;  // skip pure rank numbers
        // Skip repeat header rows (cell text matches a known header)
        const normTeam = teamName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (NUMERIC_HEADERS.has(normTeam) || normTeam === 'team' || normTeam === 'club') continue;

        standings.push({
          team_name: teamName,
          points:       getNum(resolvedPts),
          games_played: getNum(resolvedGp),
          wins:         getNum(resolvedW),
          losses:       getNum(resolvedL),
          ties:         getNum(resolvedT),
          goals_for:    getNum(resolvedGf),
          goals_against: getNum(resolvedGa),
          finish_place: standings.length + 1,
        });
      }

      if (standings.length > best.length) best = standings;
    }
  }

  return best;
}

// ─── Home page division discovery ────────────────────────────────────────────

function discoverDivisions(homeHtml: string, baseUrl: string): DivisionInfo[] {
  const doc = parse(homeHtml);
  const seenUrls = new Set<string>();
  const divisions: DivisionInfo[] = [];
  let contextGender: string | null = null;

  // Walk ALL elements in document order so we can track gender section headings
  // that appear before the division links.
  for (const el of doc.querySelectorAll('*')) {
    const tag = el.tagName?.toLowerCase() ?? '';

    // Update gender context when we pass a heading that contains ONLY "Boys" or "Girls".
    if (['h1','h2','h3','h4','h5','h6','b','strong','td','th'].includes(tag)) {
      const txt = el.text.trim();
      if (/^\s*boys\s*$/i.test(txt)) contextGender = 'Boys';
      else if (/^\s*girls\s*$/i.test(txt)) contextGender = 'Girls';
    }

    if (tag !== 'a') continue;

    const href = el.getAttribute('href') ?? '';
    if (!href.toLowerCase().includes('schedule_standings.asp')) continue;

    const fullUrl = buildAbsoluteUrl(href, baseUrl);
    if (seenUrls.has(fullUrl)) continue;
    seenUrls.add(fullUrl);

    // Extract the actual division name — not necessarily the link text.
    const name = extractDivisionName(el as NHTMLElement);
    if (!name) continue;

    const meta = parseDivisionMeta(name);
    // Prefer name-inferred gender over section-heading context.
    const gender = meta.gender ?? contextGender;

    divisions.push({ name, url: fullUrl, ...meta, gender });
  }

  return divisions;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function scrapeLeague(seasonId: number, url: string): Promise<ImportSummary> {
  const summary: ImportSummary = { divisions_found: 0, teams_imported: 0, errors: [] };

  const homeHtml = await fetchHtml(url);
  const divisions = discoverDivisions(homeHtml, url);
  summary.divisions_found = divisions.length;

  for (const div of divisions) {
    try {
      const existing = await db.execute({
        sql: 'SELECT id FROM league_divisions WHERE season_id = ? AND name = ?',
        args: [seasonId, div.name],
      });

      let divisionId: number;

      if (existing.rows[0]) {
        divisionId = existing.rows[0].id as number;
        await db.execute({
          sql: 'UPDATE league_divisions SET age_group = ?, gender = ?, division = ?, source_url = ? WHERE id = ?',
          args: [div.age_group, div.gender, div.division, div.url, divisionId],
        });
      } else {
        const ins = await db.execute({
          sql: 'INSERT INTO league_divisions (season_id, name, age_group, gender, division, source_url) VALUES (?, ?, ?, ?, ?, ?)',
          args: [seasonId, div.name, div.age_group, div.gender, div.division, div.url],
        });
        divisionId = Number(ins.lastInsertRowid);
      }

      const standingsHtml = await fetchHtml(div.url);
      const standings = parseStandingsTable(standingsHtml);

      if (standings.length === 0) {
        summary.errors.push(`${div.name}: standings page fetched but no table rows could be parsed`);
      }

      await db.execute({ sql: 'DELETE FROM league_standings WHERE division_id = ?', args: [divisionId] });

      for (const row of standings) {
        await db.execute({
          sql: `INSERT INTO league_standings
                  (division_id, team_name, points, games_played, wins, losses, ties, goals_for, goals_against, finish_place)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            divisionId, row.team_name, row.points, row.games_played,
            row.wins, row.losses, row.ties, row.goals_for, row.goals_against, row.finish_place,
          ],
        });
      }

      summary.teams_imported += standings.length;
    } catch (err) {
      summary.errors.push(`${div.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;
}
