# Implementation Plan Six — DNA Framework Refinements

## Overview

The DNA Frameworks feature is functional but the import experience and content display need refinement:

1. **Import format** — currently accepts PDF, MD, and TXT; should be narrowed to markdown-only.
2. **Sub-principles not rendering** — the parser produces a nested section tree correctly, but the UI shows a flat editor (`SectionEditor`) for any selected node, displaying raw `whitespace-pre-wrap` text rather than rendered markdown and with no awareness of children.
3. **Navigator behavior** — clicking a section jumps straight to that section's content editor; it should instead show the section's own text plus a list of its children (sub-sections), so the hierarchy is browsable.
4. **Raw text display** — content is displayed with `whitespace-pre-wrap` in a plain `<div>`; it should be rendered as formatted markdown.
5. **Import template** — no guide exists for converting a PDF/text framework into the expected markdown format.

---

## Task Breakdown

### Task 1 — Restrict Import to Markdown Only

**Files:** `server/src/routes/frameworks.ts`, `server/src/lib/frameworkParser.ts`, `client/src/pages/DNAFrameworksPage.tsx`

**Server (`frameworks.ts`):**
- In the `POST /import` handler, remove `application/pdf` and `ext === 'pdf'` from the allowed list.
- Accepted: `text/markdown`, `text/plain`, and extensions `.md`, `.txt`.
- Update the error message to say "Only .md and .txt files are accepted".

**Server (`frameworkParser.ts`):**
- Remove the `pdf-parse` branch from `parseFile`. The function body becomes simply:
  ```ts
  return parseMarkdownText(buffer.toString('utf-8'));
  ```
- Remove the `pdf-parse` dynamic require.

**Client (`DNAFrameworksPage.tsx` → `ImportModal`):**
- Change the file input `accept` attribute from `".pdf,.md,.txt"` to `".md,.txt"`.
- Update the label text from `"File (.pdf / .md / .txt)"` to `"File (.md / .txt)"`.

---

### Task 2 — Create a Markdown Import Template

**File:** `assets/framework-import-template.md`

Create a template file with two parts:
1. **Instructions for an LLM** — a comment block or preamble explaining the expected structure.
2. **Template skeleton** — the heading hierarchy that the parser expects.

Expected template structure:
```markdown
<!--
  FRAMEWORK IMPORT TEMPLATE
  Use this template to convert a coaching framework PDF or document into
  a structured markdown file that can be imported into the DNA Frameworks tool.

  STRUCTURE RULES:
  - Use `#` (H1) for the framework title / top-level document name.
  - Use `##` (H2) for primary sections (e.g., Attacking, Defending).
  - Use `###` (H3) for principles within a section.
  - Use `####` (H4) for sub-principles within a principle.
  - Place descriptive text immediately after the heading it belongs to,
    before the next heading.
  - Use markdown bullet lists (`-`) for listed items within a sub-principle.
  - Do not skip heading levels (e.g., do not go from `##` to `####`).
-->

# Framework Title

Brief description or game idea for the overall framework (optional).

## Section Name (e.g., Attacking)

**Game Idea:** One-sentence summary of the intent for this section.

### Principle Name (e.g., Create Attacking Shape)

Short description of this principle.

- Sub-point one
- Sub-point two

#### Sub-Principle Name (e.g., Provide Width)

Detailed description of this sub-principle.

- Specific bullet
- Specific bullet
```

---

### Task 3 — Refine the Import Parser to Better Handle Sub-Principles

**File:** `server/src/lib/frameworkParser.ts`

The current parser already builds a nested `ParsedSection` tree from markdown headings. The issue is that the resulting tree is correctly structured but the UI collapses all sub-children into flat text boxes. The parser itself is fine — no parser changes are needed for this task. The fix is in the UI (Task 4).

However, one parser improvement worth making: trim leading/trailing blank lines from `content` strings during `flushContent` (already done via `.trim()`), but also collapse sequences of 3+ blank lines to a maximum of 2 so content doesn't render with excessive whitespace gaps.

---

### Task 4 — Rework Section Content Display (Navigator + Content Panel)

**File:** `client/src/pages/DNAFrameworksPage.tsx`

This is the most significant UI change. Replace the current `SectionEditor` (which shows only one section's raw text) with a `SectionView` component that is aware of children.

#### 4a — `SectionView` component

When a section is selected in the navigator:
- Display the section title as an `<h3>`.
- If the section has `content`, render it as formatted markdown (see Task 5).
- If the section has children, render a **children list** below the content:
  - Each child appears as a clickable card/row showing the child's title and a truncated first line of its content.
  - Clicking a child card selects that child in the navigator and displays it.
- Show an **Edit** button that switches to edit mode (same as current `SectionEditor` edit mode).

#### 4b — `SectionNode` navigator behavior

The current `SectionNode` calls `onSelect(section)` on click of the row itself. Keep this behavior — the content panel will now show child cards automatically when a parent is selected, so the navigator just needs to set the selected section. No changes needed to `SectionNode`.

#### 4c — Edit mode

Keep the existing edit mode (title input + textarea) for manual editing. The `SectionEditor` component can be renamed `SectionEditForm` and used inside `SectionView` when in edit mode.

---

### Task 5 — Render Markdown Content as Formatted Text

**File:** `client/src/pages/DNAFrameworksPage.tsx`, `client/package.json`

Add a lightweight markdown renderer. Recommended library: `react-markdown` (already commonly used; check if it's in `package.json` first — if not, add it).

**Install (if not present):**
```bash
npm install react-markdown
```

**Usage in `SectionView`:**
```tsx
import ReactMarkdown from 'react-markdown';

// Replace the raw whitespace-pre-wrap div with:
<div className="prose prose-invert prose-sm max-w-none">
  <ReactMarkdown>{section.content}</ReactMarkdown>
</div>
```

**Tailwind Typography:** Add `@tailwindcss/typography` plugin for `prose` classes if not present.
```bash
npm install -D @tailwindcss/typography
```
Then in `tailwind.config.ts` add `require('@tailwindcss/typography')` to the `plugins` array.

Customize `prose` styles in `index.css` to match the navy/gold color scheme:
- Override `--tw-prose-body` to `rgb(209 213 219)` (gray-300)
- Override `--tw-prose-headings` to white
- Override `--tw-prose-bullets` to `rgb(156 163 175)` (gray-400)
- Override `--tw-prose-bold` to white

---

## File Change Summary

| File | Change |
|---|---|
| `server/src/lib/frameworkParser.ts` | Remove PDF support; add blank-line collapse |
| `server/src/routes/frameworks.ts` | Restrict allowed file types to MD/TXT only |
| `client/src/pages/DNAFrameworksPage.tsx` | Replace `SectionEditor` display with `SectionView` (children list + markdown render); restrict import file picker |
| `client/package.json` | Add `react-markdown`, `@tailwindcss/typography` |
| `client/tailwind.config.ts` | Add typography plugin |
| `client/src/index.css` | Add prose color overrides |
| `assets/framework-import-template.md` | New LLM-ready import template |

---

## Implementation Order

1. Task 1 — Restrict import to markdown (quick, server + client)
2. Task 2 — Create import template file (no code changes)
3. Task 3 — Minor parser cleanup (optional blank-line normalization)
4. Task 5 — Install and configure markdown renderer (dependency first)
5. Task 4 — Rework `SectionView` UI (builds on markdown renderer)
