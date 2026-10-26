import { sql } from "test-browser";

export function run() {
  await sql`SELECT 1`;
  return "done";
}
