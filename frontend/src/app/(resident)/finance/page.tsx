"use client";

import { AlertTriangle, Banknote, CheckCircle2, Clock, Copy, Landmark, Receipt, Upload } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button, Card, DataTable, EmptyState, ErrorState, Field, LoadingState, Modal, cx } from "@/components/ui";
import { api, isMockMode } from "@/lib/api";
import type { BankDetails, Bill, BillStatus, FinanceSummary, Payment } from "@/lib/types";
import { useData } from "@/lib/use-data";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const naira = (n: number) => `NGN ${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

const formatDate = (value: string) =>
  new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const METHODS: Record<string, string> = { bank_transfer: "Bank transfer", cash: "Cash", card: "Card", pos: "POS" };

const STATUS: Record<BillStatus, { label: string; className: string }> = {
  overdue: { label: "Overdue", className: "bg-red-50 text-danger" },
  unpaid: { label: "Unpaid", className: "bg-amber-50 text-amber-800" },
  pending: { label: "Awaiting confirmation", className: "bg-sky-50 text-sky-800" },
  paid: { label: "Paid", className: "bg-brand-soft text-brand-dark" },
};

function StatusChip({ status }: { status: BillStatus }) {
  const s = STATUS[status];
  return <span className={cx("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", s.className)}>{s.label}</span>;
}

function SummaryCard({ icon, value, label, tone = "brand" }: { icon: ReactNode; value: string; label: string; tone?: "brand" | "danger" }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span
        className={cx(
          "flex size-14 shrink-0 items-center justify-center rounded",
          tone === "danger" ? "bg-red-50 text-danger" : "bg-brand-soft text-brand",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xl font-semibold sm:text-2xl">{value}</span>
        <span className="block text-sm text-muted">{label}</span>
      </span>
    </Card>
  );
}

function BankCard({ bank }: { bank: BankDetails | null }) {
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
            Pay by bank transfer to the estate account below, then upload your transfer receipt on the bill. The estate confirms it within a few working days.
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

function BillRow({ bill, onUpload, onOpenReceipt }: { bill: Bill; onUpload: (b: Bill) => void; onOpenReceipt: (b: Bill) => void }) {
  const rejected = bill.receipt?.status === "rejected" && bill.status !== "paid";
  return (
    <li className="flex flex-col gap-3 border-b border-row py-4 last:border-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium text-ink">{bill.title}</h3>
          <StatusChip status={bill.status} />
        </div>
        {bill.description && <p className="mt-1 text-sm text-muted">{bill.description}</p>}
        <p className={cx("mt-1 text-sm", bill.status === "overdue" ? "text-danger" : "text-muted")}>
          {bill.status === "paid" && bill.paidAt
            ? `Paid on ${formatDate(bill.paidAt)}`
            : bill.status === "overdue"
              ? `Was due on ${formatDate(bill.dueDate)}`
              : `Due on ${formatDate(bill.dueDate)}`}
        </p>
        {bill.status === "pending" && bill.receipt && (
          <p className="mt-1 text-sm text-sky-800">
            Receipt sent on {formatDate(bill.receipt.submittedAt)} for {naira(bill.receipt.amount)}. The estate will confirm it soon.
          </p>
        )}
        {rejected && (
          <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-danger">
            Your last receipt wasn&apos;t accepted{bill.receipt?.reviewNote ? `: ${bill.receipt.reviewNote}` : "."} Please upload a new one.
          </p>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
        <span className="text-lg font-semibold whitespace-nowrap">{naira(bill.amount)}</span>
        {bill.canUploadReceipt ? (
          <Button onClick={() => onUpload(bill)} className="px-3 py-1.5 sm:text-sm">
            <Upload size={16} aria-hidden /> Upload receipt
          </Button>
        ) : bill.receipt && bill.status === "pending" ? (
          <Button variant="ghost" onClick={() => onOpenReceipt(bill)} className="px-3 py-1.5 sm:text-sm">
            <Receipt size={16} aria-hidden /> View receipt
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function UploadReceiptModal({ bill, onClose, onUploaded }: { bill: Bill | null; onClose: () => void; onUploaded: (b: Bill) => void }) {
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(todayIso());
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!bill) return;
    setAmount(String(bill.amount));
    setPaidOn(todayIso());
    setReference("");
    setFile(null);
    setError(null);
    setBusy(false);
  }, [bill]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bill) return;
    const value = Number(amount);
    if (!file) return setError("Choose the receipt file from your bank app or a photo of it.");
    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) return setError("The receipt must be a photo (JPG or PNG) or a PDF.");
    if (file.size > MAX_FILE_BYTES) return setError("The receipt must be smaller than 5 MB.");
    if (!Number.isFinite(value) || value < 1) return setError("Enter the amount you transferred.");
    if (!paidOn || paidOn > todayIso()) return setError("Enter the date you made the transfer.");

    setBusy(true);
    setError(null);
    try {
      onUploaded(await api.uploadReceipt(bill.id, { file, amount: value, paidOn, transferReference: reference }));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Upload transfer receipt" open={!!bill} onClose={onClose}>
      {bill && (
        <form onSubmit={submit} className="space-y-4">
          <p className="rounded bg-row px-3 py-2 text-sm">
            <span className="font-medium">{bill.title}</span> · {naira(bill.amount)}
          </p>
          <Field label="Amount transferred (NGN)" type="number" inputMode="decimal" min={1} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          {Number(amount) > 0 && Number(amount) !== bill.amount && (
            <p className="text-xs text-amber-800">This is different from the bill amount. The estate will check it before confirming.</p>
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

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Opens a printable receipt for a payment in a new window. */
function printReceipt(p: Payment, residentName: string, residentCode: string) {
  const w = window.open("", "_blank", "width=640,height=760");
  if (!w) return;
  const rows: [string, string][] = [
    ["Receipt number", p.receiptNumber],
    ["Date", formatDate(p.paidAt)],
    ["Resident", `${residentName} (${residentCode})`],
    ["Description", p.description],
    ["Method", p.method ? METHODS[p.method] ?? p.method : "—"],
    ["Amount", naira(p.amount)],
  ];
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(p.receiptNumber)}</title>
<style>body{font-family:system-ui,sans-serif;color:#111;max-width:520px;margin:40px auto;padding:0 16px}h1{color:#12a14a;font-size:22px;margin:0}
p{color:#8a8a8a;margin:4px 0 24px}table{width:100%;border-collapse:collapse}td{padding:10px 0;border-bottom:1px solid #ececec}td:last-child{text-align:right;font-weight:600}
.total td{font-size:18px;border-bottom:0}footer{margin-top:32px;color:#8a8a8a;font-size:12px}</style></head><body>
<h1>LincolnEstate</h1><p>Payment receipt</p><table>${rows
    .map(([k, v], i) => `<tr${i === rows.length - 1 ? ' class="total"' : ""}><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
    .join("")}</table><footer>Thank you for your payment.</footer></body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

