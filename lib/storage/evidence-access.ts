import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, join, posix } from "node:path";

import { get } from "@vercel/blob";

const EVIDENCE_ACCESS_TTL_SECONDS = 60 * 30;

const MIME_EXTENSION_MAP: Record<string, string> = {
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".txt": "text/plain",
  ".webm": "video/webm",
  ".webp": "image/webp",
};

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

function getLocalPublicPath(storageKey: string) {
  if (storageKey.startsWith("local:")) {
    return storageKey.slice("local:".length);
  }

  if (storageKey.startsWith("/uploads/")) {
    return storageKey;
  }

  throw new Error("Unsupported local evidence path.");
}

function inferMimeType(storageKey: string) {
  const extension = extname(storageKey).toLowerCase();

  return MIME_EXTENSION_MAP[extension] ?? "application/octet-stream";
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

  if (storageKey.startsWith("blob:")) {
    const pathname = storageKey.slice("blob:".length);
    const blob = await get(pathname, {
      access: "private",
    });

    if (!blob || blob.statusCode !== 200) {
      throw new Error("Evidence file not found.");
    }

    return {
      type: "stream" as const,
      body: blob.stream,
      headers: {
        "Content-Type": blob.blob.contentType,
        "Content-Disposition": blob.blob.contentDisposition,
        "Cache-Control": "private, no-store",
      },
    };
  }

  const publicPath = getLocalPublicPath(storageKey);

  if (!publicPath.startsWith("/uploads/")) {
    throw new Error("Evidence file not found.");
  }

  const absolutePath = join(process.cwd(), "public", publicPath.replace(/^\//, ""));
  const fileBuffer = await readFile(absolutePath);

  return {
    type: "buffer" as const,
    body: fileBuffer,
    headers: {
      "Content-Type": inferMimeType(publicPath),
      "Content-Disposition": `inline; filename="${publicPath.split("/").pop() ?? "evidence"}"`,
      "Cache-Control": "private, no-store",
    },
  };
}

export function buildEvidencePathname(category: "support" | "delivery", filename: string) {
  const now = new Date();
  const year = now.getUTCFullYear().toString();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0");

  return posix.join("evidence", category, year, month, filename);
}
