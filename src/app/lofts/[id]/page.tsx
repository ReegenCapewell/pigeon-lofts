import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/auth";
import LoftBirdsList from "@/components/LoftBirdsList";
import DeleteLoftButton from "@/components/DeleteLoftButton";

export const dynamic = "force-dynamic";

type Params = { id: string };

export default async function LoftDashboardPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id: loftId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/auth");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true },
  });
  if (!user) redirect("/auth");

  const loft = await prisma.loft.findUnique({
    where: { id: loftId },
    include: { birds: { orderBy: { createdAt: "desc" } } },
  });

  if (!loft || loft.ownerId !== user.id) notFound();

  // Options for "Move..." dropdown in LoftBirdsList
  const loftOptions = await prisma.loft.findMany({
    where: { ownerId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // Hygiene reminder: unassigned birds (overall, across all lofts)
  const unassignedCount = await prisma.bird.count({
    where: { ownerId: user.id, loftId: null },
  });

  const newestBird = loft.birds[0] ?? null;
  const recentBirds = loft.birds.slice(0, 5);

  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <nav className="text-xs text-slate-400">
          <Link href="/" className="hover:text-sky-300">
            Dashboard
          </Link>
          <span className="mx-2 text-slate-600">/</span>
          <Link href="/lofts" className="hover:text-sky-300">
            Lofts
          </Link>
          <span className="mx-2 text-slate-600">/</span>
          <span className="text-slate-200">{loft.name}</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">{loft.name}</h1>
            <p className="text-sm text-slate-300">Loft dashboard</p>
          </div>

          <div className="flex gap-2 flex-wrap justify-end">
            <Link
              href={`/lofts/${loft.id}/edit`}
              className="text-sm px-4 py-2 rounded-full border border-slate-600 hover:border-sky-500 hover:text-sky-300 transition"
            >
              Edit
            </Link>

            <DeleteLoftButton loftId={loft.id} />

            <Link
              href="/lofts"
              className="text-sm px-4 py-2 rounded-full border border-slate-600 hover:border-sky-500 hover:text-sky-300 transition"
            >
              Back to lofts
            </Link>
          </div>
        </div>
      </div>

      {/* Key stats */}
      <section className="grid md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-slate-400">Total birds in this loft</p>
          <p className="text-3xl font-semibold text-slate-50">
            {loft.birds.length}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-slate-400">Unassigned birds (overall)</p>
          <p className="text-3xl font-semibold text-slate-50">
            {unassignedCount}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Tip: assign them from the Birds page.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-slate-400">Newest bird in this loft</p>

          {newestBird ? (
            <Link
              href={`/birds/${newestBird.id}`}
              className="mt-2 inline-block hover:text-sky-300 transition"
            >
              <div className="text-sm text-slate-100">
                {newestBird.ring}
                {newestBird.name ? (
                  <span className="text-slate-400"> – {newestBird.name}</span>
                ) : null}
              </div>
              <div className="text-[11px] text-slate-500">
                Added: {new Date(newestBird.createdAt).toLocaleDateString()}
              </div>
            </Link>
          ) : (
            <p className="text-sm text-slate-500 mt-2">No birds yet.</p>
          )}
        </div>

        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-slate-400">Coming soon</p>
          <p className="text-sm text-slate-500 mt-2">
            Medical & race insights will appear here.
          </p>
        </div>
      </section>

      {/* Birds list with search/sort + inline actions */}
      <LoftBirdsList
        currentLoftId={loft.id}
        loftOptions={loftOptions}
        birds={loft.birds.map((b) => ({
          id: b.id,
          ring: b.ring,
          name: b.name ?? null,
          createdAt: b.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
