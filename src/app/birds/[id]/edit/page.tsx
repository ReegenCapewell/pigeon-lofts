import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/auth";
import { isValidRing, normaliseRing } from "@/lib/validation";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { id: string };
type SearchParams = { error?: string; ring?: string; name?: string; loftId?: string };

export default async function EditBirdPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/auth");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true },
  });
  if (!user) redirect("/auth");

  // ✅ IMPORTANT: do not allow editing soft-deleted birds
  const bird = await prisma.bird.findFirst({
    where: { id, ownerId: user.id, deletedAt: null },
    select: { id: true, ring: true, name: true, loftId: true },
  });

  if (!bird) notFound();

  // ✅ IMPORTANT: only non-deleted lofts in dropdown
  const lofts = await prisma.loft.findMany({
    where: { ownerId: user.id, deletedAt: null },
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

    // ✅ Re-check bird still exists + not deleted + belongs to user
    const current = await prisma.bird.findFirst({
      where: { id, ownerId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (!current) notFound();

    const ringRaw = String(formData.get("ring") ?? "");
    const nameRaw = String(formData.get("name") ?? "");
    const loftIdRaw = String(formData.get("loftId") ?? "").trim();

    const ring = normaliseRing(ringRaw);
    const name = nameRaw.trim();

    if (!ring) {
      redirect(`/birds/${id}/edit?error=${encodeURIComponent("Ring number is required.")}&name=${encodeURIComponent(name)}&loftId=${encodeURIComponent(loftIdRaw)}`);
    }

    if (!isValidRing(ring)) {
      redirect(
        `/birds/${id}/edit?error=${encodeURIComponent(
          "Invalid ring format."
        )}&ring=${encodeURIComponent(ringRaw)}&name=${encodeURIComponent(name)}&loftId=${encodeURIComponent(loftIdRaw)}`
      );
    }

    let loftId: string | null = null;
    if (loftIdRaw && loftIdRaw !== "none") {
      // ✅ must belong to user + not deleted
      const loft = await prisma.loft.findFirst({
        where: { id: loftIdRaw, ownerId: user.id, deletedAt: null },
        select: { id: true },
      });
      if (!loft) {
        redirect(
          `/birds/${id}/edit?error=${encodeURIComponent(
            "Invalid loft selection."
          )}&ring=${encodeURIComponent(ringRaw)}&name=${encodeURIComponent(name)}&loftId=${encodeURIComponent(loftIdRaw)}`
        );
      }
      loftId = loft.id;
    }

    try {
      await prisma.bird.update({
        where: { id },
        data: {
          ring,
          name: name || null,
          loftId,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        // global unique ring conflict
        redirect(
          `/birds/${id}/edit?error=${encodeURIComponent(
            "That ring number already exists. Please use a unique ring."
          )}&ring=${encodeURIComponent(ringRaw)}&name=${encodeURIComponent(name)}&loftId=${encodeURIComponent(loftIdRaw)}`
        );
      }

      redirect(
        `/birds/${id}/edit?error=${encodeURIComponent(
          "Failed to save changes. Please try again."
        )}&ring=${encodeURIComponent(ringRaw)}&name=${encodeURIComponent(name)}&loftId=${encodeURIComponent(loftIdRaw)}`
      );
    }

    redirect(`/birds/${id}`);
  }

  const initialRing = sp.ring ?? bird.ring;
  const initialName = sp.name ?? (bird.name ?? "");
  const initialLoftId = sp.loftId ?? (bird.loftId ?? "none");

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

      {sp.error ? (
        <p className="text-xs text-red-300 border border-red-900/40 bg-red-950/40 rounded-xl px-3 py-2">
          {sp.error}
        </p>
      ) : null}

      <form
        action={updateBird}
        className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4 space-y-4"
      >
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Ring number
          </label>
          <input
            name="ring"
            defaultValue={initialRing}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
            placeholder="e.g. GB 23 A12345"
            maxLength={30}
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Name (optional)
          </label>
          <input
            name="name"
            defaultValue={initialName}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
            placeholder="e.g. Newey"
            maxLength={60}
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Loft</label>
          <select
            name="loftId"
            defaultValue={initialLoftId}
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
