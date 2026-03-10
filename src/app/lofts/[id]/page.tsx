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
    where: { id: loftId, ownerId: user.id, deletedAt: null },
    include: {
      birds: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
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
    <main className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Dashboard</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <Link href="/lofts" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Lofts</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-slate-700 dark:text-slate-200">{loft.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xl font-bold shrink-0">
            {loft.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{loft.name}</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Created {new Date(loft.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/lofts/${loft.id}/edit`}
            className="text-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-sm transition"
          >
            Edit name
          </Link>
          <DeleteLoftButton loftId={loft.id} loftLabel={loft.name} />
          <Link
            href="/lofts"
            className="text-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm transition"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Birds in loft</p>
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-50">{loft.birds.length}</p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Unassigned</p>
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-50">{unassignedCount}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">Across all lofts</p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5 col-span-2 sm:col-span-1">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Newest bird</p>
          {newestBird ? (
            <Link href={`/birds/${newestBird.id}`} className="group block">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                {newestBird.ring}
                {newestBird.name ? (
                  <span className="font-normal text-slate-400 dark:text-slate-500"> – {newestBird.name}</span>
                ) : null}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Added {new Date(newestBird.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">None yet</p>
          )}
        </div>
      </div>

      {/* Birds list */}
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
