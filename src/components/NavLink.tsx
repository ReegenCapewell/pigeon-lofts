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
      className={`relative px-1 py-1 transition ${
        isActive ? "text-sky-300" : "text-slate-100 hover:text-sky-300"
      }`}
    >
      {children}
      {isActive ? (
        <span className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-sky-400" />
      ) : null}
    </Link>
  );
}
