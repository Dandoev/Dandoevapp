// ============================================================
// DandoEv — Multi-Factor Authentication (MFA) & Biometric Auth
// RFC 6238 TOTP implementation & WebAuthn / Passkey support
// ============================================================
import crypto from 'crypto';

const TOTP_STEP = 30; // 30-second time window
const TOTP_DIGITS = 6;
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 10; // e.g. "a1b2-c3d4"

/**
 * Base32 character set for TOTP secret encoding (RFC 4648)
 */
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_CHARS.indexOf(cleaned[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate a new TOTP secret key for a user.
 */
export function generateTotpSecret(): { secret: string; uri: (email: string) => string } {
  const randomBuffer = crypto.randomBytes(20);
  const secret = base32Encode(randomBuffer);

  return {
    secret,
    uri: (email: string) => {
      const issuer = encodeURIComponent('DandoEv');
      const account = encodeURIComponent(email);
      return `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP}`;
    },
  };
}

/**
 * Compute the TOTP code for a secret at a given counter.
 */
function computeTotpCode(secretBuffer: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0xf;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = binary % 10 ** TOTP_DIGITS;
  return otp.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Verify a 6-digit TOTP code against a secret with window drift tolerance (±1 step = 30s).
 */
export function verifyTotpCode(secret: string, token: string, window = 1): boolean {
  if (!secret || !token) return false;
  const cleanToken = token.trim().replace(/\s+/g, '');
  if (cleanToken.length !== TOTP_DIGITS) return false;

  try {
    const secretBuffer = base32Decode(secret);
    const currentCounter = Math.floor(Date.now() / 1000 / TOTP_STEP);

    for (let i = -window; i <= window; i++) {
      const expectedCode = computeTotpCode(secretBuffer, currentCounter + i);
      if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(expectedCode))) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}

/**
 * Generates a set of single-use backup recovery codes.
 * Returns raw codes for the user to write down, and SHA-256 hashed codes to store in DB.
 */
export function generateBackupCodes(): { rawCodes: string[]; hashedCodes: string[] } {
  const rawCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toLowerCase(); // 8 hex chars
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    const hash = crypto.createHash('sha256').update(formatted).digest('hex');

    rawCodes.push(formatted);
    hashedCodes.push(hash);
  }

  return { rawCodes, hashedCodes };
}

/**
 * Validates and consumes a single-use backup code.
 */
export function verifyBackupCode(
  providedCode: string,
  storedHashedCodes: string[]
): { valid: boolean; remainingHashes: string[] } {
  const cleanCode = providedCode.trim().toLowerCase();
  const providedHash = crypto.createHash('sha256').update(cleanCode).digest('hex');

  const index = storedHashedCodes.findIndex((hash) => hash === providedHash);
  if (index === -1) {
    return { valid: false, remainingHashes: storedHashedCodes };
  }

  // Remove the used code
  const remainingHashes = [...storedHashedCodes];
  remainingHashes.splice(index, 1);

  return { valid: true, remainingHashes };
}

/**
 * WebAuthn & Biometric Passkey Helper Types and Scaffolding
 */
export interface WebAuthnChallenge {
  challenge: string; // Base64URL
  userId: string;
  timestamp: number;
}

export function generateWebAuthnChallenge(userId: string): WebAuthnChallenge {
  const challenge = crypto.randomBytes(32).toString('base64url');
  return {
    challenge,
    userId,
    timestamp: Date.now(),
  };
}
