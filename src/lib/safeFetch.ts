import { isUploadedImageUrl } from "@/lib/uploadUrls";

/**
 * Downloads an image the server needs (Gemini checks, AI inspection, share cards) only from our UploadThing
 * storage, with a time and size limit. Fetching any URL a user sent let them make the server call internal or
 * outside addresses (SSRF) or pull huge files. Throws when the address, the final address after redirects,
 * the type or the size isn't acceptable.
 */
export async function fetchUploadedImage(url: string, { maxBytes = 8_000_000, timeoutMs = 8000 } = {}) {
  if (!isUploadedImageUrl(url)) throw new Error("Image is not an uploaded file");
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
  // utfs.io links redirect to the app's ufs.sh host; anything else after a redirect is refused
  if (res.url && !isUploadedImageUrl(res.url)) throw new Error("Image redirected off UploadThing");
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  const type = res.headers.get("content-type")?.split(";")[0].trim() || "";
  if (!type.startsWith("image/")) throw new Error("Not an image");
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new Error("Image too large");

  // Read with a running total, so a missing or wrong content-length can't stream an endless file
  const reader = res.body?.getReader();
  if (!reader) throw new Error("Empty image");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new Error("Image too large");
    }
    chunks.push(value);
  }
  const buffer = Buffer.concat(chunks.map(c => Buffer.from(c)));
  return { buffer, type };
}
