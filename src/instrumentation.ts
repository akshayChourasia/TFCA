/** Next.js calls this once when the server starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  if (process.env.MIGRATE_ON_START === "false") return;
  const { startup } = await import("./lib/startup");
  await startup();
}
