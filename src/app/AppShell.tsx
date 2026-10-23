"use client";

import { ReactNode } from "react";
import NavLink from "@/components/NavLink";
import UserMenu from "@/components/UserMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { usePathname } from "next/navigation";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // No app navigation on the login page or on public shared pedigrees.
  const hideChrome = pathname === "/auth" || pathname.startsWith("/p/");
  // Pedigree trees need more width than the usual page.
  const wide = /^\/birds\/[^/]+\/pedigree/.test(pathname);

  if (hideChrome) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="print:hidden sticky top-0 z-30 border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
        <div className={`mx-auto ${wide ? "max-w-6xl" : "max-w-4xl"} px-4 sm:px-6 py-3 flex items-center justify-between gap-2`}>
          {/* Name hidden on phones so the four menu links fit */}
          <span className="hidden sm:inline text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            LoftTracker
          </span>

          <div className="flex items-center gap-1 sm:gap-4 ml-auto sm:ml-0">
            <nav className="flex gap-0.5 text-sm">
              <NavLink href="/" exact>Home</NavLink>
              <NavLink href="/lofts">Lofts</NavLink>
              <NavLink href="/birds">Birds</NavLink>
              <NavLink href="/health">Health</NavLink>
            </nav>
            <div className="flex items-center gap-0.5">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className={`mx-auto ${wide ? "max-w-6xl" : "max-w-4xl"} px-6 py-10 print:max-w-none print:p-0`}>{children}</div>
      </main>

      <footer className="print:hidden text-xs text-slate-400 dark:text-slate-600 border-t border-slate-100 dark:border-slate-800/60">
        <div className={`mx-auto ${wide ? "max-w-6xl" : "max-w-4xl"} px-6 py-4`}>
          Built for Dad&apos;s racing pigeons
        </div>
      </footer>
    </div>
  );
}
