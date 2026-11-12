import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { AboutSection } from "@/components/profile/AboutSection";
import { FamilySection } from "@/components/profile/FamilySection";
import { PropertiesSection } from "@/components/profile/PropertiesSection";
import { SettingsSection } from "@/components/profile/SettingsSection";
import { colors } from "@/components/theme";
import { Avatar, Card, ErrorState, LoadingState, Screen, Txt } from "@/components/ui";
import { api, imageSource } from "@/lib/api";
import { useData } from "@/lib/use-data";

const TABS = [
  { key: "about", label: "About" },
  { key: "family", label: "Family Members" },
  { key: "properties", label: "Properties" },
  { key: "settings", label: "Settings" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function ProfileScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<TabKey>("about");
  const { data: profile, setData: setProfile, error, loading, refresh } = useData(api.getProfile);

  // Other screens can open a section directly, e.g. /profile?tab=settings
  useEffect(() => {
    if (TABS.some((t) => t.key === params.tab)) setTab(params.tab as TabKey);
  }, [params.tab]);

  if (loading) return <LoadingState />;
  if (error || !profile)
    return (
      <Screen>
        <ErrorState message={error ?? "Couldn't load your profile."} onRetry={refresh} />
      </Screen>
    );

  const cover = imageSource(profile.coverUrl);

  return (
    <Screen>
      {/* Cover, avatar and identity */}
      <Card style={{ padding: 12 }}>
        <View style={{ height: 130, borderRadius: 6, overflow: "hidden", backgroundColor: colors.brandSoft }}>
          {cover && <Image source={cover} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors />}
        </View>
        <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
          {profile.avatarUrl ? (
            <Image
              source={imageSource(profile.avatarUrl)!}
              style={{ width: 92, height: 92, borderRadius: 46, borderWidth: 4, borderColor: colors.white, marginTop: -46 }}
              accessibilityLabel={profile.name}
            />
          ) : (
            <Avatar name={profile.name} size={92} style={{ borderWidth: 4, borderColor: colors.white, marginTop: -46 }} />
          )}
          <Txt weight="medium" style={{ fontSize: 20, color: colors.brand, marginTop: 6 }} accessibilityRole="header">
            {profile.name}
          </Txt>
          <Txt style={{ color: colors.muted }}>{profile.residentCode}</Txt>
          <Txt style={{ marginTop: 8 }}>{profile.email}</Txt>
          <Txt style={{ color: colors.muted, fontSize: 13 }}>Email</Txt>
        </View>
      </Card>

      <Card style={{ overflow: "hidden" }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderColor: colors.line }}>
          <View style={{ flexDirection: "row", paddingHorizontal: 8 }} accessibilityRole="tablist">
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={{ paddingHorizontal: 12, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 3, borderColor: active ? colors.brand : "transparent" }}
                >
                  <Txt weight={active ? "medium" : "regular"} style={{ color: active ? colors.brand : colors.muted }}>
                    {t.label}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        <View style={{ padding: 16 }}>
          {tab === "about" && <AboutSection profile={profile} onSaved={setProfile} />}
          {tab === "family" && <FamilySection />}
          {tab === "properties" && <PropertiesSection />}
          {tab === "settings" && <SettingsSection />}
        </View>
      </Card>
    </Screen>
  );
}
