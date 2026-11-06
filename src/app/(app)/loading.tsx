export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true">
      <div className="h-8 w-64 rounded-brand bg-brand-line" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 rounded-brand bg-brand-line/60" />
        ))}
      </div>
    </div>
  );
}
