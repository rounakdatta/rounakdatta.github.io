// Pure text helpers, kept free of Astro so they can be tested on their own.

export const isPublished = (data: { draft?: boolean }) => data.draft !== true;

/** Markdown down to the words a reader sees. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[\^[^\]]+\](:.*)?/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** About 230 words a minute for prose like this; never "0 min". */
export function readingMinutes(markdown: string): number {
  const words = plainText(markdown).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

/** The prose of a piece, without the epigraphs, headings, pictures and code around it. */
export function proseOf(markdown: string): string {
  const blocks = markdown.split(/\n\s*\n/).map((b) => b.trim());
  const isProse = (b: string) => b && !/^(>|#|!\[|<|```|\||[-*+] |\d+\. |\[\^)/.test(b);
  const first = blocks.findIndex(isProse);
  return first === -1 ? markdown : blocks.slice(first).filter(isProse).join('\n\n');
}

/** The opening of a piece, cut at a sentence (or failing that a word) near `limit` characters. */
export function excerptOf(markdown: string, limit = 180): string {
  const text = plainText(proseOf(markdown));
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit + 40);
  const sentenceEnd = Math.max(cut.lastIndexOf('. ', limit), cut.lastIndexOf('! ', limit), cut.lastIndexOf('? ', limit));
  if (sentenceEnd > limit * 0.5) return cut.slice(0, sentenceEnd + 1);
  return `${text.slice(0, text.lastIndexOf(' ', limit))}…`;
}
