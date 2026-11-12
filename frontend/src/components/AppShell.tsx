"use client";

import {
  Activity,
  Banknote,
  Bell,
  Gauge,
  LogOut,
  Mail,
  Map as MapIcon,
  Menu,
  Search,
  Store,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, auth, isMockMode } from "@/lib/api";
import { EmergencyButton } from "./EmergencyButton";
import { Avatar, cx } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/finance", label: "Finance", icon: Banknote },
  { href: "/store", label: "Store", icon: Store },
  { href: "/messages", label: "Messages", icon: Mail, badge: 6 },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/estate-map", label: "Estate Map", icon: MapIcon },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/profile": "Profile",
  "/activity": "Activity",
  "/estate-map": "Estate Map",
  "/finance": "Finance",
  "/store": "Store",
  "/messages": "Messages",
};

export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold italic text-white">LE</span>
      <span className="leading-tight">
        <span className="block text-xl font-bold text-brand">LincolnEstate</span>
        <span className="block text-xs font-medium text-brand">Resident Dashboard</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop sidebar

  useEffect(() => setMenuOpen(false), [pathname]);

  // With a real backend, send signed-out visitors to the login page.
  useEffect(() => {
    if (!isMockMode && !auth.getToken()) router.replace("/login");
  }, [router]);

  const logout = async () => {
    await api.logout();
    router.push("/login");
  };

  const section = "/" + (pathname.split("/")[1] ?? "");
  const title = TITLES[section] ?? "";

  const toggleMenu = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) setCollapsed((c) => !c);
    else setMenuOpen((o) => !o);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-white px-4 shadow-[0_4px_12px_rgba(18,161,74,0.08)] sm:gap-6 lg:h-20 lg:px-6">
        <div className="hidden w-60 shrink-0 lg:block">
          <Logo />
        </div>
        <button onClick={toggleMenu} aria-label="Toggle menu" className="rounded p-1.5 text-brand hover:bg-brand-tint">
          <Menu size={28} />
        </button>
        <div className="lg:hidden">
          <span className="text-lg font-bold text-brand">LincolnEstate</span>
        </div>
        <span className="hidden text-lg font-medium text-brand xl:block">{title}</span>

        <form role="search" onSubmit={(e) => e.preventDefault()} className="hidden max-w-md flex-1 md:block lg:ml-6">
          <label className="flex items-center rounded border border-brand/40 bg-brand-soft px-3 py-1.5">
            <span className="sr-only">Search</span>
            <input placeholder="Search…" className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-brand/70" />
            <Search size={18} className="text-brand" />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-4 lg:gap-8">
          <button aria-label="Notifications, 20 unread" className="relative text-brand">
            <Bell size={26} fill="currentColor" />
            <span className="absolute -right-2 -top-1.5 rounded bg-danger px-1 text-[10px] font-semibold leading-4 text-white">20</span>
          </button>
          <Link href="/profile" aria-label="My profile">
            <Avatar name="David Onyemenam" size={44} className="rounded-lg" />
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Mobile drawer backdrop */}
        {menuOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)} />}

        {/* Sidebar */}
        <aside
          className={cx(
            "fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-white px-6 pb-6 pt-6 transition-transform lg:sticky lg:top-20 lg:z-0 lg:h-[calc(100vh-5rem)] lg:translate-x-0 lg:border-r lg:border-brand-tint lg:pt-10",
            menuOpen ? "translate-x-0" : "-translate-x-full",
            collapsed && "lg:hidden",
          )}
        >
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <nav className="space-y-4" aria-label="Main">
            {NAV.map(({ href, label, icon: Icon, badge }) => {
              const active = section === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex items-center gap-5 rounded px-6 py-2.5 text-lg font-bold text-white transition-colors",
                    active ? "bg-brand-dark ring-4 ring-brand-soft" : "bg-brand hover:bg-brand-dark",
                  )}
                >
                  <span className="relative">
                    <Icon size={26} />
                    {badge && (
                      <span className="absolute -right-2 -top-1.5 rounded-full bg-danger px-1 text-[9px] leading-3.5">{badge}</span>
                    )}
                  </span>
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col items-center gap-5 pt-8">
            <EmergencyButton />
            <button onClick={logout} className="flex items-center gap-2 text-xl font-bold text-brand hover:text-brand-dark">
              <LogOut size={24} className="rotate-180" /> Logout
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>

      {/* On phones the sidebar is hidden, so keep the emergency button one tap away */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-white/90 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <EmergencyButton className="w-full rounded-md bg-danger py-3 text-lg font-semibold text-white active:bg-red-700" />
      </div>
    </div>
  );
}
