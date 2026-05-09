export interface ParsedSection {
  title: string;
  content: string;
  level: number;
  children: ParsedSection[];
}

export function parseMarkdownText(text: string): ParsedSection[] {
  const lines = text.split('\n');
  const roots: ParsedSection[] = [];
  const stack: ParsedSection[] = [];

  let currentContent: string[] = [];

  const flushContent = () => {
    if (stack.length > 0) {
      stack[stack.length - 1].content = currentContent
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }
    currentContent = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      flushContent();
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      const section: ParsedSection = { title, content: '', level, children: [] };

      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length === 0) {
        roots.push(section);
      } else {
        stack[stack.length - 1].children.push(section);
      }
      stack.push(section);
    } else {
      currentContent.push(line);
    }
  }

  flushContent();

  if (roots.length === 0 && text.trim()) {
    roots.push({ title: 'Content', content: text.trim(), level: 1, children: [] });
  }

  return roots;
}

export async function parseFile(
  buffer: Buffer,
  _mimetype: string,
  _originalname: string
): Promise<ParsedSection[]> {
  return parseMarkdownText(buffer.toString('utf-8'));
}

export interface FlatSection {
  title: string;
  content: string;
  order_index: number;
  parentIndex: number | null;
}

export function flattenSections(sections: ParsedSection[]): FlatSection[] {
  const flat: FlatSection[] = [];

  function walk(nodes: ParsedSection[], parentIndex: number | null) {
    nodes.forEach((node, i) => {
      const idx = flat.length;
      flat.push({ title: node.title, content: node.content, order_index: i, parentIndex });
      walk(node.children, idx);
    });
  }

  walk(sections, null);
  return flat;
}
