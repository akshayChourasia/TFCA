import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * The township the current request works on.
 * Until phone-OTP login lands, this comes from the `org` cookie or DEFAULT_ORG_SLUG.
 */
export async function getCurrentOrg() {
  const jar = await cookies();
  const slug = jar.get("org")?.value ?? process.env.DEFAULT_ORG_SLUG ?? "tfca";
  const org = await db.query.organizations.findFirst({ where: eq(schema.organizations.slug, slug) });
  if (!org) throw new Error(`Organisation "${slug}" not found. Run \`npm run db:seed\`.`);
  return org;
}
