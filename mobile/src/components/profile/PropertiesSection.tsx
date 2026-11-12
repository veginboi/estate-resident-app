import { useState } from "react";
import { View } from "react-native";
import { Button, ChoiceField, EmptyState, ErrorState, Field, LoadingState, Sheet, Txt } from "@/components/ui";
import { api } from "@/lib/api";
import type { Property } from "@/lib/types";
import { useData } from "@/lib/use-data";
import { ListRow } from "./ListRow";

const TYPES = ["House", "Car", "Motorcycle", "Shop", "Other"] as const;
type Form = Omit<Property, "id">;
const EMPTY: Form = { type: "House", name: "", number: "", colour: "", details: "" };

// Field labels change with the property type so the form makes sense for houses and vehicles.
const labelsFor = (type: string) =>
  ["Car", "Motorcycle"].includes(type)
    ? { name: "Make", number: "Plate number", details: "Model" }
    : { name: "Name / section", number: "Property number", details: "Details (e.g. 8 Bed Room)" };

export function PropertiesSection() {
  const { data: properties, setData, error, loading, refresh } = useData(api.getProperties);
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

  const save = async () => {
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
  if (error || !properties) return <ErrorState message={error ?? "Couldn't load your properties."} onRetry={refresh} />;

  const labels = labelsFor(form.type);
  const typeValue = (TYPES as readonly string[]).includes(form.type) ? form.type : "Other";

  return (
    <View style={{ gap: 4 }}>
      {properties.length === 0 ? (
        <EmptyState>No properties registered yet. Add your house and vehicles so the estate can verify them.</EmptyState>
      ) : (
        properties.map((p, i) => (
          <ListRow
            key={p.id}
            title={`${p.type}: ${p.name}`}
            details={[p.number, p.colour, p.details].filter(Boolean).join(" · ")}
            shaded={i % 2 === 1}
            onEdit={() => openForm(p)}
            onRemove={() => setDeleting(p)}
          />
        ))
      )}

      <Button title="Add Properties" icon="plus" onPress={() => openForm("new")} style={{ marginTop: 16 }} />

      <Sheet title={editing === "new" ? "Register a property" : "Edit property"} open={editing !== null} onClose={() => setEditing(null)}>
        <ChoiceField label="Type" options={TYPES as readonly string[]} value={typeValue} onChange={(type) => setForm({ ...form, type })} />
        <Field label={labels.name} value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
        <Field label={labels.number} value={form.number} onChangeText={(number) => setForm({ ...form, number })} autoCapitalize="characters" />
        <Field label="Colour" value={form.colour} onChangeText={(colour) => setForm({ ...form, colour })} />
        <Field label={labels.details} value={form.details} onChangeText={(details) => setForm({ ...form, details })} />
        {formError && <ErrorState message={formError} />}
        <Button title={busy ? "Saving…" : editing === "new" ? "Register property" : "Save changes"} onPress={save} disabled={busy} />
      </Sheet>

      <Sheet title="Remove property" open={deleting !== null} onClose={() => setDeleting(null)}>
        <Txt>
          Remove{" "}
          <Txt weight="semibold">
            {deleting?.type} {deleting?.number}
          </Txt>{" "}
          from your registered properties?
        </Txt>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Button title="Cancel" variant="ghost" onPress={() => setDeleting(null)} style={{ flex: 1 }} />
          <Button title={busy ? "Removing…" : "Remove"} variant="danger" onPress={remove} disabled={busy} style={{ flex: 1 }} />
        </View>
      </Sheet>
    </View>
  );
}
