"use client";

/* eslint-disable @next/next/no-img-element */

import { useAction, useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Camera,
  Check,
  Image as ImageIcon,
  type LucideIcon,
  Loader2,
  Pencil,
  RefreshCw,
  Scale,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type MutableRefObject,
  type ReactNode,
} from "react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  formatDisplayDate,
  MealItem,
  MealLog,
  mealTypeOptions,
  MealType,
  ScaleLog,
  scaleTimeOptions,
  ScaleTimeOfDay,
  toDateKey,
} from "@/lib/steadycut";
import { cn } from "@/lib/utils";

type WorkspaceFocus = "meal" | "scale" | "all";

type AnalyzeStatus = "idle" | "uploading" | "analyzing" | "done" | "error";

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

function DisplayableImage({
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

export function PhotoLoggingWorkspace({
  compact = false,
  focus,
}: {
  compact?: boolean;
  focus: WorkspaceFocus;
}) {
  const showMeal = focus === "meal" || focus === "all";
  const showScale = focus === "scale" || focus === "all";

  return (
    <div
      className={cn(
        compact
          ? "flex flex-col gap-3"
          : "grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]"
      )}
    >
      <div className="flex flex-col gap-4">
        {showMeal ? <MealPhotoLogger compact={compact} /> : null}
        {showScale ? <ScalePhotoLogger compact={compact} /> : null}
      </div>
      <div className="flex flex-col gap-4">
        {showMeal ? <RecentMealLogs compact={compact} /> : null}
        {showScale ? <RecentScaleLogs compact={compact} /> : null}
      </div>
    </div>
  );
}

function MealPhotoLogger({ compact = false }: { compact?: boolean }) {
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const savePlaceholderMutation = useMutation(
    api.mealLogs.savePlaceholder
  ).withOptimisticUpdate((localStore, args) => {
    const limit = compact ? 3 : 8;
    const existing = localStore.getQuery(api.mealLogs.listRecent, { limit });

    if (!existing) {
      return;
    }

    localStore.setQuery(api.mealLogs.listRecent, { limit }, [
      {
        _creationTime: 0,
        _id: "optimistic-meal-log" as Id<"mealLogs">,
        id: "optimistic-meal-log" as Id<"mealLogs">,
        userId: "optimistic",
        date: args.date,
        mealType: args.mealType,
        photoId: args.photoId,
        photoUrl: null,
        status: "estimating",
        description: args.description,
        portionGrams: args.portionGrams,
        foodName: "Estimating meal...",
        items: [],
        calories: 0,
        confidence: 0,
        assumptions: ["Analyzing photo."],
        createdAt: 0,
        updatedAt: 0,
      },
      ...existing,
    ]);
  });
  const saveConfirmedMealLog = useMutation(api.mealLogs.saveConfirmedMealLog);
  const deleteMealLog = useMutation(api.mealLogs.deleteMealLog);
  const analyzeMealPhoto = useAction(api.mealLogs.analyzeMealPhoto);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const fileSelectionRef = useRef(0);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [date, setDate] = useState(toDateKey());
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [description, setDescription] = useState("");
  const [portionGrams, setPortionGrams] = useState("");
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [latest, setLatest] = useState<MealLog | null>(null);
  const [confirmMeal, setConfirmMeal] = useState<MealLog | null>(null);
  const [status, setStatus] = useState<AnalyzeStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => clearPreviewUrl(previewUrlRef), []);

  async function handleMealFileChange(nextFile: File | null) {
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
    if (!file && !latest?.photoId) {
      setError("Add a food photo first.");
      setStatus("error");
      return;
    }

    setError(null);
    setStatus(file ? "uploading" : "analyzing");

    try {
      const photoId = file
        ? await uploadToConvex(file, generateUploadUrl)
        : (latest?.photoId as Id<"_storage">);
      const combinedDescription = [
        description.trim(),
        followUpAnswer.trim()
          ? `Follow-up answer: ${followUpAnswer.trim()}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      const placeholderMealLogId = file
        ? await savePlaceholderMutation({
            date,
            mealType,
            photoId,
            description: combinedDescription || undefined,
            portionGrams: parsePositiveNumber(portionGrams),
          })
        : undefined;

      setStatus("analyzing");
      const result = (await analyzeMealPhoto({
        date,
        mealType,
        photoId,
        description: combinedDescription || undefined,
        portionGrams: parsePositiveNumber(portionGrams),
        placeholderMealLogId,
        existingMealLogId: file
          ? undefined
          : (latest?.id as Id<"mealLogs"> | undefined),
      })) as MealLog;

      if (placeholderMealLogId) {
        setConfirmMeal(result);
      } else {
        setLatest(result);
        setFollowUpAnswer("");
        handleMealFileChange(null);
      }
      setStatus("done");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Meal analysis failed.");
      setStatus("error");
    }
  }

  async function handleConfirmSave(input: MealLog) {
    const saved = (await saveConfirmedMealLog({
      id: input.id as Id<"mealLogs">,
      date: input.date,
      mealType: input.mealType,
      description: input.description,
      portionGrams: input.portionGrams,
      foodName: input.foodName,
      items: input.items,
      confidence: input.confidence,
      assumptions: input.assumptions,
      followUpQuestion: input.followUpQuestion,
    })) as MealLog;

    setLatest(saved);
    setConfirmMeal(null);
    setFollowUpAnswer("");
    handleMealFileChange(null);
  }

  async function handleConfirmDiscard(input: MealLog) {
    await deleteMealLog({ id: input.id as Id<"mealLogs"> });
    setConfirmMeal(null);
    setStatus("idle");
  }

  const isBusy =
    status === "uploading" || status === "analyzing" || isPreparingPhoto;

  return (
    <Card 
      size={compact ? "sm" : "default"}
      className={cn(
        "glass-card transition-all duration-300",
        isBusy && "glow-highlight-primary"
      )}
    >
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>
            {compact ? "Photo calories" : "Food photo calorie estimate"}
          </CardTitle>
          {!compact ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Upload the meal, add grams or oil details if you know them, then
              log the estimate.
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
          compact ? "grid-cols-1" : "lg:grid-cols-[260px_minmax(0,1fr)]"
        )}
      >
        <PhotoCapturePicker
          compact={compact}
          emptyDescription="Take a new photo or choose one from your gallery."
          emptyTitle="Add meal photo"
          existingImageUrl={latest?.photoUrl}
          isPreparingPreview={isPreparingPhoto}
          previewAlt="Meal preview"
          previewUrl={previewUrl}
          onFileChange={handleMealFileChange}
        />

        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Meal</Label>
              <Select
                value={mealType}
                onValueChange={(value: MealType) => setMealType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {mealTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Approx grams</Label>
              <Input
                inputMode="decimal"
                min="0"
                placeholder="Optional"
                type="number"
                value={portionGrams}
                onChange={(event) => setPortionGrams(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Food details</Label>
            <Textarea
              placeholder="Example: 2 rotis, paneer sabzi, medium oil, 1 bowl dal"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          {latest?.followUpQuestion ? (
            <div className="rounded-lg border bg-accent/45 p-3">
              <div className="flex items-start gap-2 text-sm font-medium">
                <AlertTriangle className="mt-0.5 text-chart-3" />
                <span>{latest.followUpQuestion}</span>
              </div>
              <Textarea
                className="mt-3"
                placeholder="Answer here, then refine the same estimate"
                rows={2}
                value={followUpAnswer}
                onChange={(event) => setFollowUpAnswer(event.target.value)}
              />
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>Could not analyze</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button className="h-11" disabled={isBusy} onClick={handleAnalyze}>
            {isBusy ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : latest?.followUpQuestion && followUpAnswer ? (
              <RefreshCw data-icon="inline-start" />
            ) : (
              <Utensils data-icon="inline-start" />
            )}
            {status === "uploading"
              ? "Uploading photo..."
              : isPreparingPhoto
                ? "Preparing photo..."
                : status === "analyzing"
                ? "Estimating calories..."
                : latest?.followUpQuestion && followUpAnswer
                  ? "Refine estimate"
                  : "Estimate calories"}
          </Button>

          {latest ? <MealEstimateResult meal={latest} /> : null}
        </div>
      </CardContent>
      <MealConfirmSheet
        meal={confirmMeal}
        onDiscard={handleConfirmDiscard}
        onOpenChange={(open) => {
          if (!open && confirmMeal) {
            void handleConfirmDiscard(confirmMeal);
          }
        }}
        onSave={handleConfirmSave}
      />
    </Card>
  );
}

function ScalePhotoLogger({ compact = false }: { compact?: boolean }) {
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
        "glass-card transition-all duration-300",
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
          compact ? "grid-cols-1" : "lg:grid-cols-[260px_minmax(0,1fr)]"
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
          <div className="grid gap-3 sm:grid-cols-2">
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

function MealEstimateResult({ meal }: { meal: MealLog }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Estimated meal</div>
          <div className="text-lg font-semibold">{meal.foodName}</div>
        </div>
        <Badge
          className={cn(
            meal.confidence >= 0.7
              ? "bg-primary text-primary-foreground"
              : "bg-chart-3 text-foreground"
          )}
        >
          {Math.round(meal.confidence * 100)}% confidence
        </Badge>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Metric label="Calories" value={`${Math.round(meal.calories)} kcal`} />
        <Metric label="Protein" value={formatMacro(meal.proteinGrams)} />
        <Metric label="Carbs" value={formatMacro(meal.carbsGrams)} />
        <Metric label="Fat" value={formatMacro(meal.fatGrams)} />
      </div>
      <Separator className="my-4" />
      <div className="space-y-2">
        <div className="text-sm font-medium">Assumptions</div>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {meal.assumptions.map((assumption) => (
            <li key={assumption} className="flex gap-2">
              <Check className="mt-0.5 size-4 text-primary" />
              <span>{assumption}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MealConfirmSheet({
  meal,
  onDiscard,
  onOpenChange,
  onSave,
}: {
  meal: MealLog | null;
  onDiscard: (meal: MealLog) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onSave: (meal: MealLog) => Promise<void>;
}) {
  if (!meal) {
    return null;
  }

  return (
    <MealConfirmSheetContent
      key={meal.id}
      meal={meal}
      onDiscard={onDiscard}
      onOpenChange={onOpenChange}
      onSave={onSave}
    />
  );
}

function MealConfirmSheetContent({
  meal,
  onDiscard,
  onOpenChange,
  onSave,
}: {
  meal: MealLog;
  onDiscard: (meal: MealLog) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onSave: (meal: MealLog) => Promise<void>;
}) {
  const [items, setItems] = useState<MealItem[]>(
    meal.items.length > 0 ? meal.items : getFallbackMealItems(meal)
  );
  const [status, setStatus] = useState<"idle" | "saving" | "discarding">("idle");
  const totalCalories = items.reduce((total, item) => total + item.calories, 0);
  const isBusy = status === "saving" || status === "discarding";

  async function handleSave() {
    setStatus("saving");
    await onSave({
      ...meal,
      items,
      foodName:
        items.length > 1
          ? `${items[0]?.name ?? "Meal"} + ${items.length - 1}`
          : items[0]?.name ?? meal.foodName,
      calories: totalCalories,
    });
    setStatus("idle");
  }

  async function handleDiscard() {
    setStatus("discarding");
    await onDiscard(meal);
    setStatus("idle");
  }

  return (
    <Sheet open={Boolean(meal)} onOpenChange={onOpenChange}>
      <SheetContent
        className="max-h-[92svh] overflow-y-auto p-0"
        showCloseButton={false}
        side="bottom"
      >
        <SheetHeader className="border-b">
          <SheetTitle>Confirm meal items</SheetTitle>
          <SheetDescription>
            Adjust each line before it counts toward today.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 p-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-sm text-muted-foreground">Estimated total</div>
            <div className="mt-1 text-3xl font-semibold">
              {Math.round(totalCalories)} kcal
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {items.map((item, index) => (
              <MealItemEditor
                key={`${index}-${item.name}`}
                index={index}
                item={item}
                onChange={(nextItem) =>
                  setItems((current) =>
                    current.map((currentItem, currentIndex) =>
                      currentIndex === index ? nextItem : currentItem
                    )
                  )
                }
                onRemove={() =>
                  setItems((current) =>
                    current.length > 1
                      ? current.filter((_, currentIndex) => currentIndex !== index)
                      : current
                  )
                }
              />
            ))}
          </div>

          {meal.followUpQuestion ? (
            <div className="rounded-lg border bg-accent/45 p-3 text-sm">
              <div className="font-medium">Optional follow-up</div>
              <p className="mt-1 text-muted-foreground">{meal.followUpQuestion}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={isBusy}
              type="button"
              variant="outline"
              onClick={handleDiscard}
            >
              {status === "discarding" ? "Discarding..." : "Discard"}
            </Button>
            <Button disabled={isBusy} type="button" onClick={handleSave}>
              {status === "saving" ? "Saving..." : "Save meal"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MealItemEditor({
  index,
  item,
  onChange,
  onRemove,
}: {
  index: number;
  item: MealItem;
  onChange: (item: MealItem) => void;
  onRemove: () => void;
}) {
  const portion = item.portionGrams ?? 100;

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">Item {index + 1}</div>
        <Button
          className="text-destructive hover:text-destructive"
          size="sm"
          type="button"
          variant="ghost"
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>
      <div className="mt-3 grid gap-3 min-[380px]:grid-cols-[minmax(0,1fr)_110px]">
        <div className="flex flex-col gap-2">
          <Label>Name</Label>
          <Input
            value={item.name}
            onChange={(event) => onChange({ ...item, name: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Calories</Label>
          <Input
            inputMode="numeric"
            min="0"
            type="number"
            value={numberToField(item.calories)}
            onChange={(event) =>
              onChange({
                ...item,
                calories: fieldToNumber(event.target.value) ?? 0,
              })
            }
          />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Portion</Label>
          <span className="text-sm font-medium">{Math.round(portion)} g</span>
        </div>
        <Slider
          max={800}
          min={25}
          step={25}
          value={[portion]}
          onValueChange={([value]) =>
            onChange({ ...item, portionGrams: value ?? portion })
          }
        />
      </div>
    </div>
  );
}

function getFallbackMealItems(meal: MealLog): MealItem[] {
  return [
    {
      name: meal.foodName,
      calories: meal.calories,
      proteinGrams: meal.proteinGrams,
      carbsGrams: meal.carbsGrams,
      fatGrams: meal.fatGrams,
      portionGrams: meal.portionGrams,
    },
  ];
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

function RecentMealLogs({ compact = false }: { compact?: boolean }) {
  const logs = useQuery(api.mealLogs.listRecent, { limit: compact ? 3 : 8 }) as
    | MealLog[]
    | undefined;

  return (
    <Card size={compact ? "sm" : "default"} className="glass-card transition-all duration-300">
      <CardHeader>
        <CardTitle>Recent meals</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!logs ? (
          <ListSkeleton />
        ) : logs.length === 0 ? (
          <EmptyState icon={Utensils} text="No meals logged yet." />
        ) : (
          logs.map((log) => (
            <div 
              key={log.id} 
              className="flex gap-3 rounded-lg p-3 glass-card spring-bounce border border-border hover:border-primary/50 transition-all duration-300"
            >
              <PhotoThumbnail
                alt={log.foodName}
                icon={Utensils}
                src={log.photoUrl}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{log.foodName}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDisplayDate(log.date)} · {log.mealType}
                </div>
                <div className="mt-1 text-sm font-semibold text-primary">
                  {log.status === "estimating"
                    ? "Estimating..."
                    : `${Math.round(log.calories)} kcal`}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function RecentScaleLogs({ compact = false }: { compact?: boolean }) {
  const logs = useQuery(api.scaleLogs.listRecent, { limit: compact ? 3 : 8 }) as
    | ScaleLog[]
    | undefined;

  return (
    <Card size={compact ? "sm" : "default"} className="glass-card transition-all duration-300">
      <CardHeader>
        <CardTitle>Scale photos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!logs ? (
          <ListSkeleton />
        ) : logs.length === 0 ? (
          <EmptyState icon={Scale} text="No scale photos logged yet." />
        ) : (
          logs.map((log) => <ScaleLogCard key={log.id} log={log} />)
        )}
      </CardContent>
    </Card>
  );
}

function ScaleLogCard({ log }: { log: ScaleLog }) {
  const updateWeight = useMutation(api.scaleLogs.updateWeight);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(log.weightKg ? String(log.weightKg) : "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setInputValue(log.weightKg ? String(log.weightKg) : "");
  }, [log.weightKg]);

  async function handleSave() {
    const num = parseFloat(inputValue);
    if (isNaN(num) || num <= 0) return;
    setIsSaving(true);
    try {
      await updateWeight({ id: log.id as Id<"scaleLogs">, weightKg: num });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update weight:", err);
    } finally {
      setIsSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setInputValue(log.weightKg ? String(log.weightKg) : "");
    }
  }

  const needsReview = log.needsManualReview || !log.weightKg;

  return (
    <div 
      className={cn(
        "flex gap-3 rounded-lg p-3 glass-card spring-bounce border transition-all duration-300 relative overflow-hidden group",
        needsReview 
          ? "border-destructive/35 dark:border-destructive/20 hover:border-destructive/60 bg-destructive/5 dark:bg-destructive/5" 
          : "border-border hover:border-primary/50"
      )}
    >
      {needsReview && (
        <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-destructive animate-pulse m-2" />
      )}
      
      <PhotoThumbnail alt="Scale photo" icon={Scale} src={log.photoUrl} />
      
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between gap-2">
          {isEditing ? (
            <div className="flex items-center gap-1.5 w-full my-0.5">
              <Input
                autoFocus
                className="h-7 w-20 px-1.5 py-0.5 text-sm font-semibold text-foreground focus-visible:ring-1 focus-visible:ring-primary"
                inputMode="decimal"
                type="number"
                step="0.1"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSaving}
              />
              <span className="text-xs font-semibold text-muted-foreground mr-1">kg</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10 rounded-md shrink-0 transition-transform active:scale-90 duration-150 ease-out"
                onClick={handleSave}
                disabled={isSaving}
                title="Save weight"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md shrink-0 transition-transform active:scale-90 duration-150 ease-out"
                onClick={() => {
                  setIsEditing(false);
                  setInputValue(log.weightKg ? String(log.weightKg) : "");
                }}
                disabled={isSaving}
                title="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/text w-full justify-between">
              <div 
                className={cn(
                  "text-sm font-semibold flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors duration-200",
                  needsReview ? "text-destructive" : "text-foreground"
                )}
                onClick={() => setIsEditing(true)}
                title="Click to manually override weight"
              >
                <span>
                  {log.weightKg ? `${log.weightKg.toFixed(1)} kg` : "Needs review"}
                </span>
                <Pencil className="h-3.5 w-3.5 opacity-0 group-hover/text:opacity-100 text-muted-foreground transition-all duration-200" />
              </div>
              
              {needsReview && (
                <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 rounded-md">
                  OCR Override
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
          {formatDisplayDate(log.date)} · {log.timeOfDay}
        </div>
        
        {!isEditing && (
          <div className="mt-1 flex items-center justify-between">
            <div className="text-[10px] text-muted-foreground/80 font-normal">
              Confidence: {Math.round(log.confidence * 100)}%
            </div>
            
            {needsReview && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-[10px] font-semibold text-primary hover:text-primary-foreground hover:bg-primary px-1.5 py-0.5 rounded transition-all duration-200 shrink-0"
              >
                Adjust Reading
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoThumbnail({
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

  return (
    <DisplayableImage
      key={src}
      alt={alt}
      className="size-16 shrink-0 rounded-md object-cover"
      fallback={fallback}
      pendingFallback={fallback}
      src={src}
    />
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  text,
}: {
  icon: typeof Utensils;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
      <Icon className="mb-2 text-primary" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
    </div>
  );
}

function formatMacro(value?: number) {
  return value == null ? "--" : `${Math.round(value)} g`;
}

function parsePositiveNumber(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function fieldToNumber(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function numberToField(value?: number) {
  return value == null ? "" : String(Math.round(value));
}

async function uploadToConvex(
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

async function prepareBrowserImageFile(file: File) {
  if (!isHeicLike(file.type, file.name)) {
    return file;
  }

  const convertedBlob = await convertHeicBlobToJpeg(file);
  const convertedName = file.name.replace(/\.(heic|heif)$/i, ".jpg");

  return new File([convertedBlob], convertedName, {
    lastModified: file.lastModified,
    type: "image/jpeg",
  });
}

async function fetchAndConvertHeicImage(src: string) {
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

function isHeicLike(type: string | undefined, nameOrUrl: string) {
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    /\.(heic|heif)(?:$|[?#])/i.test(nameOrUrl)
  );
}

function clearPreviewUrl(ref: MutableRefObject<string | null>) {
  if (ref.current) {
    URL.revokeObjectURL(ref.current);
    ref.current = null;
  }
}
