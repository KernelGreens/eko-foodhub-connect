import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";

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

function sanitizeCategory(value: string | null) {
  return value === "delivery" ? "delivery" : "support";
}

function resolveFileExtension(file: File) {
  const explicitExtension = extname(file.name).toLowerCase();

  if (explicitExtension) {
    return explicitExtension;
  }

  return MIME_EXTENSION_MAP[file.type] ?? "";
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
  const now = new Date();
  const year = now.getUTCFullYear().toString();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0");
  const extension = resolveFileExtension(file);
  const filename = `${Date.now()}-${randomUUID()}${extension}`;
  const relativeDirectory = join("uploads", "evidence", category, year, month);
  const absoluteDirectory = join(process.cwd(), "public", relativeDirectory);
  const absolutePath = join(absoluteDirectory, filename);
  const publicUrl = `/${relativeDirectory.replaceAll("\\", "/")}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(absoluteDirectory, { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    url: publicUrl,
    mimeType: file.type || undefined,
    displayName: file.name || filename,
    size: file.size,
  };
}
