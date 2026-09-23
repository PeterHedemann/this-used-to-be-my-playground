import { getCurrentUser } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import { ImageRequestError, safeFilename } from "@/lib/image-processing";
import { imageError, PRIVATE_HEADERS, requireSameOrigin } from "@/lib/image-http";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ImageRequestError("Please sign in to view this image.", 401);
    const { id } = await params;
    const image = await prisma.savedImage.findFirst({
      where: { id, userId: user.id },
      select: { filename: true, content: { select: { bytes: true } } },
    });
    if (!image?.content) throw new ImageRequestError("Image not found.", 404);
    const bytes = Uint8Array.from(image.content.bytes);
    const filename = safeFilename(image.filename);
    const disposition = new URL(request.url).searchParams.has("download") ? "attachment" : "inline";
    return new Response(bytes, {
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": "image/png",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
        Filename: filename,
      },
    });
  } catch (error) {
    return imageError(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    requireSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new ImageRequestError("Please sign in to delete this image.", 401);
    const { id } = await params;
    const deleted = await prisma.savedImage.deleteMany({ where: { id, userId: user.id } });
    if (!deleted.count) throw new ImageRequestError("Image not found.", 404);
    return new Response(null, { status: 204, headers: PRIVATE_HEADERS });
  } catch (error) {
    return imageError(error);
  }
}
