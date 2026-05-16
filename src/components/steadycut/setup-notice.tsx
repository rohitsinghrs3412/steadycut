import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SetupNoticeProps = {
  missingItems: string[];
  compact?: boolean;
};

export function SetupNotice({ missingItems, compact = false }: SetupNoticeProps) {
  if (!missingItems.length) {
    return (
      <Alert>
        <CheckCircle2 />
        <AlertTitle>Configuration looks ready.</AlertTitle>
        <AlertDescription>
          Clerk, Convex, and Gemini environment variables are present.
        </AlertDescription>
      </Alert>
    );
  }

  if (compact) {
    return (
      <Alert>
        <AlertCircle />
        <AlertTitle>Setup needed for live data</AlertTitle>
        <AlertDescription>
          Add the missing environment variables in `.env.local` to enable
          authentication, Convex persistence, and Gemini coaching.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KeyRound />
          </div>
          <div>
            <CardTitle>Connect your private app services</CardTitle>
            <p className="text-sm text-muted-foreground">
              The dashboard can run in preview mode now. Add these values to
              make it a real authenticated Convex app with Gemini coaching.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {missingItems.map((item) => (
          <Badge key={item} variant="secondary" className="font-mono">
            {item}
          </Badge>
        ))}
      </CardContent>
    </Card>
  );
}
