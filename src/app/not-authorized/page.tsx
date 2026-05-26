import { auth, currentUser } from "@clerk/nextjs/server";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

import { NotAuthorizedActions } from "@/components/steadycut/not-authorized-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NotAuthorizedPage() {
  const authState = await auth();

  if (!authState.userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses.find(
      (address) => address.id === user.primaryEmailAddressId
    )?.emailAddress ??
    "No primary email found";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <ShieldAlert />
            </div>
            <div>
              <CardTitle>Account is not allowed yet</CardTitle>
              <p className="text-sm text-muted-foreground">
                Clerk signed you in, but this account is not on the SteadyCut
                allowlist.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Alert>
            <AlertCircle />
            <AlertTitle>Signed-in account</AlertTitle>
            <AlertDescription>
              <span className="font-mono text-xs">{email}</span>
            </AlertDescription>
          </Alert>
          <p className="text-sm leading-6 text-muted-foreground">
            Add this exact email to <span className="font-mono">STEADYCUT_ALLOWED_EMAILS</span>{" "}
            in Vercel production, or sign out and choose the account that is
            already allowlisted.
          </p>
          <NotAuthorizedActions />
        </CardContent>
      </Card>
    </main>
  );
}
