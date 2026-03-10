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
    include: { loft: { select: { id: true, name: true, deletedAt: true } } },
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
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Dashboard</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <Link href="/birds" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Birds</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-slate-700 dark:text-slate-200">{bird.ring}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl shrink-0">
            🐦
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {bird.ring}
              {bird.name ? (
                <span className="text-slate-400 dark:text-slate-500 font-normal"> – {bird.name}</span>
              ) : null}
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Added {new Date(bird.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          <Link
            href={`/birds/${bird.id}/edit`}
            className="text-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-sm transition"
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
            birdLabel={bird.name ? `${bird.ring} (${bird.name})` : bird.ring}
          />
          <Link
            href="/birds"
            className="text-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm transition"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Profile stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Ring</p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-50 truncate">{bird.ring}</p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Name</p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-50">{bird.name ?? "—"}</p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Loft</p>
          {loftIsValid ? (
            <Link
              href={`/lofts/${bird.loft!.id}`}
              className="text-lg font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {bird.loft!.name}
            </Link>
          ) : (
            <p className="text-lg font-bold text-amber-500 dark:text-amber-400">Unassigned</p>
          )}
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Added</p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {new Date(bird.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Coming soon features */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { title: "Medical records", desc: "Log treatments, meds, and follow-ups." },
          { title: "Race results", desc: "Distance, position, points, notes." },
          { title: "Pedigree", desc: "Parents, pairings, offspring lineage." },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-dashed shadow-sm p-5 opacity-60"
          >
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">{f.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{f.desc}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 font-medium uppercase tracking-wide">
              Coming soon
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
