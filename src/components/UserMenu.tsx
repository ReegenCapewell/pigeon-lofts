"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  // While loading, don't flash anything
  if (status === "loading") {
    return null;
  }

  // Not logged in: show Login / Signup link
  if (!session || !session.user?.email) {
    return (
      <Link href="/auth" className="hover:text-sky-300 text-sm">
        Login / Signup
      </Link>
    );
  }

  // Logged in: show user "avatar" and dropdown
  const email = session.user.email;
  const initial = email?.[0]?.toUpperCase() ?? "?";

  async function handleLogout() {
    // This will clear the session and redirect to /auth
    await signOut({ callbackUrl: "/auth" });
  }

  return (
    <div className="relative text-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-600 bg-slate-900 hover:border-sky-500 hover:text-sky-300 transition"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-xs font-semibold text-white">
          {initial}
        </span>
        <span className="hidden sm:inline max-w-[140px] truncate">
          {email}
        </span>
        <span className="text-[10px] text-slate-400">▼</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-lg shadow-slate-950/50 text-xs z-20">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-xl"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
