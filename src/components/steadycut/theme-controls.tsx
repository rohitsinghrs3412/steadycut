"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";

import {
  type ThemePreference,
  useTheme,
} from "@/components/app/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const themeOptions: Array<{
  label: string;
  value: ThemePreference;
  icon: typeof Sun;
}> = [
  { label: "Light", value: "light", icon: Sun },
  { label: "Dark", value: "dark", icon: Moon },
  { label: "System", value: "system", icon: Monitor },
];

export function ThemeIconButton({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          className={cn("h-10 w-10", className)}
          size="icon"
          type="button"
          variant="outline"
          onClick={toggleTheme}
        >
          <Icon className="size-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function AppearanceSettingsPanel() {
  const { preference, resolvedTheme, setPreference } = useTheme();

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Appearance</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Current mode: {resolvedTheme}
          </p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {resolvedTheme === "dark" ? <Moon /> : <Sun />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 min-[420px]:grid-cols-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = preference === option.value;

            return (
              <Button
                key={option.value}
                className={cn(
                  "h-11 justify-start gap-2",
                  isSelected && "border-primary bg-primary/10 text-primary"
                )}
                type="button"
                variant="outline"
                onClick={() => setPreference(option.value)}
              >
                <Icon data-icon="inline-start" />
                <span className="flex-1 text-left">{option.label}</span>
                {isSelected ? <Check data-icon="inline-end" /> : null}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
