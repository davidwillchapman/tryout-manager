export interface ParsedActivity {
  title: string;
  summary: string;
  description: string;
  activity_type: string | null;
  duration_minutes: number | null;
  field_setup: string | null;
  coaching_points: string | null;
  flexibility_notes: string | null;
  references: Array<{ url: string; label: string | null }>;
  dnaTags: Array<{
    framework_name: string;
    phase: string | null;
    principle: string | null;
    sub_principle: string | null;
  }>;
  warnings: string[];
}

export function parseActivityMarkdown(text: string): ParsedActivity {
  const warnings: string[] = [];
  const lines = text.split('\n');

  let title = '';
  const sections: Record<string, string[]> = {};
  const dnaTagBlocks: string[][] = [];

  let currentKey: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (currentKey === null) return;
    if (currentKey === 'DNA Tags') {
      dnaTagBlocks.push([...currentLines]);
    } else {
      sections[currentKey] = [...currentLines];
    }
    currentLines = [];
    currentKey = null;
  };

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);

    if (h1 && !title) {
      flush();
      title = h1[1].trim();
      currentKey = null;
    } else if (h2) {
      flush();
      const heading = h2[1].trim();
      currentKey = heading;
    } else if (currentKey !== null) {
      currentLines.push(line);
    }
  }
  flush();

  const getText = (key: string): string | null => {
    const raw = sections[key];
    if (!raw) return null;
    const joined = raw.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    return joined || null;
  };

  const summary = getText('Summary');
  const description = getText('Description');

  if (!summary) throw new Error('Missing required section: ## Summary');
  if (!description) throw new Error('Missing required section: ## Description');

  // Activity type — first non-empty line
  let activity_type: string | null = null;
  const typeLines = sections['Activity Type'];
  if (typeLines) {
    for (const l of typeLines) {
      const t = l.trim();
      if (t) { activity_type = t; break; }
    }
  }

  // Duration — parse as integer
  let duration_minutes: number | null = null;
  const durLines = sections['Duration'];
  if (durLines) {
    for (const l of durLines) {
      const t = l.trim();
      if (t) {
        const n = parseInt(t, 10);
        if (!isNaN(n)) duration_minutes = n;
        else warnings.push(`Could not parse Duration as integer: "${t}"`);
        break;
      }
    }
  }

  // External References
  const references: Array<{ url: string; label: string | null }> = [];
  const refLines = sections['External References'];
  if (refLines) {
    for (const l of refLines) {
      const t = l.trim().replace(/^-\s*/, '');
      const urlMatch = t.match(/^(https?:\/\/\S+)(?:\s+(.+))?$/);
      if (urlMatch) {
        references.push({ url: urlMatch[1], label: urlMatch[2]?.trim() || null });
      }
    }
  }

  // DNA Tags — one block per ## DNA Tags section
  const dnaTags: ParsedActivity['dnaTags'] = [];
  for (const block of dnaTagBlocks) {
    const kv: Record<string, string> = {};
    for (const l of block) {
      const m = l.match(/^(Framework|Phase|Principle|Sub-Principle)\s*:\s*(.+)/i);
      if (m) kv[m[1].toLowerCase().replace('-', '_')] = m[2].trim();
    }
    if (!kv['framework']) {
      warnings.push('DNA Tags block missing "Framework:" line — skipped');
      continue;
    }
    dnaTags.push({
      framework_name: kv['framework'],
      phase: kv['phase'] ?? null,
      principle: kv['principle'] ?? null,
      sub_principle: kv['sub_principle'] ?? null,
    });
  }

  return {
    title: title || 'Untitled Activity',
    summary,
    description,
    activity_type,
    duration_minutes,
    field_setup: getText('Field Setup'),
    coaching_points: getText('Coaching Points'),
    flexibility_notes: getText('Flexibility Notes'),
    references,
    dnaTags,
    warnings,
  };
}
