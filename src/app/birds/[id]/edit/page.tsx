import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/auth";
import { isValidRing, normaliseRing } from "@/lib/validation";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { id: string };
type SearchParams = {
  error?: string;
  ring?: string;
  name?: string;
  loftId?: string;
};

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

  const bird = await prisma.bird.findFirst({
    where: { id, ownerId: user.id, deletedAt: null },
    select: { id: true, ring: true, name: true, loftId: true },
  });

  if (!bird) notFound();

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
      redirect(
        `/birds/${id}/edit?error=${encodeURIComponent("Ring number is required.")}&name=${encodeURIComponent(name)}&loftId=${encodeURIComponent(loftIdRaw)}`
      );
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
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Dashboard</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <Link href="/birds" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Birds</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <Link href={`/birds/${id}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">{bird.ring}</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-slate-700 dark:text-slate-200">Edit</span>
      </nav>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Edit bird</h1>
        <Link
          href={`/birds/${id}`}
          className="text-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm transition"
        >
          Cancel
        </Link>
      </div>

      {sp.error ? (
        <p className="text-xs text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 rounded-xl px-3 py-2.5">
          {sp.error}
        </p>
      ) : null}

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6 max-w-lg">
        <form action={updateBird} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
              Ring number
            </label>
            <input
              name="ring"
              defaultValue={initialRing}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition text-sm"
              placeholder="e.g. GB 23 A12345"
              maxLength={30}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
              Name (optional)
            </label>
            <input
              name="name"
              defaultValue={initialName}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition text-sm"
              placeholder="e.g. Newey"
              maxLength={60}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
              Loft
            </label>
            <select
              name="loftId"
              defaultValue={initialLoftId}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition text-sm"
            >
              <option value="none">Unassigned</option>
              {lofts.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
              You can move a bird between lofts here.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              className="text-sm px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm transition"
            >
              Save changes
            </button>
            <Link
              href={`/birds/${id}`}
              className="text-sm px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
