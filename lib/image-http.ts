import { ImageRequestError } from "@/lib/image-processing";

export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

export function imageError(error: unknown) {
  if (error instanceof ImageRequestError) {
    return Response.json({ error: error.message }, { status: error.status, headers: PRIVATE_HEADERS });
  }
  console.error("Image request failed", error instanceof Error ? error.name : "Unknown error");
  return Response.json(
    { error: "Unable to complete the image request. Please try again." },
    { status: 500, headers: PRIVATE_HEADERS },
  );
}

export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    throw new ImageRequestError("This request is not allowed.", 403);
  }
}
