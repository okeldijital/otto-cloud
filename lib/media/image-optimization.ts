export type ImageOptimizationKind = "avatar" | "artwork";

export interface ImageOptimizationPolicy {
  maxDimension: number;
  targetBytes: number;
  maxBytes: number;
  qualityFloor: number;
}

export const IMAGE_OPTIMIZATION_POLICIES: Record<ImageOptimizationKind, ImageOptimizationPolicy> = {
  avatar: {
    maxDimension: 800,
    targetBytes: 400 * 1024,
    maxBytes: 750 * 1024,
    qualityFloor: 0.42,
  },
  artwork: {
    maxDimension: 2400,
    targetBytes: 1024 * 1024,
    maxBytes: 1536 * 1024,
    qualityFloor: 0.42,
  },
};

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const SUPPORTED_SOURCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected image could not be decoded"));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The browser could not encode the selected image"));
    }, type, quality);
  });
}

function outputName(name: string): string {
  const base = name.replace(/\.[^/.]+$/, "").trim() || "image";
  return `${base}.webp`;
}

export async function optimizeImage(file: File, kind: ImageOptimizationKind): Promise<File> {
  if (!SUPPORTED_SOURCE_TYPES.has(file.type)) {
    throw new Error("Please select a JPEG, PNG, or WebP image");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Image is too large to process. Please choose an image under 20 MB");
  }

  const policy = IMAGE_OPTIMIZATION_POLICIES[kind];
  const image = await loadImage(file);
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error("The selected image has invalid dimensions");
  }

  let width = image.naturalWidth;
  let height = image.naturalHeight;
  const initialScale = Math.min(1, policy.maxDimension / Math.max(width, height));
  width = Math.max(1, Math.round(width * initialScale));
  height = Math.max(1, Math.round(height * initialScale));

  for (let dimensionAttempt = 0; dimensionAttempt < 8; dimensionAttempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is not supported by this browser");
    context.drawImage(image, 0, 0, width, height);

    for (let quality = 0.86; quality >= policy.qualityFloor; quality -= 0.08) {
      const blob = await canvasToBlob(canvas, "image/webp", Number(quality.toFixed(2)));
      if (blob.size <= policy.targetBytes || (blob.size <= policy.maxBytes && quality <= 0.62)) {
        return new File([blob], outputName(file.name), {
          type: "image/webp",
          lastModified: Date.now(),
        });
      }
    }

    if (Math.max(width, height) <= 640) break;
    width = Math.max(640, Math.round(width * 0.82));
    height = Math.max(640, Math.round(height * 0.82));
  }

  throw new Error(
    kind === "avatar"
      ? "This image could not be compressed below 750 KB. Please choose a simpler image."
      : "This artwork could not be compressed below 1.5 MB. Please choose a simpler image."
  );
}
