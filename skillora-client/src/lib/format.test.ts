import { describe, expect, it } from 'vitest';
import { categoryColor, categoryLabel, formatDate, formatHours, formatPercent, rankLabel } from '@/lib/format';

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
    expect(categoryColor('programming')).toBe('#6366f1');
    expect(categoryColor('soft-skill')).toBe('#e11d48');
    expect(categoryColor('cloud')).toBe('#10b981');
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
