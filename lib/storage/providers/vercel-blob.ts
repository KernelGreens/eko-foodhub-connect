import { get, put } from "@vercel/blob";

import type {
  EvidenceStorageLoadResult,
  EvidenceStorageProvider,
  EvidenceStoragePutInput,
} from "./types";

export const vercelBlobEvidenceStorageProvider: EvidenceStorageProvider = {
  name: "vercel-blob",
  async put(input: EvidenceStoragePutInput) {
    const blob = await put(input.pathname, input.file, {
      access: "private",
      addRandomSuffix: false,
      contentType: input.contentType,
    });

    return {
      storageKey: `blob:${blob.pathname}`,
      provider: "vercel-blob",
    };
  },
  async load(storageKey: string): Promise<EvidenceStorageLoadResult> {
    const pathname = storageKey.slice("blob:".length);
    const blob = await get(pathname, {
      access: "private",
    });

    if (!blob || blob.statusCode !== 200) {
      throw new Error("Evidence file not found.");
    }

    return {
      type: "stream",
      body: blob.stream,
      headers: {
        "Content-Type": blob.blob.contentType,
        "Content-Disposition": blob.blob.contentDisposition,
        "Cache-Control": "private, no-store",
      },
    };
  },
};
