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
      lofts: { orderBy: { createdAt: "desc" }, take: 5 },
      birds: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { loft: true },
      },
    },
  });

  const loftCount = user?.lofts.length ?? 0;
  const birdCount = user?.birds.length ?? 0;

  return (
    <main className="space-y-6">
{/* Header */}
<section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
  <div>
    <h1 className="text-2xl md:text-3xl font-semibold text-slate-50 mb-1">
      Dashboard
    </h1>
    <p className="text-sm text-slate-300">
      Quick overview of your lofts and birds.
    </p>
  </div>

  {/* Quick navigation */}
  <div className="flex gap-3 text-sm">
    <Link
      href="/lofts"
      className="px-4 py-2 rounded-full border border-slate-600 text-slate-100 hover:border-sky-500 hover:text-sky-300 transition"
    >
      View lofts →
    </Link>
    <Link
      href="/birds"
      className="px-4 py-2 rounded-full border border-slate-600 text-slate-100 hover:border-sky-500 hover:text-sky-300 transition"
    >
      View birds →
    </Link>
  </div>
</section>

{/* Stats */}
<section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
  <h2 className="text-sm font-semibold text-slate-100 mb-3">Totals</h2>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

    {/* Future-proof slots */}
    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 opacity-60">
      <p className="text-xs text-slate-400">Needs attention</p>
      <p className="text-2xl font-semibold text-slate-50">—</p>
    </div>

    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 opacity-60">
      <p className="text-xs text-slate-400">Races logged</p>
      <p className="text-2xl font-semibold text-slate-50">—</p>
    </div>
  </div>

  <p className="text-[11px] text-slate-500 mt-3">
    Totals update automatically as you add birds and assign them to lofts.
  </p>
</section>

      {/* Recent */}
      <section className="grid md:grid-cols-2 gap-4">
        {/* Recent lofts */}
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-100">Recent lofts</h2>
            <Link href="/lofts" className="text-xs text-sky-400 hover:text-sky-300">
              See all
            </Link>
          </div>

          {user?.lofts?.length ? (
            <ul className="space-y-2">
              {user.lofts.map((loft) => (
                <li key={loft.id}>
                  <Link
                    href={`/lofts/${loft.id}`}
                    className="block border border-slate-800 bg-slate-950 rounded-xl px-3 py-2 hover:border-sky-500 hover:text-sky-300 transition"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-100">{loft.name}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(loft.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Open loft dashboard →
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border border-slate-800 bg-slate-950 rounded-xl p-4 text-sm text-slate-300">
              <p className="mb-2">No lofts yet.</p>
              <Link
                href="/lofts"
                className="text-sky-400 hover:text-sky-300 underline"
              >
                Create your first loft
              </Link>
            </div>
          )}
        </div>

        {/* Recent birds */}
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-100">Recent birds</h2>
            <Link href="/birds" className="text-xs text-sky-400 hover:text-sky-300">
              See all
            </Link>
          </div>

          {user?.birds?.length ? (
            <ul className="space-y-2">
              {user.birds.map((bird) => (
                <li key={bird.id}>
                  <Link
                    href={`/birds/${bird.id}`}
                    className="block border border-slate-800 bg-slate-950 rounded-xl px-3 py-2 hover:border-sky-500 hover:text-sky-300 transition"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-100">
                        {bird.ring}
                        {bird.name ? (
                          <span className="text-slate-400"> – {bird.name}</span>
                        ) : null}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(bird.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {bird.loft ? `Loft: ${bird.loft.name}` : "Unassigned"} • Open bird profile →
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border border-slate-800 bg-slate-950 rounded-xl p-4 text-sm text-slate-300">
              <p className="mb-2">No birds yet.</p>
              <Link
                href="/birds"
                className="text-sky-400 hover:text-sky-300 underline"
              >
                Add your first bird
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
