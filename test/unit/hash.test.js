import { describe, expect, it } from 'vitest';
import { hashString } from '../../src/utils/hash.js';

describe('hashString', () => {
  it('returns the same hash for the same input', () => {
    expect(hashString('hello world')).toBe(hashString('hello world'));
  });

  it('returns different hashes for different inputs', () => {
    expect(hashString('hello')).not.toBe(hashString('world'));
  });

  it('returns a defined hash for the empty string', () => {
    expect(hashString('')).toBe('0');
  });

  it('returns a compact base-36 compatible string', () => {
    expect(hashString('omni-antigravity')).toMatch(/^-?[0-9a-z]+$/);
  });
});
