import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi, UploadThingError } from "uploadthing/server";
import { hitRateLimit, waitText } from "@/lib/rateLimit";
import { nextPictureChangeAt, pictureWaitText } from "@/lib/profilePicture";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { VehicleImage } from "@/models/VehicleImage";
import { checkVehicleImageUrl } from "@/lib/vehicleImageCheck";
import { reportError } from "@/lib/errorLog";

const f = createUploadthing();
const utapi = new UTApi();

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return { userId: session.user.id };
}

/** Vehicle photos are each checked by a paid Gemini call, so they're counted per file: 30 an hour per user. */
async function requireUserWithinPhotoLimit({ files }: { files: readonly unknown[] }) {
  const { userId } = await requireUser();
  const r = await hitRateLimit("vehicleImages", userId!, files.length);
  if (!r.ok) throw new UploadThingError(`You've uploaded a lot of photos. Please try again in ${waitText(r.retryAfterSec)}.`);
  return { userId };
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
    .middleware(requireUserWithinPhotoLimit)
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
        reportError("Vehicle image check failed:", err);
        await utapi.deleteFiles(file.key).catch(() => {});
        return { ok: false, reason: "We couldn't verify this image right now. Please try again." };
      }
    }),

  // Handover and return condition photos (scratches, fuel gauge, odometer): no vehicle check, counted per file.
  checkPhotos: f({
    image: { maxFileSize: "4MB", maxFileCount: 6 },
  })
    .middleware(async ({ files }) => {
      const { userId } = await requireUser();
      const r = await hitRateLimit("checkPhotos", userId!, files.length);
      if (!r.ok) throw new UploadThingError(`You've uploaded a lot of photos. Please try again in ${waitText(r.retryAfterSec)}.`);
      return { userId };
    })
    .onUploadComplete(async ({ file }) => ({ url: file.ufsUrl })),

  // Profile avatars: no vehicle check. A new picture can only be saved as often as src/lib/profilePicture.ts
  // allows, so the upload is refused up front while the person still has to wait (nothing is stored for nothing).
  profileImage: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const { userId } = await requireUser();
      const { User } = await import("@/models/User");
      const user = await User.findById(userId).select("pictureChanges pictureChangedAt").lean<{ pictureChanges?: number; pictureChangedAt?: Date }>();
      const waitUntil = nextPictureChangeAt(user?.pictureChanges, user?.pictureChangedAt);
      if (waitUntil) throw new UploadThingError(pictureWaitText(waitUntil));
      const r = await hitRateLimit("profileImage", userId!, 1);
      if (!r.ok) throw new UploadThingError(`Too many picture uploads. Please try again in ${waitText(r.retryAfterSec)}.`);
      return { userId };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),

  // Business logos (Business settings): owners and managers only, counted per hour like other uploads
  businessLogo: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const { userId } = await requireUser();
      const { getMembership } = await import("@/lib/business");
      const member = await getMembership(userId!);
      if (!member || !["OWNER", "MANAGER"].includes(member.role)) throw new UploadThingError("Only the owner or a manager can change the business picture.");
      const r = await hitRateLimit("businessLogo", userId!, 1);
      if (!r.ok) throw new UploadThingError(`Too many picture uploads. Please try again in ${waitText(r.retryAfterSec)}.`);
      return { userId };
    })
    .onUploadComplete(async ({ file }) => ({ url: file.ufsUrl })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
