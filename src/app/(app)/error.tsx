"use client";

import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="card mx-auto max-w-lg space-y-3 p-8 text-center">
      <p className="font-display text-xl font-semibold">Something went wrong</p>
      <p className="text-sm text-brand-muted">Please try again. If it keeps happening, contact your administrator{error.digest ? ` (ref ${error.digest})` : ""}.</p>
      <button className="btn-primary" onClick={reset}>Try again</button>
    </div>
  );
}
