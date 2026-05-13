import { localEvidenceStorageProvider } from "./local";
import { s3EvidenceStorageProvider } from "./s3";
import type {
  EvidenceStorageProvider,
  EvidenceStorageProviderName,
} from "./types";
import { vercelBlobEvidenceStorageProvider } from "./vercel-blob";

function getConfiguredStorageProviderName(): EvidenceStorageProviderName {
  const provider = process.env.STORAGE_PROVIDER?.trim().toLowerCase();

  if (!provider) {
    return process.env.BLOB_READ_WRITE_TOKEN ? "vercel-blob" : "local";
  }

  switch (provider) {
    case "blob":
    case "vercel":
    case "vercel-blob":
      return "vercel-blob";
    case "s3":
    case "aws-s3":
      return "s3";
    case "local":
      return "local";
    default:
      throw new Error(
        `Unsupported STORAGE_PROVIDER "${provider}". Use local, vercel-blob, or s3.`,
      );
  }
}

function getProviderByName(
  providerName: EvidenceStorageProviderName,
): EvidenceStorageProvider {
  switch (providerName) {
    case "vercel-blob":
      return vercelBlobEvidenceStorageProvider;
    case "s3":
      return s3EvidenceStorageProvider;
    case "local":
      return localEvidenceStorageProvider;
  }
}

export function getEvidenceStorageProvider() {
  return getProviderByName(getConfiguredStorageProviderName());
}

export function getEvidenceStorageProviderForKey(storageKey: string) {
  if (storageKey.startsWith("blob:")) {
    return vercelBlobEvidenceStorageProvider;
  }

  if (storageKey.startsWith("s3:")) {
    return s3EvidenceStorageProvider;
  }

  if (storageKey.startsWith("local:") || storageKey.startsWith("/uploads/")) {
    return localEvidenceStorageProvider;
  }

  throw new Error("Unsupported evidence storage provider.");
}
