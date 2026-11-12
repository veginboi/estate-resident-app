"use client";

import { Copy, Landmark } from "lucide-react";
import { useEffect, useState } from "react";
import type { BankDetails, ReceiptUpload } from "@/lib/types";
import { Button, Card, ErrorState, Field, Modal } from "./ui";

// Shared by the Finance and Store pages: money and date formatting, the estate bank
// account card and the bank transfer receipt form.

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const naira = (n: number) => `NGN ${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

export const formatDate = (value: string) =>
  new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function BankCard({ bank }: { bank: BankDetails | null }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!bank) return;
    try {
      await navigator.clipboard.writeText(bank.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked; the number is still on screen */
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-brand">
        <Landmark size={20} aria-hidden /> How to pay
      </h2>
      {bank ? (
        <>
          <p className="mb-4 text-sm text-muted">
            Pay by bank transfer to the estate account below, then upload your transfer receipt here. The estate confirms it within a few working days.
          </p>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">Bank</dt>
              <dd className="font-medium">{bank.bankName}</dd>
            </div>
            <div>
              <dt className="text-muted">Account name</dt>
              <dd className="font-medium">{bank.accountName}</dd>
            </div>
            <div>
              <dt className="text-muted">Account number</dt>
              <dd className="flex items-center gap-2 font-medium">
                <span className="font-mono text-base tracking-wide">{bank.accountNumber}</span>
                <button onClick={copy} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-brand hover:bg-brand-tint" aria-label="Copy account number">
                  <Copy size={14} aria-hidden /> {copied ? "Copied" : "Copy"}
                </button>
              </dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="text-sm text-muted">The estate hasn&apos;t added its bank details yet. Please contact the estate office to pay.</p>
      )}
    </Card>
  );
}

/** What a receipt is being uploaded for: a bill or a store order. */
export type ReceiptTarget = { key: string; title: string; amount: number };

/**
 * The form for sending a bank transfer receipt. `onSubmit` uploads it; if it throws, the
 * error is shown in the form.
 */
export function ReceiptUploadModal({
  target,
  onClose,
  onSubmit,
}: {
  target: ReceiptTarget | null;
  onClose: () => void;
  onSubmit: (data: ReceiptUpload) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(todayIso());
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset the form whenever it opens for a different bill or order.
  const targetKey = target?.key;
  const targetAmount = target?.amount;
  useEffect(() => {
    if (!targetKey) return;
    setAmount(String(targetAmount));
    setPaidOn(todayIso());
    setReference("");
    setFile(null);
    setError(null);
    setBusy(false);
  }, [targetKey, targetAmount]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    const value = Number(amount);
    if (!file) return setError("Choose the receipt file from your bank app or a photo of it.");
    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) return setError("The receipt must be a photo (JPG or PNG) or a PDF.");
    if (file.size > MAX_FILE_BYTES) return setError("The receipt must be smaller than 5 MB.");
    if (!Number.isFinite(value) || value < 1) return setError("Enter the amount you transferred.");
    if (!paidOn || paidOn > todayIso()) return setError("Enter the date you made the transfer.");

    setBusy(true);
    setError(null);
    try {
      await onSubmit({ file, amount: value, paidOn, transferReference: reference });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Upload transfer receipt" open={!!target} onClose={onClose}>
      {target && (
        <form onSubmit={submit} className="space-y-4">
          <p className="rounded bg-row px-3 py-2 text-sm">
            <span className="font-medium">{target.title}</span> · {naira(target.amount)}
          </p>
          <Field label="Amount transferred (NGN)" type="number" inputMode="decimal" min={1} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          {Number(amount) > 0 && Number(amount) !== target.amount && (
            <p className="text-xs text-amber-800">This is different from the amount due. The estate will check it before confirming.</p>
          )}
          <Field label="Date of transfer" type="date" max={todayIso()} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required />
          <Field label="Transfer reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={60} placeholder="From your bank app or receipt" />
          <div className="space-y-1">
            <label htmlFor="receipt-file" className="block text-sm font-medium text-ink">Receipt (JPG, PNG or PDF, up to 5 MB)</label>
            <input
              id="receipt-file"
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:font-medium file:text-brand-dark hover:file:bg-brand-tint"
              required
            />
          </div>
          {error && <ErrorState message={error} />}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Uploading…" : "Send receipt"}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

