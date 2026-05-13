import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";

import type {
  EvidenceStorageLoadResult,
  EvidenceStorageProvider,
  EvidenceStoragePutInput,
} from "./types";

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

export const localEvidenceStorageProvider: EvidenceStorageProvider = {
  name: "local",
  async put(input: EvidenceStoragePutInput) {
    const publicPath = `/${join("uploads", input.pathname).replaceAll("\\", "/")}`;
    const absolutePath = join(
      process.cwd(),
      "public",
      publicPath.replace(/^\//, ""),
    );
    const absoluteDirectory = dirname(absolutePath);
    const buffer = Buffer.from(await input.file.arrayBuffer());

    await mkdir(absoluteDirectory, { recursive: true });
    await writeFile(absolutePath, buffer);

    return {
      storageKey: `local:${publicPath}`,
      provider: "local",
    };
  },
  async load(storageKey: string): Promise<EvidenceStorageLoadResult> {
    const publicPath = getLocalPublicPath(storageKey);

    if (!publicPath.startsWith("/uploads/")) {
      throw new Error("Evidence file not found.");
    }

    const absolutePath = join(
      process.cwd(),
      "public",
      publicPath.replace(/^\//, ""),
    );
    const fileBuffer = await readFile(absolutePath);

    return {
      type: "buffer",
      body: fileBuffer,
      headers: {
        "Content-Type": inferMimeType(publicPath),
        "Content-Disposition": `inline; filename="${publicPath.split("/").pop() ?? "evidence"}"`,
        "Cache-Control": "private, no-store",
      },
    };
  },
};
