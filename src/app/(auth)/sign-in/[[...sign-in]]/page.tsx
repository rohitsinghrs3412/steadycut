import { SignIn } from "@clerk/nextjs";

import { SetupNotice } from "@/components/steadycut/setup-notice";
import { getMissingSetupItems, hasCoreServerConfig } from "@/lib/server-config";
import { AuthShell, clerkAppearance } from "@/components/steadycut/auth-shell";

export default function SignInPage() {
  if (!hasCoreServerConfig) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-xl">
          <SetupNotice missingItems={getMissingSetupItems()} />
        </div>
      </main>
    );
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="SteadyCut"
      description="Your private daily loop for meals, weigh-ins, habits, and one next action."
      footerText="Built for consistency, not noise."
    >
      <SignIn
        appearance={clerkAppearance}
        fallbackRedirectUrl="/dashboard"
        path="/sign-in"
        signUpUrl="/sign-up"
      />
    </AuthShell>
  );
}
