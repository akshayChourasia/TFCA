import path from "node:path";
import { count } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, schema } from "@/db";
import { defaultBrand } from "@/lib/brand";
import { hashPassword, normalizePhone, tempPassword } from "@/lib/password";

/**
 * Runs once when the production server starts (see src/instrumentation.ts):
 * applies database migrations, then, on an empty database, creates the
 * township and its first admin from environment variables.
 */
export async function startup() {
  for (const key of ["DATABASE_URL", "RENDER_SECRET"]) {
    if (!process.env[key]) throw new Error(`${key} is not set. See DEPLOY.md.`);
  }
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log("[startup] database migrations applied");
  await bootstrap();
}

async function bootstrap() {
  const [{ n }] = await db.select({ n: count() }).from(schema.organizations);
  if (n > 0) return;
  const phone = normalizePhone(process.env.ADMIN_PHONE ?? "");
  if (phone.length !== 10) {
    console.warn("[startup] Empty database. Set ADMIN_PHONE (10-digit mobile) and restart to create the first admin.");
    return;
  }
  const [org] = await db
    .insert(schema.organizations)
    .values({
      slug: process.env.ORG_SLUG || "tfca",
      name: process.env.ORG_NAME || "Treasure Fantasy Cricket Association",
      shortName: process.env.ORG_SHORT_NAME || "TFCA",
      brand: defaultBrand,
    })
    .returning();
  const password = process.env.ADMIN_PASSWORD || tempPassword();
  await db.insert(schema.teamUsers).values({
    orgId: org.id,
    name: process.env.ADMIN_NAME || "Admin",
    phone,
    role: "admin",
    passwordHash: await hashPassword(password),
    mustChangePassword: true,
  });
  console.log(`[startup] Created ${org.shortName} and its first admin. Log in with mobile ${phone}, password ${password}, then set your own password.`);
}
