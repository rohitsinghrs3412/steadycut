import { Flame } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-foreground">
      <div className="flex size-14 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Flame />
      </div>
      <h1 className="mt-6 text-2xl font-semibold">SteadyCut is offline</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The app shell is ready. Reconnect to sync fresh meals, check-ins, and coach
        updates.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">Try again</Link>
      </Button>
    </main>
  );
}
