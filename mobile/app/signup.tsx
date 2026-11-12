import { Link } from "expo-router";
import { useRef, useState, type ComponentRef } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/Logo";
import { colors, shadow } from "@/components/theme";
import { Button, ErrorState, Field, Txt } from "@/components/ui";
import { isMockMode } from "@/lib/api";
import { useSession } from "@/lib/session";

type Input = ComponentRef<typeof TextInput>;

export default function SignupScreen() {
  const { signUp } = useSession();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", passwordConfirmation: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<Input>(null);
  const phoneRef = useRef<Input>(null);
  const passwordRef = useRef<Input>(null);
  const confirmRef = useRef<Input>(null);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) return setError("Enter your name, email and a password.");
    if (form.password.length < 8) return setError("The password must be at least 8 characters.");
    if (form.password !== form.passwordConfirmation) return setError("The passwords don't match.");
    setBusy(true);
    setError(null);
    try {
      // The root layout switches to the app once signed in.
      await signUp({ ...form, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.brandTint }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20 }} keyboardShouldPersistTaps="handled">
          <View style={{ backgroundColor: colors.white, borderRadius: 12, padding: 24, gap: 16, ...shadow }}>
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <Logo />
            </View>
            <Txt weight="semibold" style={{ fontSize: 19, textAlign: "center", marginBottom: 4 }} accessibilityRole="header">
              Create your estate account
            </Txt>
            <Field
              label="Full name"
              value={form.name}
              onChangeText={set("name")}
              autoComplete="name"
              textContentType="name"
              maxLength={255}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
            <Field
              ref={emailRef}
              label="Email"
              value={form.email}
              onChangeText={set("email")}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              maxLength={255}
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
            />
            <Field
              ref={phoneRef}
              label="Phone number (optional)"
              value={form.phone}
              onChangeText={set("phone")}
              autoComplete="tel"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              maxLength={30}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Field
              ref={passwordRef}
              label="Password (at least 8 characters)"
              value={form.password}
              onChangeText={set("password")}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <Field
              ref={confirmRef}
              label="Confirm password"
              value={form.passwordConfirmation}
              onChangeText={set("passwordConfirmation")}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            {error && <ErrorState message={error} />}
            <Button title={busy ? "Creating account…" : "Create account"} onPress={submit} disabled={busy} />
            <Txt style={{ textAlign: "center", color: colors.muted, fontSize: 14 }}>
              Already have an account?{" "}
              <Link href="/login" replace>
                <Txt weight="semibold" style={{ color: colors.brand, fontSize: 14 }}>Sign in</Txt>
              </Link>
            </Txt>
            {isMockMode && (
              <Txt style={{ textAlign: "center", color: colors.muted, fontSize: 12 }}>Demo mode: the account isn&apos;t saved.</Txt>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
