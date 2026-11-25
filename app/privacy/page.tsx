import LegalPage from "@/components/legal-page";

export const metadata = {
  title: "Privacy Policy | Millet Jar",
  description: "How Millet Jar handles the information you share with us.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This policy explains what information Millet Jar collects when you use this website and how it is used. Replace every placeholder below with verified details before publishing."
      sections={[
        {
          title: "Information we collect",
          bullets: [
            "Account details: name, email address, password hash (for password accounts) or Google account identifier (for Google sign-in).",
            "Order details: delivery address, phone number, preferred slot, items, quantities and order totals.",
            "Technical data: IP address and request metadata used only for security and rate limiting.",
          ],
        },
        {
          title: "How we use it",
          paragraphs: [
            "We use this information to create and fulfil orders, send your order summary to WhatsApp, show your order history and protect the site from abuse.",
            "We do not sell your personal information. We do not use this website to collect card, UPI, RuPay or net-banking data.",
          ],
        },
        {
          title: "Who receives it",
          paragraphs: [
            "Order data is sent to the WhatsApp business number configured for Millet Jar so our team can confirm availability, payment and delivery. Storage is provided by [DATABASE/HOSTING PROVIDER — insert verified name and location].",
          ],
        },
        {
          title: "Retention and your choices",
          paragraphs: [
            "We keep order records for [RETENTION PERIOD] and security logs for [LOG RETENTION PERIOD]. To request access, correction or deletion, contact us at [PRIVACY CONTACT EMAIL].",
          ],
        },
        {
          title: "Cookies",
          paragraphs: [
            "We use a session cookie to keep you signed in and an OAuth state cookie during Google sign-in. Analytics/verification cookies: [LIST ANY ANALYTICS OR VERIFICATION TOOLS, OR STATE NONE].",
          ],
        },
        {
          title: "Updates",
          paragraphs: [
            "We will update this page when our practices change. Last reviewed: [DATE].",
          ],
        },
      ]}
    />
  );
}
