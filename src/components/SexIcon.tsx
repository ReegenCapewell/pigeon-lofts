import { SEX_LABELS, type BirdSex } from "@/lib/sex";

// Blue ♂ / pink ♀ marker. The symbol shape carries the meaning as well as the
// colour, and the shades are picked to stay readable in both light and dark mode.
export default function SexIcon({
  sex,
  className = "",
}: {
  sex: BirdSex | null | undefined;
  className?: string;
}) {
  if (!sex) return null;

  const label = SEX_LABELS[sex];
  const color =
    sex === "MALE" ? "text-blue-600 dark:text-blue-400" : "text-pink-600 dark:text-pink-400";

  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={label}
      className={`inline-block shrink-0 ${color} ${className}`}
    >
      <title>{label}</title>
      {sex === "MALE" ? (
        <>
          <circle cx="10" cy="14" r="6" />
          <path d="M14.5 9.5 20 4M15 4h5v5" />
        </>
      ) : (
        <>
          <circle cx="12" cy="9" r="6" />
          <path d="M12 15v7M9 19h6" />
        </>
      )}
    </svg>
  );
}