export default function FinancePage() {
  const summary = useData(api.getFinanceSummary);
  const bills = useData(() => api.getBills());
  const payments = useData(api.getPayments);
  const profile = useData(api.getProfile);
  const [tab, setTab] = useState<"bills" | "history">("bills");
  const [uploading, setUploading] = useState<Bill | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const s: FinanceSummary | null = summary.data;
  const openBills = bills.data?.filter((b) => b.status !== "paid") ?? [];
  const paidBills = bills.data?.filter((b) => b.status === "paid") ?? [];

  const openReceipt = async (bill: Bill) => {
    if (!bill.receipt) return;
    setActionError(null);
    try {
      await api.openReceiptFile(bill.receipt.id);
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <h1 className="text-xl font-semibold text-brand">Finance</h1>

      {summary.loading ? (
        <LoadingState />
      ) : summary.error || !s ? (
        <ErrorState message={summary.error ?? "Couldn't load your finances."} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={<Banknote size={28} />} value={naira(s.outstanding)} label={`Outstanding · ${s.openBills} open bill${s.openBills === 1 ? "" : "s"}`} />
          <SummaryCard icon={<AlertTriangle size={28} />} value={String(s.overdueBills)} label="Overdue bills" tone={s.overdueBills ? "danger" : "brand"} />
          <SummaryCard icon={<Clock size={28} />} value={String(s.awaitingConfirmation)} label="Awaiting confirmation" />
          <SummaryCard icon={<CheckCircle2 size={28} />} value={naira(s.paidThisYear)} label={`Paid in ${new Date().getFullYear()}`} />
        </div>
      )}

      {s && <BankCard bank={s.bank} />}

      {notice && (
        <p role="status" className="rounded bg-brand-soft px-4 py-3 text-sm font-medium text-brand-dark">{notice}</p>
      )}
      {actionError && <ErrorState message={actionError} />}

      <Card className="p-5 sm:p-6">
        <div role="tablist" aria-label="Finance" className="mb-4 flex gap-2 border-b border-row">
          {(
            [
              ["bills", "Bills"],
              ["history", "Payment history"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cx(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors sm:text-base",
                tab === key ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "bills" ? (
          bills.loading ? (
            <LoadingState />
          ) : bills.error ? (
            <ErrorState message={bills.error} />
          ) : (
            <div className="space-y-6">
              <section>
                <h2 className="mb-1 text-sm font-semibold tracking-wide text-muted uppercase">To pay</h2>
                {openBills.length === 0 ? (
                  <EmptyState>You&apos;re all paid up. 🎉</EmptyState>
                ) : (
                  <ul>
                    {openBills.map((b) => (
                      <BillRow key={b.id} bill={b} onUpload={setUploading} onOpenReceipt={openReceipt} />
                    ))}
                  </ul>
                )}
              </section>
              {paidBills.length > 0 && (
                <section>
                  <h2 className="mb-1 text-sm font-semibold tracking-wide text-muted uppercase">Paid</h2>
                  <ul>
                    {paidBills.map((b) => (
                      <BillRow key={b.id} bill={b} onUpload={setUploading} onOpenReceipt={openReceipt} />
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )
        ) : payments.loading ? (
          <LoadingState />
        ) : payments.error ? (
          <ErrorState message={payments.error} />
        ) : !payments.data?.length ? (
          <EmptyState>No payments yet. Payments appear here once the estate confirms them.</EmptyState>
        ) : (
          <DataTable headers={["Receipt", "Description", "Date", "Method", "Amount", ""]}>
            {payments.data.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3 font-mono text-sm whitespace-nowrap">{p.receiptNumber}</td>
                <td className="px-5 py-3 text-ink">{p.description}</td>
                <td className="px-5 py-3 whitespace-nowrap">{formatDate(p.paidAt)}</td>
                <td className="px-5 py-3 whitespace-nowrap">{p.method ? METHODS[p.method] ?? p.method : "—"}</td>
                <td className="px-5 py-3 font-semibold whitespace-nowrap text-ink">{naira(p.amount)}</td>
                <td className="px-3 py-3 text-right">
                  <Button
                    variant="ghost"
                    onClick={() => printReceipt(p, profile.data?.name ?? "", profile.data?.residentCode ?? "")}
                    className="px-2 py-1 sm:text-sm"
                    aria-label={`Print receipt ${p.receiptNumber}`}
                  >
                    <Receipt size={16} aria-hidden /> Receipt
                  </Button>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>

      {isMockMode && <p className="text-center text-xs text-muted">Demo mode: receipts you upload aren&apos;t saved.</p>}

      <UploadReceiptModal
        bill={uploading}
        onClose={() => setUploading(null)}
        onUploaded={(updated) => {
          setUploading(null);
          bills.setData((list) => list?.map((b) => (b.id === updated.id ? updated : b)) ?? null);
          summary.reload().catch(() => undefined);
          setNotice(`Receipt sent for "${updated.title}". We'll mark the bill as paid once the estate confirms your transfer.`);
        }}
      />
    </div>
  );
}
