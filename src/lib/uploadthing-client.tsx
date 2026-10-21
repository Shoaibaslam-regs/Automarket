"use client";

import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";
import { compressForEndpoint } from "@/lib/imageCompress";

const BaseUploadButton = generateUploadButton<OurFileRouter>();
const BaseUploadDropzone = generateUploadDropzone<OurFileRouter>();

type Endpoint = keyof OurFileRouter;
type BeforeUpload = ((files: File[]) => Promise<File[]> | File[]) | undefined;

/** Shrinks photos in the browser first (src/lib/imageCompress.ts), then runs the caller's own hook if it has one. */
function compressThen(endpoint: Endpoint, own: BeforeUpload) {
  return async (files: File[]) => {
    const compressed = await compressForEndpoint(endpoint, files);
    return own ? own(compressed) : compressed;
  };
}

// Every upload in the app goes through these two, so each photo is compressed before it leaves the phone
export const UploadButton = ((props: Parameters<typeof BaseUploadButton>[0]) => (
  <BaseUploadButton {...props} onBeforeUploadBegin={compressThen(props.endpoint as Endpoint, props.onBeforeUploadBegin)} />
)) as typeof BaseUploadButton;

export const UploadDropzone = ((props: Parameters<typeof BaseUploadDropzone>[0]) => (
  <BaseUploadDropzone {...props} onBeforeUploadBegin={compressThen(props.endpoint as Endpoint, props.onBeforeUploadBegin)} />
)) as typeof BaseUploadDropzone;
