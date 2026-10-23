// ============================================================
// DandoEv — Field-Level Data Encryption & Masking Utility
// Meets NDPR, GDPR, and PCI-DSS compliance standards.
// Uses AES-256-GCM with unique IVs and authenticated tags.
// ============================================================
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Retrieves the 32-byte encryption key from environment or fallback derivation.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.FIELD_ENCRYPTION_KEY || process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL SECURITY ERROR: FIELD_ENCRYPTION_KEY must be configured in production!');
    }
    return crypto.createHash('sha256').update('dandoev-secure-encryption-key-32b!').digest();
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Retrieves the blind index key (used for HMAC searchable hashes).
 */
function getBlindIndexKey(): Buffer {
  const secret = process.env.BLIND_INDEX_KEY || process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL SECURITY ERROR: BLIND_INDEX_KEY must be configured in production!');
    }
    return crypto.createHash('sha256').update('dandoev-blind-index-salt-secret-32b!').digest();
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export interface EncryptedDataPayload {
  ciphertext: string; // Base64
  iv: string;         // Hex
  tag: string;        // Hex
  v: number;          // Key version
}

/**
 * Encrypt a string using AES-256-GCM.
 * Output format: `enc:v1:<iv_hex>:<tag_hex>:<ciphertext_base64>`
 */
export function encryptField(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return `enc:v1:${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
  } catch (error) {
    console.error('Field encryption failed:', error);
    throw new Error('Encryption operation failed');
  }
}

/**
 * Decrypt a string encrypted with AES-256-GCM.
 */
export function decryptField(encryptedString: string | null | undefined): string | null {
  if (!encryptedString) return null;

  // If the string is not encrypted (e.g. legacy plain text), return as-is
  if (!encryptedString.startsWith('enc:v1:')) {
    return encryptedString;
  }

  try {
    const parts = encryptedString.split(':');
    if (parts.length !== 5) {
      throw new Error('Malformed encrypted payload format');
    }

    const ivHex = parts[2];
    const tagHex = parts[3];
    const ciphertextBase64 = parts[4];

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextBase64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Field decryption failed or authentication tag mismatch:', error);
    throw new Error('Decryption failed: integrity check violated or invalid key');
  }
}

/**
 * Creates a deterministic HMAC-SHA256 blind index (hash) of a sensitive value.
 * Allows fast indexed database queries (e.g. checking duplicate BVN or NIN)
 * without decrypting rows or exposing raw plaintext.
 */
export function createBlindIndex(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const key = getBlindIndexKey();
  return crypto.createHmac('sha256', key).update(normalized).digest('hex');
}

/**
 * PII Masking Utilities for safe display in logs and UI.
 */
export const Masking = {
  /**
   * Mask BVN: 22234567890 -> 222*****890
   */
  bvn(bvn: string | null | undefined): string {
    if (!bvn) return 'N/A';
    const clean = bvn.trim();
    if (clean.length < 6) return '******';
    return `${clean.slice(0, 3)}*****${clean.slice(-3)}`;
  },

  /**
   * Mask NIN: 12345678901 -> 123*****901
   */
  nin(nin: string | null | undefined): string {
    if (!nin) return 'N/A';
    const clean = nin.trim();
    if (clean.length < 6) return '******';
    return `${clean.slice(0, 3)}*****${clean.slice(-3)}`;
  },

  /**
   * Mask Bank Account Number: 0123456789 -> ******6789
   */
  accountNumber(acc: string | null | undefined): string {
    if (!acc) return 'N/A';
    const clean = acc.trim();
    if (clean.length < 4) return '****';
    return `******${clean.slice(-4)}`;
  },

  /**
   * Mask Email: user.name@example.com -> u***e@example.com
   */
  email(email: string | null | undefined): string {
    if (!email) return 'N/A';
    const [local, domain] = email.split('@');
    if (!domain || local.length <= 2) return `***@${domain || 'unknown'}`;
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  },

  /**
   * Mask Phone: +2348012345678 -> +234801****678
   */
  phone(phone: string | null | undefined): string {
    if (!phone) return 'N/A';
    const clean = phone.trim();
    if (clean.length < 7) return '*******';
    return `${clean.slice(0, 7)}****${clean.slice(-3)}`;
  },
};
