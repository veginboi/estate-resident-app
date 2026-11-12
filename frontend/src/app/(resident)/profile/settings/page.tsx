"use client";

import { useState } from "react";
import { Button, ErrorState, Field, LoadingState, Modal, cx } from "@/components/ui";
import { api } from "@/lib/api";
import type { Settings } from "@/lib/types";
import { useData } from "@/lib/use-data";

const OPTIONS: { key: keyof Settings; label: string }[] = [
  { key: "smsNotifications", label: "SMS Notification" },
  { key: "emailNotifications", label: "Email Notification" },
  { key: "allowChat", label: "All Members Can Chat With Me" },
];

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ currentPassword: "", password: "", passwordConfirmation: "" });
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");

  const close = () => {
    setForm({ currentPassword: "", password: "", passwordConfirmation: "" });
    setError(null);
    setStatus("idle");
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) return setError("Your new password must be at least 8 characters.");
    if (form.password !== form.passwordConfirmation) return setError("The new passwords don't match.");
    setError(null);
    setStatus("saving");
    try {
      await api.changePassword(form);
      setStatus("done");
    } catch (err) {
      setError((err as Error).message);
      setStatus("idle");
    }
  };

  return (
    <Modal title="Change password" open={open} onClose={close}>
      {status === "done" ? (
        <div className="space-y-4">
          <p className="rounded bg-brand-soft px-4 py-3 font-medium text-brand-dark">Your password has been changed.</p>
          <Button onClick={close} className="w-full">Done</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Current password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
          <Field label="New password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Field label="Confirm new password" type="password" autoComplete="new-password" value={form.passwordConfirmation} onChange={(e) => setForm({ ...form, passwordConfirmation: e.target.value })} required />
          {error && <ErrorState message={error} />}
          <Button type="submit" disabled={status === "saving"} className="w-full">{status === "saving" ? "Saving…" : "Change password"}</Button>
        </form>
      )}
    </Modal>
  );
}

export default function SettingsPage() {
  const { data: saved, setData: setSaved, error, loading } = useData(api.getSettings);
  const [draft, setDraft] = useState<Settings | null>(null); // non-null while editing
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  if (loading) return <LoadingState />;
  if (error || !saved) return <ErrorState message={error ?? "Couldn't load your settings."} />;

  const current = draft ?? saved;

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setSaveError(null);
    try {
      setSaved(await api.updateSettings(draft));
      setDraft(null);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-64 flex-col">
      <fieldset disabled={!draft} className="space-y-5 py-2">
        <legend className="sr-only">Notification and privacy settings</legend>
        {OPTIONS.map(({ key, label }) => (
          <label key={key} className={cx("flex items-center gap-6", draft ? "cursor-pointer" : "cursor-default")}>
            <input
              type="checkbox"
              role="switch"
              className="peer sr-only"
              checked={current[key]}
              onChange={() => draft && setDraft({ ...draft, [key]: !draft[key] })}
            />
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-brand peer-focus-visible:ring-4 peer-focus-visible:ring-brand-soft">
              <span className={cx("size-7 rounded-full transition-colors", current[key] ? "bg-brand" : "bg-transparent")} />
            </span>
            <span className="sm:text-lg">{label}</span>
          </label>
        ))}
      </fieldset>

      {saveError && <div className="mt-4"><ErrorState message={saveError} /></div>}

      <div className="mt-auto flex flex-wrap justify-between gap-3 pt-8">
        <Button onClick={() => setPasswordOpen(true)}>Change Password</Button>
        {draft ? (
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="min-w-36">{saving ? "Saving…" : "Save"}</Button>
          </div>
        ) : (
          <Button onClick={() => setDraft({ ...saved })} className="min-w-36">Edit</Button>
        )}
      </div>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}
