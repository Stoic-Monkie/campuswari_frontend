export function Placeholder({ title, milestone }: { title: string; milestone: string }) {
  return (
    <section className="rounded-card border border-dashed border-line p-6 text-center">
      <h1 className="text-lg font-medium">{title}</h1>
      <p className="mt-1 text-sm text-muted">Coming in {milestone}.</p>
    </section>
  );
}
