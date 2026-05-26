import {
  DesktopAppSidebar,
  MobileNavButton,
} from "@/components/steadycut/app-sidebar";
import { Skeleton } from "@/components/ui/skeleton";

type AppLoadingPageProps = {
  title?: string;
};

export function AppLoadingPage({ title = "Loading" }: AppLoadingPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <DesktopAppSidebar />
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <MobileNavButton />
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
                <Skeleton className="mt-2 hidden h-4 w-56 md:block" />
              </div>
            </div>
            <Skeleton className="hidden h-8 w-36 sm:block" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 flex flex-col gap-6 p-4 pb-[calc(9rem+env(safe-area-inset-bottom))] lg:px-8 lg:py-8 lg:pb-12">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-80" />
          <Skeleton className="h-48" />
        </main>
      </div>
    </div>
  );
}
