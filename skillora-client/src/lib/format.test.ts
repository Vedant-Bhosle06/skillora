import { describe, expect, it } from 'vitest';
import { categoryColor, categoryLabel, demandWord, formatDate, formatDateTime, formatHours, formatPercent, pluralize, rankLabel } from '@/lib/format';

describe('formatHours', () => {
  it('keeps one decimal', () => expect(formatHours(12.5)).toBe('12.5h'));
  it('drops a trailing .0', () => {
    expect(formatHours(12)).toBe('12h');
    expect(formatHours(11.96)).toBe('12h');
  });
  it('rounds to one decimal', () => expect(formatHours(3.14159)).toBe('3.1h'));
  it('handles zero', () => expect(formatHours(0)).toBe('0h'));
});

describe('formatPercent', () => {
  it('converts 0..1 to a whole percentage', () => {
    expect(formatPercent(0.92)).toBe('92%');
    expect(formatPercent(0.876)).toBe('88%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(1)).toBe('100%');
  });
});

describe('formatDateTime', () => {
  it('formats a valid ISO date with its time', () => {
    const iso = '2026-10-15T10:00:00.000Z';
    expect(formatDateTime(iso)).toBe(new Date(iso).toLocaleString());
  });
  it('returns a dash for missing or invalid input', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('not a date')).toBe('—');
  });
});

describe('formatDate', () => {
  it('formats a valid ISO date', () => {
    const iso = '2026-10-15T10:00:00.000Z';
    expect(formatDate(iso)).toBe(new Date(iso).toLocaleDateString());
  });
  it('returns a dash for missing or invalid input', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('not a date')).toBe('—');
  });
});

describe('categoryLabel', () => {
  it('title-cases and replaces dashes', () => {
    expect(categoryLabel('soft-skill')).toBe('Soft Skill');
    expect(categoryLabel('programming')).toBe('Programming');
    expect(categoryLabel('machine-learning-ops')).toBe('Machine Learning Ops');
  });
});

describe('categoryColor', () => {
  it('uses the fixed colour for known categories', () => {
    expect(categoryColor('programming')).toBe('#1f6fb2');
    expect(categoryColor('soft-skill')).toBe('#8c9099');
    expect(categoryColor('cloud')).toBe('#0f8a8f');
  });
  it('is deterministic for unknown categories', () => {
    const a = categoryColor('zz-test-new');
    expect(a).toMatch(/^#[0-9a-f]{6}$/);
    expect(categoryColor('zz-test-new')).toBe(a);
  });
});

describe('rankLabel', () => {
  it('maps 0..3 to labels', () => {
    expect([0, 1, 2, 3].map(rankLabel)).toEqual(['New', 'Beginner', 'Intermediate', 'Advanced']);
  });
  it('falls back to New for out-of-range values', () => expect(rankLabel(7)).toBe('New'));
});

describe('pluralize', () => {
  it('uses the singular only for exactly one', () => {
    expect(pluralize(1, 'edge')).toBe('1 edge');
    expect(pluralize(0, 'edge')).toBe('0 edges');
    expect(pluralize(183, 'edge')).toBe('183 edges');
  });
  it('accepts an irregular plural', () => {
    expect(pluralize(2, 'category', 'categories')).toBe('2 categories');
  });
});

describe('demandWord', () => {
  it('uses plain words for the thresholds', () => {
    expect(demandWord(0.9)).toBe('High demand');
    expect(demandWord(0.75)).toBe('High demand');
    expect(demandWord(0.6)).toBe('Steady demand');
    expect(demandWord(0.55)).toBe('Steady demand');
    expect(demandWord(0.2)).toBe('Niche');
  });
});
