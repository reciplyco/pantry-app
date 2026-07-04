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
  const tabs: { id: DashboardTab; label: string; count: number }[] = [
    { id: "pantry", label: "Pantry", count: pantryCount },
    { id: "generate", label: "Generate", count: selectedCount },
    { id: "recipes", label: "Recipes", count: recipeCount },
    { id: "shopping", label: "Shopping List", count: shoppingCount },
    { id: "schedule", label: "Schedule", count: scheduleCount },
  ];

  return (
    <nav className="flex overflow-x-auto rounded-sm border border-line shadow-sm">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-current={activeTab === tab.id}
          className={`flex-1 whitespace-nowrap border-b-[3px] px-5 py-5 text-left font-serif text-lg font-medium transition sm:text-xl ${
            activeTab === tab.id
              ? "border-accent bg-card text-ink"
              : "border-line bg-paper-alt text-ink-muted hover:text-ink"
          }`}
        >
          {tab.label}
          {tab.count > 0 && (
            <span className="ml-2 font-mono text-sm text-ink-muted">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
