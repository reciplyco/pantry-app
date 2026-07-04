// Keyword -> emoji lookup for pantry items. Approximate on purpose: this
// is a free, instant, zero-latency stand-in for real per-item photos.
// Checked in order, first match wins, so more specific keywords are
// listed before broader ones (e.g. "sweet potato" before "potato").
const KEYWORD_ICONS: [string, string][] = [
  // proteins
  ["chicken", "🍗"],
  ["turkey", "🦃"],
  ["bacon", "🥓"],
  ["sausage", "🌭"],
  ["beef", "🥩"],
  ["steak", "🥩"],
  ["pork", "🥩"],
  ["lamb", "🍖"],
  ["shrimp", "🍤"],
  ["prawn", "🍤"],
  ["salmon", "🐟"],
  ["tuna", "🐟"],
  ["fish", "🐟"],
  ["crab", "🦀"],
  ["egg", "🥚"],
  ["tofu", "🧊"],
  ["bean", "🫘"],
  ["lentil", "🫘"],
  ["chickpea", "🫘"],

  // dairy
  ["cheese", "🧀"],
  ["butter", "🧈"],
  ["yogurt", "🥣"],
  ["yoghurt", "🥣"],
  ["cream", "🥛"],
  ["milk", "🥛"],

  // grains / starches
  ["sweet potato", "🍠"],
  ["potato", "🥔"],
  ["rice", "🍚"],
  ["noodle", "🍜"],
  ["pasta", "🍝"],
  ["spaghetti", "🍝"],
  ["bread", "🍞"],
  ["tortilla", "🫓"],
  ["flour", "🌾"],
  ["oat", "🌾"],
  ["quinoa", "🌾"],
  ["corn", "🌽"],

  // vegetables
  ["tomato", "🍅"],
  ["onion", "🧅"],
  ["garlic", "🧄"],
  ["carrot", "🥕"],
  ["broccoli", "🥦"],
  ["cucumber", "🥒"],
  ["pepper", "🫑"],
  ["chili", "🌶️"],
  ["chilli", "🌶️"],
  ["spinach", "🥬"],
  ["lettuce", "🥬"],
  ["cabbage", "🥬"],
  ["kale", "🥬"],
  ["mushroom", "🍄"],
  ["avocado", "🥑"],
  ["eggplant", "🍆"],
  ["aubergine", "🍆"],
  ["zucchini", "🥒"],
  ["celery", "🥬"],
  ["pea", "🟢"],

  // fruits
  ["lemon", "🍋"],
  ["lime", "🍋"],
  ["apple", "🍎"],
  ["banana", "🍌"],
  ["orange", "🍊"],
  ["grape", "🍇"],
  ["strawberr", "🍓"],
  ["blueberr", "🫐"],
  ["berr", "🫐"],
  ["mango", "🥭"],
  ["pineapple", "🍍"],
  ["peach", "🍑"],
  ["pear", "🍐"],
  ["watermelon", "🍉"],
  ["coconut", "🥥"],

  // herbs, spices, condiments
  ["basil", "🌿"],
  ["cilantro", "🌿"],
  ["coriander", "🌿"],
  ["parsley", "🌿"],
  ["mint", "🌿"],
  ["thyme", "🌿"],
  ["rosemary", "🌿"],
  ["oil", "🫒"],
  ["vinegar", "🍾"],
  ["sauce", "🥫"],
  ["honey", "🍯"],
  ["sugar", "🧂"],
  ["salt", "🧂"],
  ["nut", "🥜"],
  ["almond", "🥜"],
  ["peanut", "🥜"],
  ["walnut", "🥜"],
  ["seed", "🌱"],

  // beverages
  ["wine", "🍷"],
  ["juice", "🧃"],
  ["coffee", "☕"],
  ["tea", "🍵"],
];

const FALLBACK_ICON = "🧺";

export function getIngredientIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, icon] of KEYWORD_ICONS) {
    if (lower.includes(keyword)) return icon;
  }
  return FALLBACK_ICON;
}
