import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { getCurrentOrg } from "@/lib/org";

export const runtime = "nodejs";

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

/**
 * Stores an uploaded image and records it in the media library.
 * Development storage is public/uploads; production will use Supabase Storage.
 */
export async function POST(req: NextRequest) {
  const org = await getCurrentOrg();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  const ext = ALLOWED.get(file.type);
  if (!ext) return NextResponse.json({ error: "Use a JPG, PNG or WebP image" }, { status: 400 });
  if (file.size > 40 * 1024 * 1024) return NextResponse.json({ error: "Image is larger than 40 MB" }, { status: 400 });

  const name = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", org.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  const url = `/uploads/${org.slug}/${name}`;
  await db.insert(schema.mediaAssets).values({ orgId: org.id, url, fileName: file.name });
  return NextResponse.json({ url });
}
