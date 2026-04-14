import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

function toHex(buffer: Buffer) {
  return buffer.toString("hex");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, 64);

  return `${toHex(salt)}:${toHex(derivedKey)}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [saltHex, hashHex] = passwordHash.split(":");

  if (!saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const expectedHash = Buffer.from(hashHex, "hex");
  const passwordHashBuffer = scryptSync(password, salt, expectedHash.length);

  return timingSafeEqual(passwordHashBuffer, expectedHash);
}
