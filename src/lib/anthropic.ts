import Anthropic from "@anthropic-ai/sdk";
import type { NeedIngredient, Nutrition } from "./types";

// Lazily instantiated — see the matching comment in lib/stripe.ts for why.
let _anthropic: Anthropic | null = null;

const anthropic: Anthropic = new Proxy({} as Anthropic, {
  get(_target, prop, receiver) {
    if (!_anthropic) {
      _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return Reflect.get(_anthropic, prop, receiver);
  },
});

export type GeneratedRecipe = {
  title: string;
  time_minutes: number;
  servings: number;
  have_ingredients: string[];
  need_ingredients: NeedIngredient[];
  steps: string[];
  nutrition: Nutrition;
};

const RECIPE_TOOL: Anthropic.Tool = {
  name: "return_recipes",
  description:
    "Return recipe suggestions built around the ingredients the user already has.",
  input_schema: {
    type: "object",
    properties: {
      recipes: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            time_minutes: {
              type: "integer",
              description: "Total time in minutes",
            },
            servings: { type: "integer" },
            have_ingredients: {
              type: "array",
              items: { type: "string" },
              description:
                "Ingredients used in this recipe that came from the user's pantry list, using the user's own wording",
            },
            need_ingredients: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  quantity: { type: "string" },
                },
                required: ["name", "quantity"],
              },
              description:
                "Additional ingredients the user needs to buy that are not in their pantry list",
            },
            steps: {
              type: "array",
              items: { type: "string" },
              description: "Concise, numbered-order cooking steps",
            },
            nutrition: {
              type: "object",
              properties: {
                calories: { type: "number" },
                protein_g: { type: "number" },
                carbs_g: { type: "number" },
                fat_g: { type: "number" },
              },
              required: ["calories", "protein_g", "carbs_g", "fat_g"],
              description: "Estimated nutrition per serving",
            },
          },
          required: [
            "title",
            "time_minutes",
            "servings",
            "have_ingredients",
            "need_ingredients",
            "steps",
            "nutrition",
          ],
        },
      },
    },
    required: ["recipes"],
  },
};

export type DietaryConstraints = {
  preferences: string[];
  notes: string | null;
};

export async function generateRecipes(
  pantryItems: string[],
  dietary?: DietaryConstraints
): Promise<GeneratedRecipe[]> {
  const constraints: string[] = [];
  if (dietary?.preferences.length) {
    constraints.push(dietary.preferences.join(", "));
  }
  if (dietary?.notes?.trim()) {
    constraints.push(dietary.notes.trim());
  }

  const dietaryInstruction = constraints.length
    ? `\n\nStrict dietary requirements — every recipe MUST comply, with no exceptions: ${constraints.join("; ")}. If an ingredient the user has on hand conflicts with these requirements, leave it out rather than violating the requirement.`
    : "";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system:
      "You are a practical home-cooking assistant. Given a list of ingredients someone already has, suggest recipes that make the most of those ingredients. Prefer recipes that need few, if any, additional ingredients, and note clearly what's missing. Keep steps concise and realistic for a home cook. Give honest, reasonable nutrition estimates per serving." +
      dietaryInstruction,
    messages: [
      {
        role: "user",
        content: `Ingredients I have on hand: ${pantryItems.join(", ")}.\n\nSuggest 3 different recipes I could cook using mostly these ingredients.`,
      },
    ],
    tools: [RECIPE_TOOL],
    tool_choice: { type: "tool", name: "return_recipes" },
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolUse) {
    throw new Error("Anthropic response did not include a tool_use block");
  }

  const parsed = toolUse.input as { recipes: GeneratedRecipe[] };
  return parsed.recipes;
}
