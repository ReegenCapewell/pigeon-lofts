export default function InlineError({ message }: { message: string }) {
  return (
    <p className="text-xs text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 rounded-xl px-3 py-2">
      {message}
    </p>
  );
}
