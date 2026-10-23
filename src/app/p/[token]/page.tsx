import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/auth";
import { loadTree } from "@/lib/pedigree";
import PedigreeView from "@/components/pedigree/PedigreeView";

// Public, read-only pedigree reached through a share link. No login needed;
// the link only works while the owner keeps sharing switched on.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pigeon pedigree",
  robots: { index: false, follow: false },
};

export default async function SharedPedigreePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const node = await prisma.pedigreeNode.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      ownerId: true,
      owner: { select: { name: true } },
      bird: { select: { ring: true, name: true, deletedAt: true } },
    },
  });
  if (!node?.bird || node.bird.deletedAt) notFound();

  const tree = await loadTree(node.ownerId, node.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 print:p-0 print:max-w-none">
      <div className="print:hidden pb-6 mb-6 border-b border-slate-100 dark:border-slate-800">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
          Shared pedigree{node.owner.name ? ` · ${node.owner.name}` : ""}
        </p>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
          {node.bird.ring}
          {node.bird.name ? <span className="text-slate-400 dark:text-slate-500 font-normal"> – {node.bird.name}</span> : null}
        </h1>
      </div>
      <PedigreeView tree={tree} editable={false} sheetOwner={node.owner.name} />
    </div>
  );
}
