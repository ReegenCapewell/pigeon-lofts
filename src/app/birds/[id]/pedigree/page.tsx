import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/auth";
import { ensureBirdNode, loadTree } from "@/lib/pedigree";
import PedigreeView from "@/components/pedigree/PedigreeView";
import type { LoftBirdOption } from "@/lib/pedigreeShared";

export const dynamic = "force-dynamic";

export default async function BirdPedigreePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/auth");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true, name: true },
  });
  if (!user) redirect("/auth");

  const bird = await prisma.bird.findFirst({
    where: { id, ownerId: user.id, deletedAt: null },
    select: { id: true, ring: true, name: true },
  });
  if (!bird) notFound();

  const node = await ensureBirdNode(user.id, bird.id);
  const tree = await loadTree(user.id, node.id);

  const birds = await prisma.bird.findMany({
    where: { ownerId: user.id, deletedAt: null, NOT: { id: bird.id } },
    orderBy: { ring: "asc" },
    select: { id: true, ring: true, name: true, sex: true, loft: { select: { name: true, deletedAt: true } } },
  });
  const loftBirds: LoftBirdOption[] = birds.map((b) => ({
    id: b.id,
    ring: b.ring,
    name: b.name,
    sex: b.sex,
    loftName: b.loft && !b.loft.deletedAt ? b.loft.name : null,
  }));

  return (
    <main>
      <div className="print:hidden">
        <nav className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-6">
          <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Dashboard</Link>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <Link href="/birds" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">Birds</Link>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <Link href={`/birds/${bird.id}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">{bird.ring}</Link>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="text-slate-700 dark:text-slate-200">Pedigree</span>
        </nav>

        <div className="pb-6 mb-6 border-b border-slate-100 dark:border-slate-800">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Pedigree</p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
            {bird.ring}
            {bird.name ? <span className="text-slate-400 dark:text-slate-500 font-normal"> – {bird.name}</span> : null}
          </h1>
        </div>
      </div>

      <PedigreeView
        tree={tree}
        editable
        loftBirds={loftBirds}
        subjectBirdId={bird.id}
        initialShareToken={node.shareToken}
        sheetOwner={user.name}
      />
    </main>
  );
}
