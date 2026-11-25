import type { OrderStatus } from "./types";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "paid",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

/** Forward-only workflow. Cancellation is terminal; delivered is terminal. */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "paid", "cancelled"],
  confirmed: ["paid", "packed", "cancelled"],
  paid: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return from === to || NEXT_STATUSES[from].includes(to);
}
