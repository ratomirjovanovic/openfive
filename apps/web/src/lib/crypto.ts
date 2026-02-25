/**
 * AES-256-GCM encryption/decryption for sensitive data like API keys.
 * Uses MASTER_ENCRYPTION_KEY environment variable as the key source.
 * Never stores or logs plaintext keys.
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96 bits for GCM
const KEY_LENGTH = 256;

function getMasterKey(): string {
  const key = process.env.MASTER_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error(
      "MASTER_ENCRYPTION_KEY must be set (min 32 chars). Generate with: openssl rand -hex 32"
    );
  }
  return key;
}

async function deriveKey(masterKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(masterKey).slice(0, 32),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("openfive-v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing IV + ciphertext.
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await deriveKey(getMasterKey());
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  // Prepend IV to ciphertext
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64-encoded AES-256-GCM ciphertext.
 */
export async function decrypt(encoded: string): Promise<string> {
  const key = await deriveKey(getMasterKey());
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}

/**
 * Masks a sensitive value for display (e.g., "sk-abc...xyz").
 * Shows first prefix and last 4 characters.
 */
export function maskSecret(value: string, prefixLen = 6): string {
  if (value.length <= prefixLen + 4) return "****";
  return `${value.slice(0, prefixLen)}...${value.slice(-4)}`;
}
