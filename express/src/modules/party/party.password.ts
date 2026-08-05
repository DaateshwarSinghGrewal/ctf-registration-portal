import crypto from "node:crypto";

/**
 * Team-password hashing.
 *
 * scrypt with a per-password salt, replacing PBKDF2 at 1 000 iterations — that
 * iteration count is roughly a thousandth of any current guidance and is
 * trivially brute-forced offline if the table leaks. scrypt is also
 * memory-hard, which blunts GPU attacks, and it is in Node's standard library,
 * so this needs no dependency.
 *
 * These are shared, low-value secrets typed into a "join team" box, not account
 * credentials — the cost parameters are deliberately modest so a join stays
 * fast.
 */

const SALT_BYTES = 16;
const KEY_LENGTH = 64;
const SCRYPT_COST = 16_384; // 2^14

export function hashPartyPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const derived = crypto
    .scryptSync(password, salt, KEY_LENGTH, { N: SCRYPT_COST })
    .toString("hex");
  return `scrypt$${SCRYPT_COST}$${salt}$${derived}`;
}

/**
 * Verifies a password against a stored hash.
 *
 * Understands both the current `scrypt$...` format and the legacy
 * `salt:hash` PBKDF2 format, because teams created before this change still
 * have passwords in the old encoding and locking their members out is not an
 * acceptable migration. New and rotated passwords are always written as scrypt.
 */
export function verifyPartyPassword(password: string, stored: string): boolean {
  if (stored.startsWith("scrypt$")) {
    const [, cost, salt, expected] = stored.split("$");
    if (!cost || !salt || !expected) return false;

    const derived = crypto.scryptSync(password, salt, KEY_LENGTH, { N: Number(cost) });
    return timingSafeEqualHex(derived, expected);
  }

  // Legacy: PBKDF2-SHA512, 1 000 iterations, `salt:hash`.
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;

  const derived = crypto.pbkdf2Sync(password, salt, 1000, KEY_LENGTH, "sha512");
  return timingSafeEqualHex(derived, expected);
}

/**
 * `timingSafeEqual` throws on a length mismatch, so the lengths are compared
 * first — that comparison leaks only the hash length, which is fixed and
 * public.
 */
function timingSafeEqualHex(derived: Buffer, expectedHex: string): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  if (expected.length !== derived.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

/** True when a stored hash uses the superseded PBKDF2 encoding. */
export function isLegacyHash(stored: string): boolean {
  return !stored.startsWith("scrypt$");
}
