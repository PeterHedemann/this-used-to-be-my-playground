import { getCurrentUser } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import { imageMetadataSelect } from "@/lib/saved-images";
import { imageError, PRIVATE_HEADERS, requireSameOrigin } from "@/lib/image-http";
import {
  ImageRequestError, MAX_IMAGE_BYTES, MAX_UPLOAD_BODY_BYTES,
  readLimitedBody, safeFilename, validateImage,
} from "@/lib/image-processing";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new ImageRequestError("Please sign in to upload an image.", 401);
    const secret = process.env.IMAGE_API_SECRET;
    if (!secret) throw new ImageRequestError("Image processing is not configured yet.", 503);
    const type = request.headers.get("content-type") ?? "";
    if (!type.startsWith("multipart/form-data;")) {
      throw new ImageRequestError("Upload an image using a multipart form.", 400);
    }
    const body = await readLimitedBody(request.body, MAX_UPLOAD_BODY_BYTES);
    let form: FormData;
    try {
      form = await new Response(body, { headers: { "Content-Type": type } }).formData();
    } catch {
      throw new ImageRequestError("Invalid upload form.", 400);
    }
    const image = form.get("image");
    if (!(image instanceof File) || image.size === 0 || form.getAll("image").length !== 1) {
      throw new ImageRequestError("Choose one image to upload.", 400);
    }
    if (image.size > MAX_IMAGE_BYTES) throw new ImageRequestError("Choose an image no larger than 10 MiB.", 413);
    await validateImage(new Uint8Array(await image.arrayBuffer()));
    const upstreamForm = new FormData();
    upstreamForm.append("image", image);
    let bytes: Uint8Array<ArrayBuffer>;
    let filename: string;
    try {
      const response = await fetch("https://peters-api-lab.vercel.app/api/resize", {
        method: "POST", headers: { secret }, body: upstreamForm,
        signal: AbortSignal.timeout(120_000), redirect: "error", cache: "no-store",
      });
      if (!response.ok || response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "image/png") {
        await response.body?.cancel();
        throw new ImageRequestError("The resize service could not process this image. Please try again.", 502);
      }
      filename = safeFilename(response.headers.get("Filename"));
      bytes = await readLimitedBody(response.body, MAX_IMAGE_BYTES, 502);
    } catch (error) {
      if (error instanceof ImageRequestError) throw error;
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new ImageRequestError("Image processing timed out. Please try again.", 504);
      }
      throw new ImageRequestError("The resize service is unavailable. Please try again.", 502);
    }
    const metadata = await validateImage(bytes, true);
    // The nested write commits metadata and bytes atomically, after the external call.
    const saved = await prisma.savedImage.create({
      data: {
        userId: user.id, filename, contentType: "image/png", byteSize: bytes.byteLength,
        width: metadata.width!, height: metadata.height!, content: { create: { bytes } },
      },
      select: imageMetadataSelect,
    });
    return Response.json({ ...saved, imageUrl: `/api/images/${saved.id}` }, {
      status: 201, headers: PRIVATE_HEADERS,
    });
  } catch (error) {
    return imageError(error);
  }
}
