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

  const loft = await prisma.loft.findFirst({
    where: {
      id: loftId,
      ownerId: user.id,
      deletedAt: null,
    },
    include: {
      birds: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!loft) notFound();

  const loftOptions = await prisma.loft.findMany({
    where: { ownerId: user.id, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const unassignedCount = await prisma.bird.count({
    where: { ownerId: user.id, loftId: null, deletedAt: null },
  });

  const newestBird = loft.birds[0] ?? null;

  return (
    <main>
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-6">
        <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
          Dashboard
        </Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <Link href="/lofts" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
          Lofts
        </Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-slate-700 dark:text-slate-200">{loft.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-end justify-between gap-4 pb-8 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
            Loft
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
            {loft.name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href={`/lofts/${loft.id}/edit`}
            className="text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          >
            Edit
          </Link>
          <DeleteLoftButton loftId={loft.id} loftLabel={loft.name} />
          <Link
            href="/lofts"
            className="text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="py-8 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-12">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
            Birds in loft
          </p>
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-50">
            {loft.birds.length}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
            Unassigned
          </p>
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-50">
            {unassignedCount}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Assign from the Birds page
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
            Newest bird
          </p>
          {newestBird ? (
            <Link
              href={`/birds/${newestBird.id}`}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            >
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mt-1">
                {newestBird.ring}
                {newestBird.name ? (
                  <span className="text-slate-400 dark:text-slate-500 font-normal">
                    {" "}– {newestBird.name}
                  </span>
                ) : null}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Added {new Date(newestBird.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">None yet</p>
          )}
        </div>
      </div>

      {/* Birds list */}
      <div className="pt-8">
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
      </div>
    </main>
  );
}
