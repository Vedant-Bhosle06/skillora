// Small display helpers shared by every page. Pure functions only.

/** 12.5 -> "12.5h", 12 -> "12h" (one decimal, trailing ".0" dropped). */
export function formatHours(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}h`;
}

/** 0..1 -> "42%". */
export function formatPercent(x01: number): string {
  return `${Math.round(x01 * 100)}%`;
}

/** ISO date string -> locale date; "—" for missing or invalid input. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

/** ISO date string -> locale date and time; "—" for missing or invalid input. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

/** (1, "edge") -> "1 edge", (3, "edge") -> "3 edges"; pass `plural` for irregular words. */
export function pluralize(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** "soft-skill" -> "Soft Skill". */
export function categoryLabel(cat: string): string {
  return cat
    .replace(/-/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// Transit line colours (the same hues as --line-* in index.css), for places that need a hex value.
const CATEGORY_COLORS: Record<string, string> = {
  programming: '#1f6fb2',
  framework: '#1b8f57',
  tool: '#c99300',
  concept: '#8c9099',
  database: '#e2621a',
  math: '#0f8a8f',
  domain: '#e2621a',
  cloud: '#0f8a8f',
  'soft-skill': '#8c9099',
};

const FALLBACK_PALETTE = ['#1f6fb2', '#1b8f57', '#c99300', '#e2621a', '#0f8a8f', '#8c9099'];

/** Fixed colour for known categories; a stable hash colour for anything an admin adds later. */
export function categoryColor(cat: string): string {
  const known = CATEGORY_COLORS[cat];
  if (known) return known;
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = (hash * 31 + cat.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

const RANK_LABELS = ['New', 'Beginner', 'Intermediate', 'Advanced'];

/** Proficiency rank 0..3 -> label. */
export function rankLabel(rank: number): string {
  return RANK_LABELS[rank] ?? RANK_LABELS[0];
}

/** Demand is an expert estimate (0..1), so it is shown in words, never as a decimal. */
export function demandWord(d: number): string {
  return d >= 0.75 ? 'High demand' : d >= 0.55 ? 'Steady demand' : 'Niche';
}
