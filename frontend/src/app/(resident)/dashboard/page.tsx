"use client";

import { Banknote, DoorOpen, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Card, ErrorState, LoadingState, cx, formatTime } from "@/components/ui";
import { api } from "@/lib/api";
import { useData } from "@/lib/use-data";

function StatCard({ icon: Icon, value, label, href }: { icon: LucideIcon; value: string; label: string; href: string }) {
  return (
    <Link href={href} className="block transition-transform hover:-translate-y-0.5">
      <Card className="flex items-center gap-5 p-5 sm:p-6">
        <span className="flex size-16 shrink-0 items-center justify-center rounded bg-brand-soft text-brand sm:size-20">
          <Icon size={34} strokeWidth={2.2} />
        </span>
        <span>
          <span className="block text-2xl font-semibold sm:text-3xl">{value}</span>
          <span className="block text-muted sm:text-lg">{label}</span>
        </span>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { data, error, loading } = useData(api.getDashboard);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [showAll, setShowAll] = useState(false);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "Couldn't load your dashboard."} />;

  const { stats, reminders, updates } = data;
  const visibleReminders = showAll ? reminders : reminders.slice(0, 4);
  const update = updates[0];

  return (
    <div className="space-y-8 lg:space-y-14">
      <h1 className="sr-only">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-[1fr_1.3fr_1fr] xl:gap-8">
        <StatCard icon={UserRound} value={String(stats.neighbors)} label="Neighbors" href="/estate-map" />
        <StatCard icon={Banknote} value={`NGN ${stats.totalPayments.toLocaleString("en-NG")}`} label="Total Payment Made" href="/finance" />
        <StatCard icon={DoorOpen} value={String(stats.familyActivities)} label="Family Activities" href="/activity" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2 xl:gap-8">
        {/* Reminders */}
        <Card className="flex flex-col p-5 sm:p-6">
          <h2 className="mb-5 text-center text-lg font-semibold text-brand">Reminder</h2>
          {reminders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No reminders right now.</p>
          ) : (
            <ul className="space-y-6">
              {visibleReminders.map((r) => {
                const isDone = done[r.id] ?? r.done;
                return (
                  <li key={r.id} className="flex gap-4">
                    <button
                      onClick={() => {
                        setDone((d) => ({ ...d, [r.id]: !isDone }));
                        api.setReminderDone(r.id, !isDone).catch(() => setDone((d) => ({ ...d, [r.id]: isDone })));
                      }}
                      aria-pressed={isDone}
                      aria-label={isDone ? "Mark as not done" : "Mark as done"}
                      className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-brand"
                    >
                      <span className={cx("size-7 rounded-full", isDone ? "bg-brand-soft" : "bg-brand")} />
                    </button>
                    <div className="flex-1">
                      <p className={cx("font-semibold", isDone && "text-muted line-through")}>{r.text}</p>
                      <p className="text-right text-muted">{formatTime(r.time)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {reminders.length > 4 && (
            <button onClick={() => setShowAll((s) => !s)} className="mt-6 self-end rounded bg-brand px-5 py-2 text-sm font-medium text-white">
              {showAll ? "Show less" : "View all"}
            </button>
          )}
        </Card>

        {/* Latest update from the estate admin */}
        <Card className="overflow-hidden p-5 sm:p-6">
          {update ? (
            <article>
              {update.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={update.imageUrl} alt="" className="aspect-[5/3] w-full rounded object-cover" />
              )}
              <div className="mt-4 flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-semibold sm:text-xl">
                  Update From <span className="text-brand">{update.author}</span>
                </h2>
                <time className="shrink-0 text-muted/60 sm:text-lg">{formatTime(update.postedAt)}</time>
              </div>
              <p className="mt-2 leading-relaxed text-muted sm:text-lg">{update.body}</p>
            </article>
          ) : (
            <p className="py-6 text-center text-sm text-muted">No updates from the estate admin yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
