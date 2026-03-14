"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  if (status === "loading") return null;

  if (!session || !session.user?.email) {
    return (
      <Link
        href="/auth"
        className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-50 transition"
      >
        Login / Signup
      </Link>
    );
  }

  const email = session.user.email;
  const initial = email?.[0]?.toUpperCase() ?? "?";

  async function handleLogout() {
    await signOut({ callbackUrl: "/auth" });
  }

  return (
    <div className="relative text-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-emerald-500 dark:hover:border-emerald-500 transition"
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white">
          {initial}
        </span>
        <span className="hidden sm:inline max-w-[130px] truncate text-slate-700 dark:text-slate-300">
          {email}
        </span>
        <span className="text-[9px] text-slate-400 dark:text-slate-500">▼</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg shadow-black/10 dark:shadow-slate-950/50 text-xs z-20">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left px-3 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
