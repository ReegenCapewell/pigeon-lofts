import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { id: string };

export default async function LoftDashboardPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id: loftId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/auth");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true },
  });
  if (!user) redirect("/auth");

  const loft = await prisma.loft.findUnique({
    where: { id: loftId },
    include: { birds: { orderBy: { createdAt: "desc" } } },
  });

  if (!loft || loft.ownerId !== user.id) notFound();

  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <nav className="text-xs text-slate-400">
          <Link href="/" className="hover:text-sky-300">
            Dashboard
          </Link>
          <span className="mx-2 text-slate-600">/</span>
          <Link href="/lofts" className="hover:text-sky-300">
            Lofts
          </Link>
          <span className="mx-2 text-slate-600">/</span>
          <span className="text-slate-200">{loft.name}</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">{loft.name}</h1>
            <p className="text-sm text-slate-300">Loft dashboard</p>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/lofts/${loft.id}/edit`}
              className="text-sm px-4 py-2 rounded-full border border-slate-600 hover:border-sky-500 hover:text-sky-300 transition"
            >
              Edit
            </Link>

            <Link
              href="/lofts"
              className="text-sm px-4 py-2 rounded-full border border-slate-600 hover:border-sky-500 hover:text-sky-300 transition"
            >
              Back to lofts
            </Link>
          </div>
        </div>
      </div>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-slate-400">Total birds</p>
          <p className="text-3xl font-semibold text-slate-50">
            {loft.birds.length}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-slate-400">Birds needing medicine</p>
          <p className="text-sm text-slate-500 mt-1">
            Coming soon (Medical Records)
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs text-slate-400">Average race result</p>
          <p className="text-sm text-slate-500 mt-1">
            Coming soon (Race Results)
          </p>
        </div>
      </section>

      <section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-slate-100 mb-3">
          Birds in this loft
        </h2>

        {loft.birds.length === 0 ? (
          <p className="text-xs text-slate-400">No birds assigned yet.</p>
        ) : (
          <ul className="space-y-2">
            {loft.birds.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/birds/${b.id}`}
                  className="block border border-slate-700 bg-slate-950 rounded-xl px-3 py-2 hover:border-sky-500 hover:text-sky-300 transition"
                >
                  <div className="text-sm text-slate-100">
                    {b.ring}
                    {b.name ? (
                      <span className="text-slate-400"> – {b.name}</span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
