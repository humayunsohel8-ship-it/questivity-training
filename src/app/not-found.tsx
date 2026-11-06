import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-[60vh] place-items-center p-6 text-center">
      <div className="space-y-3">
        <p className="font-display text-5xl font-bold text-brand">404</p>
        <p className="text-brand-muted">We couldn&apos;t find that page, or you don&apos;t have access to it.</p>
        <Link href="/dashboard" className="btn-primary">Back to my learning</Link>
      </div>
    </main>
  );
}
