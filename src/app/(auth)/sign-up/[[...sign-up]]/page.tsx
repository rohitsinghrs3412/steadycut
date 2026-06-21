import { SignUp } from "@clerk/nextjs";

import { SetupNotice } from "@/components/steadycut/setup-notice";
import { getMissingSetupItems, hasCoreServerConfig } from "@/lib/server-config";
import { AuthShell, clerkAppearance } from "@/components/steadycut/auth-shell";

export default function SignUpPage() {
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
      eyebrow="Start steady"
      title="Create your SteadyCut account"
      description="Keep the weight-loss loop simple: log food, weigh in, finish habits, repeat."
      footerText="Private by default. Yours every day."
    >
      <SignUp
        appearance={clerkAppearance}
        fallbackRedirectUrl="/dashboard"
        path="/sign-up"
        signInUrl="/sign-in"
      />
    </AuthShell>
  );
}
