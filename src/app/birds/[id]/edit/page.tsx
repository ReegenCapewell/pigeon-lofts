import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { id: string };

export default async function EditBirdPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/auth");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true },
  });
  if (!user) redirect("/auth");

  const bird = await prisma.bird.findUnique({
    where: { id },
    include: { loft: true },
  });
  if (!bird || bird.ownerId !== user.id) notFound();

  const lofts = await prisma.loft.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  async function updateBird(formData: FormData) {
    "use server";

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) redirect("/auth");

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    });
    if (!user) redirect("/auth");

    const ring = String(formData.get("ring") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const loftIdRaw = String(formData.get("loftId") ?? "").trim();

    if (!ring) return;

    const current = await prisma.bird.findUnique({ where: { id } });
    if (!current || current.ownerId !== user.id) notFound();

    let loftId: string | null = null;
    if (loftIdRaw && loftIdRaw !== "none") {
      const loft = await prisma.loft.findUnique({ where: { id: loftIdRaw } });
      if (!loft || loft.ownerId !== user.id) notFound();
      loftId = loft.id;
    }

    await prisma.bird.update({
      where: { id },
      data: {
        ring,
        name: name || null,
        loftId,
      },
    });

    redirect(`/birds/${id}`);
  }

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
          <Link href={`/birds/${id}`} className="hover:text-sky-300">
            {bird.ring}
          </Link>
          <span className="mx-2 text-slate-600">/</span>
          <span className="text-slate-200">Edit</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">Edit bird</h1>
            <p className="text-sm text-slate-300">Update the bird details.</p>
          </div>

          <Link
            href={`/birds/${id}`}
            className="text-sm px-4 py-2 rounded-full border border-slate-600 hover:border-sky-500 hover:text-sky-300 transition"
          >
            Cancel
          </Link>
        </div>
      </div>

      <form
        action={updateBird}
        className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4 space-y-4"
      >
        <div>
          <label className="block text-xs text-slate-400 mb-1">Ring number</label>
          <input
            name="ring"
            defaultValue={bird.ring}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
            placeholder="e.g. GB 23 A12345"
            maxLength={30}
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Name (optional)</label>
          <input
            name="name"
            defaultValue={bird.name ?? ""}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
            placeholder="e.g. Newey"
            maxLength={60}
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Loft</label>
          <select
            name="loftId"
            defaultValue={bird.loftId ?? "none"}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
          >
            <option value="none">Unassigned</option>
            {lofts.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 mt-1">
            You can move a bird between lofts here.
          </p>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-medium transition"
        >
          Save changes
        </button>
      </form>
    </main>
  );
}
