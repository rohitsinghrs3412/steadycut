"use client";

import { useAction, useMutation } from "convex/react";
import { AlertTriangle, Check, Loader2, RefreshCw, Utensils } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import {
  getFallbackMealItems,
  getMealInputError,
  MealItem,
  MealLog,
  mealTypeOptions,
  MealType,
  parseMealPortionGrams,
  toDateKey,
} from "@/lib/steadycut";
import { cn } from "@/lib/utils";
import {
  clearPreviewUrl,
  prepareBrowserImageFile,
} from "@/components/steadycut/photo-file-utils";
import { PhotoCapturePicker } from "@/components/steadycut/photo-capture-picker";

import {
  Metric,
  getErrorMessage,
  uploadToConvex,
  formatMacro,
  numberToField,
  fieldToNumber,
} from "./shared";

type AnalyzeStatus = "idle" | "uploading" | "analyzing" | "done" | "error";

export function MealPhotoLogger({ compact = false }: { compact?: boolean }) {
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
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
    setError(null);
    setFile(null);
    setPreviewUrl(null);

    if (!nextFile) {
      setIsPreparingPhoto(false);
      return;
    }

    setLatest(null);
    setConfirmMeal(null);
    setFollowUpAnswer("");
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
    const hasNewFile = Boolean(file);
    const reusablePhotoId = latest?.photoId as Id<"_storage"> | undefined;
    const existingMealLogId = latest?.id as Id<"mealLogs"> | undefined;

    if (!file && !reusablePhotoId) {
      setError("Add a food photo first.");
      setStatus("error");
      setLatest(null);
      setConfirmMeal(null);
      return;
    }

    const parsedPortionGrams = parseMealPortionGrams(portionGrams);
    const combinedDescription = [
      description.trim(),
      followUpAnswer.trim()
        ? `Follow-up answer: ${followUpAnswer.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
    const inputError = getMealInputError({
      description: combinedDescription,
      portionGramsField: portionGrams,
      portionGrams: parsedPortionGrams,
    });

    if (inputError) {
      setError(inputError);
      setStatus("error");
      setLatest(null);
      setConfirmMeal(null);
      return;
    }

    setError(null);
    setLatest(null);
    setConfirmMeal(null);
    setStatus(hasNewFile ? "uploading" : "analyzing");

    try {
      const photoId = file
        ? await uploadToConvex(file, generateUploadUrl)
        : reusablePhotoId;

      setStatus("analyzing");
      const result = (await analyzeMealPhoto({
        date,
        mealType,
        photoId: photoId as Id<"_storage">,
        description: combinedDescription || undefined,
        portionGrams: parsedPortionGrams,
        existingMealLogId: hasNewFile ? undefined : existingMealLogId,
      })) as MealLog;

      if (hasNewFile) {
        setConfirmMeal(result);
      } else {
        setLatest(result);
        setFollowUpAnswer("");
        handleMealFileChange(null);
      }
      setStatus("done");
    } catch (caught) {
      setError(getErrorMessage(caught, "Meal analysis failed."));
      setLatest(null);
      setConfirmMeal(null);
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
        "glass-card !overflow-visible transition-all duration-300",
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
          <RefreshCw className="h-4 w-4" />
          Gemini
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "grid gap-4",
          compact ? "grid-cols-1" : "lg:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-1"
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
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-1">
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
        className="max-h-[92svh] overflow-y-auto p-0 sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-t-xl sm:border-x"
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
