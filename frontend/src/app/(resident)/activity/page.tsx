"use client";

import { useState } from "react";
import { Card, ErrorState, LoadingState, cx, formatTime } from "@/components/ui";
import { api } from "@/lib/api";
import { useData } from "@/lib/use-data";

export default function ActivityPage() {
  const [date, setDate] = useState("");
  const { data: activities, error, loading } = useData(() => api.getActivities(date || undefined), [date]);

  return (
    <div className="space-y-6 lg:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-xl font-semibold text-brand">Activity</h1>
        <label className="flex items-center gap-3 text-sm">
          <span className="text-muted">Filter by date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-line bg-white px-3 py-1.5 outline-none focus:border-brand"
          />
          {date && <button onClick={() => setDate("")} className="text-brand hover:underline">Clear</button>}
        </label>
      </div>

      <Card className="min-h-[28rem] overflow-hidden">
        <h2 className="bg-[#e1e4eb] px-6 py-4 sm:text-lg">Family Check in and Out Activity</h2>
        {loading ? (
          <LoadingState />
        ) : error || !activities ? (
          <div className="p-6"><ErrorState message={error ?? "Couldn't load activity."} /></div>
        ) : activities.length === 0 ? (
          <p className="py-16 text-center text-muted">No check-ins or check-outs {date ? "on this date" : "yet"}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] sm:text-lg">
              <thead>
                <tr>
                  {["Name", "Date", "Out", "Out With", "In", "In With"].map((h, i) => (
                    <th key={h} scope="col" className={cx("px-5 py-4 font-normal", i === 0 ? "text-left" : "text-center")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activities.map((a, i) => (
                  <tr key={a.id} className={i % 2 === 0 ? "bg-[#e1e4eb]" : undefined}>
                    <td className="px-5 py-3">{a.name}</td>
                    <td className="px-5 py-3 text-center text-muted">
                      {new Date(`${a.date}T00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-5 py-3 text-center">{formatTime(a.outAt)}</td>
                    <td className="px-5 py-3 text-center">{a.outWith ?? "—"}</td>
                    <td className="px-5 py-3 text-center">
                      {a.inAt ? formatTime(a.inAt) : <span className="rounded bg-amber-100 px-2 py-0.5 text-sm text-amber-800">Still out</span>}
                    </td>
                    <td className="px-5 py-3 text-center">{a.inWith ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
