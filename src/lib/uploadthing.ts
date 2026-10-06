import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi } from "uploadthing/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { VehicleImage } from "@/models/VehicleImage";
import { checkVehicleImageUrl } from "@/lib/vehicleImageCheck";

const f = createUploadthing();
const utapi = new UTApi();

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return { userId: session.user.id };
}

/** What the client receives per file once the server has checked it. */
export type VehicleUploadResult =
  | { ok: true; url: string; vehicleType: string }
  | { ok: false; reason: string };

export const ourFileRouter = {
  // Listing / inspection photos: every file must pass the AI vehicle check or it is deleted.
  vehicleImages: f({
    image: { maxFileSize: "4MB", maxFileCount: 8 },
  })
    .middleware(requireUser)
    .onUploadComplete(async ({ file, metadata }): Promise<VehicleUploadResult> => {
      try {
        const check = await checkVehicleImageUrl(file.ufsUrl);

        if (!check.isVehicle) {
          await utapi.deleteFiles(file.key);
          return { ok: false, reason: check.reason || "This image doesn't show a car or bike." };
        }

        await connectDB();
        await VehicleImage.create({ url: file.ufsUrl, key: file.key, userId: metadata.userId, vehicleType: check.vehicleType });
        return { ok: true, url: file.ufsUrl, vehicleType: check.vehicleType };
      } catch (err) {
        // Fail closed: if we can't verify the image, don't keep it.
        console.error("Vehicle image check failed:", err);
        await utapi.deleteFiles(file.key).catch(() => {});
        return { ok: false, reason: "We couldn't verify this image right now. Please try again." };
      }
    }),

  // Profile avatars: no vehicle check.
  profileImage: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(requireUser)
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
