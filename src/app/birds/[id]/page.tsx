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
        select: { id: true, name: true, deletedAt: true },
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

  // Calculate age in whole years from dateOfBirth
  let ageYears: number | null = null;
  let dobDisplay: string | null = null;
  if (bird.dateOfBirth) {
    const today = new Date();
    const dob = new Date(bird.dateOfBirth);
    let age = today.getFullYear() - dob.getFullYear();
    const hasHadBirthdayThisYear =
      today.getMonth() > dob.getMonth() ||
      (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
    if (!hasHadBirthdayThisYear) age -= 1;
    ageYears = age;
    const dd = String(dob.getDate()).padStart(2, "0");
    const mm = String(dob.getMonth() + 1).padStart(2, "0");
    const yyyy = dob.getFullYear();
    dobDisplay = `${dd}/${mm}/${yyyy}`;
  }

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
      <div className="py-8 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Ring number</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{bird.ring}</p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Name</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{bird.name ?? "—"}</p>
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
          {ageYears !== null ? (
            <>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {ageYears} {ageYears === 1 ? "year" : "years"} old
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{dobDisplay}</p>
            </>
          ) : (
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">—</p>
          )}
        </div>
      </div>

      {/* Coming soon */}
      <div className="pt-8">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Coming soon</p>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-1">Medical records</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Log treatments, meds, follow-ups.</p>
          </div>
          <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-1">Race results</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Distance, position, points, notes.</p>
          </div>
          <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-1">Pedigree</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Parents, pairings, offspring lineage.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
