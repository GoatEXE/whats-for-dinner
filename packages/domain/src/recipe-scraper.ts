import { normalizeName } from "./normalize";

export interface ScrapedRecipeIngredient {
  raw: string;
  name: string;
  quantityText: string | null;
}

export interface ScrapedRecipe {
  name: string;
  ingredients: ScrapedRecipeIngredient[];
  notes: string | null;
  prepMinutes: number | null;
  tags: string[];
  imageUrl: string | null;
  sourceUrl: string;
  sourceHost: string;
}

type JsonRecord = Record<string, unknown>;

const SCRIPT_TAG_PATTERN = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const META_TAG_PATTERN = /<meta\b[^>]*>/gi;
const COMMON_UNITS = new Set([
  "teaspoon",
  "teaspoons",
  "tsp",
  "tablespoon",
  "tablespoons",
  "tbsp",
  "cup",
  "cups",
  "pint",
  "pints",
  "quart",
  "quarts",
  "gallon",
  "gallons",
  "ml",
  "milliliter",
  "milliliters",
  "l",
  "liter",
  "liters",
  "oz",
  "ounce",
  "ounces",
  "lb",
  "lbs",
  "pound",
  "pounds",
  "g",
  "gram",
  "grams",
  "kg",
  "kilogram",
  "kilograms",
  "mg",
  "pinch",
  "pinches",
  "dash",
  "dashes",
  "clove",
  "cloves",
  "can",
  "cans",
  "package",
  "packages",
  "pkg",
  "pkgs",
  "packet",
  "packets",
  "jar",
  "jars",
  "bottle",
  "bottles",
  "slice",
  "slices",
  "head",
  "heads",
  "bunch",
  "bunches",
  "sprig",
  "sprigs",
  "stick",
  "sticks",
  "piece",
  "pieces",
  "fillet",
  "fillets",
  "breast",
  "breasts",
  "thigh",
  "thighs",
  "leg",
  "legs",
]);
const FRACTION_CHARACTERS = "¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞";

export function extractRecipeFromHtml(html: string, sourceUrl: string): ScrapedRecipe | null {
  const scripts = extractJsonLdBlocks(html);
  const recipes: JsonRecord[] = [];

  for (const script of scripts) {
    const parsed = parseJsonLd(script);

    if (parsed === null) {
      continue;
    }

    recipes.push(...findRecipeNodes(parsed));
  }

  if (recipes.length === 0) {
    return null;
  }

  const bestRecipe = recipes
    .slice()
    .sort((left, right) => scoreRecipeNode(right) - scoreRecipeNode(left))[0];
  const name = getPrimaryText(bestRecipe.name) ?? getPrimaryText(bestRecipe.headline);

  if (!name) {
    return null;
  }

  const normalizedSourceUrl = normalizeUrl(sourceUrl) ?? sourceUrl.trim();
  const sourceHost = getSourceHost(normalizedSourceUrl);
  const ingredients = extractIngredients(bestRecipe.recipeIngredient ?? bestRecipe.ingredients);
  const notes = extractRecipeNotes(bestRecipe);
  const prepMinutes =
    parseDuration(getPrimaryText(bestRecipe.totalTime)) ??
    parseDuration(getPrimaryText(bestRecipe.prepTime)) ??
    parseDuration(getPrimaryText(bestRecipe.cookTime));
  const tags = extractTags(bestRecipe);
  const imageUrl =
    extractImageUrl(bestRecipe.image, normalizedSourceUrl) ??
    extractOgImageUrl(html, normalizedSourceUrl);

  return {
    name,
    ingredients,
    notes,
    prepMinutes,
    tags,
    imageUrl,
    sourceUrl: normalizedSourceUrl,
    sourceHost,
  };
}

export function parseDuration(isoDuration: string | null | undefined): number | null {
  if (!isoDuration) {
    return null;
  }

  const candidate = isoDuration.trim();

  if (!candidate) {
    return null;
  }

  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i.exec(candidate);

  if (!match) {
    return null;
  }

  const hasAnyComponent = match.slice(1).some((part) => part !== undefined);

  if (!hasAnyComponent) {
    return null;
  }

  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  return days * 1440 + hours * 60 + minutes + Math.round(seconds / 60);
}

