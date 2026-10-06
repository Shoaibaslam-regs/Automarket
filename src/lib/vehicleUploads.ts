import type { VehicleUploadResult } from "@/lib/uploadthing";

export type RejectedUpload = { name: string; reason: string };

/** Splits UploadThing results from the `vehicleImages` endpoint into approved URLs and rejected files. */
export function splitVehicleUploads(res: { name: string; serverData: VehicleUploadResult | null }[]) {
  const accepted: string[] = [];
  const rejected: RejectedUpload[] = [];
  for (const r of res) {
    if (r.serverData?.ok) accepted.push(r.serverData.url);
    else rejected.push({ name: r.name, reason: r.serverData?.reason ?? "This image couldn't be verified." });
  }
  return { accepted, rejected };
}
