"use client";

import { ReactNode } from "react";
import NavLink from "@/components/NavLink";
import UserMenu from "@/components/UserMenu";
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
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">🐦 LoftTracker</span>
          </div>

          <div className="flex items-center gap-6">
            <nav className="flex gap-4 text-sm">
              <NavLink href="/" exact>
                Home
              </NavLink>
              <NavLink href="/lofts">
                Lofts
              </NavLink>
              <NavLink href="/birds">
                Birds
              </NavLink>
            </nav>

            <UserMenu />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
      </main>

      <footer className="border-t border-slate-800 text-xs text-slate-500">
        <div className="mx-auto max-w-5xl px-4 py-3">
          Built for Dad&apos;s racing pigeons 🐦
        </div>
      </footer>
    </div>
  );
}
