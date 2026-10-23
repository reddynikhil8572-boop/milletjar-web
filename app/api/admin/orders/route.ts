import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/guard";
import { readDB } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardAdmin(req, {
    key: "admin:orders:list",
    csrf: false,
    limit: 120,
  });
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "all";

  const orders = await readDB((db) =>
    db.orders
      .filter((order) => status === "all" || order.status === status)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 200)
  );

  const stats = await readDB((db) => ({
    total: db.orders.length,
    paid: db.orders.filter((o) => o.payment.status === "paid").length,
    revenue: db.orders
      .filter((o) => o.payment.status === "paid")
      .reduce((sum, o) => sum + o.total, 0),
    customers: db.users.length,
  }));

  return NextResponse.json({ orders, stats }, { status: 200 });
}
