import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

/** Stored as `scrypt:<salt hex>:<hash hex>`. */
export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(pw.normalize("NFKC"), salt, 64);
  return ["scrypt", salt.toString("hex"), hash.toString("hex")].join(":");
}

export async function verifyPassword(pw: string, stored: string | null) {
  if (!stored) return false;
  const [algo, saltHex, hashHex] = stored.split(":");
  if (algo !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(pw.normalize("NFKC"), Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

export const MIN_PASSWORD = 8;

/** Readable temporary password, e.g. "tfca-4821-mango". */
export function tempPassword() {
  const words = ["mango", "neem", "lotus", "tulsi", "peepal", "kesar", "chandan", "gulab", "moti", "heera"];
  const n = 1000 + (randomBytes(2).readUInt16BE() % 9000);
  return `tfca-${n}-${words[randomBytes(1)[0] % words.length]}`;
}

/** Indian mobile numbers: keep the last 10 digits. */
export const normalizePhone = (p: string) => p.replace(/\D/g, "").slice(-10);
