import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { View } from "react-native";
import type { BankDetails, ReceiptUpload } from "@/lib/types";
import { colors } from "./theme";
import { Button, Card, Chip, ErrorState, Field, Sheet, Txt } from "./ui";

// Shared by the Finance and Store screens: money and date formatting, the estate bank
// account card and the bank transfer receipt sheet.

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const naira = (n: number) => `NGN ${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const formatDate = (value: string) => {
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** The estate bank account residents transfer to. */
export function BankCard({ bank, hint = "Pay by bank transfer to the estate account below, then upload your transfer receipt." }: { bank: BankDetails | null; hint?: string }) {
  return (
    <Card style={{ padding: 16, gap: 10 }}>
      <Txt weight="semibold" style={{ color: colors.brand, fontSize: 16 }} accessibilityRole="header">
        How to pay
      </Txt>
      {bank ? (
        <>
          <Txt style={{ fontSize: 13, color: colors.muted }}>
            {hint}
          </Txt>
          <View style={{ gap: 6 }}>
            <Txt style={{ fontSize: 14 }}>
              <Txt style={{ color: colors.muted, fontSize: 14 }}>Bank: </Txt>
              {bank.bankName}
            </Txt>
            <Txt style={{ fontSize: 14 }}>
              <Txt style={{ color: colors.muted, fontSize: 14 }}>Account name: </Txt>
              {bank.accountName}
            </Txt>
            <Txt style={{ fontSize: 14 }} selectable>
              <Txt style={{ color: colors.muted, fontSize: 14 }}>Account number: </Txt>
              <Txt weight="semibold" style={{ fontSize: 16, letterSpacing: 1 }}>
                {bank.accountNumber}
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
  );
}

type Picked = { uri: string; name: string; type: string; size?: number };

/** What a receipt is being uploaded for: a bill or a store order. */
export type ReceiptTarget = { key: string; title: string; amount: number };

/** The bottom sheet for sending a bank transfer receipt. If `onSubmit` throws, the error shows in the sheet. */
export function ReceiptUploadSheet({
  target,
  onClose,
  onSubmit,
}: {
  target: ReceiptTarget | null;
  onClose: () => void;
  onSubmit: (data: ReceiptUpload) => Promise<void>;
}) {

  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(isoDate(new Date()));
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<Picked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openedFor, setOpenedFor] = useState<string | null>(null);

  // Reset the form each time it opens for a bill.
  if (target && openedFor !== target.key) {
    setOpenedFor(target.key);
    setAmount(String(target.amount));
    setPaidOn(isoDate(new Date()));
    setReference("");
    setFile(null);
    setError(null);
    setBusy(false);
  }
  if (!target && openedFor !== null) setOpenedFor(null);

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
    if (!target) return;
    const value = Number(amount.replace(/,/g, ""));
    if (!file) return setError("Choose a photo or file of your transfer receipt.");
    if (!ALLOWED_TYPES.includes(file.type)) return setError("The receipt must be a photo (JPG or PNG) or a PDF.");
    if (file.size && file.size > MAX_FILE_BYTES) return setError("The receipt must be smaller than 5 MB.");
    if (!Number.isFinite(value) || value < 1) return setError("Enter the amount you transferred.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || paidOn > today) return setError("Enter the transfer date as YYYY-MM-DD, not in the future.");

    setBusy(true);
    setError(null);
    try {
      await onSubmit({ file: { uri: file.uri, name: file.name, type: file.type }, amount: value, paidOn, transferReference: reference });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Sheet title="Upload transfer receipt" open={!!target} onClose={onClose}>
      {target && (
        <>
          <View style={{ backgroundColor: colors.row, borderRadius: 6, padding: 12 }}>
            <Txt weight="medium">{target.title}</Txt>
            <Txt style={{ color: colors.muted, fontSize: 13 }}>{naira(target.amount)}</Txt>
          </View>
          <Field label="Amount transferred (NGN)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          {Number(amount) > 0 && Number(amount) !== target.amount && (
            <Txt style={{ fontSize: 12, color: colors.amber }}>This is different from the amount due. The estate will check it before confirming.</Txt>
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

