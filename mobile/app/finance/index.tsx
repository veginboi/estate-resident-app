import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import { useState, type ComponentProps } from "react";
import { View } from "react-native";
import { colors } from "@/components/theme";
import { Button, Card, Chip, EmptyState, ErrorState, Field, LoadingState, Screen, Sheet, SuccessNote, Txt } from "@/components/ui";
import { api, isMockMode } from "@/lib/api";
import type { Bill, BillStatus, FinanceSummary, Payment } from "@/lib/types";
import { useData } from "@/lib/use-data";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const METHODS: Record<string, string> = { bank_transfer: "Bank transfer", cash: "Cash", card: "Card", pos: "POS" };

const naira = (n: number) => `NGN ${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const formatDate = (value: string) => {
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

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

type Picked = { uri: string; name: string; type: string; size?: number };

function UploadSheet({ bill, onClose, onUploaded }: { bill: Bill | null; onClose: () => void; onUploaded: (b: Bill) => void }) {
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(isoDate(new Date()));
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<Picked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openedFor, setOpenedFor] = useState<number | null>(null);

  // Reset the form each time it opens for a bill.
  if (bill && openedFor !== bill.id) {
    setOpenedFor(bill.id);
    setAmount(String(bill.amount));
    setPaidOn(isoDate(new Date()));
    setReference("");
    setFile(null);
    setError(null);
    setBusy(false);
  }
  if (!bill && openedFor !== null) setOpenedFor(null);

  const today = isoDate(new Date());
  const yesterday = isoDate(new Date(Date.now() - 86_400_000));

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled) return;
    const a = result.assets[0];
    setFile({ uri: a.uri, name: a.fileName ?? "receipt.jpg", type: a.mimeType ?? "image/jpeg", size: a.fileSize });
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ALLOWED_TYPES, copyToCacheDirectory: true });
    if (result.canceled) return;
    const a = result.assets[0];
    setFile({ uri: a.uri, name: a.name, type: a.mimeType ?? "application/octet-stream", size: a.size });
  };

  const submit = async () => {
    if (!bill) return;
    const value = Number(amount.replace(/,/g, ""));
    if (!file) return setError("Choose a photo or file of your transfer receipt.");
    if (!ALLOWED_TYPES.includes(file.type)) return setError("The receipt must be a photo (JPG or PNG) or a PDF.");
    if (file.size && file.size > MAX_FILE_BYTES) return setError("The receipt must be smaller than 5 MB.");
    if (!Number.isFinite(value) || value < 1) return setError("Enter the amount you transferred.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || paidOn > today) return setError("Enter the transfer date as YYYY-MM-DD, not in the future.");

    setBusy(true);
    setError(null);
    try {
      onUploaded(await api.uploadReceipt(bill.id, { file: { uri: file.uri, name: file.name, type: file.type }, amount: value, paidOn, transferReference: reference }));
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Sheet title="Upload transfer receipt" open={!!bill} onClose={onClose}>
      {bill && (
        <>
          <View style={{ backgroundColor: colors.row, borderRadius: 6, padding: 12 }}>
            <Txt weight="medium">{bill.title}</Txt>
            <Txt style={{ color: colors.muted, fontSize: 13 }}>{naira(bill.amount)}</Txt>
          </View>
          <Field label="Amount transferred (NGN)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          {Number(amount) > 0 && Number(amount) !== bill.amount && (
            <Txt style={{ fontSize: 12, color: colors.amber }}>This is different from the bill amount. The estate will check it before confirming.</Txt>
          )}
          <View style={{ gap: 6 }}>
            <Txt weight="medium" style={{ fontSize: 14 }}>
              Date of transfer
            </Txt>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Chip label="Today" active={paidOn === today} onPress={() => setPaidOn(today)} role="radio" />
              <Chip label="Yesterday" active={paidOn === yesterday} onPress={() => setPaidOn(yesterday)} role="radio" />
            </View>
            <Field label="Or enter a date (YYYY-MM-DD)" value={paidOn} onChangeText={setPaidOn} keyboardType="numbers-and-punctuation" maxLength={10} />
          </View>
          <Field label="Transfer reference (optional)" value={reference} onChangeText={setReference} maxLength={60} autoCapitalize="characters" />
          <View style={{ gap: 8 }}>
            <Txt weight="medium" style={{ fontSize: 14 }}>
              Receipt (JPG, PNG or PDF, up to 5 MB)
            </Txt>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button title="Choose photo" icon="image" variant="outline" onPress={pickPhoto} style={{ flex: 1 }} />
              <Button title="Choose file" icon="file" variant="outline" onPress={pickFile} style={{ flex: 1 }} />
            </View>
            {file && (
              <Txt style={{ fontSize: 13, color: colors.muted }} numberOfLines={1}>
                Selected: {file.name}
              </Txt>
            )}
          </View>
          {error && <ErrorState message={error} />}
          <Button title={busy ? "Uploading…" : "Send receipt"} onPress={submit} disabled={busy} />
        </>
      )}
    </Sheet>
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

          <Card style={{ padding: 16, gap: 10 }}>
            <Txt weight="semibold" style={{ color: colors.brand, fontSize: 16 }} accessibilityRole="header">
              How to pay
            </Txt>
            {s.bank ? (
              <>
                <Txt style={{ fontSize: 13, color: colors.muted }}>
                  Pay by bank transfer to the estate account below, then upload your transfer receipt on the bill.
                </Txt>
                <View style={{ gap: 6 }}>
                  <Txt style={{ fontSize: 14 }}>
                    <Txt style={{ color: colors.muted, fontSize: 14 }}>Bank: </Txt>
                    {s.bank.bankName}
                  </Txt>
                  <Txt style={{ fontSize: 14 }}>
                    <Txt style={{ color: colors.muted, fontSize: 14 }}>Account name: </Txt>
                    {s.bank.accountName}
                  </Txt>
                  <Txt style={{ fontSize: 14 }} selectable>
                    <Txt style={{ color: colors.muted, fontSize: 14 }}>Account number: </Txt>
                    <Txt weight="semibold" style={{ fontSize: 16, letterSpacing: 1 }}>
                      {s.bank.accountNumber}
                    </Txt>
                  </Txt>
                  <Txt style={{ fontSize: 11, color: colors.muted }}>Press and hold the account number to copy it.</Txt>
                </View>
              </>
            ) : (
              <Txt style={{ fontSize: 13, color: colors.muted }}>
                The estate hasn&apos;t added its bank details yet. Please contact the estate office to pay.
              </Txt>
            )}
          </Card>
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

      <UploadSheet
        bill={uploading}
        onClose={() => setUploading(null)}
        onUploaded={(updated) => {
          setUploading(null);
          bills.setData((list) => list?.map((b) => (b.id === updated.id ? updated : b)) ?? null);
          summary.refresh();
          setNotice(`Receipt sent for "${updated.title}". The bill will be marked paid once the estate confirms your transfer.`);
        }}
      />
    </Screen>
  );
}
