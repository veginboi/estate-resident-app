"use client";

import { AlertTriangle, Banknote, CheckCircle2, Clock, Receipt, Upload } from "lucide-react";
import { useState, type ReactNode } from "react";
import { BankCard, ReceiptUploadModal, formatDate, naira } from "@/components/payments";
import { Button, Card, DataTable, EmptyState, ErrorState, LoadingState, cx } from "@/components/ui";
import { api, isMockMode } from "@/lib/api";
import type { Bill, BillStatus, FinanceSummary, Payment } from "@/lib/types";
import { useData } from "@/lib/use-data";

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

      <ReceiptUploadModal
        target={uploading && { key: `bill-${uploading.id}`, title: uploading.title, amount: uploading.amount }}
        onClose={() => setUploading(null)}
        onSubmit={async (data) => {
          if (!uploading) return;
          const updated = await api.uploadReceipt(uploading.id, data);
          setUploading(null);
          bills.setData((list) => list?.map((b) => (b.id === updated.id ? updated : b)) ?? null);
          summary.reload().catch(() => undefined);
          setNotice(`Receipt sent for "${updated.title}". We'll mark the bill as paid once the estate confirms your transfer.`);
        }}
      />
    </div>
  );
}
