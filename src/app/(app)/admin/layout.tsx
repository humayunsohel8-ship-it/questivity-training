import { requireAdmin } from "@/lib/auth";
import { AdminNav, Flash } from "./admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div>
      <AdminNav />
      <Flash />
      {children}
    </div>
  );
}
