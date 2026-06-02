"use client";

/* eslint-disable @next/next/no-img-element */

import { Camera, Image as ImageIcon, Loader2 } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import {
  clearPreviewUrl,
  fetchAndConvertHeicImage,
} from "@/components/steadycut/photo-file-utils";
import { cn } from "@/lib/utils";

export function PhotoCapturePicker({
  compact = false,
  emptyDescription,
  emptyTitle,
  existingImageUrl,
  isPreparingPreview = false,
  onFileChange,
  previewAlt,
  previewUrl,
}: {
  compact?: boolean;
  emptyDescription: string;
  emptyTitle: string;
  existingImageUrl?: string | null;
  isPreparingPreview?: boolean;
  onFileChange: (file: File | null) => void | Promise<void>;
  previewAlt: string;
  previewUrl?: string | null;
}) {
  const cameraInputId = useId();
  const galleryInputId = useId();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imageUrl = previewUrl ?? existingImageUrl ?? null;

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    onFileChange(event.target.files?.[0] ?? null);
    event.currentTarget.value = "";
  }

  function handleOpenCameraPicker() {
    cameraInputRef.current?.click();
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        aria-label={`${emptyTitle}: take photo`}
        className={cn(
          "flex w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed bg-secondary/35 p-3 text-center text-foreground transition hover:bg-secondary/55 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-70",
          compact ? "min-h-44" : "min-h-64"
        )}
        disabled={isPreparingPreview}
        type="button"
        onClick={handleOpenCameraPicker}
      >
        {isPreparingPreview ? (
          <PreparingPhotoPreview />
        ) : imageUrl ? (
          <DisplayableImage
            key={imageUrl}
            alt={previewAlt}
            className={cn(
              "w-full rounded-md object-cover",
              compact ? "h-40" : "h-56"
            )}
            fallback={
              <EmptyPhotoPreview
                description="The selected image could not be previewed. Try another photo."
                title="Preview unavailable"
              />
            }
            pendingFallback={<PreparingPhotoPreview />}
            src={imageUrl}
          />
        ) : (
          <EmptyPhotoPreview
            compact={compact}
            description={emptyDescription}
            title={emptyTitle}
          />
        )}
      </button>

      <div className="grid grid-cols-2 gap-2">
        <Button asChild className="h-10" variant="secondary">
          <label htmlFor={cameraInputId}>
            <Camera data-icon="inline-start" />
            Take photo
          </label>
        </Button>
        <Button asChild className="h-10" variant="outline">
          <label htmlFor={galleryInputId}>
            <ImageIcon data-icon="inline-start" />
            Gallery
          </label>
        </Button>
      </div>

      <input
        accept="image/*"
        capture="environment"
        className="pointer-events-none absolute size-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]"
        id={cameraInputId}
        ref={cameraInputRef}
        type="file"
        onChange={handleInputChange}
      />
      <input
        accept="image/*"
        className="pointer-events-none absolute size-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]"
        id={galleryInputId}
        type="file"
        onChange={handleInputChange}
      />
    </div>
  );
}

export function DisplayableImage({
  alt,
  className,
  fallback,
  pendingFallback,
  src,
}: {
  alt: string;
  className: string;
  fallback: ReactNode;
  pendingFallback?: ReactNode;
  src: string;
}) {
  const convertedUrlRef = useRef<string | null>(null);
  const [convertedSrc, setConvertedSrc] = useState<string | null>(null);
  const [isBroken, setIsBroken] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const displaySrc = convertedSrc ?? src;

  useEffect(() => () => clearPreviewUrl(convertedUrlRef), []);

  async function handleImageError() {
    if (isConverting || convertedSrc) {
      setIsBroken(true);
      return;
    }

    setIsConverting(true);

    try {
      const convertedBlob = await fetchAndConvertHeicImage(src);
      const convertedUrl = URL.createObjectURL(convertedBlob);
      clearPreviewUrl(convertedUrlRef);
      convertedUrlRef.current = convertedUrl;
      setConvertedSrc(convertedUrl);
      setIsBroken(false);
    } catch {
      setIsBroken(true);
    } finally {
      setIsConverting(false);
    }
  }

  if (isBroken) {
    return fallback;
  }

  if (isConverting) {
    return pendingFallback ?? fallback;
  }

  return (
    <img
      alt={alt}
      className={className}
      src={displaySrc}
      onError={handleImageError}
    />
  );
}

function PreparingPhotoPreview() {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <Loader2 className="mb-3 size-8 animate-spin text-primary" />
      <span className="text-sm font-medium">Preparing preview</span>
      <span className="mt-1 max-w-56 text-xs text-muted-foreground">
        Converting the photo for browser display.
      </span>
    </div>
  );
}

function EmptyPhotoPreview({
  compact = false,
  description,
  title,
}: {
  compact?: boolean;
  description: string;
  title: string;
}) {
  return (
    <>
      <Camera className={cn("mb-3 text-primary", compact ? "size-8" : "size-9")} />
      <span className="text-sm font-medium">{title}</span>
      <span className="mt-1 max-w-56 text-xs text-muted-foreground">
        {description}
      </span>
    </>
  );
}
