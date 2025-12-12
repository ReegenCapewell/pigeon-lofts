export default function LoftParamsDebug({
  params,
}: {
  params: Record<string, string | string[] | undefined>;
}) {
  return (
    <main style={{ padding: 24 }}>
      <h1>Loft Params Debug</h1>
      <p>If routing works, you should see an ID below.</p>
      <pre>{JSON.stringify(params, null, 2)}</pre>
    </main>
  );
}
