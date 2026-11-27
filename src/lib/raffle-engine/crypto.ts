import crypto from "crypto";

export const ALGORITHM_VERSION = "LMS-HMAC-SHA256-FY-V1";

export function generateCryptographicSeed(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function sha256Hex(input: string | Buffer): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function computeSeedCommitment(seedHex: string): string {
  return sha256Hex(`LMS_COMMITMENT_V1:${seedHex}`);
}

export function encryptSeed(seedHex: string, encryptionKeyHex: string): string {
  if (!/^[0-9a-fA-F]{64}$/.test(encryptionKeyHex)) {
    throw new Error("RAFFLE_SEED_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  const key = Buffer.from(encryptionKeyHex, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(seedHex, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSeed(payload: string, encryptionKeyHex: string): string {
  if (!/^[0-9a-fA-F]{64}$/.test(encryptionKeyHex)) {
    throw new Error("RAFFLE_SEED_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted seed format");
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = Buffer.from(encryptionKeyHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * Deterministic HMAC-SHA256 PRNG with rejection sampling for unbiased integer generation.
 */
export class DeterministicPrng {
  private counter = 0;
  private readonly seedKey: Buffer;

  constructor(seedHex: string) {
    this.seedKey = Buffer.from(seedHex, "hex");
  }

  private nextUint32(): number {
    const hmac = crypto.createHmac("sha256", this.seedKey);
    hmac.update(`LMS_PRNG_V1:${this.counter}`);
    this.counter += 1;
    const digest = hmac.digest();
    return digest.readUInt32BE(0);
  }

  /**
   * Returns an unbiased integer in [0, maxExclusive) using rejection sampling.
   */
  public nextInt(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error("maxExclusive must be a positive integer");
    }
    if (maxExclusive === 1) return 0;

    const maxUint32 = 0x100000000;
    const limit = maxUint32 - (maxUint32 % maxExclusive);

    while (true) {
      const value = this.nextUint32();
      if (value < limit) {
        return value % maxExclusive;
      }
    }
  }
}

/**
 * Deterministic Fisher-Yates shuffle using unbiased rejection sampling.
 */
export function deterministicFisherYates<T>(items: readonly T[], seedHex: string): T[] {
  const result = [...items];
  const prng = new DeterministicPrng(seedHex);

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = prng.nextInt(i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}

