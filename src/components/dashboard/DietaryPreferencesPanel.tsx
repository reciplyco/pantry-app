"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DIETARY_PREFERENCE_OPTIONS } from "@/lib/types";

type Props = {
  initialPreferences: string[];
  initialNotes: string;
};

const LABELS: Record<(typeof DIETARY_PREFERENCE_OPTIONS)[number], string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  pescatarian: "Pescatarian",
  "gluten-free": "Gluten-free",
  "dairy-free": "Dairy-free",
  "nut-free": "Nut-free",
  "low-carb": "Low-carb",
  keto: "Keto",
};

export default function DietaryPreferencesPanel({
  initialPreferences,
  initialNotes,
}: Props) {
  const [preferences, setPreferences] = useState<string[]>(initialPreferences);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(option: string) {
    setPreferences((prev) =>
      prev.includes(option)
        ? prev.filter((p) => p !== option)
        : [...prev, option]
    );
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({
          dietary_preferences: preferences,
          dietary_notes: notes.trim() || null,
        })
        .eq("id", user.id);
    }
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="mt-8 paper-card rounded-sm p-6">
      <h2 className="font-serif text-xl font-medium">Dietary preferences</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Recipes generated for you will respect these.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {DIETARY_PREFERENCE_OPTIONS.map((option) => {
          const active = preferences.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                active
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line text-ink-muted hover:border-ink"
              }`}
            >
              {LABELS[option]}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <label htmlFor="dietary-notes" className="mb-1 block text-sm text-ink-muted">
          Allergies or other notes
        </label>
        <input
          id="dietary-notes"
          type="text"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          placeholder="e.g. allergic to shellfish, no cilantro"
          className="w-full max-w-md rounded-sm border border-line bg-card px-3 py-2 outline-none focus:border-accent"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-full border border-line px-5 py-2 text-sm font-medium transition hover:border-ink disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
        {saved && <p className="text-sm text-sage">Saved.</p>}
      </div>
    </div>
  );
}
