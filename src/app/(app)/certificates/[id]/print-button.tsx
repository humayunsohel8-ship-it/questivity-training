"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button className="btn-primary" onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> Print / save as PDF
    </button>
  );
}
