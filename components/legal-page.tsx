import Link from "next/link";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export default function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Draft notice:</strong> replace the bracketed placeholders with
        Millet Jar’s verified business and legal details before launch. These
        pages are provided as a starting structure, not as legal advice.
      </div>
      <h1 className="mt-8 text-3xl font-semibold text-mj-ink">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-mj-brown">{intro}</p>

      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-medium text-mj-ink">{section.title}</h2>
            {section.paragraphs?.map((text) => (
              <p key={text} className="mt-2 text-sm leading-relaxed text-mj-brown">
                {text}
              </p>
            ))}
            {section.bullets && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-mj-brown">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <p className="mt-10 text-sm text-mj-brown">
        Questions? <Link href="/contact" className="text-mj-green hover:underline">Contact us</Link>.
      </p>
    </div>
  );
}
