const { booleanish } = require("../../src/lib/validation");

describe("booleanish", () => {
  it("preserves the existing loose coercion behavior by default", () => {
    const schema = booleanish();

    expect(schema.parse(true)).toBe(true);
    expect(schema.parse(false)).toBe(false);
    expect(schema.parse("true")).toBe(true);
    expect(schema.parse("TRUE")).toBe(true);
    expect(schema.parse("false")).toBe(false);
    expect(schema.parse("banana")).toBe(false);
  });

  it("supports the existing strict mode for exact string booleans", () => {
    const schema = booleanish({ strict: true });

    expect(schema.parse(true)).toBe(true);
    expect(schema.parse(false)).toBe(false);
    expect(schema.parse("true")).toBe(true);
    expect(schema.parse("false")).toBe(false);
    expect(() => schema.parse("TRUE")).toThrow();
    expect(() => schema.parse("banana")).toThrow();
  });
});
