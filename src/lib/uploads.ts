import path from "node:path";

/**
 * Where uploaded images live on disk. Production points UPLOAD_DIR at a
 * persistent volume (e.g. /data/uploads); development keeps them in
 * public/uploads. Files are served at /uploads/<org>/<file> either way.
 */
export const uploadDir = () => process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
