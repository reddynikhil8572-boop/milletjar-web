import LegalPage from "@/components/legal-page";

export const metadata = {
  title: "Terms of Service | Millet Jar",
  description: "Terms for using the Millet Jar website and WhatsApp ordering.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms govern use of the Millet Jar website and its WhatsApp ordering flow. Replace every placeholder below with verified terms before publishing."
      sections={[
        {
          title: "Orders are confirmations, not instant sales",
          paragraphs: [
            "Submitting the booking form sends your complete order to our WhatsApp number. Your order is confirmed only when our team confirms availability, price and delivery with you on WhatsApp.",
            "The website does not accept online payment. Payment and delivery are arranged directly with our team.",
          ],
        },
        {
          title: "Pricing and availability",
          paragraphs: [
            "Prices shown are recalculated from the current catalog when the order is created. Stock is limited and may change before confirmation. Errors in pricing or availability will be corrected with you before fulfilment.",
          ],
        },
        {
          title: "Delivery",
          paragraphs: [
            "Delivery areas, slots and charges are confirmed on WhatsApp. Delivery is subject to [SERVICE AREA / OPERATING HOURS — insert verified details].",
          ],
        },
        {
          title: "Accounts",
          paragraphs: [
            "You are responsible for keeping your account credentials secure and for the accuracy of the information you submit. Unauthorized access should be reported to [SECURITY CONTACT EMAIL].",
          ],
        },
        {
          title: "Liability and law",
          paragraphs: [
            "To the extent permitted by law, Millet Jar is not liable for indirect losses arising from use of this website. These terms are governed by the laws of [JURISDICTION — insert verified details].",
          ],
        },
        {
          title: "Changes",
          paragraphs: [
            "We may update these terms. Last reviewed: [DATE].",
          ],
        },
      ]}
    />
  );
}
