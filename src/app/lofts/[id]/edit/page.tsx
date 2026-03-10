import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { id: string };

export default async function EditLoftPage({
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

  const loft = await prisma.loft.findUnique({ where: { id } });
  if (!loft || loft.ownerId !== user.id) notFound();

  async function updateLoft(formData: FormData) {
    "use server";

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) redirect("/auth");

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true },
    });
    if (!user) redirect("/auth");

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;

    const current = await prisma.loft.findUnique({ where: { id } });
    if (!current || current.ownerId !== user.id) notFound();

    await prisma.loft.update({ where: { id }, data: { name } });
    redirect(`/lofts/${id}`);
  }

  return (
    <main className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Dashboard</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <Link href="/lofts" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Lofts</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <Link href={`/lofts/${id}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">{loft.name}</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-slate-700 dark:text-slate-200">Edit</span>
      </nav>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Edit loft</h1>
        <Link
          href={`/lofts/${id}`}
          className="text-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm transition"
        >
          Cancel
        </Link>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6 max-w-lg">
        <form action={updateLoft} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
              Loft name
            </label>
            <input
              name="name"
              defaultValue={loft.name}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition text-sm"
              placeholder="e.g. Main Loft"
              maxLength={60}
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
              Keep it short and recognisable (e.g. &quot;Main Loft&quot;, &quot;Young Birds&quot;).
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
              href={`/lofts/${id}`}
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
