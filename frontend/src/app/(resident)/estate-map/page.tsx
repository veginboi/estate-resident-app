"use client";

import { useMemo, useState } from "react";
import { Card, ErrorState, LoadingState, cx } from "@/components/ui";
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

export default function EstateMapPage() {
  const { data: map, error, loading } = useData(api.getEstateMap);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const mine = map?.plots.find((p) => p.isMine);
  const selected = map?.plots.find((p) => p.id === (selectedId ?? mine?.id)) ?? null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !map) return new Set<string>();
    return new Set(map.plots.filter((p) => `${p.label} ${p.owner ?? ""}`.toLowerCase().includes(q)).map((p) => p.id));
  }, [query, map]);

  if (loading) return <LoadingState />;
  if (error || !map) return <ErrorState message={error ?? "Couldn't load the estate map."} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-xl font-semibold text-brand">Estate Map</h1>
        <label className="w-full sm:w-72">
          <span className="sr-only">Find a plot or neighbour</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a plot or neighbour…"
            className="w-full rounded border border-brand/40 bg-brand-soft px-3 py-2 text-sm outline-none placeholder:text-brand/70 focus:border-brand"
          />
        </label>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <Card className="p-3 sm:p-5">
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${map.width} ${map.height}`} className="min-w-[640px] w-full rounded bg-[#f1f3ee]" role="img" aria-label="Map of LincolnEstate">
              {map.roads.map((r, i) => {
                const horizontal = r.w > r.h;
                return (
                  <g key={i}>
                    <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#9aa0a6" />
                    {horizontal ? (
                      <line x1={r.x} x2={r.x + r.w} y1={r.y + r.h / 2} y2={r.y + r.h / 2} stroke="#fff" strokeWidth={2} strokeDasharray="14 10" />
                    ) : (
                      <line y1={r.y} y2={r.y + r.h} x1={r.x + r.w / 2} x2={r.x + r.w / 2} stroke="#fff" strokeWidth={2} strokeDasharray="14 10" />
                    )}
                    {r.name && (
                      <text
                        x={horizontal ? r.x + 140 : r.x + r.w / 2}
                        y={horizontal ? r.y + r.h / 2 - 6 : r.y + 560}
                        fill="#fff"
                        fontSize={12}
                        fontWeight={600}
                        textAnchor="middle"
                        transform={horizontal ? undefined : `rotate(-90 ${r.x + r.w / 2} ${r.y + 560})`}
                      >
                        {r.name}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Main gate */}
              <g>
                <rect x={0} y={292} width={10} height={56} fill="#ff1a1a" />
                <text x={16} y={286} fontSize={12} fontWeight={600} fill="#ff1a1a">Main Gate</text>
              </g>

              {map.plots.map((p) => {
                const s = styleFor(p);
                const isSelected = selected?.id === p.id;
                const isMatch = matches.has(p.id);
                const dimmed = matches.size > 0 && !isMatch;
                return (
                  <g
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${p.label}${p.owner ? `, ${p.owner}` : ""}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedId(p.id)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelectedId(p.id))}
                    className="cursor-pointer outline-none"
                    opacity={dimmed ? 0.35 : 1}
                  >
                    <rect
                      x={p.x}
                      y={p.y}
                      width={p.w}
                      height={p.h}
                      rx={6}
                      fill={s.fill}
                      stroke={isSelected || isMatch ? "#111" : s.stroke}
                      strokeWidth={isSelected ? 4 : isMatch ? 3 : 1.5}
                    />
                    <text
                      x={p.x + p.w / 2}
                      y={p.y + p.h / 2 + 5}
                      textAnchor="middle"
                      fontSize={p.kind === "residential" ? 20 : 16}
                      fontWeight={600}
                      fill={p.isMine ? "#fff" : "#333"}
                      pointerEvents="none"
                    >
                      {p.label}
                    </text>
                    {p.isMine && (
                      <text x={p.x + p.w / 2} y={p.y + p.h / 2 + 26} textAnchor="middle" fontSize={14} fill="#fff" pointerEvents="none">
                        You
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            {Object.values(KIND_STYLE).map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                <span className="size-4 rounded-sm border" style={{ background: s.fill, borderColor: s.stroke }} />
                {s.label}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="h-fit p-5">
          {selected ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">{styleFor(selected).label}</p>
              <h2 className="text-2xl font-semibold text-brand">{selected.label}</h2>
              {selected.owner && (
                <p>
                  <span className="text-muted">Resident: </span>
                  {selected.owner}
                </p>
              )}
              {selected.description && <p className="text-muted">{selected.description}</p>}
              {selected.kind === "residential" && !selected.owner && <p className="text-muted">No registered resident.</p>}
              {selected.id !== mine?.id && mine && (
                <button onClick={() => setSelectedId(mine.id)} className="text-sm text-brand hover:underline">
                  Back to your home ({mine.label})
                </button>
              )}
            </div>
          ) : (
            <p className="text-muted">Select a plot to see its details.</p>
          )}

          {matches.size > 0 && (
            <div className="mt-6 border-t border-line pt-4">
              <p className="mb-2 text-sm text-muted">{matches.size} match{matches.size === 1 ? "" : "es"}</p>
              <ul className="space-y-1">
                {map.plots.filter((p) => matches.has(p.id)).map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelectedId(p.id)}
                      className={cx("w-full rounded px-2 py-1 text-left text-sm hover:bg-brand-tint", selected?.id === p.id && "bg-brand-tint")}
                    >
                      <strong>{p.label}</strong>
                      {p.owner && <span className="text-muted"> · {p.owner}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
