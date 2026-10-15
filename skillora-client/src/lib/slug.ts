// Slugs for admin-created skills and roles. Pure functions only.

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Power BI" -> "power-bi", "C++ / C#" -> "c-c", "  Node.js  " -> "node-js". */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents left over after NFKD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Lowercase letters and digits in groups joined by single hyphens. */
export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

/** "a, b ,, A, c" -> ["a", "b", "c"]: trimmed, blanks dropped, de-duplicated case-insensitively (first spelling kept). */
export function parseAliases(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(',')) {
    const alias = raw.trim();
    const key = alias.toLowerCase();
    if (!alias || seen.has(key)) continue;
    seen.add(key);
    out.push(alias);
  }
  return out;
}
