"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/AppShell";
import { Button, ErrorState, Field } from "@/components/ui";
import { api, isMockMode } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(email.trim(), password);
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
        <h1 className="mb-6 text-center text-xl font-semibold">Sign in to your estate account</h1>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <ErrorState message={error} />}
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          New to the estate?{" "}
          <Link href="/signup" className="font-medium text-brand hover:underline">Create an account</Link>
        </p>
        {isMockMode && (
          <p className="mt-3 text-center text-xs text-muted">Demo mode: any email and password will work.</p>
        )}
      </div>
    </main>
  );
}