export function parseIngredientLine(
  raw: string,
): { name: string; quantityText: string | null } {
  const cleaned = stripTrailingPunctuation(normalizeWhitespace(raw.replace(/^[•\-–—\s]+/, "")));

  if (!cleaned) {
    return {
      name: "",
      quantityText: null,
    };
  }

  const quantityMatch = cleaned.match(
    new RegExp(
      `^(?<quantity>(?:about|approximately)?\\s*(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?|[${FRACTION_CHARACTERS}])(?:\\s*(?:to|-|–)\\s*(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?|[${FRACTION_CHARACTERS}]))?(?:\\s*\\([^)]*\\))?(?:\\s+[A-Za-z]+\\.?)?)\\s+(?<rest>.+)$`,
      "i",
    ),
  );

  if (!quantityMatch?.groups) {
    return {
      name: cleaned,
      quantityText: null,
    };
  }

  let quantityText = normalizeWhitespace(quantityMatch.groups.quantity);
  let name = normalizeWhitespace(quantityMatch.groups.rest);
  const nameTokens = name.split(" ");

  while (nameTokens.length > 1 && isUnitToken(nameTokens[0])) {
    quantityText = `${quantityText} ${nameTokens.shift()}`;
    name = nameTokens.join(" ");
  }

  return {
    name: name || cleaned,
    quantityText: quantityText || null,
  };
}

function extractJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = SCRIPT_TAG_PATTERN.exec(html)) !== null) {
    const attributes = match[1] ?? "";
    const type = getHtmlAttribute(attributes, "type")?.toLowerCase();

    if (!type?.includes("application/ld+json")) {
      continue;
    }

    blocks.push(match[2] ?? "");
  }

  return blocks;
}

function parseJsonLd(scriptContent: string): unknown | null {
  const sanitized = sanitizeJsonLd(scriptContent);

  if (!sanitized) {
    return null;
  }

  try {
    const parsed = JSON.parse(sanitized);

    if (typeof parsed === "string") {
      try {
        return JSON.parse(parsed);
      } catch {
        return parsed;
      }
    }

    return parsed;
  } catch {
    return null;
  }
}

function sanitizeJsonLd(scriptContent: string) {
  return scriptContent
    .replace(/^\uFEFF/, "")
    .replace(/^\s*<!--/, "")
    .replace(/-->\s*$/, "")
    .replace(/^\s*<!\[CDATA\[/, "")
    .replace(/\]\]>\s*$/, "")
    .replace(/;\s*$/, "")
    .trim();
}

function findRecipeNodes(value: unknown, seen = new Set<object>(), found: JsonRecord[] = []) {
  if (!value || typeof value !== "object") {
    return found;
  }

  if (seen.has(value)) {
    return found;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      findRecipeNodes(item, seen, found);
    }

    return found;
  }

  const record = value as JsonRecord;

  if (hasRecipeType(record["@type"])) {
    found.push(record);
  }

  for (const nestedValue of Object.values(record)) {
    findRecipeNodes(nestedValue, seen, found);
  }

  return found;
}

function hasRecipeType(typeValue: unknown): boolean {
  if (typeof typeValue === "string") {
    return normalizeSchemaType(typeValue) === "recipe";
  }

  if (Array.isArray(typeValue)) {
    return typeValue.some((entry) => typeof entry === "string" && normalizeSchemaType(entry) === "recipe");
  }

  return false;
}

function normalizeSchemaType(typeName: string): string {
  return typeName
    .trim()
    .toLowerCase()
    .split(/[\/#]/)
    .filter(Boolean)
    .pop() ?? "";
}

function scoreRecipeNode(recipe: JsonRecord): number {
  const nameScore = getPrimaryText(recipe.name) ? 5 : 0;
  const ingredientScore = extractStringList(recipe.recipeIngredient ?? recipe.ingredients).length * 2;
  const instructionScore = collectInstructionTexts(recipe.recipeInstructions).length;

  return nameScore + ingredientScore + instructionScore;
}

function extractIngredients(value: unknown): ScrapedRecipeIngredient[] {
  return extractStringList(value)
    .map((raw) => {
      const parsed = parseIngredientLine(raw);

      return {
        raw,
        name: parsed.name,
        quantityText: parsed.quantityText,
      };
    })
    .filter((ingredient) => ingredient.name.length > 0);
}

function extractStringList(value: unknown): string[] {
  if (typeof value === "string") {
    const text = normalizeWhitespace(decodeHtmlEntities(stripHtmlTags(value)));
    return text ? [text] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractStringList(entry));
  }

  if (value && typeof value === "object") {
    const record = value as JsonRecord;
    const preferred =
      getPrimaryText(record.text) ??
      getPrimaryText(record.name) ??
      getPrimaryText(record.value) ??
      getPrimaryText(record["@value"]);

    if (preferred) {
      return [preferred];
    }
  }

  return [];
}

function extractRecipeNotes(recipe: JsonRecord): string | null {
  const instructionTexts = collectInstructionTexts(recipe.recipeInstructions);

  if (instructionTexts.length > 0) {
    return instructionTexts.join("\n").slice(0, 4000) || null;
  }

  return getPrimaryText(recipe.description);
}

function collectInstructionTexts(value: unknown): string[] {
  if (typeof value === "string") {
    const text = getPrimaryText(value);
    return text ? [text] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectInstructionTexts(entry));
  }

  if (value && typeof value === "object") {
    const record = value as JsonRecord;
    const directText = getPrimaryText(record.text) ?? getPrimaryText(record.name);

    if (directText) {
      return [directText];
    }

    if (record.itemListElement) {
      return collectInstructionTexts(record.itemListElement);
    }
  }

  return [];
}

