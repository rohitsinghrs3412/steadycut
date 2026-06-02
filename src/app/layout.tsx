import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RootProviders } from "@/components/app/root-providers";
import { hasCoreServerConfig } from "@/lib/server-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeScript = `
(() => {
  try {
    const key = "steadycut-theme";
    const stored = window.localStorage.getItem(key);
    const preference = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    const resolved = preference === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : preference;

    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.dataset.theme = preference;
    document.documentElement.style.colorScheme = resolved;
  } catch {
  }
})();
`;

export const metadata: Metadata = {
  applicationName: "SteadyCut",
  manifest: "/manifest.webmanifest",
  title: "SteadyCut",
  description: "A private consistency dashboard for weight-loss check-ins.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SteadyCut",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fbf8" },
    { media: "(prefers-color-scheme: dark)", color: "#070a10" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://clerk.steadycut.app" />
        <link rel="preconnect" href="https://api.convex.cloud" />
        <link rel="preconnect" href="https://ingest.sentry.io" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">
        <RootProviders
          clerkPublishableKey={
            hasCoreServerConfig
              ? (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").trim()
              : ""
          }
          convexUrl={(process.env.NEXT_PUBLIC_CONVEX_URL ?? "").trim()}
        >
          {children}
        </RootProviders>
      </body>
    </html>
  );
}
