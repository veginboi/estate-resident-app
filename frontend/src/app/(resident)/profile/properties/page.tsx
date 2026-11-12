"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, DataTable, EmptyState, ErrorState, Field, LoadingState, Modal, SelectField } from "@/components/ui";
import { api } from "@/lib/api";
import type { Property } from "@/lib/types";
import { useData } from "@/lib/use-data";

const TYPES = ["House", "Car", "Motorcycle", "Shop", "Other"];
type Form = Omit<Property, "id">;
const EMPTY: Form = { type: "House", name: "", number: "", colour: "", details: "" };

// Field labels change with the property type so the form makes sense for houses and vehicles.
const labelsFor = (type: string) =>
  ["Car", "Motorcycle"].includes(type)
    ? { name: "Make", number: "Plate number", details: "Model" }
    : { name: "Name / section", number: "Property number", details: "Details (e.g. 8 Bed Room)" };

export default function PropertiesPage() {
  const { data: properties, setData, error, loading } = useData(api.getProperties);
  const [editing, setEditing] = useState<Property | "new" | null>(null);
  const [deleting, setDeleting] = useState<Property | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openForm = (property: Property | "new") => {
    setForm(property === "new" ? EMPTY : { ...property });
    setFormError(null);
    setEditing(property);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.number.trim()) return setFormError("Name and number are required.");
    const payload = { ...form, name: form.name.trim(), number: form.number.trim().toUpperCase() };
    const duplicate = properties?.some((p) => p.number.toUpperCase() === payload.number && (editing === "new" || p.id !== editing?.id));
    if (duplicate) return setFormError(`You've already registered ${payload.number}.`);

    setBusy(true);
    try {
      if (editing === "new") {
        const created = await api.createProperty(payload);
        setData((list) => [...(list ?? []), created]);
      } else if (editing) {
        const updated = await api.updateProperty(editing.id, payload);
        setData((list) => list?.map((p) => (p.id === updated.id ? updated : p)) ?? null);
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
      await api.deleteProperty(deleting.id);
      setData((list) => list?.filter((p) => p.id !== deleting.id) ?? null);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error || !properties) return <ErrorState message={error ?? "Couldn't load your properties."} />;

  const labels = labelsFor(form.type);

  return (
    <div className="flex min-h-64 flex-col">
      {properties.length === 0 ? (
        <EmptyState>No properties registered yet. Add your house and vehicles so the estate can verify them.</EmptyState>
      ) : (
        <DataTable headers={["Type", "Name", "Properties Number", "Colour", "Others", ""]}>
          {properties.map((p) => (
            <tr key={p.id}>
              <td className="px-5 py-3">{p.type}</td>
              <td className="px-5 py-3">{p.name}</td>
              <td className="px-5 py-3">{p.number}</td>
              <td className="px-5 py-3">{p.colour || "—"}</td>
              <td className="px-5 py-3">{p.details || "—"}</td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <button onClick={() => openForm(p)} aria-label={`Edit ${p.name}`} className="rounded p-1.5 hover:bg-white hover:text-brand"><Pencil size={17} /></button>
                <button onClick={() => setDeleting(p)} aria-label={`Remove ${p.name}`} className="rounded p-1.5 hover:bg-white hover:text-danger"><Trash2 size={17} /></button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <Button onClick={() => openForm("new")} className="mt-8 self-end">Add Properties</Button>

      <Modal title={editing === "new" ? "Register a property" : "Edit property"} open={editing !== null} onClose={() => setEditing(null)}>
        <form onSubmit={save} className="space-y-4">
          <SelectField label="Type" options={TYPES} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          <Field label={labels.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Field label={labels.number} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Colour" value={form.colour} onChange={(e) => setForm({ ...form, colour: e.target.value })} />
            <Field label={labels.details} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
          </div>
          {formError && <ErrorState message={formError} />}
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Saving…" : editing === "new" ? "Register property" : "Save changes"}</Button>
        </form>
      </Modal>

      <Modal title="Remove property" open={deleting !== null} onClose={() => setDeleting(null)}>
        <p>Remove <strong>{deleting?.type} {deleting?.number}</strong> from your registered properties?</p>
        <div className="mt-6 flex gap-3">
          <Button variant="ghost" onClick={() => setDeleting(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={remove} disabled={busy} className="flex-1">{busy ? "Removing…" : "Remove"}</Button>
        </div>
      </Modal>
    </div>
  );
}
