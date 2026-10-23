import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuth } from "@/lib/session";
import { googleConfigured, env } from "@/lib/env";
import LoginForm from "@/components/login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in | Millet Jar",
  description: "Sign in to Millet Jar with Google to place and track orders.",
};

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/account";
  }
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);

  // Already signed in? Skip the form.
  const auth = await getAuth();
  if (auth) redirect(next);

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:px-8">
      <div className="hidden max-w-sm lg:block">
        <Link href="/" className="text-sm text-mj-green hover:underline">
          ← Back to store
        </Link>
        <h2 className="mt-6 text-3xl font-semibold leading-tight text-mj-ink">
          Your orders, all in one place.
        </h2>
        <ul className="mt-6 space-y-3 text-sm text-mj-brown">
          {[
            "Save your delivery details once",
            "Track every order from your account",
            "Pay online securely or confirm on WhatsApp",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-mj-green/10 text-[10px] text-mj-green">
                ✓
              </span>
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex w-full justify-center lg:justify-start">
        <LoginForm
          googleEnabled={googleConfigured()}
          devLoginEnabled={!env.isProd}
          next={next}
          initialError={params.error}
        />
      </div>
    </div>
  );
}
