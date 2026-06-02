"use client";

// Let's declare local type overrides to avoid import issues
type LocalFacingMode = "environment" | "user";
type LocalConnectionState = "idle" | "preview" | "connecting" | "connected" | "error";
type LocalCameraDeviceOption = {
  deviceId: string;
  facing: LocalFacingMode | "unknown";
  label: string;
};
type LocalZoomRange = {
  max: number;
  min: number;
  step: number;
};
type LocalVoicePromptInput = {
  cameraError: string;
  connectionState: LocalConnectionState;
  isMicOn: boolean;
  latestSystemText?: string;
  liveReady: boolean;
  statusText: string;
};

export function getPreviewReason(missingItems: string[]) {
  if (missingItems.includes("GOOGLE_GENERATIVE_AI_API_KEY")) {
    return "Gemini Live needs the Google API key.";
  }
  if (missingItems.length > 0) {
    return "Preview mode is active.";
  }
  return "Live services are not enabled.";
}

export function getVideoConstraints(
  facingMode: LocalFacingMode,
  selectedCameraId: string
): MediaTrackConstraints {
  const baseConstraints: MediaTrackConstraints = {
    aspectRatio: { ideal: 16 / 9 },
    frameRate: { ideal: 30, max: 30 },
    height: { ideal: 1080 },
    width: { ideal: 1920 },
  };

  if (selectedCameraId) {
    return {
      ...baseConstraints,
      deviceId: { exact: selectedCameraId },
    };
  }

  return {
    ...baseConstraints,
    facingMode: { ideal: facingMode },
  };
}

export function inferCameraFacing(label: string): LocalFacingMode | "unknown" {
  const normalized = label.toLowerCase();
  if (/(front|user|selfie)/.test(normalized)) {
    return "user";
  }
  if (/(back|rear|environment|world|wide|tele|macro)/.test(normalized)) {
    return "environment";
  }
  return "unknown";
}

export function getCameraCandidates(
  cameras: LocalCameraDeviceOption[],
  facingMode: LocalFacingMode,
  options: { includeUnknownFallback?: boolean } = {}
) {
  const includeUnknownFallback = options.includeUnknownFallback ?? true;
  const preferred = cameras.filter((camera) => camera.facing === facingMode);

  if (preferred.length > 0) {
    return [...preferred].sort(
      (left, right) =>
        getCameraScore(right, facingMode) - getCameraScore(left, facingMode)
    );
  }

  if (!includeUnknownFallback) {
    return [];
  }

  return cameras.filter((camera) => camera.facing === "unknown");
}

export function getPreferredCamera(
  cameras: LocalCameraDeviceOption[],
  facingMode: LocalFacingMode,
  options?: { includeUnknownFallback?: boolean }
) {
  return getCameraCandidates(cameras, facingMode, options)[0] ?? null;
}

export function getCameraScore(camera: LocalCameraDeviceOption, facingMode: LocalFacingMode) {
  const label = camera.label.toLowerCase();
  const cameraIndex = getAndroidCameraIndex(label);
  let score = 0;

  if (camera.facing === facingMode) {
    score += 20;
  }

  if (facingMode === "environment") {
    if (cameraIndex === 0) {
      score += 85;
    } else if (typeof cameraIndex === "number") {
      score -= Math.min(cameraIndex * 10, 40);
    }

    if (/(main|primary|standard|1x)/.test(label)) {
      score += 95;
    }

    if (/(back|rear|environment|world)/.test(label)) {
      score += 70;
    }

    if (/wide/.test(label) && !/(ultra|0\.5|0,5|super[\s-]?wide)/.test(label)) {
      score += 45;
    }

    if (/(ultra|0\.5|0,5|super[\s-]?wide)/.test(label)) {
      score -= 110;
    }

    if (/(tele|zoom|2x|3x|portrait|periscope|macro|depth)/.test(label)) {
      score -= 105;
    }
  } else if (/(front|user|selfie)/.test(label)) {
    score += 55;

    if (cameraIndex === 1) {
      score += 35;
    }
  }

  return score;
}

export function getAndroidCameraIndex(label: string) {
  const match = label.match(/\bcamera(?:2)?\s*(\d+)\b/);
  return match ? Number(match[1]) : null;
}

export function getReadableCameraLabel(label: string | undefined, facingMode: LocalFacingMode) {
  if (!label) {
    return facingMode === "environment" ? "Rear" : "Front";
  }

  const normalized = label.toLowerCase();
  if (/(ultra|0\.5)/.test(normalized)) {
    return "Ultra wide";
  }
  if (/wide/.test(normalized)) {
    return "Wide";
  }
  if (/(tele|zoom|2x|3x|portrait)/.test(normalized)) {
    return "Telephoto";
  }
  if (/(front|user|selfie)/.test(normalized)) {
    return "Front";
  }
  if (/(back|rear|environment|world|main)/.test(normalized)) {
    return "Rear";
  }
  return label;
}

export function getZoomRange(track: MediaStreamTrack): LocalZoomRange | null {
  if (!("getCapabilities" in track)) {
    return null;
  }

  const capabilities = track.getCapabilities() as MediaTrackCapabilities & { zoom?: { min?: number; max?: number; step?: number } };
  const zoom = capabilities.zoom;

  if (
    typeof zoom?.min !== "number" ||
    typeof zoom.max !== "number" ||
    zoom.max <= zoom.min
  ) {
    return null;
  }

  return {
    max: zoom.max,
    min: zoom.min,
    step: typeof zoom.step === "number" && zoom.step > 0 ? zoom.step : 0.1,
  };
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getVoicePrompt({
  cameraError,
  connectionState,
  isMicOn,
  latestSystemText,
  liveReady,
  statusText,
}: LocalVoicePromptInput) {
  if (connectionState === "error") {
    return latestSystemText ?? "Could not start voice.";
  }
  if (!liveReady) {
    return "Preview mode only.";
  }
  if (cameraError) {
    return cameraError;
  }
  if (connectionState === "connecting") {
    return statusText === "Starting audio" ? "Starting speaker..." : "Connecting...";
  }
  if (connectionState === "connected") {
    if (statusText === "Speaking") {
      return "Speaking...";
    }
    return isMicOn ? "Listening..." : "Mic muted.";
  }
  return "Tap Start, then speak.";
}

export async function readLiveTokenResponse(response: Response): Promise<{ error?: string; expiresAt?: string; model?: string; token?: string }> {
  const text = await response.text();
  if (!text) {
    return response.ok
      ? {}
      : { error: `Could not start Gemini Live (${response.status}).` };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error:
        text.replace(/\s+/g, " ").slice(0, 180) ||
        `Could not start Gemini Live (${response.status}).`,
    };
  }
}

export function getPcmSampleRate(mimeType?: string) {
  const match = mimeType?.match(/rate=(\d+)/);
  return match ? Number(match[1]) : null;
}

export function base64ToUint8Array(base64: string) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBufferLike) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return window.btoa(binary);
}

export function downsampleToPcm16(
  input: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
) {
  if (outputSampleRate === inputSampleRate) {
    return floatToPcm16(input);
  }
  if (outputSampleRate > inputSampleRate) {
    return floatToPcm16(input);
  }

  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(Math.floor((index + 1) * ratio), input.length);
    let total = 0;
    let count = 0;

    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      total += input[sampleIndex] ?? 0;
      count += 1;
    }
    output[index] = count > 0 ? total / count : 0;
  }

  return floatToPcm16(output);
}

export function floatToPcm16(input: Float32Array) {
  const output = new Int16Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index] ?? 0));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}
