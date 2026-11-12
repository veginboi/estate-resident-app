import { useState } from "react";
import { View } from "react-native";
import { colors } from "@/components/theme";
import { Button, ErrorState, Field, Txt } from "@/components/ui";
import { api } from "@/lib/api";
import type { Profile } from "@/lib/types";

export function AboutSection({ profile, onSaved }: { profile: Profile; onSaved: (p: Profile) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: profile.name, phone: profile.phone, about: profile.about });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setForm({ name: profile.name, phone: profile.phone, about: profile.about });
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    if (!form.name.trim()) return setError("Your name can't be empty.");
    setSaving(true);
    try {
      onSaved(await api.updateProfile({ ...form, name: form.name.trim() }));
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <View style={{ gap: 14 }}>
        <Field label="Full name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} autoComplete="name" />
        <Field label="Phone number" value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} keyboardType="phone-pad" autoComplete="tel" />
        <View>
          <Field label="About" value={form.about} onChangeText={(about) => setForm({ ...form, about })} multiline maxLength={1000} />
          <Txt style={{ color: colors.muted, fontSize: 12, textAlign: "right", marginTop: 4 }}>{form.about.length}/1000</Txt>
        </View>
        {error && <ErrorState message={error} />}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} style={{ flex: 1 }} />
          <Button title={saving ? "Saving…" : "Save"} onPress={save} disabled={saving} style={{ flex: 1 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <Txt style={{ lineHeight: 23 }}>
        {profile.about || <Txt style={{ color: colors.muted }}>You haven&apos;t written anything about yourself yet.</Txt>}
      </Txt>
      <View style={{ flexDirection: "row", gap: 16 }}>
        <Txt style={{ color: colors.muted, fontSize: 14 }}>Phone</Txt>
        <Txt style={{ fontSize: 14 }}>{profile.phone || "—"}</Txt>
      </View>
      <Button title="Edit" onPress={startEditing} icon="edit-2" />
    </View>
  );
}
