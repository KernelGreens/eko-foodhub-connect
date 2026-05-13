export type EvidenceStorageProviderName = "local" | "vercel-blob" | "s3";

export type EvidenceStoragePutInput = {
  pathname: string;
  file: File;
  contentType?: string;
  displayName: string;
};

export type EvidenceStoragePutResult = {
  storageKey: string;
  provider: EvidenceStorageProviderName;
};

export type EvidenceStorageLoadResult =
  | {
      type: "buffer";
      body: Buffer;
      headers: Record<string, string>;
    }
  | {
      type: "stream";
      body: ReadableStream;
      headers: Record<string, string>;
    }
  | {
      type: "redirect";
      url: string;
    };

export type EvidenceStorageProvider = {
  name: EvidenceStorageProviderName;
  put(input: EvidenceStoragePutInput): Promise<EvidenceStoragePutResult>;
  load(storageKey: string): Promise<EvidenceStorageLoadResult>;
};
