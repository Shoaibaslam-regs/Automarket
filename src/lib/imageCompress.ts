// Client-side (browser only). Shrinks photos before they are uploaded, so phones send far less data and every
// upload fits UploadThing's 4MB limit. Used by the wrapped UploadButton/UploadDropzone in uploadthing-client.tsx.

export type CompressPreset = {
  /** Longest side in pixels after resizing (smaller images are not enlarged) */
  maxSide: number;
  /** JPEG quality, 0 to 1 */
  quality: number;
  /** Keep transparency (PNG/WebP in, PNG out), for logos and profile pictures */
  keepAlpha?: boolean;
};

/** Per UploadThing endpoint (src/lib/uploadthing.ts). Endpoints not listed upload unchanged. */
export const COMPRESS_PRESETS: Record<string, CompressPreset> = {
  // Listing, deal and AI inspection photos: sharp on a large screen, and JPEG so share cards can draw them
  vehicleImages: { maxSide: 1920, quality: 0.82 },
  // Handover and return condition photos
  checkPhotos: { maxSide: 1600, quality: 0.8 },
  // Profile pictures and business logos are shown small
  profileImage: { maxSide: 512, quality: 0.85, keepAlpha: true },
  businessLogo: { maxSide: 512, quality: 0.85, keepAlpha: true },
};

/**
 * Returns a resized JPEG (or PNG when keeping transparency), with the camera's rotation applied. Falls back to the
 * original file when the browser can't read it (some HEIC files, SVG, animated GIF) or when the original was
 * already smaller.
 */
export async function compressImage(file: File, preset: CompressPreset): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  const scale = Math.min(1, preset.maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const alpha = !!preset.keepAlpha && /png|webp/.test(file.type);
  const type = alpha ? "image/png" : "image/jpeg";

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) { bitmap.close(); return file; }
  if (!alpha) {
    // JPEG has no transparency: put transparent areas on white instead of black
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, preset.quality));
  if (!blob) return file;
  // A small JPEG/PNG can come out bigger (a simple logo, an already compressed photo); keep the original then
  if (blob.size >= file.size && /jpeg|png/.test(file.type)) return file;

  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.${alpha ? "png" : "jpg"}`, { type, lastModified: file.lastModified });
}

/** Compresses every file for an endpoint; unknown endpoints pass through. */
export function compressForEndpoint(endpoint: string, files: File[]): Promise<File[]> {
  const preset = COMPRESS_PRESETS[endpoint];
  return preset ? Promise.all(files.map(f => compressImage(f, preset))) : Promise.resolve(files);
}
