import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/auth";
import AssignLoftButton from "@/components/AssignLoftButton";
import DeleteBirdButton from "@/components/DeleteBirdButton";
import { formatAge, formatDob } from "@/lib/dateOfBirth";
import { SEX_LABELS } from "@/lib/sex";
import { birdLabel } from "@/lib/pedigreeShared";
import { dayKey, dueState, pmvStatus, recordHeading } from "@/lib/medical";
import PmvBadge from "@/components/medical/PmvBadge";
import { RACE_STATUS_LABELS, bestPosition, compareForPedigree, dateKey, pedigreeLine } from "@/lib/races";
import SexIcon from "@/components/SexIcon";

export const dynamic = "force-dynamic";

type ParentSummary = {
  ring: string | null;
  name: string | null;
  bird: { ring: string; name: string | null } | null;
} | null;

function parentLabel(p: ParentSummary): string | null {
  if (!p) return null;
  return birdLabel(p.bird ?? p);
}

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
        select: { id: true, name: true, deletedAt: true },
      },
      medicalRecords: {
        select: { id: true, type: true, category: true, title: true, date: true, nextDueDate: true, reminderDone: true },
      },
      raceResults: {
        select: { raceName: true, raceDate: true, raceType: true, status: true, clubPosition: true, fedPosition: true, openPosition: true },
      },
      pedigreeNode: {
        select: {
          sire: { select: { ring: true, name: true, bird: { select: { ring: true, name: true } } } },
          dam: { select: { ring: true, name: true, bird: { select: { ring: true, name: true } } } },
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

  const medical = bird.medicalRecords
    .map((r) => ({ ...r, date: formatDob(r.date), nextDueDate: r.nextDueDate ? formatDob(r.nextDueDate) : null }))
    .sort((a, b) => (dayKey(b.date) ?? 0) - (dayKey(a.date) ?? 0));
  const pmv = pmvStatus(medical);
  const openDue = medical.filter((r) => r.nextDueDate && !r.reminderDone).map((r) => dueState(r.nextDueDate));
  const overdueCount = openDue.filter((s) => s === "overdue").length;
  const dueSoonCount = openDue.filter((s) => s === "due-soon").length;
  const latestMedical = medical[0] ?? null;

  const races = bird.raceResults.map((r) => ({ ...r, raceDate: formatDob(r.raceDate) }));
  const raceWins = races.filter((r) => bestPosition(r) === 1).length;
  const placed = races.filter((r) => bestPosition(r) !== null).sort(compareForPedigree);
  const bestRaceLine = placed.length ? pedigreeLine(placed[0]) : null;
  const latest = [...races].sort((a, b) => dateKey(b.raceDate) - dateKey(a.raceDate))[0];
  const latestRaceLine = latest
    ? `${pedigreeLine(latest)}${bestPosition(latest) === null ? ` · ${RACE_STATUS_LABELS[latest.status]}` : ""}`
    : null;

  const sire = bird.pedigreeNode?.sire ?? null;
  const dam = bird.pedigreeNode?.dam ?? null;
  const hasPedigree = !!(sire || dam);

  const ageDisplay = bird.dateOfBirth ? formatAge(bird.dateOfBirth) : null;
  const dobDisplay = bird.dateOfBirth ? formatDob(bird.dateOfBirth) : null;

  return (
    <main>
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-6">
        <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Dashboard</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <Link href="/birds" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Birds</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-slate-700 dark:text-slate-200">{bird.ring}</span>
      </nav>

      {/* Header */}
      <div className="flex items-end justify-between gap-4 pb-8 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Bird</p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
            {bird.ring}
            {bird.name ? (
              <span className="text-slate-400 dark:text-slate-500 font-normal"> – {bird.name}</span>
            ) : null}
          </h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
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
            birdLabel={bird.name ? `${bird.ring} (${bird.name})` : bird.ring}
          />
          <Link
            href="/birds"
            className="text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="py-8 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Ring number</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{bird.ring}</p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Name</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{bird.name ?? "—"}</p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Sex</p>
          {bird.sex ? (
            <p className="inline-flex items-center gap-1.5 text-lg font-semibold text-slate-900 dark:text-slate-50">
              <SexIcon sex={bird.sex} className="w-4 h-4" />
              {SEX_LABELS[bird.sex]}
            </p>
          ) : (
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">Unknown</p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Loft</p>
          {loftIsValid ? (
            <Link
              href={`/lofts/${bird.loft!.id}`}
              className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {bird.loft!.name}
            </Link>
          ) : (
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">Unassigned</p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Age</p>
          {ageDisplay !== null ? (
            <>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{ageDisplay}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Born {dobDisplay}</p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">—</p>
              <Link
                href={`/birds/${bird.id}/edit`}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Add date of birth
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Pedigree */}
      <div className="py-8 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">Pedigree</p>
          <Link
            href={`/birds/${bird.id}/pedigree`}
            className={
              hasPedigree
                ? "text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                : "text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
            }
          >
            {hasPedigree ? "View pedigree" : "Create pedigree"}
          </Link>
        </div>
        {hasPedigree ? (
          <dl className="grid grid-cols-2 gap-8">
            <div>
              <dt className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-1">
                <SexIcon sex="MALE" /> Sire
              </dt>
              <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">{parentLabel(sire) ?? "Not added"}</dd>
            </div>
            <div>
              <dt className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-1">
                <SexIcon sex="FEMALE" /> Dam
              </dt>
              <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">{parentLabel(dam) ?? "Not added"}</dd>
            </div>
          </dl>
        ) : (
          <p className="rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            This bird doesn&apos;t have a pedigree yet.
          </p>
        )}
      </div>

      {/* Race stats */}
      <div className="py-8 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">Race stats</p>
          <Link
            href={`/birds/${bird.id}/races`}
            className={
              races.length
                ? "text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                : "text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
            }
          >
            {races.length ? "View race stats" : "Add race results"}
          </Link>
        </div>
        {races.length ? (
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <dt className="text-xs text-slate-400 dark:text-slate-500 mb-1">Races</dt>
              <dd className="text-lg font-semibold text-slate-900 dark:text-slate-50">{races.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 dark:text-slate-500 mb-1">Wins</dt>
              <dd className="text-lg font-semibold text-slate-900 dark:text-slate-50">{raceWins}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 dark:text-slate-500 mb-1">Best placing</dt>
              <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">{bestRaceLine ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 dark:text-slate-500 mb-1">Latest</dt>
              <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">{latestRaceLine}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No race results logged yet.</p>
        )}
      </div>

      {/* Health */}
      <div className="pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Health <PmvBadge status={pmv} />
          </p>
          <Link
            href={`/birds/${bird.id}/health`}
            className="text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          >
            {medical.length ? "View medical records" : "Add medical records"}
          </Link>
        </div>
        {medical.length ? (
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <dt className="text-xs text-slate-400 dark:text-slate-500 mb-1">PMV vaccination</dt>
              <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {pmv.state === "none" ? "Not recorded" : pmv.state === "expired" ? `Expired ${pmv.validUntil}` : `Valid until ${pmv.validUntil}`}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 dark:text-slate-500 mb-1">Reminders</dt>
              <dd className={`text-sm font-medium ${overdueCount ? "text-red-600 dark:text-red-300" : dueSoonCount ? "text-amber-700 dark:text-amber-300" : "text-slate-800 dark:text-slate-100"}`}>
                {overdueCount ? `${overdueCount} overdue` : dueSoonCount ? `${dueSoonCount} due soon` : "None due"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 dark:text-slate-500 mb-1">Latest record</dt>
              <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {latestMedical ? `${recordHeading(latestMedical)}, ${latestMedical.date}` : "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No medical records yet.</p>
        )}
      </div>
    </main>
  );
}
