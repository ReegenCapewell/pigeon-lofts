import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/auth";
import { raceResultSelect } from "@/lib/raceQueries";
import { toRaceDTO } from "@/lib/races";
import { pmvPeriods } from "@/lib/medical";
import { pmvRowsToInput, pmvSelect } from "@/lib/medicalQueries";
import RaceResultsView from "@/components/races/RaceResultsView";

export const dynamic = "force-dynamic";

export default async function BirdRacesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/auth");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true },
  });
  if (!user) redirect("/auth");

  const bird = await prisma.bird.findFirst({
    where: { id, ownerId: user.id, deletedAt: null },
    select: {
      id: true,
      ring: true,
      name: true,
      raceResults: { select: raceResultSelect },
      medicalRecords: pmvSelect,
    },
  });
  if (!bird) notFound();

  const label = bird.name ? `${bird.ring} – ${bird.name}` : bird.ring;

  return (
    <main>
      <nav className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-6">
        <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Dashboard</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <Link href="/birds" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Birds</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <Link href={`/birds/${bird.id}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">{bird.ring}</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-slate-700 dark:text-slate-200">Race stats</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4 pb-8 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Race stats</p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
            {bird.ring}
            {bird.name ? <span className="text-slate-400 dark:text-slate-500 font-normal"> – {bird.name}</span> : null}
          </h1>
        </div>
        <Link
          href={`/birds/${bird.id}/pedigree`}
          className="text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
        >
          View pedigree
        </Link>
      </div>

      <RaceResultsView
        birdId={bird.id}
        birdLabel={label}
        results={bird.raceResults.map(toRaceDTO)}
        pmvPeriods={pmvPeriods(pmvRowsToInput(bird.medicalRecords))}
      />
    </main>
  );
}
