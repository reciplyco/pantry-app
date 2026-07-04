"use client";

export type DashboardTab =
  | "pantry"
  | "generate"
  | "search"
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
    {
      id: "generate",
      label: "Generate",
      shortLabel: "Generate",
      count: selectedCount,
    },
    { id: "pantry", label: "Pantry", shortLabel: "Pantry", count: pantryCount },
    { id: "search", label: "Search", shortLabel: "Search", count: 0 },
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
      <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto sm:gap-1.5">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={active}
              className={`whitespace-nowrap rounded-full px-4 py-2 font-serif text-sm font-medium transition sm:px-5 sm:py-2.5 sm:text-base ${
                active
                  ? "bg-accent text-accent-ink"
                  : "text-ink-muted hover:bg-paper-alt hover:text-ink"
              }`}
            >
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`ml-1.5 hidden font-mono text-xs sm:inline ${
                    active ? "text-accent-ink/75" : "text-ink-muted"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {/* Hints that the tab bar scrolls horizontally when the header's
          logo + tabs + account links don't all fit on one line. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-paper to-transparent"
      />
    </div>
  );
}
