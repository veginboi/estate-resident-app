import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useState, type ComponentProps } from "react";
import { View } from "react-native";
import { BankCard, ReceiptUploadSheet, formatDate, naira } from "@/components/payments";
import { colors } from "@/components/theme";
import { Button, Card, Chip, EmptyState, ErrorState, LoadingState, Screen, SuccessNote, Txt } from "@/components/ui";
import { api, isMockMode } from "@/lib/api";
import type { Bill, BillStatus, FinanceSummary, Payment } from "@/lib/types";
import { useData } from "@/lib/use-data";

const METHODS: Record<string, string> = { bank_transfer: "Bank transfer", cash: "Cash", card: "Card", pos: "POS" };

const STATUS: Record<BillStatus, { label: string; bg: string; fg: string }> = {
  overdue: { label: "Overdue", bg: colors.dangerSoft, fg: colors.danger },
  unpaid: { label: "Unpaid", bg: colors.amberSoft, fg: colors.amber },
  pending: { label: "Awaiting confirmation", bg: "#e0f2fe", fg: "#075985" },
  paid: { label: "Paid", bg: colors.brandSoft, fg: colors.brandDark },
};

function StatusChip({ status }: { status: BillStatus }) {
  const s = STATUS[status];
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, alignSelf: "flex-start" }}>
      <Txt weight="semibold" style={{ color: s.fg, fontSize: 11 }}>
        {s.label}
      </Txt>
    </View>
  );
}

