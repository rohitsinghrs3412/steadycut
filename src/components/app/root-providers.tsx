"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import dynamic from "next/dynamic";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
} from "react";

import { DashboardQueryProvider } from "@/components/steadycut/dashboard-query-provider";
import { PwaRegistrar } from "@/components/app/pwa-registrar";
import { ThemeProvider } from "@/components/app/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

const MobileAppChrome = dynamic(
  () =>
    import("@/components/steadycut/mobile-bottom-nav").then(
      (mod) => mod.MobileAppChrome
    ),
  { ssr: false }
);

type RootProvidersProps = PropsWithChildren<{
  clerkPublishableKey: string;
  convexUrl: string;
}>;

type AppProviderConfig = {
  hasClerk: boolean;
  hasConvex: boolean;
};

const AppProviderConfigContext = createContext<AppProviderConfig>({
  hasClerk: false,
  hasConvex: false,
});

export function RootProviders({
  children,
  clerkPublishableKey,
  convexUrl,
}: RootProvidersProps) {
  const providerConfig = {
    hasClerk: Boolean(clerkPublishableKey),
    hasConvex: Boolean(convexUrl),
  };
  const content = (
    <ThemeProvider>
      <AppProviderConfigContext.Provider value={providerConfig}>
        <TooltipProvider delayDuration={250}>
          {children}
          <MobileAppChrome />
          <PwaRegistrar />
        </TooltipProvider>
      </AppProviderConfigContext.Provider>
    </ThemeProvider>
  );

  if (!clerkPublishableKey) {
    return content;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      {convexUrl ? (
        <ConvexClerkProvider convexUrl={convexUrl}>{content}</ConvexClerkProvider>
      ) : (
        content
      )}
    </ClerkProvider>
  );
}

export function useAppProviderConfig() {
  return useContext(AppProviderConfigContext);
}

function ConvexClerkProvider({
  children,
  convexUrl,
}: PropsWithChildren<{ convexUrl: string }>) {
  const trimmedUrl = convexUrl.trim();
  const convex = useMemo(() => new ConvexReactClient(trimmedUrl), [trimmedUrl]);

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <DashboardQueryProvider>{children}</DashboardQueryProvider>
    </ConvexProviderWithClerk>
  );
}
