"use client";

import { useAction, useMutation } from "convex/react";
import { AlertTriangle, Loader2, Scale } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { api } from "@convex/_generated/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatDisplayDate,
  ScaleLog,
  scaleTimeOptions,
  ScaleTimeOfDay,
  toDateKey,
} from "@/lib/steadycut";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  clearPreviewUrl,
  prepareBrowserImageFile,
} from "@/components/steadycut/photo-file-utils";
import { PhotoCapturePicker } from "@/components/steadycut/photo-capture-picker";

import {
  uploadToConvex,
} from "./shared";

type AnalyzeStatus = "idle" | "uploading" | "analyzing" | "done" | "error";

export function ScalePhotoLogger({ compact = false }: { compact?: boolean }) {
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const analyzeScalePhoto = useAction(api.scaleLogs.analyzeScalePhoto);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const fileSelectionRef = useRef(0);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [date, setDate] = useState(toDateKey());
  const [timeOfDay, setTimeOfDay] = useState<ScaleTimeOfDay>("morning");
  const [note, setNote] = useState("");
  const [latest, setLatest] = useState<ScaleLog | null>(null);
  const [status, setStatus] = useState<AnalyzeStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => clearPreviewUrl(previewUrlRef), []);

  async function handleScaleFileChange(nextFile: File | null) {
    const selectionId = fileSelectionRef.current + 1;
    fileSelectionRef.current = selectionId;
    clearPreviewUrl(previewUrlRef);
    setFile(null);
    setPreviewUrl(null);

    if (!nextFile) {
      setIsPreparingPhoto(false);
      return;
    }

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
      setError("Add a weighing-scale photo first.");
      setStatus("error");
      return;
    }

    setError(null);
    setStatus("uploading");

    try {
      const photoId = await uploadToConvex(file, generateUploadUrl);
      setStatus("analyzing");
      const result = (await analyzeScalePhoto({
        date,
        timeOfDay,
        photoId,
        note: note.trim() || undefined,
      })) as ScaleLog;

      setLatest(result);
      handleScaleFileChange(null);
      setStatus("done");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Scale analysis failed.");
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
          <CardTitle>Scale photo weight log</CardTitle>
          {!compact ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Morning and night photos are saved, and clear kg readings update
              the weight trend automatically.
            </p>
          ) : null}
        </div>
        <Scale className="text-primary" />
      </CardHeader>
      <CardContent
        className={cn(
          "grid gap-4",
          compact ? "grid-cols-1" : "lg:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-1"
        )}
      >
        <PhotoCapturePicker
          compact={compact}
          emptyDescription="Take a clear photo of the scale or choose one from your gallery."
          emptyTitle="Add scale photo"
          existingImageUrl={latest?.photoUrl}
          isPreparingPreview={isPreparingPhoto}
          previewAlt="Scale preview"
          previewUrl={previewUrl}
          onFileChange={handleScaleFileChange}
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
              <Label>Time</Label>
              <Select
                value={timeOfDay}
                onValueChange={(value: ScaleTimeOfDay) => setTimeOfDay(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {scaleTimeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Note</Label>
            <Textarea
              placeholder="Optional: after workout, after dinner, etc."
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>Could not read scale</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button className="h-11" disabled={isBusy} onClick={handleAnalyze}>
            {isBusy ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Scale data-icon="inline-start" />
            )}
            {status === "uploading"
              ? "Uploading photo..."
              : isPreparingPhoto
                ? "Preparing photo..."
                : status === "analyzing"
                ? "Reading scale..."
                : "Read scale photo"}
          </Button>

          {latest ? <ScaleResult log={latest} /> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ScaleResult({ log }: { log: ScaleLog }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Scale reading</div>
          <div className="text-2xl font-semibold">
            {log.weightKg ? `${log.weightKg.toFixed(1)} kg` : "Needs review"}
          </div>
        </div>
        <Badge variant={log.needsManualReview ? "secondary" : "default"}>
          {Math.round(log.confidence * 100)}% confidence
        </Badge>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {log.needsManualReview
          ? log.note ?? "The display was unclear. Try another photo."
          : `Saved as the ${log.timeOfDay} reading for ${formatDisplayDate(log.date)}.`}
      </p>
    </div>
  );
}
