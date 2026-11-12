"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar, Card, ErrorState, LoadingState, cx } from "@/components/ui";
import { api } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { ProfileContext } from "./profile-context";

const TABS = [
  { href: "/profile", label: "About" },
  { href: "/profile/family", label: "Family Members" },
  { href: "/profile/properties", label: "Properties" },
  { href: "/profile/settings", label: "Settings" },
];

export default function ProfileLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: profile, setData: setProfile, error, loading } = useData(api.getProfile);

  if (loading) return <LoadingState />;
  if (error || !profile) return <ErrorState message={error ?? "Couldn't load your profile."} />;

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      <div className="space-y-8 lg:space-y-12">
        {/* Cover, avatar and identity */}
        <Card className="p-4 sm:p-6">
          <div className="h-32 overflow-hidden rounded bg-brand-soft sm:h-44 lg:h-56">
            {profile.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.coverUrl} alt="" className="size-full object-cover" />
            )}
          </div>
          <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-end sm:gap-8 sm:px-6">
            <Avatar name={profile.name} src={profile.avatarUrl} size={104} className="-mt-12 border-4 border-white sm:-mt-10" />
            <div className="sm:pb-1">
              <h1 className="text-xl text-brand sm:text-2xl">{profile.name}</h1>
              <p className="text-muted">{profile.residentCode}</p>
            </div>
            <div className="sm:ml-8 sm:pb-1">
              <p className="break-all text-lg sm:text-2xl">{profile.email}</p>
              <p className="text-muted">Email</p>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Card className="p-4 sm:p-8">
          <nav aria-label="Profile sections" className="-mx-4 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
            <ul className="flex min-w-max gap-2 sm:gap-10">
              {TABS.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <li key={tab.href}>
                    <Link
                      href={tab.href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "-mb-px block border-b-4 px-3 pb-2 sm:px-5 sm:text-lg",
                        active ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink",
                      )}
                    >
                      {tab.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="pt-6">{children}</div>
        </Card>
      </div>
    </ProfileContext.Provider>
  );
}
