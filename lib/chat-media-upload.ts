"use client";

import { Upload } from "tus-js-client";

export async function uploadChatMediaResumable(
  file: File,
  path: string,
  token: string,
  onProgress?: (percentage: number) => void,
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !apiKey) throw new Error("Secure media upload is not configured.");
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const endpoint = `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        apikey: apiKey,
        "x-signature": token,
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: "hopebridge-private-uploads",
        objectName: path,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      onError(error) {
        console.error("Resumable HOPEBRIDGE media upload failed:", error);
        reject(new Error(error.message || "The upload was interrupted. Please try again."));
      },
      onProgress(bytesUploaded, bytesTotal) {
        if (bytesTotal > 0) onProgress?.(Math.round((bytesUploaded / bytesTotal) * 100));
      },
      onSuccess() {
        resolve();
      },
    });
    upload.start();
  });
}
