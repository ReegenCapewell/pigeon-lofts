import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/auth";
import { todayUtc } from "@/lib/dateOfBirth";
import { DUE_SOON_DAYS, dueState, pmvStatus, type DueState } from "@/lib/medical";
import { medicalRecordSelect, pmvRowsToInput, pmvSelect } from "@/lib/medicalQueries";
import { withBatchSizes } from "@/lib/medicalServer";
import HealthOverview from "@/components/medical/HealthOverview";

export const dynamic = "force-dynamic";

const label = (b: { ring: string; name: string | null }) => (b.name ? `${b.ring} – ${b.name}` : b.ring);

export default async function HealthPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/auth");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true },
  });
  if (!user) redirect("/auth");

  const soon = todayUtc();
  soon.setUTCDate(soon.getUTCDate() + DUE_SOON_DAYS);

  const [lofts, birds, dueRows, recentRows] = await Promise.all([
    prisma.loft.findMany({ where: { ownerId: user.id, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.bird.findMany({
      where: { ownerId: user.id, deletedAt: null },
      orderBy: { ring: "asc" },
      select: {
        id: true,
        ring: true,
        name: true,
        loft: { select: { id: true, name: true, deletedAt: true } },
        medicalRecords: pmvSelect,
      },
    }),
    prisma.medicalRecord.findMany({
      where: { ownerId: user.id, reminderDone: false, nextDueDate: { lte: soon }, bird: { deletedAt: null } },
      orderBy: { nextDueDate: "asc" },
      select: { ...medicalRecordSelect, bird: { select: { ring: true, name: true } } },
    }),
    prisma.medicalRecord.findMany({
      where: { ownerId: user.id, bird: { deletedAt: null } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 20,
      select: { ...medicalRecordSelect, bird: { select: { ring: true, name: true } } },
    }),
  ]);


  const dueDtos = await withBatchSizes(user.id, dueRows);
  const reminders = dueRows.map((row, i) => ({
    record: dueDtos[i],
    birdLabel: label(row.bird),
    state: dueState(dueDtos[i].nextDueDate) as DueState,
  }));
  const recentDtos = await withBatchSizes(user.id, recentRows);

  return (
    <main>
      <HealthOverview
        lofts={lofts}
        birds={birds.map((b) => {
          const loftOk = b.loft && !b.loft.deletedAt;
          return { id: b.id, ring: b.ring, name: b.name, loftId: loftOk ? b.loft!.id : null, loftName: loftOk ? b.loft!.name : null };
        })}
        reminders={reminders}
        pmvRows={birds.map((b) => ({
          birdId: b.id,
          birdLabel: label(b),
          loftName: b.loft && !b.loft.deletedAt ? b.loft.name : null,
          status: pmvStatus(pmvRowsToInput(b.medicalRecords)),
        }))}
        recent={recentRows.map((row, i) => ({ record: recentDtos[i], birdLabel: label(row.bird) }))}
      />
    </main>
  );
}
