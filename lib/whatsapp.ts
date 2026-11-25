import "server-only";

import { whatsappNumber } from "./env";
import type { Order } from "./types";

/**
 * Customer-entered text is flattened to one line and stripped of WhatsApp
 * formatting markers so it cannot inject a fake total or a new section.
 */
function field(value: string | undefined, max: number): string {
  return (
    (value || "")
      .replace(/[\r\n\t]+/g, " ")
      .replace(/[*_~`]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max) || "-"
  );
}

/** WhatsApp message body: full customer, item, quantity and total details. */
export function orderMessage(order: Order): string {
  const lines: string[] = [
    "*MILLET JAR - NEW ORDER*",
    "--------------------------",
    "*Customer Details:*",
    `Name: ${field(order.customer.name, 80)}`,
    `Phone: ${field(order.customer.phone, 15)}`,
    `Address: ${field(order.customer.address, 300)}`,
  ];
  const city = field(order.customer.city, 80);
  if (city !== "-") lines.push(`City: ${city}`);
  lines.push(`Pincode: ${field(order.customer.pincode, 10)}`);
  const slot = field(order.customer.slot, 80);
  if (slot !== "-") lines.push(`Delivery Slot: ${slot}`);
  lines.push(`Order Ref: ${field(order.reference, 40)}`, "");
  lines.push("*Order Details:*", "--------------------------");
  order.items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${field(item.name, 80)}`,
      `   Rate: ₹${item.price} | Qty: ${item.qty} | Total: ₹${item.lineTotal}`
    );
  });
  lines.push("--------------------------");
  if (order.shipping > 0) {
    lines.push(`Subtotal: ₹${order.subtotal}`, `Shipping: ₹${order.shipping}`);
  }
  lines.push(
    `*GRAND TOTAL: ₹${order.total}*`,
    "--------------------------",
    "",
    "Please confirm availability & delivery."
  );
  return lines.join("\n");
}

export function whatsappLink(order: Order): string {
  return `https://wa.me/${whatsappNumber()}?text=${encodeURIComponent(
    orderMessage(order)
  )}`;
}
