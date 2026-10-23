import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin";
import { adminConfigured } from "@/lib/env";
import AdminLoginForm from "@/components/admin-login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin | Millet Jar",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const admin = await getAdmin();
  if (admin) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-mj-cream/40 px-4 py-12">
      <div className="w-full max-w-sm">
        {!adminConfigured() && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
            Admin sign-in is not configured. Set <code>ADMIN_EMAIL</code> and{" "}
            <code>ADMIN_PASSWORD_HASH</code> (or <code>ADMIN_PASSWORD</code>{" "}
            for local development).
          </div>
        )}
        <AdminLoginForm />
      </div>
    </div>
  );
}
