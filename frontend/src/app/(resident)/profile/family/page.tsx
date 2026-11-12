"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, DataTable, EmptyState, ErrorState, Field, LoadingState, Modal, SelectField } from "@/components/ui";
import { api } from "@/lib/api";
import type { FamilyMember, Gender } from "@/lib/types";
import { useData } from "@/lib/use-data";

const ROLES = ["Husband", "Wife", "Child", "Parent", "Sibling", "Relative", "Domestic Staff"];
type Form = { name: string; role: string; age: string; gender: Gender };
const EMPTY: Form = { name: "", role: "Child", age: "", gender: "Male" };

export default function FamilyMembersPage() {
  const { data: members, setData, error, loading } = useData(api.getFamilyMembers);
  const [editing, setEditing] = useState<FamilyMember | "new" | null>(null);
  const [deleting, setDeleting] = useState<FamilyMember | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openForm = (member: FamilyMember | "new") => {
    setForm(member === "new" ? EMPTY : { ...member, age: String(member.age) });
    setFormError(null);
    setEditing(member);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const age = Number(form.age);
    if (!form.name.trim()) return setFormError("Enter the member's name.");
    if (!Number.isInteger(age) || age < 0 || age > 120) return setFormError("Enter an age between 0 and 120.");
    const payload = { name: form.name.trim(), role: form.role, age, gender: form.gender };

    setBusy(true);
    try {
      if (editing === "new") {
        const created = await api.createFamilyMember(payload);
        setData((list) => [...(list ?? []), created]);
      } else if (editing) {
        const updated = await api.updateFamilyMember(editing.id, payload);
        setData((list) => list?.map((m) => (m.id === updated.id ? updated : m)) ?? null);
      }
      setEditing(null);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteFamilyMember(deleting.id);
      setData((list) => list?.filter((m) => m.id !== deleting.id) ?? null);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error || !members) return <ErrorState message={error ?? "Couldn't load family members."} />;

  return (
    <div className="flex min-h-64 flex-col">
      {members.length === 0 ? (
        <EmptyState>No family members yet. Add the people who live with you so security can recognise them at the gate.</EmptyState>
      ) : (
        <DataTable headers={["Name", "Role In Family", "Age", "Gender", ""]}>
          {members.map((m) => (
            <tr key={m.id}>
              <td className="px-5 py-3">{m.name}</td>
              <td className="px-5 py-3">{m.role}</td>
              <td className="px-5 py-3">{m.age}</td>
              <td className="px-5 py-3">{m.gender}</td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <button onClick={() => openForm(m)} aria-label={`Edit ${m.name}`} className="rounded p-1.5 hover:bg-white hover:text-brand"><Pencil size={17} /></button>
                <button onClick={() => setDeleting(m)} aria-label={`Remove ${m.name}`} className="rounded p-1.5 hover:bg-white hover:text-danger"><Trash2 size={17} /></button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <Button onClick={() => openForm("new")} className="mt-8 self-end">Add a Member</Button>

      <Modal title={editing === "new" ? "Add a family member" : "Edit family member"} open={editing !== null} onClose={() => setEditing(null)}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          <SelectField label="Role in family" options={ROLES} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Age" type="number" min={0} max={120} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required />
            <SelectField label="Gender" options={["Male", "Female"]} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })} />
          </div>
          {formError && <ErrorState message={formError} />}
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Saving…" : editing === "new" ? "Add member" : "Save changes"}</Button>
        </form>
      </Modal>

      <Modal title="Remove family member" open={deleting !== null} onClose={() => setDeleting(null)}>
        <p>Remove <strong>{deleting?.name}</strong> from your household? They won&apos;t be recognised at the gate any more.</p>
        <div className="mt-6 flex gap-3">
          <Button variant="ghost" onClick={() => setDeleting(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={remove} disabled={busy} className="flex-1">{busy ? "Removing…" : "Remove"}</Button>
        </div>
      </Modal>
    </div>
  );
}
