import { Link } from "expo-router";
import { useRef, useState, type ComponentRef } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/Logo";
import { colors, shadow } from "@/components/theme";
import { Button, ErrorState, Field, Txt } from "@/components/ui";
import { isMockMode } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function LoginScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const submit = async () => {
    if (!isMockMode && (!email.trim() || !password)) return setError("Enter your email and password.");
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password); // the root layout switches to the app once signed in
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
              Sign in to your estate account
            </Txt>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Field
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            {error && <ErrorState message={error} />}
            <Button title={busy ? "Signing in…" : "Sign in"} onPress={submit} disabled={busy} />
            <Txt style={{ textAlign: "center", color: colors.muted, fontSize: 14 }}>
              New to the estate?{" "}
              <Link href="/signup" replace>
                <Txt weight="semibold" style={{ color: colors.brand, fontSize: 14 }}>Create an account</Txt>
              </Link>
            </Txt>
            {isMockMode && (
              <Txt style={{ textAlign: "center", color: colors.muted, fontSize: 12 }}>Demo mode: any email and password will work.</Txt>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
