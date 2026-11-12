import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, View } from "react-native";
import type { OrderStatus } from "@/lib/types";
import { colors } from "./theme";
import { Txt } from "./ui";

export const CATEGORY_ICONS: Record<string, ComponentProps<typeof Feather>["name"]> = {
  "Access & Security": "key",
  Home: "home",
  Merchandise: "shopping-bag",
};

export const ORDER_STATUS: Record<OrderStatus, { label: string; bg: string; fg: string }> = {
  awaiting_payment: { label: "Awaiting payment", bg: colors.amberSoft, fg: colors.amber },
  payment_submitted: { label: "Receipt sent", bg: "#e0f2fe", fg: "#075985" },
  processing: { label: "Paid · Preparing", bg: colors.brandTint, fg: colors.brandDark },
  ready: { label: "Ready", bg: colors.brandSoft, fg: colors.brandDark },
  completed: { label: "Completed", bg: colors.row, fg: colors.ink },
  cancelled: { label: "Cancelled", bg: colors.row, fg: colors.muted },
};

export function Stepper({ value, max, onChange, label }: { value: number; max: number | null; onChange: (n: number) => void; label: string }) {
  const atMax = max !== null && value >= max;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 6 }}>
      <Pressable onPress={() => onChange(value - 1)} accessibilityRole="button" accessibilityLabel={`Remove one ${label}`} hitSlop={6} style={{ padding: 8 }}>
        <Feather name="minus" size={16} color={colors.brand} />
      </Pressable>
      <Txt weight="semibold" style={{ minWidth: 26, textAlign: "center" }} accessibilityLabel={`${value} in cart`}>
        {value}
      </Txt>
      <Pressable
        onPress={() => onChange(value + 1)}
        disabled={atMax}
        accessibilityRole="button"
        accessibilityLabel={`Add one more ${label}`}
        accessibilityState={{ disabled: atMax }}
        hitSlop={6}
        style={{ padding: 8, opacity: atMax ? 0.4 : 1 }}
      >
        <Feather name="plus" size={16} color={colors.brand} />
      </Pressable>
    </View>
  );
}
