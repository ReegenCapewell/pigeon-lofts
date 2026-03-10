import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    redirect("/auth");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    include: {
      lofts: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 5 },
      birds: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { loft: { select: { id: true, name: true, deletedAt: true } } },
      },
    },
  });

  const loftCount = user?.lofts.length ?? 0;
  const birdCount = user?.birds.length ?? 0;

  return (
    <main className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Welcome back — here&apos;s your flock at a glance.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Link
          href="/lofts"
          className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all p-5"
        >
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Lofts
          </p>
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-50">{loftCount}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3 font-medium group-hover:underline">
            Manage lofts →
          </p>
        </Link>

        <Link
          href="/birds"
          className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all p-5"
        >
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Birds
          </p>
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-50">{birdCount}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3 font-medium group-hover:underline">
            Manage birds →
          </p>
        </Link>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5 opacity-50">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Races
          </p>
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-50">—</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 font-medium">
            Coming soon
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/lofts"
          className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm transition"
        >
          <span className="text-base leading-none">+</span> New loft
        </Link>
        <Link
          href="/birds"
          className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium shadow-sm transition"
        >
          <span className="text-base leading-none">+</span> Add bird
        </Link>
      </div>

      {/* Recent sections */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent lofts */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Recent lofts</h2>
            <Link
              href="/lofts"
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition"
            >
              See all →
            </Link>
          </div>

          {user?.lofts?.length ? (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {user.lofts.map((loft) => (
                <li key={loft.id}>
                  <Link
                    href={`/lofts/${loft.id}`}
                    className="group flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-bold shrink-0">
                        {loft.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        {loft.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {new Date(loft.createdAt).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">No lofts yet.</p>
              <Link
                href="/lofts"
                className="text-sm px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm transition"
              >
                Create a loft
              </Link>
            </div>
          )}
        </div>

        {/* Recent birds */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Recent birds</h2>
            <Link
              href="/birds"
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition"
            >
              See all →
            </Link>
          </div>

          {user?.birds?.length ? (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {user.birds.map((bird) => {
                const loftValid = bird.loft && bird.loft.deletedAt === null;
                return (
                  <li key={bird.id}>
                    <Link
                      href={`/birds/${bird.id}`}
                      className="group flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs font-bold shrink-0">
                          🐦
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                            {bird.ring}
                            {bird.name ? (
                              <span className="font-normal text-slate-400 dark:text-slate-500"> – {bird.name}</span>
                            ) : null}
                          </span>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {loftValid ? bird.loft!.name : (
                              <span className="text-amber-500 dark:text-amber-400">Unassigned</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                        {new Date(bird.createdAt).toLocaleDateString()}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">No birds yet.</p>
              <Link
                href="/birds"
                className="text-sm px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm transition"
              >
                Add a bird
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
