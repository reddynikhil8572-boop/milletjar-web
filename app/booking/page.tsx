import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { readDB } from "@/lib/store";
import BookingForm from "@/components/booking-form";
import Reveal from "@/components/reveal";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Delivery details | Millet Jar",
  description: "Add your delivery details to place a Millet Jar order.",
};

export default async function BookingPage() {
  const auth = await requireUser();
  if (!auth) redirect("/login?next=/booking");

  const savedAddresses = await readDB((db) =>
    db.savedAddresses
      .filter((a) => a.userId === auth.user.id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 6)
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Reveal className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-mj-ink">
            Delivery details
          </h1>
          <p className="mt-1 text-mj-brown">
            We will use these details only to deliver this order.
          </p>
        </div>
        <span className="rounded-full bg-mj-cream px-3 py-1 text-xs font-medium text-mj-green">
          Step 1 of 2
        </span>
      </Reveal>

      <BookingForm
        defaultName={auth.user.name}
        defaultEmail={auth.user.email}
        savedAddresses={savedAddresses}
      />
    </div>
  );
}
