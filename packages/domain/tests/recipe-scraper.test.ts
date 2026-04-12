import { readFileSync } from "node:fs";
import path from "node:path";

import {
  extractRecipeFromHtml,
  parseDuration,
  parseIngredientLine,
} from "../src/recipe-scraper";

const fixturesDir = path.join(__dirname, "fixtures");

describe("parseDuration", () => {
  it.each([
    ["PT30M", 30],
    ["PT1H15M", 75],
    ["PT2H", 120],
    ["P1DT30M", 1470],
    ["PT45S", 1],
  ])("parses %s into minutes", (value, expected) => {
    expect(parseDuration(value)).toBe(expected);
  });

  it.each(["", "soon", "P", "PT", "PX5M"])("returns null for invalid durations", (value) => {
    expect(parseDuration(value)).toBeNull();
  });
});

describe("parseIngredientLine", () => {
  it.each([
    ["2 cups flour", { name: "flour", quantityText: "2 cups" }],
    ["1/2 lb chicken breast", { name: "chicken breast", quantityText: "1/2 lb" }],
    ["salt", { name: "salt", quantityText: null }],
    ["3 (14 oz) cans tomatoes", { name: "tomatoes", quantityText: "3 (14 oz) cans" }],
    ["• 2 tbsp olive oil;", { name: "olive oil", quantityText: "2 tbsp" }],
    ["8 lasagna noodles", { name: "lasagna noodles", quantityText: "8" }],
    ["3 skinless chicken thighs", { name: "skinless chicken thighs", quantityText: "3" }],
  ])("splits %s", (raw, expected) => {
    expect(parseIngredientLine(raw)).toEqual(expected);
  });
});

