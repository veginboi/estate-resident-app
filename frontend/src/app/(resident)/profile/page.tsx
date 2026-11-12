"use client";

import { useState } from "react";
import { Button, ErrorState, Field } from "@/components/ui";
import { api } from "@/lib/api";
import { useProfile } from "./profile-context";

export default function AboutPage() {
  const { profile, setProfile } = useProfile();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: profile.name, phone: profile.phone, about: profile.about });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setForm({ name: profile.name, phone: profile.phone, about: profile.about });
    setError(null);
    setEditing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Your name can't be empty.");
    setSaving(true);
    try {
      setProfile(await api.updateProfile({ ...form, name: form.name.trim() }));
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <form onSubmit={save} className="max-w-2xl space-y-4">
        <Field label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Field label="Phone number" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <div className="space-y-1">
          <label htmlFor="about" className="block text-sm font-medium">About</label>
          <textarea
            id="about"
            rows={5}
            maxLength={1000}
            value={form.about}
            onChange={(e) => setForm({ ...form, about: e.target.value })}
            className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
          />
          <p className="text-right text-xs text-muted">{form.about.length}/1000</p>
        </div>
        {error && <ErrorState message={error} />}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          <Button type="submit" disabled={saving} className="min-w-36">{saving ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex min-h-64 flex-col">
      <p className="max-w-3xl whitespace-pre-line leading-relaxed sm:text-lg">
        {profile.about || <span className="text-muted">You haven&apos;t written anything about yourself yet.</span>}
      </p>
      <dl className="mt-6 grid max-w-xl grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
        <dt className="text-muted">Phone</dt>
        <dd>{profile.phone || "—"}</dd>
      </dl>
      <Button onClick={startEditing} className="mt-auto min-w-36 self-end">Edit</Button>
    </div>
  );
}
