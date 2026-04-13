import { describe, expect, it } from 'vitest';
import { stringIdToNumber, generateMealId, generateIngredientId } from '@/db/ids';

describe('stringIdToNumber', () => {
  it('returns a positive integer for a UUID-style meal ID', () => {
    const id = generateMealId();
    const num = stringIdToNumber(id);
    expect(num).toBeGreaterThan(0);
    expect(Number.isInteger(num)).toBe(true);
  });

  it('returns distinct numbers for distinct UUIDs', () => {
    const ids = Array.from({ length: 50 }, () => generateMealId());
    const numbers = ids.map(stringIdToNumber);
    const unique = new Set(numbers);
    // With 50 UUIDs and 31-bit hash space, collisions are astronomically unlikely
    expect(unique.size).toBe(50);
  });

  it('is deterministic — same input always produces same output', () => {
    const id = '019706a1-2b3c-7def-8901-234567890abc';
    expect(stringIdToNumber(id)).toBe(stringIdToNumber(id));
  });

  it('returns distinct numbers for ingredient_hash-style IDs', () => {
    const a = generateIngredientId('chicken');
    const b = generateIngredientId('rice');
    expect(stringIdToNumber(a)).not.toBe(stringIdToNumber(b));
  });

  it('does NOT collapse different IDs to the same charCodeAt fallback', () => {
    // These all start with the same character but are different strings
    const ids = [
      '019706a1-0000-0000-0000-000000000001',
      '019706a1-0000-0000-0000-000000000002',
      '019706a1-ffff-ffff-ffff-ffffffffffff',
    ];
    const numbers = ids.map(stringIdToNumber);
    const unique = new Set(numbers);
    expect(unique.size).toBe(3);
  });

  it('passes through plain positive integers unchanged', () => {
    expect(stringIdToNumber('42')).toBe(42);
    expect(stringIdToNumber('1')).toBe(1);
    expect(stringIdToNumber('999999')).toBe(999999);
  });

  it('hashes non-integer numeric strings', () => {
    const num = stringIdToNumber('3.14');
    expect(num).toBeGreaterThan(0);
    expect(Number.isInteger(num)).toBe(true);
  });

  it('hashes zero and negative integer strings', () => {
    // "0" is not positive, so it gets hashed
    expect(stringIdToNumber('0')).toBeGreaterThan(0);
    expect(Number.isInteger(stringIdToNumber('-1'))).toBe(true);
    expect(stringIdToNumber('-1')).toBeGreaterThan(0);
  });
});