describe("extractRecipeFromHtml", () => {
  it("extracts a complete recipe from JSON-LD", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Recipe",
              "name": "Weeknight Chicken Curry",
              "image": "/images/curry.jpg",
              "recipeCategory": ["Dinner", "Curry"],
              "keywords": "easy, chicken, weeknight",
              "totalTime": "PT50M",
              "recipeIngredient": [
                "1 lb chicken thighs",
                "1 onion",
                "2 tbsp curry paste"
              ],
              "recipeInstructions": [
                { "@type": "HowToStep", "text": "Brown the chicken." },
                { "@type": "HowToStep", "text": "Add onion and curry paste." }
              ]
            }
          </script>
        </head>
      </html>
    `;

    expect(extractRecipeFromHtml(html, "https://www.example.com/recipes/curry")).toEqual({
      name: "Weeknight Chicken Curry",
      ingredients: [
        {
          raw: "1 lb chicken thighs",
          name: "chicken thighs",
          quantityText: "1 lb",
        },
        {
          raw: "1 onion",
          name: "onion",
          quantityText: "1",
        },
        {
          raw: "2 tbsp curry paste",
          name: "curry paste",
          quantityText: "2 tbsp",
        },
      ],
      notes: "Brown the chicken.\nAdd onion and curry paste.",
      prepMinutes: 50,
      tags: ["Dinner", "Curry", "easy", "chicken", "weeknight"],
      imageUrl: "https://www.example.com/images/curry.jpg",
      sourceUrl: "https://www.example.com/recipes/curry",
      sourceHost: "example.com",
    });
  });

  it("finds a Recipe nested inside an @graph fixture", () => {
    const html = readFileSync(path.join(fixturesDir, "allrecipes-like.html"), "utf8");
    const extracted = extractRecipeFromHtml(html, "https://www.allrecipes.com/easy-skillet-lasagna");

    expect(extracted).toMatchObject({
      name: "Easy Skillet Lasagna",
      prepMinutes: 40,
      sourceHost: "allrecipes.com",
      imageUrl: "https://images.example.com/lasagna.jpg",
      tags: ["Dinner", "Pasta", "weeknight", "one-pan", "family favorite"],
    });
    expect(extracted?.ingredients).toHaveLength(4);
    expect(extracted?.ingredients[2]).toEqual({
      raw: "8 lasagna noodles",
      name: "lasagna noodles",
      quantityText: "8",
    });
    expect(extracted?.notes).toContain("Brown the beef in a large skillet.");
  });

  it("picks the JSON-LD block that actually contains a recipe", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">{"@type":"WebSite","name":"Example"}</script>
          <script type="application/ld+json">
            {"@type":"Recipe","name":"Sheet Pan Fajitas","recipeIngredient":["1 lb chicken","2 peppers"]}
          </script>
        </head>
      </html>
    `;

    expect(extractRecipeFromHtml(html, "https://example.com/fajitas")?.name).toBe(
      "Sheet Pan Fajitas",
    );
  });

  it("handles JSON-LD arrays and mixed @type arrays", () => {
    const html = `
      <script type="application/ld+json">
        [
          {"@type":"Thing","name":"Ignore me"},
          {
            "@type":["CreativeWork","Recipe"],
            "name":"Tomato Soup",
            "recipeIngredient":["2 cans tomatoes"],
            "description":"Blend until smooth."
          }
        ]
      </script>
    `;

    expect(extractRecipeFromHtml(html, "https://example.com/soup")).toMatchObject({
      name: "Tomato Soup",
      notes: "Blend until smooth.",
    });
  });

  it("uses nested HowToSection steps instead of section titles", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@type": "Recipe",
          "name": "Layered Enchiladas",
          "recipeIngredient": ["8 tortillas"],
          "recipeInstructions": [
            {
              "@type": "HowToSection",
              "name": "Make the filling",
              "itemListElement": [
                { "@type": "HowToStep", "text": "Cook the onions." },
                { "@type": "HowToStep", "text": "Stir in the beans." }
              ]
            },
            {
              "@type": "HowToSection",
              "name": "Bake",
              "itemListElement": [
                { "@type": "HowToStep", "text": "Layer everything in a dish." },
                { "@type": "HowToStep", "text": "Bake until bubbling." }
              ]
            }
          ]
        }
      </script>
    `;

    expect(extractRecipeFromHtml(html, "https://example.com/enchiladas")?.notes).toBe(
      "Cook the onions.\nStir in the beans.\nLayer everything in a dish.\nBake until bubbling.",
    );
  });

  it("falls back to og:image when recipe image is missing or only a fragment @id", () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="/fallback.jpg" />
          <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Baked Potatoes",
              "image": {
                "@type": "ImageObject",
                "@id": "#img1"
              },
              "recipeIngredient": ["4 potatoes"]
            }
          </script>
        </head>
      </html>
    `;

    expect(extractRecipeFromHtml(html, "https://example.com/potatoes")?.imageUrl).toBe(
      "https://example.com/fallback.jpg",
    );
  });

  it("returns null when there is no JSON-LD recipe", () => {
    const html = "<html><head></head><body><h1>Just a blog post</h1></body></html>";

    expect(extractRecipeFromHtml(html, "https://example.com/post")).toBeNull();
  });

  it("returns null when JSON-LD has no Recipe type", () => {
    const html = `
      <script type="application/ld+json">
        {"@type":"Article","headline":"Not dinner"}
      </script>
    `;

    expect(extractRecipeFromHtml(html, "https://example.com/article")).toBeNull();
  });

  it("ignores malformed JSON-LD instead of throwing", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">{ this is not valid json }</script>
        </head>
      </html>
    `;

    expect(() => extractRecipeFromHtml(html, "https://example.com/bad")).not.toThrow();
    expect(extractRecipeFromHtml(html, "https://example.com/bad")).toBeNull();
  });

  it("uses description when recipe instructions are absent", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@type": "Recipe",
          "name": "Fruit Salad",
          "description": "Mix everything together and chill.",
          "recipeIngredient": ["1 apple", "1 orange"]
        }
      </script>
    `;

    expect(extractRecipeFromHtml(html, "https://example.com/fruit-salad")).toMatchObject({
      name: "Fruit Salad",
      notes: "Mix everything together and chill.",
    });
  });

  it("keeps recipes with empty ingredients as editable best-effort drafts", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@type": "Recipe",
          "name": "Mystery Sauce",
          "description": "Add your ingredients later.",
          "recipeIngredient": []
        }
      </script>
    `;

    expect(extractRecipeFromHtml(html, "https://example.com/mystery-sauce")).toMatchObject({
      name: "Mystery Sauce",
      ingredients: [],
      notes: "Add your ingredients later.",
    });
  });
});
