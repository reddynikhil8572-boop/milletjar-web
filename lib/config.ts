const rawWhatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(
  /[\s()+.-]/g,
  ""
);
const devWhatsappNumber = "919999999999";
const whatsappNumber =
  /^\d{10,15}$/.test(rawWhatsappNumber) && rawWhatsappNumber !== devWhatsappNumber
    ? rawWhatsappNumber
    : process.env.NODE_ENV === "production"
      ? ""
      : devWhatsappNumber;

export const SITE = {
  name: "Millet Jar",
  tagline: "Fresh from Farm to Your Family.",
  domain: "www.milletjar.in",
  url: "https://www.milletjar.in",
  instagram: "@milletjarofficial",
  /** Digits only. Empty in production if misconfigured; startup validation fails closed. */
  whatsappNumber,
};

export const CONTACT = {
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@milletjar.in",
};
