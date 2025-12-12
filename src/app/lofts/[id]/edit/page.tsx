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

    await prisma.loft.update({
      where: { id },
      data: { name },
    });

    redirect(`/lofts/${id}`);
  }

  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <nav className="text-xs text-slate-400">
          <Link href="/" className="hover:text-sky-300">Dashboard</Link>
          <span className="mx-2 text-slate-600">/</span>
          <Link href="/lofts" className="hover:text-sky-300">Lofts</Link>
          <span className="mx-2 text-slate-600">/</span>
          <Link href={`/lofts/${id}`} className="hover:text-sky-300">{loft.name}</Link>
          <span className="mx-2 text-slate-600">/</span>
          <span className="text-slate-200">Edit</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">Edit loft</h1>
            <p className="text-sm text-slate-300">Update the loft details.</p>
          </div>

          <Link
            href={`/lofts/${id}`}
            className="text-sm px-4 py-2 rounded-full border border-slate-600 hover:border-sky-500 hover:text-sky-300 transition"
          >
            Cancel
          </Link>
        </div>
      </div>

      <form action={updateLoft} className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4 space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Loft name</label>
          <input
            name="name"
            defaultValue={loft.name}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
            placeholder="e.g. Main Loft"
            maxLength={60}
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Keep it short and recognisable (e.g. “Main Loft”, “Young Birds”).
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