function Stat({ icon, value, label, danger }: { icon: ComponentProps<typeof Feather>["name"]; value: string; label: string; danger?: boolean }) {
  return (
    <Card style={{ flexBasis: "47%", flexGrow: 1, padding: 14, gap: 8 }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 6,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: danger ? colors.dangerSoft : colors.brandSoft,
        }}
      >
        <Feather name={icon} size={20} color={danger ? colors.danger : colors.brand} />
      </View>
      <Txt weight="semibold" style={{ fontSize: 17 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Txt>
      <Txt style={{ fontSize: 12, color: colors.muted }}>{label}</Txt>
    </Card>
  );
}

function BillCard({ bill, onUpload }: { bill: Bill; onUpload: (b: Bill) => void }) {
  const rejected = bill.receipt?.status === "rejected" && bill.status !== "paid";
  return (
    <View style={{ paddingVertical: 14, gap: 6, borderBottomWidth: 1, borderColor: colors.row }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <Txt weight="medium" style={{ flex: 1 }}>
          {bill.title}
        </Txt>
        <Txt weight="semibold">{naira(bill.amount)}</Txt>
      </View>
      <StatusChip status={bill.status} />
      {bill.description ? <Txt style={{ fontSize: 13, color: colors.muted }}>{bill.description}</Txt> : null}
      <Txt style={{ fontSize: 13, color: bill.status === "overdue" ? colors.danger : colors.muted }}>
        {bill.status === "paid" && bill.paidAt
          ? `Paid on ${formatDate(bill.paidAt)}`
          : bill.status === "overdue"
            ? `Was due on ${formatDate(bill.dueDate)}`
            : `Due on ${formatDate(bill.dueDate)}`}
      </Txt>
      {bill.status === "pending" && bill.receipt && (
        <Txt style={{ fontSize: 13, color: "#075985" }}>
          Receipt sent on {formatDate(bill.receipt.submittedAt)} for {naira(bill.receipt.amount)}. The estate will confirm it soon.
        </Txt>
      )}
      {rejected && (
        <View style={{ backgroundColor: colors.dangerSoft, borderRadius: 6, padding: 10 }}>
          <Txt style={{ fontSize: 13, color: colors.danger }}>
            Your last receipt wasn&apos;t accepted{bill.receipt?.reviewNote ? `: ${bill.receipt.reviewNote}` : "."} Please upload a new one.
          </Txt>
        </View>
      )}
      {bill.canUploadReceipt && (
        <View style={{ alignItems: "flex-start", marginTop: 4 }}>
          <Button title="Upload receipt" icon="upload" onPress={() => onUpload(bill)} />
        </View>
      )}
    </View>
  );
}

function PaymentRow({ p }: { p: Payment }) {
  return (
    <View style={{ paddingVertical: 12, gap: 2, borderBottomWidth: 1, borderColor: colors.row }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <Txt weight="medium" style={{ flex: 1 }}>
          {p.description}
        </Txt>
        <Txt weight="semibold">{naira(p.amount)}</Txt>
      </View>
      <Txt style={{ fontSize: 12, color: colors.muted }}>
        {p.receiptNumber} · {formatDate(p.paidAt)}
        {p.method ? ` · ${METHODS[p.method] ?? p.method}` : ""}
      </Txt>
    </View>
  );
}

export default function FinanceScreen() {
  const summary = useData(api.getFinanceSummary);
  const bills = useData(() => api.getBills());
  const payments = useData(api.getPayments);
  const [tab, setTab] = useState<"bills" | "history">("bills");
  const [uploading, setUploading] = useState<Bill | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = () => {
    summary.refresh();
    bills.refresh();
    payments.refresh();
  };

  const s: FinanceSummary | null = summary.data;
  const openBills = bills.data?.filter((b) => b.status !== "paid") ?? [];
  const paidBills = bills.data?.filter((b) => b.status === "paid") ?? [];

  return (
    <Screen onRefresh={refresh} refreshing={summary.refreshing || bills.refreshing || payments.refreshing}>
      <Stack.Screen options={{ title: "Finance" }} />

      {summary.loading ? (
        <LoadingState />
      ) : summary.error || !s ? (
        <ErrorState message={summary.error ?? "Couldn't load your finances."} onRetry={summary.refresh} />
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <Stat icon="credit-card" value={naira(s.outstanding)} label={`Outstanding · ${s.openBills} open`} />
            <Stat icon="alert-triangle" value={String(s.overdueBills)} label="Overdue bills" danger={s.overdueBills > 0} />
            <Stat icon="clock" value={String(s.awaitingConfirmation)} label="Awaiting confirmation" />
            <Stat icon="check-circle" value={naira(s.paidThisYear)} label={`Paid in ${new Date().getFullYear()}`} />
          </View>

          <BankCard bank={s.bank} />
        </>
      )}

      {notice && <SuccessNote>{notice}</SuccessNote>}

      <Card style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }} accessibilityRole="tablist">
          <Chip label="Bills" active={tab === "bills"} onPress={() => setTab("bills")} />
          <Chip label="Payment history" active={tab === "history"} onPress={() => setTab("history")} />
        </View>

        {tab === "bills" ? (
          bills.loading ? (
            <LoadingState />
          ) : bills.error ? (
            <ErrorState message={bills.error} onRetry={bills.refresh} />
          ) : (
            <>
              <Txt weight="semibold" style={{ fontSize: 12, color: colors.muted, marginTop: 12 }}>
                TO PAY
              </Txt>
              {openBills.length === 0 ? (
                <EmptyState>You&apos;re all paid up. 🎉</EmptyState>
              ) : (
                openBills.map((b) => <BillCard key={b.id} bill={b} onUpload={setUploading} />)
              )}
              {paidBills.length > 0 && (
                <>
                  <Txt weight="semibold" style={{ fontSize: 12, color: colors.muted, marginTop: 16 }}>
                    PAID
                  </Txt>
                  {paidBills.map((b) => (
                    <BillCard key={b.id} bill={b} onUpload={setUploading} />
                  ))}
                </>
              )}
            </>
          )
        ) : payments.loading ? (
          <LoadingState />
        ) : payments.error ? (
          <ErrorState message={payments.error} onRetry={payments.refresh} />
        ) : !payments.data?.length ? (
          <EmptyState>No payments yet. Payments appear here once the estate confirms them.</EmptyState>
        ) : (
          payments.data.map((p) => <PaymentRow key={p.id} p={p} />)
        )}
      </Card>

      {isMockMode && (
        <Txt style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}>Demo mode: receipts you upload aren&apos;t saved.</Txt>
      )}

      <ReceiptUploadSheet
        target={uploading && { key: `bill-${uploading.id}`, title: uploading.title, amount: uploading.amount }}
        onClose={() => setUploading(null)}
        onSubmit={async (data) => {
          if (!uploading) return;
          const updated = await api.uploadReceipt(uploading.id, data);
          setUploading(null);
          bills.setData((list) => list?.map((b) => (b.id === updated.id ? updated : b)) ?? null);
          summary.refresh();
          setNotice(`Receipt sent for "${updated.title}". The bill will be marked paid once the estate confirms your transfer.`);
        }}
      />
    </Screen>
  );
}
