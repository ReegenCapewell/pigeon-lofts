"use client";

import { ReactNode } from "react";
import NavLink from "@/components/NavLink";
import UserMenu from "@/components/UserMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { usePathname } from "next/navigation";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Hide header/footer on auth page (prevents logged-out users clicking into app pages)
  const hideChrome = pathname === "/auth";

  if (hideChrome) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
              LoftTracker
            </span>
          </div>

          <div className="flex items-center gap-5">
            <nav className="flex gap-1 text-sm">
              <NavLink href="/" exact>
                Home
              </NavLink>
              <NavLink href="/lofts">Lofts</NavLink>
              <NavLink href="/birds">Birds</NavLink>
            </nav>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500">
        <div className="mx-auto max-w-5xl px-4 py-3">
          Built for Dad&apos;s racing pigeons
        </div>
      </footer>
    </div>
  );
}
