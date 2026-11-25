import LegalPage from "@/components/legal-page";

export const metadata = {
  title: "Refund & Cancellation Policy | Millet Jar",
  description: "How Millet Jar handles cancellations, returns and refunds.",
};

export default function RefundPage() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      intro="This policy explains how cancellations, returns and refunds are handled for orders placed through Millet Jar. Replace every placeholder below with verified details before publishing."
      sections={[
        {
          title: "Before confirmation",
          paragraphs: [
            "You may cancel an unconfirmed order by replying on WhatsApp. No payment has been collected by this website.",
          ],
        },
        {
          title: "After confirmation",
          paragraphs: [
            "Cancellation and refund eligibility depend on the state of the order at the time you contact us: [INSERT VERIFIED WINDOW, e.g. before dispatch]. Once an order is shipped, cancellation may not be possible.",
          ],
        },
        {
          title: "Damaged or incorrect items",
          paragraphs: [
            "If an item arrives damaged or incorrect, contact us on WhatsApp within [INSERT VERIFIED TIME WINDOW] with your order reference and photos. We will arrange [REPLACEMENT / REFUND — insert verified process].",
          ],
        },
        {
          title: "How refunds are paid",
          paragraphs: [
            "Because payments are handled directly with our team on WhatsApp, refunds are returned using the same method and to the same payer, within [INSERT VERIFIED TIMELINE]. Any bank or payment-provider charges are [INSERT VERIFIED POLICY].",
          ],
        },
        {
          title: "Contact",
          paragraphs: [
            "For cancellation or refund requests, message the WhatsApp number shown on the order confirmation or email [REFUNDS CONTACT EMAIL]. Last reviewed: [DATE].",
          ],
        },
      ]}
    />
  );
}
