import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { id: string };

export default async function BirdDashboardPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id: birdId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/auth");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true },
  });
  if (!user) redirect("/auth");

  const bird = await prisma.bird.findUnique({
    where: { id: birdId },
    include: { loft: true },
  });

  if (!bird || bird.ownerId !== user.id) notFound();

  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <nav className="text-xs text-slate-400">
          <Link href="/" className="hover:text-sky-300">
            Dashboard
          </Link>
          <span className="mx-2 text-slate-600">/</span>
          <Link href="/birds" className="hover:text-sky-300">
            Birds
          </Link>
          <span className="mx-2 text-slate-600">/</span>
          <span className="text-slate-200">{bird.ring}</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">
              {bird.ring}
              {bird.name ? (
                <span className="text-slate-400"> – {bird.name}</span>
              ) : null}
            </h1>
            <p className="text-sm text-slate-300">Bird dashboard / profile</p>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/birds/${bird.id}/edit`}
              className="text-sm px-4 py-2 rounded-full border border-slate-600 hover:border-sky-500 hover:text-sky-300 transition"
            >
              Edit
            </Link>

            <Link
              href="/birds"
              className="text-sm px-4 py-2 rounded-full border border-slate-600 hover:border-sky-500 hover:text-sky-300 transition"
            >
              Back to birds
            </Link>
          </div>
        </div>
      </div>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-slate-400">Ring number</p>
          <p className="text-lg font-semibold text-slate-50">{bird.ring}</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-slate-400">Name</p>
          <p className="text-lg font-semibold text-slate-50">
            {bird.name ?? "—"}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-slate-400">Loft</p>
          {bird.loft ? (
            <Link
              href={`/lofts/${bird.loft.id}`}
              className="text-lg font-semibold text-sky-300 hover:underline"
            >
              {bird.loft.name}
            </Link>
          ) : (
            <p className="text-lg font-semibold text-slate-50">Unassigned</p>
          )}
        </div>
      </section>

      <section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-slate-100 mb-2">
          Coming soon
        </h2>

        <div className="grid md:grid-cols-3 gap-3 text-xs text-slate-400">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <p className="font-semibold text-slate-200 mb-1">Medical records</p>
            <p>Log treatments, meds, follow-ups.</p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <p className="font-semibold text-slate-200 mb-1">Race results</p>
            <p>Distance, position, points, notes.</p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
            <p className="font-semibold text-slate-200 mb-1">Pedigree</p>
            <p>Parents, pairings, offspring lineage.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
