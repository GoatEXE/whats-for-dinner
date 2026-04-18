import { normalizeName, normalizeTag } from "../src/normalize";

describe("normalize", () => {
  it("normalizes names by trimming, lowercasing, and collapsing whitespace", () => {
    expect(normalizeName("  Chicken   Fried   Rice  ")).toBe("chicken fried rice");
  });

  it("normalizes tags using the existing punctuation-stripping behavior", () => {
    expect(normalizeTag("  Kid-Friendly!  ")).toBe("kid-friendly");
    expect(normalizeTag("Quick & Easy")).toBe("quick  easy");
  });
});
