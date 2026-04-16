import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";

import { put } from "@vercel/blob";

import {
  buildEvidencePathname,
  createSignedEvidenceAccessUrl,
} from "./evidence-access";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

const MIME_EXTENSION_MAP: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "text/plain": ".txt",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
};

function isAllowedMimeType(mimeType: string) {
  return (
    mimeType.startsWith("image/") ||
    mimeType.startsWith("video/") ||
    mimeType === "application/pdf" ||
    mimeType === "text/plain"
  );
}

function sanitizeCategory(value: string | null): "support" | "delivery" {
  return value === "delivery" ? "delivery" : "support";
}

function resolveFileExtension(file: File) {
  const explicitExtension = extname(file.name).toLowerCase();

  if (explicitExtension) {
    return explicitExtension;
  }

  return MIME_EXTENSION_MAP[file.type] ?? "";
}

function buildUniqueFilename(file: File) {
  return `${Date.now()}-${randomUUID()}${resolveFileExtension(file)}`;
}

function hasBlobStorageToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveEvidenceUpload(
  file: File,
  categoryValue: string | null,
) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("A file is required.");
  }

  if (file.size === 0) {
    throw new Error("Uploaded files cannot be empty.");
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Uploaded files must be 10MB or smaller.");
  }

  if (file.type && !isAllowedMimeType(file.type)) {
    throw new Error("Only image, video, PDF, or text files are supported.");
  }

  const category = sanitizeCategory(categoryValue);
  const filename = buildUniqueFilename(file);
  const pathname = buildEvidencePathname(category, filename);

  if (hasBlobStorageToken()) {
    const blob = await put(pathname, file, {
      access: "private",
      addRandomSuffix: false,
      contentType: file.type || undefined,
    });

    const storageKey = `blob:${blob.pathname}`;

    return {
      storageKey,
      accessUrl: createSignedEvidenceAccessUrl(storageKey),
      mimeType: file.type || undefined,
      displayName: file.name || filename,
      size: file.size,
      provider: "blob" as const,
    };
  }

  const publicPath = `/${join("uploads", pathname).replaceAll("\\", "/")}`;
  const absolutePath = join(process.cwd(), "public", publicPath.replace(/^\//, ""));
  const absoluteDirectory = dirname(absolutePath);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(absoluteDirectory, { recursive: true });
  await writeFile(absolutePath, buffer);

  const storageKey = `local:${publicPath}`;

  return {
    storageKey,
    accessUrl: createSignedEvidenceAccessUrl(storageKey),
    mimeType: file.type || undefined,
    displayName: file.name || filename,
    size: file.size,
    provider: "local" as const,
  };
}
