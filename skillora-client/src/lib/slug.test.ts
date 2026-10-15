import { describe, expect, it } from 'vitest';
import { isValidSlug, parseAliases, slugify } from '@/lib/slug';

describe('slugify', () => {
  it('lowercases and joins words with hyphens', () => expect(slugify('Power BI')).toBe('power-bi'));
  it('collapses punctuation and repeated separators', () => {
    expect(slugify('Node.js')).toBe('node-js');
    expect(slugify('C++ / C#')).toBe('c-c');
    expect(slugify('a  --  b')).toBe('a-b');
  });
  it('trims leading and trailing separators', () => expect(slugify('  -Docker-  ')).toBe('docker'));
  it('strips accents', () => expect(slugify('Café Analytics')).toBe('cafe-analytics'));
  it('keeps the zz-test- prefix', () => expect(slugify('zz-test-a')).toBe('zz-test-a'));
  it('returns an empty string for text without letters or digits', () => expect(slugify('<>!')).toBe(''));
  it('always produces a valid slug when non-empty', () => {
    for (const s of ['Power BI', 'Machine Learning (ML)', '<img src=x onerror=alert(1)>', 'R']) {
      expect(isValidSlug(slugify(s))).toBe(true);
    }
  });
});

describe('isValidSlug', () => {
  it('accepts lowercase words joined by single hyphens', () => {
    expect(isValidSlug('power-bi')).toBe(true);
    expect(isValidSlug('python3')).toBe(true);
    expect(isValidSlug('zz-test-role')).toBe(true);
  });
  it('rejects uppercase, spaces and other characters', () => {
    expect(isValidSlug('Power-BI')).toBe(false);
    expect(isValidSlug('power bi')).toBe(false);
    expect(isValidSlug('power_bi')).toBe(false);
    expect(isValidSlug('node.js')).toBe(false);
  });
  it('rejects empty, leading, trailing and double hyphens', () => {
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug('-power')).toBe(false);
    expect(isValidSlug('power-')).toBe(false);
    expect(isValidSlug('power--bi')).toBe(false);
  });
});

describe('parseAliases', () => {
  it('splits on commas and trims', () => expect(parseAliases(' PBI , MS Power BI ')).toEqual(['PBI', 'MS Power BI']));
  it('drops blanks', () => expect(parseAliases('a,, ,b,')).toEqual(['a', 'b']));
  it('de-duplicates case-insensitively, keeping the first spelling', () =>
    expect(parseAliases('JS, js, Js, TS')).toEqual(['JS', 'TS']));
  it('returns an empty list for empty input', () => expect(parseAliases('')).toEqual([]));
});
