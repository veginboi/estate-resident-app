import { Feather } from "@expo/vector-icons";
import { useMemo, useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";
import { colors, fonts } from "@/components/theme";
import { Card, ErrorState, LoadingState, Screen, Txt } from "@/components/ui";
import { api } from "@/lib/api";
import type { MapPlot, PlotKind } from "@/lib/types";
import { useData } from "@/lib/use-data";

const KIND_STYLE: Record<PlotKind | "mine", { fill: string; stroke: string; label: string }> = {
  mine: { fill: "#12a14a", stroke: "#0d8a3e", label: "Your home" },
  residential: { fill: "#ffffff", stroke: "#b8b8b8", label: "Residential plot" },
  amenity: { fill: "#c9f7d4", stroke: "#12a14a", label: "Amenity" },
  security: { fill: "#ffe1e1", stroke: "#ff1a1a", label: "Security" },
  green: { fill: "#dff0c8", stroke: "#8bbf5a", label: "Green space" },
};

const styleFor = (p: MapPlot) => KIND_STYLE[p.isMine ? "mine" : p.kind];

// The map is drawn at a fixed width and scrolls sideways, so plot labels stay big enough to read and tap.
const MAP_WIDTH = 680;

export default function EstateMapScreen() {
  const { data: map, error, loading, refresh } = useData(api.getEstateMap);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const mapScroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrolledToHome = useRef(false);

  const mine = map?.plots.find((p) => p.isMine);
  const selected = map?.plots.find((p) => p.id === (selectedId ?? mine?.id)) ?? null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !map) return new Set<string>();
    return new Set(map.plots.filter((p) => `${p.label} ${p.owner ?? ""}`.toLowerCase().includes(q)).map((p) => p.id));
  }, [query, map]);

  if (loading) return <LoadingState />;
  if (error || !map)
    return (
      <Screen>
        <ErrorState message={error ?? "Couldn't load the estate map."} onRetry={refresh} />
      </Screen>
    );

  const height = (MAP_WIDTH * map.height) / map.width;

  // Open the map scrolled so the resident's own plot is in view.
  const scrollToHome = (viewportWidth: number) => {
    if (!mine || scrolledToHome.current) return;
    scrolledToHome.current = true;
    const homeCenter = ((mine.x + mine.w / 2) * MAP_WIDTH) / map.width;
    mapScroll.current?.scrollTo({ x: Math.max(0, Math.min(homeCenter - viewportWidth / 2, MAP_WIDTH - viewportWidth)), animated: false });
  };

  return (
    <Screen>
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "rgba(18,161,74,0.4)", backgroundColor: colors.brandSoft, borderRadius: 6, paddingHorizontal: 12 }}
      >
        <Feather name="search" size={18} color={colors.brand} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Find a plot or neighbour…"
          placeholderTextColor="rgba(18,161,74,0.7)"
          accessibilityLabel="Find a plot or neighbour"
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={{ flex: 1, paddingVertical: 10, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }}
        />
      </View>

      <Card style={{ padding: 10 }}>
        <ScrollView ref={mapScroll} horizontal showsHorizontalScrollIndicator onLayout={(e) => scrollToHome(e.nativeEvent.layout.width)}>
          <Svg width={MAP_WIDTH} height={height} viewBox={`0 0 ${map.width} ${map.height}`} accessibilityLabel="Map of LincolnEstate">
            <Rect x={0} y={0} width={map.width} height={map.height} rx={8} fill="#f1f3ee" />
            {map.roads.map((r, i) => {
              const horizontal = r.w > r.h;
              const labelX = horizontal ? r.x + 140 : r.x + r.w / 2;
              const labelY = horizontal ? r.y + r.h / 2 - 6 : r.y + 560;
              return (
                <G key={i}>
                  <Rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#9aa0a6" />
                  {horizontal ? (
                    <Line x1={r.x} x2={r.x + r.w} y1={r.y + r.h / 2} y2={r.y + r.h / 2} stroke="#fff" strokeWidth={2} strokeDasharray="14 10" />
                  ) : (
                    <Line y1={r.y} y2={r.y + r.h} x1={r.x + r.w / 2} x2={r.x + r.w / 2} stroke="#fff" strokeWidth={2} strokeDasharray="14 10" />
                  )}
                  {r.name && (
                    <SvgText fontFamily={fonts.semibold}
                      x={labelX}
                      y={labelY}
                      fill="#fff"
                      fontSize={13}
                      fontWeight="600"
                      textAnchor="middle"
                      rotation={horizontal ? 0 : -90}
                      originX={labelX}
                      originY={labelY}
                    >
                      {r.name}
                    </SvgText>
                  )}
                </G>
              );
            })}

            {/* Main gate */}
            <Rect x={0} y={292} width={10} height={56} fill="#ff1a1a" />
            <SvgText fontFamily={fonts.semibold} x={16} y={286} fontSize={13} fontWeight="600" fill="#ff1a1a">
              Main Gate
            </SvgText>

            {map.plots.map((p) => {
              const s = styleFor(p);
              const isSelected = selected?.id === p.id;
              const isMatch = matches.has(p.id);
              const dimmed = matches.size > 0 && !isMatch;
              return (
                <G key={p.id} onPress={() => setSelectedId(p.id)} opacity={dimmed ? 0.35 : 1}>
                  <Rect
                    x={p.x}
                    y={p.y}
                    width={p.w}
                    height={p.h}
                    rx={6}
                    fill={s.fill}
                    stroke={isSelected || isMatch ? "#111" : s.stroke}
                    strokeWidth={isSelected ? 4 : isMatch ? 3 : 1.5}
                  />
                  <SvgText fontFamily={fonts.semibold}
                    x={p.x + p.w / 2}
                    y={p.y + p.h / 2 + 6}
                    textAnchor="middle"
                    fontSize={p.kind === "residential" ? 22 : 17}
                    fontWeight="600"
                    fill={p.isMine ? "#fff" : "#333"}
                  >
                    {p.label}
                  </SvgText>
                  {p.isMine && (
                    <SvgText fontFamily={fonts.semibold} x={p.x + p.w / 2} y={p.y + p.h / 2 + 28} textAnchor="middle" fontSize={15} fill="#fff">
                      You
                    </SvgText>
                  )}
                </G>
              );
            })}
          </Svg>
        </ScrollView>

        <Txt style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 8 }}>Swipe sideways to see the whole estate</Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 6, marginTop: 10, paddingHorizontal: 4 }}>
          {Object.values(KIND_STYLE).map((s) => (
            <View key={s.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 14, height: 14, borderRadius: 3, borderWidth: 1, backgroundColor: s.fill, borderColor: s.stroke }} />
              <Txt style={{ color: colors.muted, fontSize: 12 }}>{s.label}</Txt>
            </View>
          ))}
        </View>
      </Card>

      {matches.size > 0 && (
        <Card style={{ padding: 8 }}>
          <Txt style={{ color: colors.muted, fontSize: 13, padding: 8 }}>
            {matches.size} match{matches.size === 1 ? "" : "es"}
          </Txt>
          {map.plots
            .filter((p) => matches.has(p.id))
            .map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setSelectedId(p.id)}
                accessibilityRole="button"
                style={{ padding: 8, borderRadius: 6, backgroundColor: selected?.id === p.id ? colors.brandTint : "transparent" }}
              >
                <Txt>
                  <Txt weight="semibold">{p.label}</Txt>
                  {p.owner && <Txt style={{ color: colors.muted }}> · {p.owner}</Txt>}
                </Txt>
              </Pressable>
            ))}
        </Card>
      )}

      <Card style={{ padding: 16, gap: 6 }}>
        {selected ? (
          <>
            <Txt style={{ color: colors.muted, fontSize: 13 }}>{styleFor(selected).label}</Txt>
            <Txt weight="semibold" style={{ fontSize: 22, color: colors.brand }} accessibilityRole="header">
              {selected.label}
            </Txt>
            {selected.owner && (
              <Txt>
                <Txt style={{ color: colors.muted }}>Resident: </Txt>
                {selected.owner}
              </Txt>
            )}
            {selected.description && <Txt style={{ color: colors.muted }}>{selected.description}</Txt>}
            {selected.kind === "residential" && !selected.owner && <Txt style={{ color: colors.muted }}>No registered resident.</Txt>}
            {selected.id !== mine?.id && mine && (
              <Pressable onPress={() => setSelectedId(mine.id)} accessibilityRole="button" style={{ marginTop: 4 }}>
                <Txt style={{ color: colors.brand, fontSize: 14 }}>Back to your home ({mine.label})</Txt>
              </Pressable>
            )}
          </>
        ) : (
          <Txt style={{ color: colors.muted }}>Tap a plot to see its details.</Txt>
        )}
      </Card>
    </Screen>
  );
}
