import {
  ActivityHandling,
  GoogleGenAI,
  MediaResolution,
  Modality,
  ThinkingLevel,
  TurnCoverage,
} from "@google/genai";
import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";

import {
  LIVE_COACH_MODEL,
  LIVE_COACH_NEW_SESSION_TTL_MS,
  LIVE_COACH_SYSTEM_INSTRUCTION,
  LIVE_COACH_TOKEN_TTL_MS,
  LIVE_COACH_VOICE_NAME,
} from "@/lib/live-coach";
import { isAuthorizedAppUser } from "@/lib/app-auth";
import { hasCoreServerConfig, serverConfig } from "@/lib/server-config";

export const runtime = "nodejs";

const TOKEN_ROUTE_TIMEOUT_MS = 12_000;
const TOKEN_RATE_LIMIT_WINDOW_MS = 60_000;
const TOKEN_RATE_LIMIT_MAX = 6;
const tokenRateLimit = new Map<string, number[]>();

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return json({ error: "Request origin is not allowed." }, 403);
  }

  if (!hasCoreServerConfig) {
    return json({ error: "Live services are not enabled." }, 403);
  }

  if (!serverConfig.geminiApiKey) {
    return json({ error: "Gemini Live is not configured." }, 503);
  }

  const authState = await auth();

  if (!authState.userId) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!(await isAuthorizedAppUser(authState))) {
    return json({ error: "Not found." }, 404);
  }

  if (!checkTokenRateLimit(authState.userId)) {
    return json({ error: "Too many session requests. Try again shortly." }, 429);
  }

  const client = new GoogleGenAI({
    apiKey: serverConfig.geminiApiKey,
    httpOptions: { apiVersion: "v1alpha" },
  });
  const expiresAt = new Date(Date.now() + LIVE_COACH_TOKEN_TTL_MS).toISOString();
  const newSessionExpiresAt = new Date(
    Date.now() + LIVE_COACH_NEW_SESSION_TTL_MS
  ).toISOString();
  try {
    const token = await withTimeout(
      client.authTokens.create({
        config: {
          uses: 1,
          expireTime: expiresAt,
          newSessionExpireTime: newSessionExpiresAt,
          liveConnectConstraints: {
            model: LIVE_COACH_MODEL,
            config: {
              responseModalities: [Modality.AUDIO],
              mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: LIVE_COACH_VOICE_NAME,
                  },
                },
              },
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.MINIMAL,
              },
              systemInstruction: LIVE_COACH_SYSTEM_INSTRUCTION,
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              realtimeInputConfig: {
                activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
                turnCoverage:
                  TurnCoverage.TURN_INCLUDES_AUDIO_ACTIVITY_AND_ALL_VIDEO,
              },
            },
          },
        },
      }),
      TOKEN_ROUTE_TIMEOUT_MS
    );

    if (!token.name) {
      return json({ error: "Could not start Gemini Live right now." }, 502);
    }

    return json({
      token: token.name,
      model: LIVE_COACH_MODEL,
      expiresAt,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        feature: "live-coach-token",
      },
    });
    console.error("Gemini Live token error:", error);

    return json({ error: "Could not start Gemini Live right now." }, 502);
  }
}

function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");

  if (site && !["same-origin", "same-site", "none"].includes(site)) {
    return false;
  }

  if (!origin) {
    return true;
  }

  return origin === new URL(request.url).origin;
}

function checkTokenRateLimit(userId: string) {
  const now = Date.now();
  const recent = (tokenRateLimit.get(userId) ?? []).filter(
    (timestamp) => now - timestamp < TOKEN_RATE_LIMIT_WINDOW_MS
  );

  if (recent.length >= TOKEN_RATE_LIMIT_MAX) {
    tokenRateLimit.set(userId, recent);
    return false;
  }

  recent.push(now);
  tokenRateLimit.set(userId, recent);
  return true;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Gemini Live token request timed out.")),
      timeoutMs
    );
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
