"use client";

import { useState } from "react";
import type { PantryItem } from "@/lib/types";
import { getIngredientIcon } from "@/lib/ingredient-icons";

type Props = {
  pantryItems: PantryItem[];
  onAdd: (name: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  isSelected: (id: string) => boolean;
  onToggleSelected: (id: string) => void;
  allSelected: boolean;
  onToggleSelectAll: () => void;
};

export default function PantryTab({
  pantryItems,
  onAdd,
  onRemove,
  isSelected,
  onToggleSelected,
  allSelected,
  onToggleSelectAll,
}: Props) {
  const [input, setInput] = useState("");
  const [validating, setValidating] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim();
    if (!value) return;

    setAddError(null);
    setValidating(true);
    try {
      const res = await fetch("/api/pantry/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
      const body = await res.json();
      if (res.ok && body.valid === false) {
        setAddError(
          body.reason
            ? `"${value}" — ${body.reason}`
            : `"${value}" doesn't look like a real ingredient.`
        );
        return;
      }
    } catch {
      // Fail open — a network hiccup on the validation check shouldn't
      // block adding a pantry item.
    } finally {
      setValidating(false);
    }

    setInput("");
    await onAdd(value);
  }

  return (
    <div>
      <p className="text-sm text-ink-muted">
        List what you&rsquo;ve got. Check off which items to use for your
        next generation over on the Generate tab.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setAddError(null);
          }}
          placeholder="e.g. chickpeas, spinach, garlic"
          className="flex-1 rounded-sm border border-line bg-card px-4 py-3 text-base outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={validating}
          className="rounded-full border border-line px-6 py-3 text-base font-medium transition hover:border-ink active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
        >
          {validating ? "Checking…" : "Add"}
        </button>
      </form>
      {addError && <p className="mt-2 text-sm text-accent">{addError}</p>}

      {pantryItems.length > 0 ? (
        <>
          <div className="mt-6 flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
              {pantryItems.filter((i) => isSelected(i.id)).length} of{" "}
              {pantryItems.length} selected
            </p>
            <button
              type="button"
              onClick={onToggleSelectAll}
              className="rounded-full border border-line px-4 py-1.5 text-sm font-medium transition hover:border-ink active:scale-95"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          </div>

          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pantryItems.map((item) => {
              const selected = isSelected(item.id);
              return (
                <li
                  key={item.id}
                  className={`anim-fade-in-up flex items-center gap-2 rounded-sm border px-3 py-3 transition-all duration-200 ${
                    selected
                      ? "border-line bg-paper-alt opacity-100"
                      : "border-line/50 bg-transparent opacity-45"
                  }`}
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleSelected(item.id)}
                      className="h-4 w-4 shrink-0 accent-accent"
                    />
                    <span className="text-xl leading-none" aria-hidden="true">
                      {getIngredientIcon(item.name)}
                    </span>
                    <span
                      className={`truncate text-sm ${selected ? "text-ink" : "text-ink-muted"}`}
                    >
                      {item.name}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg text-ink-muted transition hover:bg-line/40 hover:text-accent active:scale-90"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="mt-4 text-sm text-ink-muted">
          Nothing in your pantry yet — add a few ingredients to get started.
        </p>
      )}
    </div>
  );
}
