export const serverConfig = {
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL ?? "",
  clerkJwtIssuerDomain: process.env.CLERK_JWT_ISSUER_DOMAIN ?? "",
  geminiApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
};

export const hasClerkServerConfig = Boolean(
  serverConfig.clerkPublishableKey && serverConfig.clerkSecretKey
);

export const hasConvexServerConfig = Boolean(
  serverConfig.convexUrl && serverConfig.clerkJwtIssuerDomain
);

export const shouldUseLiveServices =
  process.env.NODE_ENV === "production" ||
  process.env.STEADYCUT_LIVE_MODE === "true";

export const hasCoreServerConfig =
  shouldUseLiveServices && hasClerkServerConfig && hasConvexServerConfig;

export function getMissingSetupItems() {
  const missingItems = [
    ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", serverConfig.clerkPublishableKey],
    ["CLERK_SECRET_KEY", serverConfig.clerkSecretKey],
    ["NEXT_PUBLIC_CONVEX_URL", serverConfig.convexUrl],
    ["CLERK_JWT_ISSUER_DOMAIN", serverConfig.clerkJwtIssuerDomain],
    ["GOOGLE_GENERATIVE_AI_API_KEY", serverConfig.geminiApiKey],
    ["VAPID_PUBLIC_KEY", serverConfig.vapidPublicKey],
    ["VAPID_PRIVATE_KEY", serverConfig.vapidPrivateKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingItems.length === 0 && !shouldUseLiveServices) {
    return ["STEADYCUT_LIVE_MODE=true"];
  }

  return missingItems;
}
