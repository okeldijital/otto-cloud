export type MediaImageKind = "avatar" | "artwork";

export const MEDIA_IMAGE_LIMITS: Record<MediaImageKind, number> = {
  avatar: 750 * 1024,
  artwork: 1536 * 1024,
};

export function getMediaImageKind(entityType: string): MediaImageKind | null {
  const normalized = entityType.trim().toLowerCase();
  if (normalized === "artist") return "avatar";
  if (normalized === "release") return "artwork";
  return null;
}

export function getMediaImageMaxBytes(entityType: string, mimeType: string): number | null {
  if (!mimeType.toLowerCase().startsWith("image/")) return null;
  const kind = getMediaImageKind(entityType);
  return kind ? MEDIA_IMAGE_LIMITS[kind] : null;
}
