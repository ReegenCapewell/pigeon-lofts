"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  exact?: boolean;
};

export default function NavLink({ href, children, exact }: Props) {
  const pathname = usePathname();

  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`relative px-3 py-1.5 rounded-lg text-sm transition ${
        isActive
          ? "text-emerald-600 dark:text-emerald-400 font-medium"
          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800/60"
      }`}
    >
      {children}
      {isActive ? (
        <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-emerald-500" />
      ) : null}
    </Link>
  );
}
