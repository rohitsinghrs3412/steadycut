import type { MutableRefObject } from "react";

const MAX_UPLOAD_IMAGE_EDGE = 1600;
const MAX_UPLOAD_IMAGE_BYTES = 1_500_000;
const UPLOAD_JPEG_QUALITY = 0.82;

export async function prepareBrowserImageFile(file: File) {
  const displayableFile = isHeicLike(file.type, file.name)
    ? new File(
        [await convertHeicBlobToJpeg(file)],
        file.name.replace(/\.(heic|heif)$/i, ".jpg"),
        {
          lastModified: file.lastModified,
          type: "image/jpeg",
        }
      )
    : file;

  try {
    return await resizeImageFileForUpload(displayableFile);
  } catch {
    return displayableFile;
  }
}

export async function fetchAndConvertHeicImage(src: string) {
  const response = await fetch(src);

  if (!response.ok) {
    throw new Error("Image could not be loaded.");
  }

  const blob = await response.blob();

  if (!isHeicLike(blob.type, src)) {
    throw new Error("Image is not a HEIC file.");
  }

  return await convertHeicBlobToJpeg(blob);
}

export function clearPreviewUrl(ref: MutableRefObject<string | null>) {
  if (ref.current) {
    URL.revokeObjectURL(ref.current);
    ref.current = null;
  }
}

async function convertHeicBlobToJpeg(blob: Blob) {
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({
    blob,
    quality: 0.9,
    toType: "image/jpeg",
  });
  const firstBlob = Array.isArray(converted) ? converted[0] : converted;

  if (!firstBlob) {
    throw new Error("HEIC conversion failed.");
  }

  return firstBlob;
}

async function resizeImageFileForUpload(file: File) {
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  ) {
    return file;
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(imageUrl);
    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(1, MAX_UPLOAD_IMAGE_EDGE / longestEdge);

    if (scale >= 1 && file.size <= MAX_UPLOAD_IMAGE_BYTES) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const resizedBlob = await canvasToBlob(
      canvas,
      "image/jpeg",
      UPLOAD_JPEG_QUALITY
    );

    if (resizedBlob.size >= file.size && file.size <= MAX_UPLOAD_IMAGE_BYTES) {
      return file;
    }

    return new File([resizedBlob], toJpegFileName(file.name), {
      lastModified: file.lastModified,
      type: "image/jpeg",
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be loaded."));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Image resize failed."));
        }
      },
      type,
      quality
    );
  });
}

function toJpegFileName(name: string) {
  return /\.(jpe?g|png|webp|bmp|heic|heif)$/i.test(name)
    ? name.replace(/\.(jpe?g|png|webp|bmp|heic|heif)$/i, ".jpg")
    : `${name}.jpg`;
}

function isHeicLike(type: string | undefined, nameOrUrl: string) {
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    /\.(heic|heif)(?:$|[?#])/i.test(nameOrUrl)
  );
}
