"use client";

import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

export function PhotoThumbnail({
  alt,
  icon: Icon,
  src,
}: {
  alt: string;
  icon: LucideIcon;
  src?: string | null;
}) {
  const fallback = (
    <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
      <Icon />
    </div>
  );

  if (!src) {
    return fallback;
  }

  const isLocal = src.startsWith("blob:") || src.startsWith("data:");

  return (
    <Image
      src={src}
      alt={alt}
      width={64}
      height={64}
      className="size-16 shrink-0 rounded-md object-cover"
      unoptimized={isLocal}
    />
  );
}

export function EmptyState({
  icon: Icon,
  text,
}: {
  icon: LucideIcon;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
      <Icon className="mb-2 text-primary" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
    </div>
  );
}

export function formatMacro(value?: number) {
  return value == null ? "--" : `${Math.round(value)} g`;
}

export function fieldToNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function numberToField(value?: number) {
  return value == null ? "" : String(Math.round(value));
}

export function getErrorMessage(caught: unknown, fallback: string) {
  if (
    caught &&
    typeof caught === "object" &&
    "data" in caught &&
    typeof caught.data === "string"
  ) {
    return caught.data;
  }
  return caught instanceof Error ? caught.message : fallback;
}

export async function uploadToConvex(
  file: File,
  generateUploadUrl: () => Promise<string>
) {
  const uploadUrl = await generateUploadUrl();
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Photo upload failed.");
  }

  const { storageId } = (await response.json()) as { storageId: string };
  return storageId as Id<"_storage">;
}
