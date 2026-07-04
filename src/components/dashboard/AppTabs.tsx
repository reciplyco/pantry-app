"use client";

export type DashboardTab =
  | "pantry"
  | "generate"
  | "recipes"
  | "shopping"
  | "schedule";

type Props = {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  pantryCount: number;
  selectedCount: number;
  recipeCount: number;
  shoppingCount: number;
  scheduleCount: number;
};

export default function AppTabs({
  activeTab,
  onChange,
  pantryCount,
  selectedCount,
  recipeCount,
  shoppingCount,
  scheduleCount,
}: Props) {
  const tabs: {
    id: DashboardTab;
    label: string;
    shortLabel: string;
    count: number;
  }[] = [
    { id: "pantry", label: "Pantry", shortLabel: "Pantry", count: pantryCount },
    {
      id: "generate",
      label: "Generate",
      shortLabel: "Generate",
      count: selectedCount,
    },
    { id: "recipes", label: "Recipes", shortLabel: "Recipes", count: recipeCount },
    {
      id: "shopping",
      label: "Shopping List",
      shortLabel: "Shop",
      count: shoppingCount,
    },
    {
      id: "schedule",
      label: "Schedule",
      shortLabel: "Plan",
      count: scheduleCount,
    },
  ];

  return (
    <div className="relative">
      <nav className="flex overflow-x-auto rounded-sm border border-line shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={activeTab === tab.id}
            className={`flex-1 whitespace-nowrap border-b-[3px] px-3 py-3 text-left font-serif text-base font-medium transition sm:px-5 sm:py-5 sm:text-lg lg:text-xl ${
              activeTab === tab.id
                ? "border-accent bg-card text-ink"
                : "border-line bg-paper-alt text-ink-muted hover:text-ink"
            }`}
          >
            <span className="sm:hidden">{tab.shortLabel}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count > 0 && (
              <span className="ml-1.5 hidden font-mono text-sm text-ink-muted sm:inline">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
      {/* Hints that the tab bar scrolls horizontally on narrow screens,
          where all 5 tabs don't necessarily fit at once. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-paper to-transparent sm:hidden"
      />
    </div>
  );
}
