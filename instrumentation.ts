/**
 * Runs once per server instance before it accepts requests. Only the Node.js
 * runtime validates config; proxy runs on the edge and must not import
 * server-only modules.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { validateProductionConfig } = await import("@/lib/env");
  validateProductionConfig();
}
