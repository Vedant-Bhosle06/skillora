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

const CATEGORY_COLORS: Record<string, string> = {
  programming: '#6366f1',
  framework: '#8b5cf6',
  tool: '#0ea5e9',
  concept: '#14b8a6',
  database: '#f97316',
  math: '#f59e0b',
  domain: '#ec4899',
  cloud: '#10b981',
  'soft-skill': '#e11d48',
};

const FALLBACK_PALETTE = ['#64748b', '#0891b2', '#7c3aed', '#ca8a04', '#db2777', '#059669'];

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
