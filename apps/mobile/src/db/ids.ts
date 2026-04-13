function getRandomBytes(length: number) {
  const bytes = new Uint8Array(length);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }

  for (let index = 0; index < length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }

  return bytes;
}

function bytesToUuid(bytes: Uint8Array) {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function generateUuidV7() {
  const bytes = getRandomBytes(16);
  const timestamp = BigInt(Date.now());

  bytes[0] = Number((timestamp >> 40n) & 0xffn);
  bytes[1] = Number((timestamp >> 32n) & 0xffn);
  bytes[2] = Number((timestamp >> 24n) & 0xffn);
  bytes[3] = Number((timestamp >> 16n) & 0xffn);
  bytes[4] = Number((timestamp >> 8n) & 0xffn);
  bytes[5] = Number(timestamp & 0xffn);
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return bytesToUuid(bytes);
}

function hashString(input: string) {
  let hash = 0xcbf29ce484222325n;

  for (const character of input) {
    hash ^= BigInt(character.codePointAt(0) ?? 0);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }

  return hash.toString(16).padStart(16, "0");
}

export function generateMealId() {
  return generateUuidV7();
}

export function generateHistoryId() {
  return generateUuidV7();
}

export function generatePlanId() {
  return generateUuidV7();
}

export function generateIngredientId(normalizedName: string) {
  return `ingredient_${hashString(normalizedName)}`;
}

export function generateTagId(normalizedName: string) {
  return `tag_${hashString(normalizedName)}`;
}

/**
 * Convert a string ID (UUID, ingredient_hash, etc.) to a stable 32-bit
 * positive integer suitable for the domain layer's number-typed ID fields.
 * Uses FNV-1a hashing truncated to 32 bits so every distinct string maps
 * to a consistent number, avoiding the charCodeAt(0) collapse bug where
 * all UUIDs mapped to the same value.
 */
export function stringIdToNumber(id: string): number {
  // Fast path: if the string is already a plain integer, use it directly.
  const parsed = Number(id);
  if (Number.isFinite(parsed) && parsed === Math.floor(parsed) && parsed > 0) {
    return parsed;
  }

  // FNV-1a 32-bit hash
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Ensure positive by masking to 31 bits (avoid sign bit)
  return (hash >>> 1) || 1;
}
