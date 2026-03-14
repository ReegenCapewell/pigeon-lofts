"use client";

import { ReactNode } from "react";
import NavLink from "@/components/NavLink";
import UserMenu from "@/components/UserMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { usePathname } from "next/navigation";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const hideChrome = pathname === "/auth";

  if (hideChrome) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-6 py-3 flex items-center justify-between">
          <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            LoftTracker
          </span>

          <div className="flex items-center gap-4">
            <nav className="flex gap-0.5 text-sm">
              <NavLink href="/" exact>Home</NavLink>
              <NavLink href="/lofts">Lofts</NavLink>
              <NavLink href="/birds">Birds</NavLink>
            </nav>
            <div className="flex items-center gap-0.5">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-6 py-10">{children}</div>
      </main>

      <footer className="text-xs text-slate-400 dark:text-slate-600 border-t border-slate-100 dark:border-slate-800/60">
        <div className="mx-auto max-w-4xl px-6 py-4">
          Built for Dad&apos;s racing pigeons
        </div>
      </footer>
    </div>
  );
}
