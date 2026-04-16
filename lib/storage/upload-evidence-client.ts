type UploadEvidenceCategory = "support" | "delivery";

type UploadedEvidenceFile = {
  url: string;
  mimeType?: string;
  displayName: string;
  size: number;
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
