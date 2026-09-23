import "server-only";
import { prisma } from "@/lib/prisma";

export const imageMetadataSelect = {
  id: true, filename: true, contentType: true, byteSize: true,
  width: true, height: true, createdAt: true,
} as const;

export async function getImageHistory(userId: string, page: number) {
  const results = await prisma.savedImage.findMany({
    where: { userId },
    select: imageMetadataSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * 20,
    take: 21,
  });
  return { images: results.slice(0, 20), hasMore: results.length > 20 };
}
