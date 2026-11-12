import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { colors } from "@/components/theme";
import { Card, Chip, EmptyState, ErrorState, LoadingState, Screen, Txt, formatTime } from "@/components/ui";
import { api } from "@/lib/api";
import type { Activity } from "@/lib/types";
import { useData } from "@/lib/use-data";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shortDate = (date: string) => new Date(`${date}T00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** The last two weeks as quick date filters: easier on a phone than a calendar picker. */
function useRecentDays(count = 14) {
  return useMemo(() => {
    const today = new Date();
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      return { value: iso(d), label: i === 0 ? "Today" : i === 1 ? "Yesterday" : shortDate(iso(d)) };
    });
  }, [count]);
}

function Movement({ label, time, withWhom }: { label: string; time: string | null; withWhom: string | null }) {
  return (
    <View style={{ flex: 1 }}>
      <Txt style={{ color: colors.muted, fontSize: 12 }}>{label}</Txt>
      {time ? (
        <Txt weight="medium">{formatTime(time)}</Txt>
      ) : (
        <View style={{ alignSelf: "flex-start", backgroundColor: colors.amberSoft, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
          <Txt style={{ color: colors.amber, fontSize: 13 }}>Still out</Txt>
        </View>
      )}
      {withWhom && <Txt style={{ color: colors.muted, fontSize: 13 }}>with {withWhom}</Txt>}
    </View>
  );
}

function ActivityRow({ a, shaded }: { a: Activity; shaded: boolean }) {
  return (
    <View style={{ padding: 16, gap: 10, backgroundColor: shaded ? "#f1f2f5" : colors.white }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Txt weight="semibold">{a.name}</Txt>
        <Txt style={{ color: colors.muted, fontSize: 13 }}>{shortDate(a.date)}</Txt>
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Movement label="Out" time={a.outAt} withWhom={a.outWith} />
        <Movement label="In" time={a.inAt} withWhom={a.inWith} />
      </View>
    </View>
  );
}

export default function ActivityScreen() {
  const [date, setDate] = useState("");
  const days = useRecentDays();
  const { data: activities, error, loading, refreshing, refresh } = useData(() => api.getActivities(date || undefined), [date]);

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -16 }}>
        <View style={{ width: 8 }} />
        <Chip label="All" active={!date} onPress={() => setDate("")} />
        {days.map((d) => (
          <Chip key={d.value} label={d.label} active={date === d.value} onPress={() => setDate(d.value)} />
        ))}
        <View style={{ width: 8 }} />
      </ScrollView>

      <Card style={{ overflow: "hidden" }}>
        <Txt weight="medium" style={{ backgroundColor: "#e1e4eb", paddingHorizontal: 16, paddingVertical: 12 }} accessibilityRole="header">
          Family Check in and Out Activity
        </Txt>
        {loading ? (
          <LoadingState />
        ) : error || !activities ? (
          <View style={{ padding: 16 }}>
            <ErrorState message={error ?? "Couldn't load activity."} onRetry={refresh} />
          </View>
        ) : activities.length === 0 ? (
          <EmptyState>No check-ins or check-outs {date ? "on this date" : "yet"}.</EmptyState>
        ) : (
          activities.map((a, i) => <ActivityRow key={a.id} a={a} shaded={i % 2 === 1} />)
        )}
      </Card>
    </Screen>
  );
}
