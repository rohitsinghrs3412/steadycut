import { Flame } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const clerkAppearance = {
  variables: {
    colorPrimary: "#2fa569",
    colorBackground: "var(--background)",
    colorText: "var(--foreground)",
    colorTextSecondary: "var(--muted-foreground)",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-geist-sans)",
  },
  elements: {
    cardBox: "shadow-none border border-border",
    card: "bg-card text-card-foreground",
    headerTitle: "text-foreground",
    headerSubtitle: "text-muted-foreground",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
    footerActionLink: "text-primary hover:text-primary/90",
    socialButtonsBlockButton:
      "border-border bg-background text-foreground hover:bg-muted",
    formFieldInput:
      "border-input bg-background text-foreground focus-visible:ring-ring",
  },
} as const;

export function BrandMark() {
  return (
    <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <Flame />
    </div>
  );
}

export function AuthShell({
  children,
  eyebrow,
  title,
  description,
  footerText,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  footerText: string;
}) {
  return (
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
      <section className="hidden flex-col justify-between border-r bg-sidebar p-10 lg:flex">
        <Link className="flex items-center gap-3" href="/">
          <BrandMark />
          <span className="text-xl font-semibold">SteadyCut</span>
        </Link>
        <div className="max-w-md">
          <div className="text-sm font-medium text-primary">{eyebrow}</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {footerText}
        </div>
      </section>
      <section
        className={cn(
          "flex min-h-screen items-center justify-center p-4",
          "sm:p-6 lg:p-10"
        )}
      >
        <div className="w-full max-w-md">
          <Link className="mb-6 flex items-center gap-3 lg:hidden" href="/">
            <BrandMark />
            <span className="text-xl font-semibold">SteadyCut</span>
          </Link>
          {children}
        </div>
      </section>
    </main>
  );
}
