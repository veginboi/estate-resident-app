import { useState } from "react";
import { View } from "react-native";
import { Button, ChoiceField, EmptyState, ErrorState, Field, LoadingState, Sheet, Txt } from "@/components/ui";
import { api } from "@/lib/api";
import type { FamilyMember, Gender } from "@/lib/types";
import { useData } from "@/lib/use-data";
import { ListRow } from "./ListRow";

const ROLES = ["Husband", "Wife", "Child", "Parent", "Sibling", "Relative", "Domestic Staff"] as const;
const GENDERS = ["Male", "Female"] as const;
type Form = { name: string; role: string; age: string; gender: Gender };
const EMPTY: Form = { name: "", role: "Child", age: "", gender: "Male" };

export function FamilySection() {
  const { data: members, setData, error, loading, refresh } = useData(api.getFamilyMembers);
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

  const save = async () => {
    const age = Number(form.age);
    if (!form.name.trim()) return setFormError("Enter the member's name.");
    if (form.age.trim() === "" || !Number.isInteger(age) || age < 0 || age > 120) return setFormError("Enter an age between 0 and 120.");
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
  if (error || !members) return <ErrorState message={error ?? "Couldn't load family members."} onRetry={refresh} />;

  return (
    <View style={{ gap: 4 }}>
      {members.length === 0 ? (
        <EmptyState>No family members yet. Add the people who live with you so security can recognise them at the gate.</EmptyState>
      ) : (
        members.map((m, i) => (
          <ListRow
            key={m.id}
            title={m.name}
            details={`${m.role} · ${m.age} yrs · ${m.gender}`}
            shaded={i % 2 === 1}
            onEdit={() => openForm(m)}
            onRemove={() => setDeleting(m)}
          />
        ))
      )}

      <Button title="Add a Member" icon="user-plus" onPress={() => openForm("new")} style={{ marginTop: 16 }} />

      <Sheet title={editing === "new" ? "Add a family member" : "Edit family member"} open={editing !== null} onClose={() => setEditing(null)}>
        <Field label="Full name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} autoComplete="name" />
        <ChoiceField label="Role in family" options={ROLES as readonly string[]} value={form.role} onChange={(role) => setForm({ ...form, role })} />
        <Field label="Age" value={form.age} onChangeText={(age) => setForm({ ...form, age: age.replace(/\D/g, "") })} keyboardType="number-pad" maxLength={3} />
        <ChoiceField label="Gender" options={GENDERS} value={form.gender} onChange={(gender) => setForm({ ...form, gender })} />
        {formError && <ErrorState message={formError} />}
        <Button title={busy ? "Saving…" : editing === "new" ? "Add member" : "Save changes"} onPress={save} disabled={busy} />
      </Sheet>

      <Sheet title="Remove family member" open={deleting !== null} onClose={() => setDeleting(null)}>
        <Txt>
          Remove <Txt weight="semibold">{deleting?.name}</Txt> from your household? They won&apos;t be recognised at the gate any more.
        </Txt>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Button title="Cancel" variant="ghost" onPress={() => setDeleting(null)} style={{ flex: 1 }} />
          <Button title={busy ? "Removing…" : "Remove"} variant="danger" onPress={remove} disabled={busy} style={{ flex: 1 }} />
        </View>
      </Sheet>
    </View>
  );
}
