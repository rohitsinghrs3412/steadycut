"use client";

import { Plus, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoCapturePicker } from "@/components/steadycut/photo-capture-picker";
import { clearPreviewUrl } from "@/components/steadycut/photo-file-utils";

export function DemoCaloriePhotoCard() {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [estimated, setEstimated] = useState(false);

  useEffect(() => () => clearPreviewUrl(previewUrlRef), []);

  function handleDemoFileChange(nextFile: File | null) {
    clearPreviewUrl(previewUrlRef);
    setFileName(nextFile?.name ?? "");
    setEstimated(false);

    if (nextFile) {
      const nextPreviewUrl = URL.createObjectURL(nextFile);
      previewUrlRef.current = nextPreviewUrl;
      setPreviewUrl(nextPreviewUrl);
    } else {
      setPreviewUrl(null);
    }
  }

  return (
    <Card size="sm" className="glass-card transition-all duration-300">
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Photo calories</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Try the first step of the loop in preview.
          </p>
        </div>
        <Sparkles className="text-primary" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PhotoCapturePicker
          compact
          emptyDescription="Take a new photo or choose one from your gallery."
          emptyTitle="Add meal photo"
          previewAlt={fileName || "Meal preview"}
          previewUrl={previewUrl}
          onFileChange={handleDemoFileChange}
        />
        <Button className="h-10" onClick={() => setEstimated(true)}>
          <Plus data-icon="inline-start" />
          Estimate calories
        </Button>
        {estimated ? (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-muted-foreground">
                  Demo estimate
                </div>
                <div className="text-lg font-semibold">Home meal plate</div>
              </div>
              <Badge>540 kcal</Badge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <CalorieMetric label="Protein" value="24g" />
              <CalorieMetric label="Carbs" value="62g" />
              <CalorieMetric label="Fat" value="18g" />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CalorieMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-secondary p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-semibold">{value}</div>
    </div>
  );
}
