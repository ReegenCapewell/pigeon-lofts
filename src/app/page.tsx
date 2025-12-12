import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // If not logged in, go to auth page
  if (!session || !session.user?.email) {
    redirect("/auth");
  }

  // Logged in: fetch stats for this user
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      lofts: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      birds: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  const loftCount = user?.lofts.length ?? 0;
  const birdCount = user?.birds.length ?? 0;

  return (
    <main className="space-y-6">
      {/* Header card */}
      <section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-50 mb-1">
            Hi{session.user.email ? `, ${session.user.email}` : ""} 👋
          </h1>
          <p className="text-sm text-slate-300">
            Here&apos;s a quick overview of your lofts and birds.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link
            href="/lofts"
            className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-sky-500 bg-sky-500 text-white font-medium hover:bg-sky-400 transition"
          >
            Manage lofts
          </Link>
          <Link
            href="/birds"
            className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-slate-600 text-slate-100 hover:border-sky-500 hover:text-sky-300 transition"
          >
            Manage birds
          </Link>
        </div>
      </section>

      {/* Stats + recent activity */}
      <section className="grid md:grid-cols-2 gap-4">
        {/* Stats cards */}
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-100">
            Overview (totals)
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-950 border border-slate-700 rounded-xl p-3">
              <p className="text-xs text-slate-400">Lofts</p>
              <p className="text-2xl font-semibold text-slate-50">
                {loftCount}
              </p>
            </div>
            <div className="bg-slate-950 border border-slate-700 rounded-xl p-3">
              <p className="text-xs text-slate-400">Birds</p>
              <p className="text-2xl font-semibold text-slate-50">
                {birdCount}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Use lofts to group birds by location or purpose (stock, racers,
            young birds, etc.).
          </p>
        </div>

        {/* Recent lofts + birds */}
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4 grid gap-3">
          {/* Recent lofts */}
          <div>
            <h2 className="text-sm font-semibold text-slate-100 mb-2">
              Recent lofts
            </h2>
            {user?.lofts && user.lofts.length > 0 ? (
              <ul className="space-y-1 text-xs text-slate-300">
                {user.lofts.map((loft) => (
                  <li
                    key={loft.id}
                    className="flex justify-between border border-slate-800 bg-slate-950 rounded-lg px-2 py-1.5"
                  >
                    <span>{loft.name}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(loft.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">
                No lofts yet.{" "}
                <Link
                  href="/lofts"
                  className="text-sky-400 hover:text-sky-300 underline"
                >
                  Create one
                </Link>
                .
              </p>
            )}
          </div>

          {/* Recent birds */}
          <div>
            <h2 className="text-sm font-semibold text-slate-100 mb-2">
              Recent birds
            </h2>
            {user?.birds && user.birds.length > 0 ? (
              <ul className="space-y-1 text-xs text-slate-300">
                {user.birds.map((bird) => (
                  <li
                    key={bird.id}
                    className="flex justify-between border border-slate-800 bg-slate-950 rounded-lg px-2 py-1.5"
                  >
                    <span>
                      {bird.ring}
                      {bird.name ? ` – ${bird.name}` : ""}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(bird.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">
                No birds yet.{" "}
                <Link
                  href="/birds"
                  className="text-sky-400 hover:text-sky-300 underline"
                >
                  Add one
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
