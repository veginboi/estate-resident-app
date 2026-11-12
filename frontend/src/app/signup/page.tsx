"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/AppShell";
import { Button, ErrorState, Field } from "@/components/ui";
import { api, isMockMode } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", passwordConfirmation: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.passwordConfirmation) return setError("The passwords don't match.");
    setBusy(true);
    setError(null);
    try {
      await api.register({ ...form, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() });
      router.replace("/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-tint px-4 py-10">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-[0_4px_24px_rgba(18,161,74,0.15)]">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <h1 className="mb-6 text-center text-xl font-semibold">Create your estate account</h1>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Full name" autoComplete="name" value={form.name} onChange={set("name")} required maxLength={255} autoFocus />
          <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} required maxLength={255} />
          <Field label="Phone number (optional)" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} maxLength={30} />
          <Field label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} required minLength={8} />
          <Field label="Confirm password" type="password" autoComplete="new-password" value={form.passwordConfirmation} onChange={set("passwordConfirmation")} required minLength={8} />
          {error && <ErrorState message={error} />}
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Creating account…" : "Create account"}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">Sign in</Link>
        </p>
        {isMockMode && (
          <p className="mt-3 text-center text-xs text-muted">Demo mode: the account isn&apos;t saved.</p>
        )}
      </div>
    </main>
  );
}
