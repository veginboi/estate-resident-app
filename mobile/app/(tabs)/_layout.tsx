import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { View, type ColorValue } from "react-native";
import { EmergencyButton } from "@/components/EmergencyButton";
import { Logo } from "@/components/Logo";
import { colors, fonts } from "@/components/theme";
import { useUnread } from "@/lib/unread";

type IconName = ComponentProps<typeof Feather>["name"];

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Feather name={name} color={color as string} size={size} />;

export default function TabsLayout() {
  const unread = useUnread();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        // Poppins has tall ascenders, so give the label an explicit line height or it gets clipped.
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
        headerTitleStyle: { fontFamily: fonts.semibold, color: colors.brand, fontSize: 18 },
        headerShadowVisible: true,
        headerRight: () => (
          <View style={{ marginRight: 16 }}>
            <EmergencyButton compact />
          </View>
        ),
        sceneStyle: { backgroundColor: colors.page },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarLabel: "Home",
          tabBarIcon: icon("home"),
          headerTitle: () => <Logo size={34} subtitle="" />,
        }}
      />
      <Tabs.Screen name="activity" options={{ title: "Activity", tabBarIcon: icon("activity") }} />
      <Tabs.Screen name="estate-map" options={{ title: "Estate Map", tabBarLabel: "Map", tabBarIcon: icon("map") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: icon("user") }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: icon("grid"), tabBarBadge: unread.count > 0 ? (unread.count > 99 ? "99+" : unread.count) : undefined }} />
    </Tabs>
  );
}
