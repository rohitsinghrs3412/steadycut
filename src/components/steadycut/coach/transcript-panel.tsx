"use client";

import { cn } from "@/lib/utils";

type TranscriptLine = {
  id: string;
  role: "coach" | "system" | "user";
  text: string;
};

export function TranscriptPanel({
  transcript,
}: {
  transcript: TranscriptLine[];
}) {
  return (
    <div className="max-h-[28svh] w-full min-w-0 overflow-y-auto rounded-lg border border-white/10 bg-black/45 p-2.5 backdrop-blur-md">
      <div className="flex flex-col gap-2">
        {transcript.map((line) => (
          <div
            key={line.id}
            className={cn(
              "w-fit max-w-[88%] rounded-lg px-3 py-2 text-xs leading-relaxed",
              line.role === "user" && "ml-auto bg-white text-black",
              line.role === "coach" && "bg-primary text-primary-foreground",
              line.role === "system" && "mx-auto bg-white/10 text-white/72"
            )}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}
