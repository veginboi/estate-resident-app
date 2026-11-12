import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";
import { BankCard, ReceiptUploadSheet, formatDate, naira } from "@/components/payments";
import { useReceiptViewer } from "@/components/ReceiptViewer";
import { ORDER_STATUS } from "@/components/store";
import { colors } from "@/components/theme";
import { Button, Card, EmptyState, ErrorState, LoadingState, Screen, SuccessNote, Txt } from "@/components/ui";
import { api } from "@/lib/api";
import type { Order } from "@/lib/types";
import { useData } from "@/lib/use-data";

function OrderCard({
  order,
  highlight,
  onUpload,
  onCancel,
  onViewReceipt,
  opening,
}: {
  order: Order;
  highlight: boolean;
  onUpload: () => void;
  onCancel: () => void;
  onViewReceipt: () => void;
  opening: boolean;
}) {
  const s = ORDER_STATUS[order.status];
  const rejected = order.receipt?.status === "rejected" && order.status === "awaiting_payment";
  const showReceipt = !!order.receipt && (order.status === "payment_submitted" || rejected);
  const help =
    order.status === "awaiting_payment"
      ? "Pay by bank transfer, then upload your receipt."
      : order.status === "payment_submitted"
        ? `Receipt sent on ${formatDate(order.receipt?.submittedAt ?? order.createdAt)}. The estate is checking your transfer.`
        : order.status === "processing"
          ? "Payment confirmed. The estate is preparing your order."
          : order.status === "ready"
            ? order.deliveryMethod === "pickup"
              ? "Ready to collect at the estate office."
              : "On its way to your house."
            : null;

  return (
    <Card style={{ padding: 16, gap: 8, borderWidth: highlight ? 2 : 0, borderColor: colors.brand }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <View>
          <Txt weight="semibold">{order.orderNumber}</Txt>
          <Txt style={{ fontSize: 12, color: colors.muted }}>
            {formatDate(order.createdAt)} · {order.deliveryMethod === "pickup" ? "Pickup" : "Delivery"}
          </Txt>
        </View>
        <View style={{ backgroundColor: s.bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 }}>
          <Txt weight="semibold" style={{ color: s.fg, fontSize: 11 }}>
            {s.label}
          </Txt>
        </View>
      </View>
      {order.items.map((i) => (
        <View key={i.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <Txt style={{ fontSize: 14, flex: 1 }}>
            {i.quantity} × {i.name}
          </Txt>
          <Txt style={{ fontSize: 14 }}>{naira(i.lineTotal)}</Txt>
        </View>
      ))}
      {order.note ? <Txt style={{ fontSize: 12, color: colors.muted }}>Note: {order.note}</Txt> : null}
      <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderColor: colors.row, paddingTop: 8 }}>
        <Txt style={{ color: colors.muted }}>Total</Txt>
        <Txt weight="semibold">{naira(order.total)}</Txt>
      </View>
      {help && <Txt style={{ fontSize: 13, color: colors.muted }}>{help}</Txt>}
      {rejected && (
        <View style={{ backgroundColor: colors.dangerSoft, borderRadius: 6, padding: 10 }}>
          <Txt style={{ fontSize: 13, color: colors.danger }}>
            Your last receipt wasn&apos;t accepted{order.receipt?.reviewNote ? `: ${order.receipt.reviewNote}` : "."} Please upload a new one.
          </Txt>
        </View>
      )}
      {(order.canUploadReceipt || order.canCancel || showReceipt) && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {order.canUploadReceipt && <Button title="Upload receipt" icon="upload" onPress={onUpload} style={{ flex: 1 }} />}
          {showReceipt && (
            <Button
              title={opening ? "Opening…" : order.status === "payment_submitted" ? "View receipt" : "View last receipt"}
              icon="file-text"
              variant="outline"
              onPress={onViewReceipt}
              disabled={opening}
            />
          )}
          {order.canCancel && <Button title="Cancel" variant="outline" onPress={onCancel} />}
        </View>
      )}
    </Card>
  );
}

export default function OrdersScreen() {
  const { placed } = useLocalSearchParams<{ placed?: string }>();
  const placedId = placed ? Number(placed) : null;
  const orders = useData(api.getOrders);
  const finance = useData(api.getFinanceSummary);
  const [uploading, setUploading] = useState<Order | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const receipts = useReceiptViewer();

  const placedOrder = orders.data?.find((o) => o.id === placedId);
  const awaiting = orders.data?.some((o) => o.status === "awaiting_payment");
  const replace = (updated: Order) => orders.setData((list) => list?.map((o) => (o.id === updated.id ? updated : o)) ?? null);

  const confirmCancel = (order: Order) =>
    Alert.alert("Cancel this order?", `${order.orderNumber} for ${naira(order.total)} will be cancelled. Only cancel if you haven't paid for it yet.`, [
      { text: "Keep order", style: "cancel" },
      {
        text: "Cancel order",
        style: "destructive",
        onPress: async () => {
          setError(null);
          try {
            replace(await api.cancelOrder(order.id));
            setNotice(`Order ${order.orderNumber} was cancelled.`);
          } catch (e) {
            setError((e as Error).message);
          }
        },
      },
    ]);

  return (
    <Screen onRefresh={() => (orders.refresh(), finance.refresh())} refreshing={orders.refreshing}>
      <Stack.Screen options={{ title: "My orders" }} />
      {placedOrder && placedOrder.status === "awaiting_payment" && !notice && (
        <SuccessNote>
          Order {placedOrder.orderNumber} placed. Pay {naira(placedOrder.total)} by bank transfer, then upload your receipt below.
        </SuccessNote>
      )}
      {notice && <SuccessNote>{notice}</SuccessNote>}
      {error && <ErrorState message={error} />}
      {receipts.error && <ErrorState message={receipts.error} />}
      {awaiting && finance.data && <BankCard bank={finance.data.bank} />}

      {orders.loading ? (
        <LoadingState />
      ) : orders.error ? (
        <ErrorState message={orders.error} onRetry={orders.refresh} />
      ) : !orders.data?.length ? (
        <EmptyState>You haven&apos;t ordered anything yet.</EmptyState>
      ) : (
        orders.data.map((o) => (
          <OrderCard
            key={o.id}
            order={o}
            highlight={o.id === placedId}
            onUpload={() => setUploading(o)}
            onCancel={() => confirmCancel(o)}
            onViewReceipt={() => o.receipt && receipts.open(o.receipt)}
            opening={receipts.openingId === o.receipt?.id}
          />
        ))
      )}

      {receipts.viewer}

      <ReceiptUploadSheet
        target={uploading && { key: `order-${uploading.id}`, title: `Order ${uploading.orderNumber}`, amount: uploading.total }}
        onClose={() => setUploading(null)}
        onSubmit={async (data) => {
          if (!uploading) return;
          const updated = await api.uploadOrderReceipt(uploading.id, data);
          replace(updated);
          setUploading(null);
          setNotice(`Receipt sent for ${updated.orderNumber}. The estate will start preparing it once your transfer is confirmed.`);
        }}
      />
    </Screen>
  );
}
