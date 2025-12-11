"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import UserMenu from "@/components/UserMenu";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/auth");

  // 🔒 On /auth: no top nav, just the page content (and footer)
  if (isAuthPage) {
    return (
      <div className="min-h-screen flex flex-col">
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

  // ✅ On all other pages: show header + nav + footer
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">
              🐦 LoftTracker
            </span>
          </div>
          <nav className="flex gap-4 text-sm items-center">
            <Link href="/" className="hover:text-sky-300">
              Home
            </Link>
            <Link href="/lofts" className="hover:text-sky-300">
              Lofts
            </Link>
            <Link href="/birds" className="hover:text-sky-300">
              Birds
            </Link>

            {/* Right side: login link OR user dropdown */}
            <UserMenu />
          </nav>
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
