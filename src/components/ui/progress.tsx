"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const boundedValue = Math.max(0, Math.min(value ?? 0, 100));

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-1 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full bg-primary transition-[width]"
        style={{ width: `${boundedValue}%` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
