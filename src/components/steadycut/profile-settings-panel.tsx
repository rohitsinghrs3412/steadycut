"use client";

import { Calculator, Ruler, Scale, Settings, UserRound } from "lucide-react";
import { useMemo, useRef, useState } from "react";

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
import {
  ancestryOptions,
  calculateBmi,
  getBmiSummary,
  ProfileInput,
  sexOptions,
  type Ancestry,
  type Sex,
  type UserProfile,
} from "@/lib/steadycut";

type ProfileSettingsPanelProps = {
  compact?: boolean;
  latestWeightKg?: number;
  onSaveProfile: (input: ProfileInput) => Promise<void>;
  onSaveWeight?: (weightKg: number) => Promise<void>;
  profile?: UserProfile | null;
};

export function ProfileSettingsPanel({
  compact = false,
  latestWeightKg,
  onSaveProfile,
  onSaveWeight,
  profile,
}: ProfileSettingsPanelProps) {
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [heightCm, setHeightCm] = useState(numberToField(profile?.heightCm));
  const [weightKg, setWeightKg] = useState(numberToField(latestWeightKg));
  const [sex, setSex] = useState<Sex>(profile?.sex ?? "male");
  const [ancestry, setAncestry] = useState<Ancestry>(
    profile?.ancestry ?? "south-asian"
  );
  const [targetCalories, setTargetCalories] = useState(
    numberToField(profile?.targetCalories ?? 1800)
  );
  const [targetWeightKg, setTargetWeightKg] = useState(
    numberToField(profile?.targetWeightKg)
  );
  const initialWeightRef = useRef(latestWeightKg);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const parsedHeight = fieldToNumber(heightCm);
  const parsedWeight = fieldToNumber(weightKg);
  const bmi = useMemo(
    () => calculateBmi(parsedWeight, parsedHeight),
    [parsedHeight, parsedWeight]
  );

  async function handleSave() {
    setStatus("saving");
    setErrorMessage("");

    try {
      await withTimeout(
        onSaveProfile({
          displayName: displayName.trim() || undefined,
          heightCm: parsedHeight,
          sex,
          ancestry,
          targetCalories: fieldToNumber(targetCalories),
          targetWeightKg: fieldToNumber(targetWeightKg),
        }),
        "Profile save took too long. Please check your connection and try again."
      );

      if (onSaveWeight && parsedWeight && hasWeightChanged(parsedWeight, initialWeightRef.current)) {
        await withTimeout(
          onSaveWeight(parsedWeight),
          "Profile saved, but the weight log took too long. Please try again."
        );
        initialWeightRef.current = parsedWeight;
      }

      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 1400);
    } catch (caught) {
      setErrorMessage(
        caught instanceof Error
          ? caught.message
          : "Profile could not be saved. Please try again."
      );
      setStatus("error");
    }
  }

  return (
    <Card size={compact ? "sm" : "default"}>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>{compact ? "Profile & BMI" : "Body profile"}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Personal inputs for calorie targets and BMI.
          </p>
        </div>
        <Settings className="text-primary" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 grid-cols-3">
          <div className="flex flex-col justify-between rounded-lg border p-3 bg-card/40">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calculator className="size-3.5" />
                BMI
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight">
                {bmi ? bmi.toFixed(1) : "--"}
              </div>
            </div>
            {bmi ? (
              <Badge 
                className="mt-2 w-full justify-center text-[10px] px-1 truncate" 
                variant="secondary"
                title={getBmiSummary(bmi, ancestry)}
              >
                {getBmiSummary(bmi, ancestry)}
              </Badge>
            ) : (
              <div className="mt-1 text-xs text-muted-foreground">kg/m²</div>
            )}
          </div>
          <div className="flex flex-col justify-between rounded-lg border p-3 bg-card/40">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Scale className="size-3.5" />
                Weight
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight">
                {parsedWeight ? parsedWeight.toFixed(1) : "--"}
              </div>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">kg</div>
          </div>
          <div className="flex flex-col justify-between rounded-lg border p-3 bg-card/40">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Ruler className="size-3.5" />
                Height
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight">
                {parsedHeight ? Math.round(parsedHeight) : "--"}
              </div>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">cm</div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              placeholder="Optional"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-weight">Weight (kg)</Label>
            <Input
              id="profile-weight"
              inputMode="decimal"
              min="30"
              step="0.1"
              type="number"
              value={weightKg}
              onChange={(event) => setWeightKg(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-height">Height (cm)</Label>
            <Input
              id="profile-height"
              inputMode="decimal"
              min="100"
              step="0.1"
              type="number"
              value={heightCm}
              onChange={(event) => setHeightCm(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-calories">Daily calories</Label>
            <Input
              id="profile-calories"
              inputMode="numeric"
              min="800"
              step="25"
              type="number"
              value={targetCalories}
              onChange={(event) => setTargetCalories(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Sex</Label>
            <Select value={sex} onValueChange={(value: Sex) => setSex(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {sexOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Ancestry</Label>
            <Select
              value={ancestry}
              onValueChange={(value: Ancestry) => setAncestry(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {ancestryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="profile-target-weight">Goal weight (kg)</Label>
            <Input
              id="profile-target-weight"
              inputMode="decimal"
              min="30"
              placeholder="Optional"
              step="0.1"
              type="number"
              value={targetWeightKg}
              onChange={(event) => setTargetWeightKg(event.target.value)}
            />
          </div>
        </div>

        <Button className="h-10" disabled={status === "saving"} onClick={handleSave}>
          <UserRound data-icon="inline-start" />
          {status === "saving"
            ? "Saving profile..."
            : status === "saved"
              ? "Profile saved"
              : "Save profile"}
        </Button>
        {status === "error" ? (
          <p className="text-center text-sm font-medium text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function hasWeightChanged(nextWeight: number, previousWeight?: number) {
  return previousWeight == null || Math.abs(nextWeight - previousWeight) >= 0.05;
}

async function withTimeout<T>(promise: Promise<T>, message: string) {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), 20_000);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
}

function fieldToNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function numberToField(value?: number) {
  return value == null ? "" : String(value);
}
