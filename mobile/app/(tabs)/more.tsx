import { Feather } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, View } from "react-native";
import { colors } from "@/components/theme";
import { Card, Screen, Txt } from "@/components/ui";
import { isMockMode } from "@/lib/api";
import { useUnread } from "@/lib/unread";
import { useSession } from "@/lib/session";

type Item = { label: string; icon: ComponentProps<typeof Feather>["name"]; href: Href; badge?: number };

const ITEMS: Item[] = [
  { label: "Finance", icon: "credit-card", href: "/finance" },
  { label: "Store", icon: "shopping-bag", href: "/section/store" },
  { label: "Messages", icon: "mail", href: "/messages" },
  { label: "Settings", icon: "settings", href: "/profile?tab=settings" },
];

function Row({ label, icon, onPress, badge, color = colors.ink, last }: { label: string; icon: Item["icon"]; onPress: () => void; badge?: number; color?: string; last?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} unread` : label}
      style={({ pressed }) => [
        { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 15 },
        !last && { borderBottomWidth: 1, borderColor: colors.row },
        pressed && { backgroundColor: colors.brandTint },
      ]}
    >
      <Feather name={icon} size={20} color={color === colors.ink ? colors.brand : color} />
      <Txt weight="medium" style={{ flex: 1, color }}>
        {label}
      </Txt>
      {badge ? (
        <View style={{ backgroundColor: colors.danger, borderRadius: 999, paddingHorizontal: 7, minWidth: 20, alignItems: "center" }}>
          <Txt weight="semibold" style={{ color: colors.white, fontSize: 11 }}>
            {badge > 99 ? "99+" : badge}
          </Txt>
        </View>
      ) : null}
      {color === colors.ink && <Feather name="chevron-right" size={18} color={colors.line} />}
    </Pressable>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const { signOut } = useSession();
  const unread = useUnread();

  return (
    <Screen>
      <Card style={{ overflow: "hidden" }}>
        {ITEMS.map((item, i) => (
          <Row key={item.label} {...item} badge={item.href === "/messages" ? unread.count : item.badge} onPress={() => router.push(item.href)} last={i === ITEMS.length - 1} />
        ))}
      </Card>

      <Card style={{ overflow: "hidden" }}>
        <Row label="Logout" icon="log-out" color={colors.brand} onPress={signOut} last />
      </Card>

      {isMockMode && (
        <Txt style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}>Demo mode: showing sample estate data.</Txt>
      )}
    </Screen>
  );
}
