import { createHmac, timingSafeEqual } from "node:crypto";
import { posix } from "node:path";

import { getEvidenceStorageProviderForKey } from "./providers";

const EVIDENCE_ACCESS_TTL_SECONDS = 60 * 30;

type EvidenceAccessPayload = {
  storageKey: string;
  expiresAt: number;
};

function getEvidenceAccessSecret() {
  return (
    process.env.EVIDENCE_ACCESS_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "eko-foodhub-evidence-dev-secret"
  );
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value: string) {
  return createHmac("sha256", getEvidenceAccessSecret())
    .update(value)
    .digest("base64url");
}

function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function isInternalEvidenceStorageKey(value: string) {
  return (
    value.startsWith("blob:") ||
    value.startsWith("s3:") ||
    value.startsWith("local:") ||
    value.startsWith("/uploads/")
  );
}

export function createSignedEvidenceAccessUrl(storageKey: string) {
  if (!storageKey || isExternalUrl(storageKey)) {
    return storageKey;
  }

  const payload: EvidenceAccessPayload = {
    storageKey,
    expiresAt: Date.now() + EVIDENCE_ACCESS_TTL_SECONDS * 1000,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(encodedPayload);

  return `/api/uploads/evidence/access?token=${encodeURIComponent(`${encodedPayload}.${signature}`)}`;
}

export function verifySignedEvidenceAccessToken(token: string | null) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload);
  const providedSignature = Buffer.from(signature);
  const actualSignature = Buffer.from(expectedSignature);

  if (
    providedSignature.length !== actualSignature.length ||
    !timingSafeEqual(providedSignature, actualSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      base64UrlDecode(encodedPayload),
    ) as EvidenceAccessPayload;

    if (payload.expiresAt <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function loadEvidenceForAccess(storageKey: string) {
  if (!storageKey) {
    throw new Error("Evidence file not found.");
  }

  if (isExternalUrl(storageKey)) {
    return {
      type: "redirect" as const,
      url: storageKey,
    };
  }

  return getEvidenceStorageProviderForKey(storageKey).load(storageKey);
}

export function buildEvidencePathname(
  category: "support" | "delivery" | "vendor-application",
  filename: string,
) {
  const now = new Date();
  const year = now.getUTCFullYear().toString();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0");

  return posix.join("evidence", category, year, month, filename);
}
