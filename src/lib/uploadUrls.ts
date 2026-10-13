// Client-safe check that an image URL points at our UploadThing storage, so users can't save arbitrary links.

export function isUploadedImageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "utfs.io" || url.hostname.endsWith(".ufs.sh"));
  } catch {
    return false;
  }
}
