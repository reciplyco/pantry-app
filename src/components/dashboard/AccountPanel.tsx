"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AccountPanel() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }

    setPasswordSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setPasswordSaving(false);

    if (error) {
      setPasswordError(error.message);
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setPasswordSuccess(true);
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setDeleteError(body.error ?? "Couldn't delete your account.");
        setDeleting(false);
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setDeleteError("Couldn't delete your account. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="paper-card rounded-sm p-6">
        <h2 className="font-serif text-xl font-medium">Change password</h2>
        <form onSubmit={handlePasswordSubmit} className="mt-4 max-w-sm space-y-3">
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm text-ink-muted">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sm border border-line bg-card px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-sm text-ink-muted">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-sm border border-line bg-card px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          {passwordError && <p className="text-sm text-accent">{passwordError}</p>}
          {passwordSuccess && (
            <p className="text-sm text-sage">Password updated.</p>
          )}
          <button
            type="submit"
            disabled={passwordSaving}
            className="rounded-full border border-line px-5 py-2 text-sm font-medium transition hover:border-ink disabled:opacity-50"
          >
            {passwordSaving ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>

      <div className="paper-card rounded-sm p-6">
        <h2 className="font-serif text-xl font-medium">Your data</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Download everything Reciply has stored for you — pantry, recipes,
          shopping list, and meal plan — as a JSON file.
        </p>
        <a
          href="/api/account/export"
          className="mt-4 inline-block rounded-full border border-line px-5 py-2 text-sm font-medium transition hover:border-ink"
        >
          Export my data
        </a>
      </div>

      <div className="paper-card rounded-sm border-accent/40 p-6">
        <h2 className="font-serif text-xl font-medium text-accent">
          Delete account
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          This permanently deletes your account and all of your data —
          pantry, recipes, shopping list, meal plan, and billing history.
          This can&rsquo;t be undone.
        </p>

        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mt-4 rounded-full border border-accent px-5 py-2 text-sm font-medium text-accent transition hover:bg-accent hover:text-accent-ink"
          >
            Delete my account
          </button>
        ) : (
          <div className="mt-4 max-w-sm space-y-3">
            <label htmlFor="delete-confirm" className="block text-sm text-ink-muted">
              Type <span className="font-mono font-bold">DELETE</span> to confirm.
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              className="w-full rounded-sm border border-line bg-card px-3 py-2 outline-none focus:border-accent"
            />
            {deleteError && <p className="text-sm text-accent">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={deleteInput !== "DELETE" || deleting}
                onClick={handleDelete}
                className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Permanently delete"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingDelete(false);
                  setDeleteInput("");
                  setDeleteError(null);
                }}
                className="rounded-full border border-line px-5 py-2 text-sm font-medium transition hover:border-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
