"use client";

import { useAction, useMutation } from "convex/react";
import { AlertTriangle, Check, Droplet, Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { api } from "@convex/_generated/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  formatHydrationVolume,
  HydrationLog,
  toDateKey,
} from "@/lib/steadycut";
import { cn } from "@/lib/utils";
import {
  clearPreviewUrl,
  prepareBrowserImageFile,
} from "@/components/steadycut/photo-file-utils";
import { PhotoCapturePicker } from "@/components/steadycut/photo-capture-picker";

import {
  uploadToConvex,
  getErrorMessage,
} from "./shared";

type AnalyzeStatus = "idle" | "uploading" | "analyzing" | "done" | "error";

export function HydrationPhotoLogger({ compact = false }: { compact?: boolean }) {
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const analyzeHydrationPhoto = useAction(
    api.hydrationLogs.analyzeHydrationPhoto
  );
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const fileSelectionRef = useRef(0);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [date, setDate] = useState(toDateKey());
  const [context, setContext] = useState("");
  const [latest, setLatest] = useState<HydrationLog | null>(null);
  const [status, setStatus] = useState<AnalyzeStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => clearPreviewUrl(previewUrlRef), []);

  async function handleHydrationFileChange(nextFile: File | null) {
    const selectionId = fileSelectionRef.current + 1;
    fileSelectionRef.current = selectionId;
    clearPreviewUrl(previewUrlRef);
    setError(null);
    setFile(null);
    setPreviewUrl(null);

    if (!nextFile) {
      setIsPreparingPhoto(false);
      return;
    }

    setLatest(null);
    setIsPreparingPhoto(true);

    try {
      const displayableFile = await prepareBrowserImageFile(nextFile);

      if (fileSelectionRef.current !== selectionId) {
        return;
      }

      const nextPreviewUrl = URL.createObjectURL(displayableFile);
      previewUrlRef.current = nextPreviewUrl;
      setFile(displayableFile);
      setPreviewUrl(nextPreviewUrl);
    } catch {
      if (fileSelectionRef.current === selectionId) {
        setError(
          "This photo format could not be prepared for preview. Try saving it as JPG or PNG, then upload again."
        );
      }
    } finally {
      if (fileSelectionRef.current === selectionId) {
        setIsPreparingPhoto(false);
      }
    }
  }

  async function handleAnalyze() {
    if (!file) {
      setError("Add a bottle, glass, or mug photo first.");
      setStatus("error");
      return;
    }

    if (context.length > 500) {
      setError("Beverage details must be 500 characters or less.");
      setStatus("error");
      return;
    }

    setError(null);
    setStatus("uploading");

    try {
      const photoId = await uploadToConvex(file, generateUploadUrl);
      setStatus("analyzing");
      const result = (await analyzeHydrationPhoto({
        date,
        photoId,
        context: context.trim() || undefined,
      })) as HydrationLog;

      setLatest(result);
      handleHydrationFileChange(null);
      setStatus("done");
    } catch (caught) {
      setError(getErrorMessage(caught, "Hydration estimate failed."));
      setStatus("error");
    }
  }

  const isBusy =
    status === "uploading" || status === "analyzing" || isPreparingPhoto;

  return (
    <Card
      size={compact ? "sm" : "default"}
      className={cn(
        "glass-card !overflow-visible transition-all duration-300",
        isBusy && "glow-highlight-primary"
      )}
    >
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>{compact ? "Hydration photo" : "Beverage volume log"}</CardTitle>
          {!compact ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Snap a bottle, glass, tumbler, or mug. Gemini estimates the ml for
              today.
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles />
          Gemini
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "grid gap-4",
          compact
            ? "grid-cols-1"
            : "lg:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-1"
        )}
      >
        <PhotoCapturePicker
          compact={compact}
          emptyDescription="Take a new photo or choose one from your gallery."
          emptyTitle="Add drink photo"
          existingImageUrl={latest?.photoUrl}
          isPreparingPreview={isPreparingPhoto}
          previewAlt="Beverage preview"
          previewUrl={previewUrl}
          onFileChange={handleHydrationFileChange}
        />

        <div className="flex flex-col gap-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
            <div className="flex flex-col gap-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Container details</Label>
              <Input
                placeholder="Optional: 1L bottle, half-full mug"
                value={context}
                onChange={(event) => setContext(event.target.value)}
              />
            </div>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>Could not estimate volume</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button className="h-11" disabled={isBusy} onClick={handleAnalyze}>
            {isBusy ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Droplet data-icon="inline-start" />
            )}
            {status === "uploading"
              ? "Uploading photo..."
              : isPreparingPhoto
                ? "Preparing photo..."
                : status === "analyzing"
                ? "Estimating volume..."
                : "Log drink volume"}
          </Button>

          {latest ? <HydrationResult log={latest} /> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function HydrationResult({ log }: { log: HydrationLog }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Estimated drink</div>
          <div className="text-lg font-semibold">{log.beverageName}</div>
          <div className="text-sm text-muted-foreground">{log.containerName}</div>
        </div>
        <Badge className="bg-primary text-primary-foreground">
          {Math.round(log.confidence * 100)}% confidence
        </Badge>
      </div>
      <div className="mt-4 flex items-end gap-2">
        <span className="text-3xl font-semibold">
          {formatHydrationVolume(log.volumeMl)}
        </span>
        <span className="pb-1 text-sm text-muted-foreground">added today</span>
      </div>
      <Separator className="my-4" />
      <ul className="space-y-1 text-sm text-muted-foreground">
        {log.assumptions.map((assumption) => (
          <li key={assumption} className="flex gap-2">
            <Check className="mt-0.5 size-4 text-primary" />
            <span>{assumption}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
