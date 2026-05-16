import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { hasCoreServerConfig } from "@/lib/server-config";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/check-ins(.*)",
  "/progress(.*)",
  "/habits(.*)",
  "/insights(.*)",
  "/coach(.*)",
  "/goals(.*)",
  "/settings(.*)",
]);
const configuredMiddleware = clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect({
      unauthenticatedUrl: new URL("/sign-in", request.url).toString(),
    });
  }
});

export default hasCoreServerConfig
  ? configuredMiddleware
  : function proxy() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/((?!monitoring|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
