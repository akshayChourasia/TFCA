import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Headless Chromium opens /render/... without a login. The URL carries a
 * short-lived HMAC token tied to the organisation and issue.
 */
const secret = () => process.env.RENDER_SECRET ?? "dev-render-secret";
const TTL_MS = 10 * 60 * 1000;

/** `resource` names what may be rendered, e.g. an issue id or `invoice:<id>`. */
export function signRender(orgId: string, resource: string) {
  const exp = Date.now() + TTL_MS;
  const sig = createHmac("sha256", secret()).update(`${orgId}.${resource}.${exp}`).digest("hex");
  return `${orgId}.${exp}.${sig}`;
}

export function verifyRender(token: string, resource: string): string | null {
  const [orgId, expStr, sig] = token.split(".");
  if (!orgId || !expStr || !sig) return null;
  if (Number(expStr) < Date.now()) return null;
  const expected = createHmac("sha256", secret()).update(`${orgId}.${resource}.${expStr}`).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? orgId : null;
}
