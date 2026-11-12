import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { naira } from "@/components/payments";
import { Stepper } from "@/components/store";
import { colors } from "@/components/theme";
import { Button, Card, ChoiceField, EmptyState, ErrorState, Field, Screen, Txt } from "@/components/ui";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";

const DELIVERY = { "Pick up at the estate office": "pickup", "Deliver to my house": "delivery" } as const;
type DeliveryLabel = keyof typeof DELIVERY;

export default function CartScreen() {
  const router = useRouter();
  const cart = useCart();
  const [delivery, setDelivery] = useState<DeliveryLabel>("Pick up at the estate office");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const place = async () => {
    setBusy(true);
    setError(null);
    try {
      const order = await api.placeOrder({
        items: cart.items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        deliveryMethod: DELIVERY[delivery],
        note,
      });
      cart.clear();
      router.replace({ pathname: "/store/orders", params: { placed: String(order.id) } });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: "Your cart" }} />
      {cart.items.length === 0 ? (
        <Card style={{ padding: 16, gap: 12 }}>
          <EmptyState>Your cart is empty.</EmptyState>
          <Button title="Browse the store" variant="outline" onPress={() => router.back()} />
        </Card>
      ) : (
        <>
          <Card style={{ paddingHorizontal: 16 }}>
            {cart.items.map(({ product, quantity }, i) => (
              <View
                key={product.id}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderColor: colors.row }}
              >
                <View style={{ flex: 1 }}>
                  <Txt weight="medium">{product.name}</Txt>
                  <Txt style={{ fontSize: 12, color: colors.muted }}>{naira(product.price)} each</Txt>
                </View>
                <Stepper value={quantity} max={product.maxQuantity} onChange={(n) => cart.setQuantity(product, n)} label={product.name} />
                <Pressable onPress={() => cart.setQuantity(product, 0)} accessibilityRole="button" accessibilityLabel={`Remove ${product.name}`} hitSlop={8}>
                  <Feather name="trash-2" size={18} color={colors.muted} />
                </Pressable>
              </View>
            ))}
          </Card>

          <Card style={{ padding: 16, gap: 16 }}>
            <ChoiceField label="How would you like to get it?" options={Object.keys(DELIVERY) as DeliveryLabel[]} value={delivery} onChange={setDelivery} />
            <Field label="Note for the estate (optional)" value={note} onChangeText={setNote} multiline maxLength={500} placeholder="e.g. best time to deliver" />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderColor: colors.row, paddingTop: 12 }}>
              <Txt style={{ color: colors.muted }}>Total</Txt>
              <Txt weight="semibold" style={{ fontSize: 20 }}>
                {naira(cart.total)}
              </Txt>
            </View>
            {error && <ErrorState message={error} />}
            <Button title={busy ? "Placing order…" : "Place order"} onPress={place} disabled={busy} />
            <Txt style={{ fontSize: 12, color: colors.muted }}>After placing the order, pay by bank transfer and upload your receipt.</Txt>
          </Card>
        </>
      )}
    </Screen>
  );
}
