import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";
import SexIcon from "@/components/SexIcon";
import { todayUtc } from "@/lib/dateOfBirth";
import { DUE_SOON_DAYS } from "@/lib/medical";

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

  // The lists above only hold the 5 most recent, so count separately.
  const ownerId = user?.id ?? "";
  const today = todayUtc();
  const soon = new Date(today);
  soon.setUTCDate(soon.getUTCDate() + DUE_SOON_DAYS);
  const openReminder = { ownerId, reminderDone: false, bird: { deletedAt: null } };

  const [loftCount, birdCount, missingPedigreeCount, raceCount, overdueRows, dueSoonRows] = await Promise.all([
    prisma.loft.count({ where: { ownerId, deletedAt: null } }),
    prisma.bird.count({ where: { ownerId, deletedAt: null } }),
    prisma.bird.count({
      where: {
        ownerId,
        deletedAt: null,
        OR: [{ pedigreeNode: { is: null } }, { pedigreeNode: { is: { sireId: null, damId: null } } }],
      },
    }),
    prisma.raceResult.count({ where: { ownerId, bird: { deletedAt: null } } }),
    prisma.medicalRecord.findMany({ where: { ...openReminder, nextDueDate: { lt: today } }, select: { id: true, batchId: true } }),
    prisma.medicalRecord.findMany({ where: { ...openReminder, nextDueDate: { gte: today, lte: soon } }, select: { id: true, batchId: true } }),
  ]);
  // A reminder logged for a whole loft at once counts as one.
  const groups = (rows: { id: string; batchId: string | null }[]) => new Set(rows.map((r) => r.batchId ?? r.id)).size;
  const overdueCount = groups(overdueRows);
  const dueSoonCount = groups(dueSoonRows);

  return (
    <main>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-8 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
            Overview
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
            Dashboard
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/lofts"
            className="text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500 transition"
          >
            Lofts
          </Link>
          <Link
            href="/birds"
            className="text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500 transition"
          >
            Birds
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="py-8 flex gap-12 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-50">{loftCount}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 uppercase tracking-wide">Lofts</p>
        </div>
        <div>
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-50">{birdCount}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 uppercase tracking-wide">Birds</p>
        </div>
        <div>
          <p className="text-4xl font-bold text-slate-900 dark:text-slate-50">{raceCount}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 uppercase tracking-wide">Race results</p>
        </div>
      </div>

      {overdueCount + dueSoonCount > 0 ? (
        <div
          className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
            overdueCount
              ? "border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200"
              : "border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200"
          }`}
        >
          <p className="text-sm">
            Health reminders: {[overdueCount ? `${overdueCount} overdue` : null, dueSoonCount ? `${dueSoonCount} due in the next two weeks` : null]
              .filter(Boolean)
              .join(", ")}
            .
          </p>
          <Link href="/health" className="text-sm font-medium hover:underline">
            View health →
          </Link>
        </div>
      ) : null}

      {missingPedigreeCount > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {missingPedigreeCount === 1 ? "1 bird doesn't" : `${missingPedigreeCount} birds don't`} have a pedigree yet.
          </p>
          <Link href="/birds" className="text-sm font-medium text-amber-800 dark:text-amber-200 hover:underline">
            View birds →
          </Link>
        </div>
      ) : null}

      {/* Recent sections */}
      <div className="grid md:grid-cols-2 gap-0 md:gap-12 mt-0">
        {/* Recent lofts */}
        <section className="py-8 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 md:pr-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Recent lofts
            </h2>
            <Link
              href="/lofts"
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition"
            >
              See all
            </Link>
          </div>

          {user?.lofts?.length ? (
            <ul>
              {user.lofts.map((loft) => (
                <li key={loft.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <Link
                    href={`/lofts/${loft.id}`}
                    className="group flex items-center justify-between py-3 -mx-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition"
                  >
                    <span className="text-sm text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition font-medium">
                      {loft.name}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {new Date(loft.createdAt).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No lofts yet.{" "}
              <Link href="/lofts" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                Create one
              </Link>
            </p>
          )}
        </section>

        {/* Recent birds */}
        <section className="py-8 md:pl-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Recent birds
            </h2>
            <Link
              href="/birds"
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition"
            >
              See all
            </Link>
          </div>

          {user?.birds?.length ? (
            <ul>
              {user.birds.map((bird) => {
                const loftValid = bird.loft && bird.loft.deletedAt === null;
                return (
                  <li key={bird.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <Link
                      href={`/birds/${bird.id}`}
                      className="group flex items-center justify-between py-3 -mx-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition"
                    >
                      <div>
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition font-medium">
                          <SexIcon sex={bird.sex} />
                          {bird.ring}
                          {bird.name ? (
                            <span className="font-normal text-slate-400 dark:text-slate-500"> – {bird.name}</span>
                          ) : null}
                        </span>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {loftValid ? bird.loft!.name : "Unassigned"}
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {new Date(bird.createdAt).toLocaleDateString()}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No birds yet.{" "}
              <Link href="/birds" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                Add one
              </Link>
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
