import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/auth";
import AssignLoftButton from "@/components/AssignLoftButton";
import DeleteBirdButton from "@/components/DeleteBirdButton";

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

  const bird = await prisma.bird.findFirst({
    where: { id: birdId, ownerId: user.id, deletedAt: null },
    include: {
      loft: {
        select: {
          id: true,
          name: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!bird) notFound();

  const lofts = await prisma.loft.findMany({
    where: { ownerId: user.id, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const loftIsValid = !!bird.loft && bird.loft.deletedAt === null;

  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <nav className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Link
            href="/"
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          >
            Dashboard
          </Link>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <Link
            href="/birds"
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          >
            Birds
          </Link>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="text-slate-700 dark:text-slate-200">{bird.ring}</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {bird.ring}
              {bird.name ? (
                <span className="text-slate-400 dark:text-slate-500 font-normal">
                  {" "}
                  – {bird.name}
                </span>
              ) : null}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Bird dashboard / profile
            </p>
          </div>

          <div className="flex gap-2 flex-wrap justify-end">
            <Link
              href={`/birds/${bird.id}/edit`}
              className="text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            >
              Edit
            </Link>

            <AssignLoftButton
              birdId={bird.id}
              lofts={lofts}
              currentLoftId={loftIsValid ? bird.loftId : null}
            />

            <DeleteBirdButton
              birdId={bird.id}
              birdLabel={
                bird.name ? `${bird.ring} (${bird.name})` : bird.ring
              }
            />

            <Link
              href="/birds"
              className="text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            >
              Back to birds
            </Link>
          </div>
        </div>
      </div>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ring number
          </p>
          <p className="text-xl font-semibold text-slate-900 dark:text-slate-50 mt-1">
            {bird.ring}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Name</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-slate-50 mt-1">
            {bird.name ?? "—"}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Loft</p>

          {loftIsValid ? (
            <Link
              href={`/lofts/${bird.loft!.id}`}
              className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mt-1 inline-block"
            >
              {bird.loft!.name}
            </Link>
          ) : (
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-50 mt-1">
              Unassigned
            </p>
          )}
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
          Coming soon
        </h2>

        <div className="grid md:grid-cols-3 gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
            <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Medical records
            </p>
            <p>Log treatments, meds, follow-ups.</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
            <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Race results
            </p>
            <p>Distance, position, points, notes.</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
            <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Pedigree
            </p>
            <p>Parents, pairings, offspring lineage.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
