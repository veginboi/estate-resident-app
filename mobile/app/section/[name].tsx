import { Feather } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { colors } from "@/components/theme";
import { Card, Screen, Txt } from "@/components/ui";

// The Store isn't part of the current Resident App tasks.
// This placeholder keeps its link working until it's built.
const SECTIONS: Record<string, { title: string; icon: "shopping-bag" }> = {
  store: { title: "Store", icon: "shopping-bag" },
};

export default function ComingSoonScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const section = SECTIONS[name] ?? { title: "Coming soon", icon: "clock" as const };

  return (
    <Screen>
      <Stack.Screen options={{ title: section.title }} />
      <Card style={{ padding: 32, alignItems: "center", gap: 10 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <Feather name={section.icon} size={28} color={colors.brand} />
        </View>
        <Txt weight="semibold" style={{ fontSize: 20, color: colors.brand }} accessibilityRole="header">
          {section.title}
        </Txt>
        <Txt style={{ color: colors.muted, textAlign: "center" }}>This section is coming soon.</Txt>
      </Card>
    </Screen>
  );
}
