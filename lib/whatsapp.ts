import { env } from "./env";
import type { Order } from "./types";

/** WhatsApp message body for an order, including name, rate, qty and total. */
export function orderMessage(order: Order): string {
  const lines: string[] = [
    "*MILLET JAR - NEW ORDER*",
    "--------------------------",
    "*Customer Details:*",
    `Name: ${order.customer.name}`,
    `Phone: ${order.customer.phone}`,
    `Address: ${order.customer.address}`,
    `Pincode: ${order.customer.pincode}`,
  ];
  if (order.customer.slot) lines.push(`Delivery Slot: ${order.customer.slot}`);
  lines.push(`Order Ref: ${order.reference}`, "");
  lines.push("*Order Details:*", "--------------------------");
  order.items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.name}`,
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
  return `https://wa.me/${env.whatsappNumber}?text=${encodeURIComponent(
    orderMessage(order)
  )}`;
}
