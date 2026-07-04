"use client";

import { useState } from "react";
import type { ShoppingListItem } from "@/lib/types";

type Props = {
  items: ShoppingListItem[];
  onAdd: (name: string, quantity: string) => Promise<void>;
  onToggle: (id: string, checked: boolean) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onClearChecked: () => Promise<void>;
};

export default function ShoppingList({
  items,
  onAdd,
  onToggle,
  onRemove,
  onClearChecked,
}: Props) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name;
    const q = quantity;
    setName("");
    setQuantity("");
    await onAdd(n, q);
  }

  const hasChecked = items.some((i) => i.checked);

  return (
    <section>
      <h2 className="font-serif text-2xl font-medium">Shopping list</h2>
      <div className="receipt mt-4 rounded-sm p-6 pb-8 font-mono text-sm">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-ink-muted">
          Reciply
        </p>
        <p className="mb-4 text-center text-xs text-ink-muted">
          {items.length} item{items.length === 1 ? "" : "s"}
        </p>

        {items.length === 0 ? (
          <p className="py-6 text-center text-ink-muted">List is empty.</p>
        ) : (
          <ul>
            {items.map((item) => (
              <li
                key={item.id}
                className="anim-fade-in-up flex h-7 items-center justify-between gap-2"
              >
                <label className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => onToggle(item.id, e.target.checked)}
                    className="accent-accent transition-transform active:scale-90"
                  />
                  <span
                    className={`truncate transition-colors duration-300 ${
                      item.checked ? "text-ink-muted line-through" : "text-ink"
                    }`}
                  >
                    {item.name}
                    {item.quantity ? ` — ${item.quantity}` : ""}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${item.name}`}
                  className="text-ink-muted transition hover:text-accent active:scale-90"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="my-4 border-t border-dashed border-line" />

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="item"
            className="min-w-0 flex-1 border-b border-line bg-transparent px-1 py-1 outline-none focus:border-accent"
          />
          <input
            type="text"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="qty"
            className="w-16 border-b border-line bg-transparent px-1 py-1 outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-full border border-line px-3 py-1 text-xs transition hover:border-ink active:scale-95"
          >
            Add
          </button>
        </form>

        {hasChecked && (
          <button
            type="button"
            onClick={onClearChecked}
            className="anim-fade-in mt-4 w-full text-center text-xs text-ink-muted underline underline-offset-2 transition active:scale-95"
          >
            Clear checked items
          </button>
        )}
      </div>
      <div className="receipt-notch" />
    </section>
  );
}
