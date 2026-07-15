const ITEMS = [
  "🍅 Tomato",
  "🧄 Garlic",
  "🌿 Herbs",
  "🥕 Carrot",
  "🧅 Onion",
  "🍋 Lemon",
  "🫒 Olive oil",
  "🌶️ Chilli",
  "🧀 Cheese",
  "🍚 Rice",
];

// Content is duplicated so the track can loop seamlessly at -50% instead
// of snapping back to 0.
export default function IngredientMarquee() {
  return (
    <div className="no-scrollbar overflow-hidden border-y border-line bg-paper-alt py-4">
      <div className="anim-marquee flex w-max gap-10 whitespace-nowrap">
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span
            key={i}
            className="font-mono text-sm uppercase tracking-widest text-ink-muted"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
