import { Feather } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import type { ComponentProps } from "react";
import { useState } from "react";
import { Image, Pressable, View } from "react-native";
import { EmergencyButton } from "@/components/EmergencyButton";
import { colors } from "@/components/theme";
import { Card, ErrorState, LoadingState, Screen, Txt, formatTime } from "@/components/ui";
import { api, imageSource } from "@/lib/api";
import { useData } from "@/lib/use-data";

function StatCard({ icon, value, label, href }: { icon: ComponentProps<typeof Feather>["name"]; value: string; label: string; href: Href }) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(href)} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`}>
      {({ pressed }) => (
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 16, padding: 16, opacity: pressed ? 0.85 : 1 }}>
          <View style={{ width: 56, height: 56, borderRadius: 6, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <Feather name={icon} size={28} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt weight="semibold" style={{ fontSize: 22 }}>
              {value}
            </Txt>
            <Txt style={{ color: colors.muted }}>{label}</Txt>
          </View>
          <Feather name="chevron-right" size={20} color={colors.line} />
        </Card>
      )}
    </Pressable>
  );
}

export default function DashboardScreen() {
  const { data, error, loading, refreshing, refresh } = useData(api.getDashboard);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [showAll, setShowAll] = useState(false);

  if (loading) return <LoadingState />;
  if (error || !data)
    return (
      <Screen>
        <ErrorState message={error ?? "Couldn't load your dashboard."} onRetry={refresh} />
      </Screen>
    );

  const { stats, reminders, updates } = data;
  const visibleReminders = showAll ? reminders : reminders.slice(0, 4);
  const update = updates[0];
  const updateImage = imageSource(update?.imageUrl);

  const toggle = (id: number, isDone: boolean) => {
    setDone((d) => ({ ...d, [id]: !isDone }));
    api.setReminderDone(id, !isDone).catch(() => setDone((d) => ({ ...d, [id]: isDone })));
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <StatCard icon="users" value={String(stats.neighbors)} label="Neighbors" href="/estate-map" />
      <StatCard icon="credit-card" value={`NGN ${stats.totalPayments.toLocaleString("en-NG")}`} label="Total Payment Made" href="/finance" />
      <StatCard icon="log-out" value={String(stats.familyActivities)} label="Family Activities" href="/activity" />

      {/* Reminders */}
      <Card style={{ padding: 16 }}>
        <Txt weight="semibold" style={{ fontSize: 18, color: colors.brand, textAlign: "center", marginBottom: 16 }} accessibilityRole="header">
          Reminder
        </Txt>
        {reminders.length === 0 ? (
          <Txt style={{ color: colors.muted, textAlign: "center", paddingVertical: 16 }}>No reminders right now.</Txt>
        ) : (
          <View style={{ gap: 18 }}>
            {visibleReminders.map((r) => {
              const isDone = done[r.id] ?? r.done;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => toggle(r.id, isDone)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isDone }}
                  accessibilityLabel={r.text}
                  style={{ flexDirection: "row", gap: 14 }}
                >
                  <View
                    style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.brand, alignItems: "center", justifyContent: "center", marginTop: 2 }}
                  >
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: isDone ? colors.brandSoft : colors.brand }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt
                      weight="semibold"
                      style={[{ fontSize: 14 }, isDone && { color: colors.muted, textDecorationLine: "line-through" }]}
                    >
                      {r.text}
                    </Txt>
                    <Txt style={{ color: colors.muted, textAlign: "right", fontSize: 13 }}>{formatTime(r.time)}</Txt>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
        {reminders.length > 4 && (
          <Pressable onPress={() => setShowAll((s) => !s)} accessibilityRole="button" style={{ alignSelf: "flex-end", marginTop: 16 }}>
            <Txt weight="medium" style={{ color: colors.brand }}>
              {showAll ? "Show less" : "View all"}
            </Txt>
          </Pressable>
        )}
      </Card>

      {/* Latest update from the estate admin */}
      <Card style={{ padding: 16 }}>
        {update ? (
          <View>
            {updateImage && <Image source={updateImage} style={{ width: "100%", aspectRatio: 5 / 3, borderRadius: 6 }} resizeMode="cover" accessibilityIgnoresInvertColors />}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 12, gap: 12 }}>
              <Txt weight="semibold" style={{ fontSize: 16, flex: 1 }} accessibilityRole="header">
                Update From <Txt weight="semibold" style={{ fontSize: 16, color: colors.brand }}>{update.author}</Txt>
              </Txt>
              <Txt style={{ color: colors.muted, fontSize: 13 }}>{formatTime(update.postedAt)}</Txt>
            </View>
            <Txt style={{ color: colors.muted, marginTop: 6, lineHeight: 22 }}>{update.body}</Txt>
          </View>
        ) : (
          <Txt style={{ color: colors.muted, textAlign: "center", paddingVertical: 16 }}>No updates from the estate admin yet.</Txt>
        )}
      </Card>

      <EmergencyButton />
    </Screen>
  );
}
