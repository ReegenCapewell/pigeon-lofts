export default function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={[
        "animate-pulse rounded-xl bg-slate-800/50 border border-slate-700/50",
        className,
      ].join(" ")}
    />
  );
}