function extractTags(recipe: JsonRecord): string[] {
  const values = [
    ...collectTagTexts(recipe.recipeCategory),
    ...collectTagTexts(recipe.keywords, { splitKeywords: true }),
  ];
  const unique = new Set<string>();
  const tags: string[] = [];

  for (const tag of values) {
    const normalized = normalizeName(tag);

    if (!normalized || unique.has(normalized)) {
      continue;
    }

    unique.add(normalized);
    tags.push(tag);
  }

  return tags;
}

function collectTagTexts(
  value: unknown,
  options: { splitKeywords?: boolean } = {},
): string[] {
  if (typeof value === "string") {
    const text = getPrimaryText(value);

    if (!text) {
      return [];
    }

    if (!options.splitKeywords) {
      return [text];
    }

    return text
      .split(/[;,]/)
      .map((item) => normalizeWhitespace(item))
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectTagTexts(entry, options));
  }

  if (value && typeof value === "object") {
    const record = value as JsonRecord;
    const directText = getPrimaryText(record.name) ?? getPrimaryText(record.text);
    return directText ? [directText] : [];
  }

  return [];
}

function extractImageUrl(value: unknown, sourceUrl: string): string | null {
  if (typeof value === "string") {
    return resolveUrl(value, sourceUrl);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const imageUrl = extractImageUrl(entry, sourceUrl);

      if (imageUrl) {
        return imageUrl;
      }
    }

    return null;
  }

  if (value && typeof value === "object") {
    const record = value as JsonRecord;
    const directUrl =
      getPrimaryText(record.url) ??
      getPrimaryText(record.contentUrl) ??
      getPrimaryText(record["@id"]);

    return directUrl ? resolveUrl(directUrl, sourceUrl) : null;
  }

  return null;
}

function extractOgImageUrl(html: string, sourceUrl: string): string | null {
  const metaTags = html.match(META_TAG_PATTERN) ?? [];

  for (const tag of metaTags) {
    const property = getHtmlAttribute(tag, "property")?.toLowerCase();
    const name = getHtmlAttribute(tag, "name")?.toLowerCase();

    if (property !== "og:image" && name !== "og:image") {
      continue;
    }

    const content = getHtmlAttribute(tag, "content");

    if (content) {
      return resolveUrl(content, sourceUrl);
    }
  }

  return null;
}

function getHtmlAttribute(source: string, attributeName: string): string | null {
  const quotedMatch = new RegExp(`\\b${attributeName}\\s*=\\s*(["'])(.*?)\\1`, "i").exec(source);

  if (quotedMatch) {
    return quotedMatch[2];
  }

  const unquotedMatch = new RegExp(`\\b${attributeName}\\s*=\\s*([^\\s>]+)`, "i").exec(source);
  return unquotedMatch?.[1] ?? null;
}

function getPrimaryText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const text = normalizeWhitespace(decodeHtmlEntities(stripHtmlTags(value)));
  return text || null;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripHtmlTags(value: string): string {
  return value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ");
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[;,]+$/, "").trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function isUnitToken(token: string): boolean {
  return COMMON_UNITS.has(token.toLowerCase().replace(/\.$/, ""));
}

function normalizeUrl(candidate: string): string | null {
  try {
    return new URL(candidate).toString();
  } catch {
    return null;
  }
}

function resolveUrl(candidate: string, sourceUrl: string): string | null {
  const trimmed = candidate.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed, sourceUrl).toString();
  } catch {
    return trimmed;
  }
}

function getSourceHost(sourceUrl: string): string {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./i, "");
  } catch {
    return sourceUrl;
  }
}
