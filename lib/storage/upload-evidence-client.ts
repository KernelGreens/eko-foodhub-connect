type UploadEvidenceCategory = "support" | "delivery";

type UploadedEvidenceFile = {
  storageKey: string;
  accessUrl: string;
  mimeType?: string;
  displayName: string;
  size: number;
  provider: "blob" | "local";
};

export async function uploadEvidenceFile(
  file: File,
  category: UploadEvidenceCategory,
): Promise<UploadedEvidenceFile> {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("category", category);

  const response = await fetch("/api/uploads/evidence", {
    method: "POST",
    body: formData,
  });
  const payload = await response.json();

  if (!response.ok || !payload?.data) {
    throw new Error(payload?.error?.message ?? "Failed to upload evidence.");
  }

  return payload.data as UploadedEvidenceFile;
}
