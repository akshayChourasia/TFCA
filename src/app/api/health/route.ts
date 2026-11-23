import { sql } from "drizzle-orm";
import { db } from "@/db";

export const runtime = "nodejs";

/** Health check for the host: the app is up and can reach the database. */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
