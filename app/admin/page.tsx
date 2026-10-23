import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin";
import AdminDashboard from "@/components/admin-dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin | Millet Jar",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // Full server-side verification, not just a cookie presence check.
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-mj-cream/30">
      <AdminDashboard email={admin.email} />
    </div>
  );
}
