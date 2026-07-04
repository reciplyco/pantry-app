"use client";

import { useState } from "react";
import type { PantryItem } from "@/lib/types";
import PantryTab from "./PantryTab";
import GenerateTab from "./GenerateTab";

type Tab = "pantry" | "generate";

type Props = {
  pantryItems: PantryItem[];
  onAdd: (name: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onGenerate: (
    selectedNames: string[],
    customInstructions: string
  ) => Promise<void>;
  generating: boolean;
  generateError: string | null;
  isPro: boolean;
  remaining: number;
  freeTierWeeklyLimit: number;
};

export default function PantryPanel({
  pantryItems,
  onAdd,
  onRemove,
  onGenerate,
  generating,
  generateError,
  isPro,
  remaining,
  freeTierWeeklyLimit,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("pantry");
  const [deselectedIds, setDeselectedIds] = useState<Set<string>>(new Set());
  const [customInstructions, setCustomInstructions] = useState("");

  function isSelected(id: string) {
    return !deselectedIds.has(id);
  }

  function toggleSelected(id: string) {
    setDeselectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const allSelected = pantryItems.every((item) => isSelected(item.id));

  function toggleSelectAll() {
    setDeselectedIds(
      allSelected ? new Set(pantryItems.map((item) => item.id)) : new Set()
    );
  }

  const selectedNames = pantryItems
    .filter((item) => isSelected(item.id))
    .map((item) => item.name);

  async function handleGenerate() {
    await onGenerate(selectedNames, customInstructions);
  }

  return (
    <section className="paper-card overflow-hidden rounded-sm">
      <div className="flex">
        <button
          type="button"
          onClick={() => setActiveTab("pantry")}
          className={`flex-1 border-b-[3px] px-6 py-5 text-left font-serif text-xl font-medium transition ${
            activeTab === "pantry"
              ? "border-accent bg-card text-ink"
              : "border-line bg-paper-alt text-ink-muted hover:text-ink"
          }`}
        >
          Pantry
          {pantryItems.length > 0 && (
            <span className="ml-2 font-mono text-sm text-ink-muted">
              {pantryItems.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("generate")}
          className={`flex-1 border-b-[3px] px-6 py-5 text-left font-serif text-xl font-medium transition ${
            activeTab === "generate"
              ? "border-accent bg-card text-ink"
              : "border-line bg-paper-alt text-ink-muted hover:text-ink"
          }`}
        >
          Generate
          {selectedNames.length > 0 && (
            <span className="ml-2 font-mono text-sm text-ink-muted">
              {selectedNames.length} selected
            </span>
          )}
        </button>
      </div>

      <div className="p-6">
        {activeTab === "pantry" ? (
          <PantryTab
            pantryItems={pantryItems}
            onAdd={onAdd}
            onRemove={onRemove}
            isSelected={isSelected}
            onToggleSelected={toggleSelected}
            allSelected={allSelected}
            onToggleSelectAll={toggleSelectAll}
          />
        ) : (
          <GenerateTab
            selectedNames={selectedNames}
            totalCount={pantryItems.length}
            customInstructions={customInstructions}
            onCustomInstructionsChange={setCustomInstructions}
            onGenerate={handleGenerate}
            generating={generating}
            generateError={generateError}
            isPro={isPro}
            remaining={remaining}
            freeTierWeeklyLimit={freeTierWeeklyLimit}
          />
        )}
      </div>
    </section>
  );
}
