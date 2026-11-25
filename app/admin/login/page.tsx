import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin";
import { supabaseConfigured } from "@/lib/env";
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
        {!supabaseConfigured() && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
            Admin sign-in is not configured. Set <code>SUPABASE_URL</code>{" "}
            and <code>SUPABASE_SERVICE_ROLE_KEY</code>, run{" "}
            <code>supabase/schema.sql</code> in the Supabase SQL Editor, then
            create an admin with <code>npm run create:admin</code>.
          </div>
        )}
        <AdminLoginForm />
      </div>
    </div>
  );
}
