import { useState } from "react";
import { Switch, View } from "react-native";
import { colors } from "@/components/theme";
import { Button, ErrorState, Field, LoadingState, Sheet, SuccessNote, Txt } from "@/components/ui";
import { api } from "@/lib/api";
import type { Settings } from "@/lib/types";
import { useData } from "@/lib/use-data";

const OPTIONS: { key: keyof Settings; label: string }[] = [
  { key: "smsNotifications", label: "SMS Notification" },
  { key: "emailNotifications", label: "Email Notification" },
  { key: "allowChat", label: "All Members Can Chat With Me" },
];

function ChangePasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ currentPassword: "", password: "", passwordConfirmation: "" });
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");

  const close = () => {
    setForm({ currentPassword: "", password: "", passwordConfirmation: "" });
    setError(null);
    setStatus("idle");
    onClose();
  };

  const submit = async () => {
    if (!form.currentPassword) return setError("Enter your current password.");
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
    <Sheet title="Change password" open={open} onClose={close}>
      {status === "done" ? (
        <>
          <SuccessNote>Your password has been changed.</SuccessNote>
          <Button title="Done" onPress={close} />
        </>
      ) : (
        <>
          <Field label="Current password" secureTextEntry autoComplete="current-password" textContentType="password" value={form.currentPassword} onChangeText={(currentPassword) => setForm({ ...form, currentPassword })} />
          <Field label="New password" secureTextEntry autoComplete="new-password" textContentType="newPassword" value={form.password} onChangeText={(password) => setForm({ ...form, password })} />
          <Field label="Confirm new password" secureTextEntry autoComplete="new-password" textContentType="newPassword" value={form.passwordConfirmation} onChangeText={(passwordConfirmation) => setForm({ ...form, passwordConfirmation })} />
          {error && <ErrorState message={error} />}
          <Button title={status === "saving" ? "Saving…" : "Change password"} onPress={submit} disabled={status === "saving"} />
        </>
      )}
    </Sheet>
  );
}

export function SettingsSection() {
  const { data: settings, setData, error, loading, refresh } = useData(api.getSettings);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  if (loading) return <LoadingState />;
  if (error || !settings) return <ErrorState message={error ?? "Couldn't load your settings."} onRetry={refresh} />;

  // On a phone a switch is expected to take effect straight away, so each toggle saves on its own
  // and flips back if the save fails.
  const toggle = async (key: keyof Settings) => {
    const previous = settings;
    const next = { ...settings, [key]: !settings[key] };
    setData(next);
    setSaveError(null);
    try {
      setData(await api.updateSettings(next));
    } catch (err) {
      setData(previous);
      setSaveError((err as Error).message);
    }
  };

  return (
    <View style={{ gap: 6 }}>
      {OPTIONS.map(({ key, label }) => (
        <View key={key} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, gap: 12 }}>
          <Txt style={{ flex: 1 }}>{label}</Txt>
          <Switch
            value={settings[key]}
            onValueChange={() => toggle(key)}
            accessibilityLabel={label}
            trackColor={{ true: colors.brand, false: colors.line }}
            thumbColor={colors.white}
            ios_backgroundColor={colors.line}
          />
        </View>
      ))}
      {saveError && <ErrorState message={saveError} />}
      <Button title="Change Password" variant="outline" icon="lock" onPress={() => setPasswordOpen(true)} style={{ marginTop: 12 }} />
      <ChangePasswordSheet open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </View>
  );
}
