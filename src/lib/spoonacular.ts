import type { SearchRecipeResult } from "./types";

const COMPLEX_SEARCH_URL = "https://api.spoonacular.com/recipes/complexSearch";

// Spoonacular only accepts one value for `diet` per request, but multiple
// `intolerances`. Our UI presents both as a single flat "dietary" multi-select,
// so we split user-facing tokens into whichever Spoonacular param they map to.
const DIET_TO_SPOONACULAR_DIET: Record<string, string> = {
  vegan: "vegan",
  vegetarian: "vegetarian",
  pescatarian: "pescetarian",
  keto: "ketogenic",
  paleo: "paleo",
};

const DIET_TO_INTOLERANCE: Record<string, string> = {
  "dairy-free": "dairy",
  "nut-free": "tree nut,peanut",
  "gluten-free": "gluten",
  "egg-free": "egg",
};

// Spoonacular has no "cooking method" filter param, so this is a best-effort
// keyword match against each result's title/dishTypes after fetching.
const METHOD_KEYWORDS: Record<string, string[]> = {
  bake: ["bake", "baked", "baking", "roast", "roasted", "oven"],
  stovetop: [
    "skillet",
    "stovetop",
    "saute",
    "sauté",
    "stir-fry",
    "stir fry",
    "pan-fried",
    "pan fried",
    "simmer",
  ],
  "slow cooker": ["slow cooker", "crockpot", "crock pot", "slow-cooked", "slow cooked"],
  "air fryer": ["air fryer", "air-fried", "air fried"],
  grill: ["grill", "grilled", "barbecue", "bbq"],
  "no-cook": ["no-cook", "no cook", "no bake", "no-bake", "raw"],
};

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "some",
  "leftover",
  "half",
  "fresh",
  "freshly",
  "chopped",
  "sliced",
  "diced",
  "minced",
  "ground",
  "large",
  "small",
  "medium",
  "cup",
  "cups",
  "tbsp",
  "tbsps",
  "tsp",
  "tsps",
  "tablespoon",
  "tablespoons",
  "teaspoon",
  "teaspoons",
  "ounce",
  "ounces",
  "oz",
  "clove",
  "cloves",
  "and",
  "or",
  "to",
  "taste",
  "piece",
  "pieces",
  "can",
  "cans",
  "jar",
  "package",
]);

function significantWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function ingredientsOverlap(userIngredient: string, recipeIngredientName: string): boolean {
  const a = userIngredient.toLowerCase().trim();
  const b = recipeIngredientName.toLowerCase().trim();
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const aWords = significantWords(a);
  const bWords = significantWords(b);
  return aWords.some((w) => bWords.includes(w));
}

type SpoonacularIngredient = {
  id: number;
  name?: string;
  nameClean?: string;
  original: string;
};

type SpoonacularRecipe = {
  id: number;
  title: string;
  image?: string;
  sourceUrl?: string;
  sourceName?: string;
  readyInMinutes?: number;
  aggregateLikes?: number;
  cuisines?: string[];
  dishTypes?: string[];
  diets?: string[];
  extendedIngredients?: SpoonacularIngredient[];
};

type SpoonacularComplexSearchResponse = {
  results: SpoonacularRecipe[];
};

export type SearchRecipesParams = {
  ingredients: string[];
  maxTime?: number;
  cuisines: string[];
  methods: string[];
  diets: string[];
};

function matchesMethod(recipe: SpoonacularRecipe, methods: string[]): boolean {
  if (methods.length === 0) return true;
  const haystack = `${recipe.title} ${(recipe.dishTypes ?? []).join(" ")}`.toLowerCase();
  return methods.some((m) =>
    (METHOD_KEYWORDS[m] ?? [m]).some((keyword) => haystack.includes(keyword))
  );
}

export async function searchRecipes(
  params: SearchRecipesParams
): Promise<SearchRecipeResult[]> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) {
    throw new Error("SPOONACULAR_API_KEY is not configured");
  }

  const spoonacularDiet = params.diets
    .map((d) => DIET_TO_SPOONACULAR_DIET[d])
    .find((v): v is string => Boolean(v));

  const intolerances = params.diets
    .map((d) => DIET_TO_INTOLERANCE[d])
    .filter((v): v is string => Boolean(v))
    .join(",");

  const query = new URLSearchParams({
    apiKey,
    number: "20",
    addRecipeInformation: "true",
    fillIngredients: "true",
    instructionsRequired: "false",
    sort: "max-used-ingredients",
  });

  if (params.ingredients.length > 0) {
    query.set("includeIngredients", params.ingredients.join(","));
  }
  if (params.maxTime) query.set("maxReadyTime", String(params.maxTime));
  if (params.cuisines.length > 0) query.set("cuisine", params.cuisines.join(","));
  if (spoonacularDiet) query.set("diet", spoonacularDiet);
  if (intolerances) query.set("intolerances", intolerances);

  const res = await fetch(`${COMPLEX_SEARCH_URL}?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`Spoonacular request failed with status ${res.status}`);
  }
  const body = (await res.json()) as SpoonacularComplexSearchResponse;

  const results = body.results
    .filter((r) => matchesMethod(r, params.methods))
    .map((r): SearchRecipeResult => {
      const ingredients = r.extendedIngredients ?? [];
      const matched: string[] = [];
      const missing: string[] = [];
      for (const ing of ingredients) {
        const name = ing.nameClean || ing.name || ing.original;
        const isMatched = params.ingredients.some((u) => ingredientsOverlap(u, name));
        (isMatched ? matched : missing).push(name);
      }
      const matchPercent =
        ingredients.length > 0
          ? Math.round((matched.length / ingredients.length) * 100)
          : 0;

      let sourceName = r.sourceName ?? null;
      if (!sourceName && r.sourceUrl) {
        try {
          sourceName = new URL(r.sourceUrl).hostname.replace(/^www\./, "");
        } catch {
          sourceName = null;
        }
      }

      return {
        id: r.id,
        title: r.title,
        sourceName,
        sourceUrl: r.sourceUrl ?? `https://spoonacular.com/recipes/${r.id}`,
        image: r.image ?? null,
        matchPercent,
        matchedIngredients: matched,
        missingIngredients: missing,
        readyInMinutes: r.readyInMinutes ?? null,
        popularity: r.aggregateLikes ?? 0,
        cuisines: r.cuisines ?? [],
        dishTypes: r.dishTypes ?? [],
        diets: r.diets ?? [],
      };
    });

  results.sort((a, b) => b.matchPercent - a.matchPercent);
  return results;
}
