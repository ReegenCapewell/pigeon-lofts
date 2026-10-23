// Small amber flag shown in bird lists when a bird has no pedigree yet.
export default function NoPedigreeBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 dark:bg-amber-900/40 px-1.5 py-px text-[10px] font-medium text-amber-800 dark:text-amber-300">
      No pedigree
    </span>
  );
}
