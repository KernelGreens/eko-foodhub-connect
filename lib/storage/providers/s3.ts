import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import type {
  EvidenceStorageLoadResult,
  EvidenceStorageProvider,
  EvidenceStoragePutInput,
} from "./types";

function optionalEnv(name: string) {
  const value = process.env[name]?.trim();

  return value || undefined;
}

function requiredEnv(name: string) {
  const value = optionalEnv(name);

  if (!value) {
    throw new Error(`${name} is required when STORAGE_PROVIDER is s3.`);
  }

  return value;
}

function isTrue(value: string | undefined) {
  return value === "true" || value === "1";
}

function getBucketName() {
  return requiredEnv("S3_BUCKET_NAME");
}

function getS3Key(storageKey: string) {
  if (!storageKey.startsWith("s3:")) {
    throw new Error("Unsupported S3 evidence path.");
  }

  const key = storageKey.slice("s3:".length);

  if (!key) {
    throw new Error("Evidence file not found.");
  }

  return key;
}

function buildS3Client() {
  const accessKeyId = optionalEnv("S3_ACCESS_KEY_ID") ?? optionalEnv("AWS_ACCESS_KEY_ID");
  const secretAccessKey =
    optionalEnv("S3_SECRET_ACCESS_KEY") ?? optionalEnv("AWS_SECRET_ACCESS_KEY");
  const sessionToken =
    optionalEnv("S3_SESSION_TOKEN") ?? optionalEnv("AWS_SESSION_TOKEN");
  const credentials =
    accessKeyId && secretAccessKey
      ? {
          accessKeyId,
          secretAccessKey,
          sessionToken,
        }
      : undefined;

  return new S3Client({
    region: optionalEnv("S3_REGION") ?? optionalEnv("AWS_REGION") ?? "us-east-1",
    endpoint: optionalEnv("S3_ENDPOINT_URL"),
    forcePathStyle: isTrue(optionalEnv("S3_FORCE_PATH_STYLE")),
    credentials,
  });
}

function buildContentDisposition(displayName: string) {
  const safeDisplayName = displayName.replaceAll('"', "'");

  return `inline; filename="${safeDisplayName}"`;
}

export const s3EvidenceStorageProvider: EvidenceStorageProvider = {
  name: "s3",
  async put(input: EvidenceStoragePutInput) {
    const s3 = buildS3Client();
    const body = Buffer.from(await input.file.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: getBucketName(),
        Key: input.pathname,
        Body: body,
        ContentType: input.contentType,
        ContentDisposition: buildContentDisposition(input.displayName),
      }),
    );

    return {
      storageKey: `s3:${input.pathname}`,
      provider: "s3",
    };
  },
  async load(storageKey: string): Promise<EvidenceStorageLoadResult> {
    const s3 = buildS3Client();
    const key = getS3Key(storageKey);
    const object = await s3.send(
      new GetObjectCommand({
        Bucket: getBucketName(),
        Key: key,
      }),
    );

    if (!object.Body) {
      throw new Error("Evidence file not found.");
    }

    const body = Buffer.from(await object.Body.transformToByteArray());

    return {
      type: "buffer",
      body,
      headers: {
        "Content-Type": object.ContentType ?? "application/octet-stream",
        "Content-Disposition":
          object.ContentDisposition ??
          `inline; filename="${key.split("/").pop() ?? "evidence"}"`,
        "Cache-Control": "private, no-store",
      },
    };
  },
};
