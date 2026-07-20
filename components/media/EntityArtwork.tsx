"use client";

import React, { useState } from "react";
import { Disc, User, Building2, Image as ImageIcon } from "lucide-react";
import { useAttachment } from "@/hooks/useAttachment";

export type EntityArtworkProps = {
  entityType: "release" | "artist" | "label" | "user" | "publisher" | string;
  entityId: string | number | null | undefined;
  alt?: string;
  className?: string;
  /** Inline style for the image/placeholder container */
  style?: React.CSSProperties;
  /** Force square container size (px). If set, applies width+height. */
  size?: number;
  /** Optional pre-resolved signed URL (skips fetch when provided). */
  src?: string | null;
  /** Placeholder icon variant */
  placeholder?: "release" | "artist" | "label" | "user" | "generic";
};

function PlaceholderIcon({
  kind,
  size,
}: {
  kind: EntityArtworkProps["placeholder"];
  size: number;
}) {
  const iconSize = Math.max(16, Math.round(size * 0.35));
  const common = { size: iconSize, className: "text-text-secondary opacity-50" };
  switch (kind) {
    case "artist":
    case "user":
      return <User {...common} />;
    case "label":
      return <Building2 {...common} />;
    case "release":
      return <Disc {...common} />;
    default:
      return <ImageIcon {...common} />;
  }
}

/**
 * Renders entity artwork via Storage Service signed URLs.
 * Never uses /uploads/ legacy paths. Shows a placeholder when missing.
 */
export default function EntityArtwork({
  entityType,
  entityId,
  alt = "",
  className = "",
  style,
  size,
  src: srcProp,
  placeholder,
}: EntityArtworkProps) {
  const shouldFetch = srcProp === undefined;
  const { url: fetchedUrl, loading } = useAttachment(
    shouldFetch ? entityType : null,
    shouldFetch ? entityId : null
  );
  const url = srcProp !== undefined ? srcProp : fetchedUrl;
  const [broken, setBroken] = useState(false);

  const kind =
    placeholder ||
    (entityType === "artist"
      ? "artist"
      : entityType === "label" || entityType === "publisher"
        ? "label"
        : entityType === "user"
          ? "user"
          : "release");

  const dim = size
    ? { width: size, height: size, minWidth: size, minHeight: size }
    : {};

  const boxStyle: React.CSSProperties = {
    ...dim,
    ...style,
    overflow: "hidden",
    background: "rgba(255,255,255,0.03)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const showImage = !!url && !broken && !loading;

  return (
    <div className={className} style={boxStyle} aria-label={alt || undefined}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setBroken(true)}
        />
      ) : (
        <PlaceholderIcon kind={kind} size={size || 64} />
      )}
    </div>
  );
}
