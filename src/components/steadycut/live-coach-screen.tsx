"use client";

import {
  ActivityHandling,
  GoogleGenAI,
  MediaResolution,
  Modality,
  ThinkingLevel,
  TurnCoverage,
  type LiveServerMessage,
  type Session,
} from "@google/genai";
import {
  ArrowLeft,
  Bot,
  Camera,
  CameraOff,
  FlipHorizontal2,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Sparkles,
  Video,
  ZoomIn,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LIVE_COACH_MODEL, LIVE_COACH_VOICE_NAME } from "@/lib/live-coach";
import { cn } from "@/lib/utils";

type AppMode = "demo" | "live" | "setup";
type ConnectionState = "idle" | "preview" | "connecting" | "connected" | "error";
type FacingMode = "environment" | "user";

type LiveCoachScreenProps = {
  hasGemini: boolean;
  missingItems: string[];
  mode: AppMode;
};

type LiveTokenResponse = {
  error?: string;
  expiresAt?: string;
  model?: string;
  token?: string;
};

type TranscriptLine = {
  id: string;
  role: "coach" | "system" | "user";
  text: string;
};

type CameraDeviceOption = {
  deviceId: string;
  facing: FacingMode | "unknown";
  label: string;
};

type VoicePromptInput = {
  cameraError: string;
  connectionState: ConnectionState;
  isMicOn: boolean;
  latestSystemText?: string;
  liveReady: boolean;
  statusText: string;
};

type WindowWithWebkitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

type ZoomCapability = {
  max?: number;
  min?: number;
  step?: number;
};

type ZoomRange = {
  max: number;
  min: number;
  step: number;
};

type ZoomMediaTrackCapabilities = MediaTrackCapabilities & {
  zoom?: ZoomCapability;
};

type ZoomMediaTrackSettings = MediaTrackSettings & {
  deviceId?: string;
  zoom?: number;
};

type ZoomMediaTrackConstraintSet = MediaTrackConstraintSet & {
  zoom?: number;
};

const previewResponses = [
  "Preview mode is ready. In a live session I would watch the scene with you and keep the next action practical.",
  "For now, protect one simple behavior: log the meal, estimate calmly, and move on.",
  "I will keep this non-medical and focused on consistency once Gemini Live is connected.",
];

export function LiveCoachScreen({
  hasGemini,
  missingItems,
  mode,
}: LiveCoachScreenProps) {
  const liveReady = mode === "live" && hasGemini;
  const [activeCameraLabel, setActiveCameraLabel] = useState("");
  const [availableCameras, setAvailableCameras] = useState<CameraDeviceOption[]>([]);
  const [cameraError, setCameraError] = useState("");
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isTextPanelOpen, setIsTextPanelOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [statusText, setStatusText] = useState(
    liveReady ? "Ready" : "Preview"
  );
  const [streamVersion, setStreamVersion] = useState(0);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([
    {
      id: "system-intro",
      role: "system",
      text: liveReady
        ? "Tap Start when you are ready."
        : getPreviewReason(missingItems),
    },
  ]);
  const [zoomRange, setZoomRange] = useState<ZoomRange | null>(null);
  const [zoomValue, setZoomValue] = useState(1);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameTimerRef = useRef<number | null>(null);
  const lineIdRef = useRef(0);
  const mutedGainRef = useRef<GainNode | null>(null);
  const playheadTimeRef = useRef(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<Session | null>(null);
  const speakingTimerRef = useRef<number | null>(null);
  const stateRef = useRef(connectionState);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    stateRef.current = connectionState;
  }, [connectionState]);

  const appendTranscript = useCallback(
    (role: TranscriptLine["role"], text: string) => {
      const cleaned = text.trim();

      if (!cleaned) {
        return;
      }

      setTranscript((current) =>
        [
          ...current,
          {
            id: `${Date.now()}-${lineIdRef.current++}`,
            role,
            text: cleaned,
          },
        ].slice(-8)
      );
    },
    []
  );

  const getAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      return audioContextRef.current;
    }

    const AudioContextCtor =
      window.AudioContext ??
      (window as WindowWithWebkitAudio).webkitAudioContext;

    if (!AudioContextCtor) {
      throw new Error("Audio playback is not supported in this browser.");
    }

    const audioContext = new AudioContextCtor();
    audioContextRef.current = audioContext;
    return audioContext;
  }, []);

  const clearSpeakingTimer = useCallback(() => {
    if (speakingTimerRef.current != null) {
      window.clearTimeout(speakingTimerRef.current);
      speakingTimerRef.current = null;
    }
  }, []);

  const primeAudioOutput = useCallback(async () => {
    const audioContext = getAudioContext();
    await audioContext.resume();

    const buffer = audioContext.createBuffer(1, 1, 24000);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
    playheadTimeRef.current = audioContext.currentTime + 0.03;
  }, [getAudioContext]);

  const stopAudioOutput = useCallback(() => {
    clearSpeakingTimer();

    for (const source of scheduledSourcesRef.current) {
      try {
        source.stop();
      } catch {
      }
    }

    scheduledSourcesRef.current.clear();
    playheadTimeRef.current = audioContextRef.current?.currentTime ?? 0;
  }, [clearSpeakingTimer]);

  const playLiveAudio = useCallback(
    async (base64: string, mimeType?: string) => {
      const audioContext = getAudioContext();
      await audioContext.resume();

      const bytes = base64ToUint8Array(base64);
      const sampleRate = getPcmSampleRate(mimeType) ?? 24000;
      const frameCount = Math.floor(bytes.byteLength / 2);

      if (frameCount === 0) {
        return;
      }

      const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const audioBuffer = audioContext.createBuffer(1, frameCount, sampleRate);
      const channel = audioBuffer.getChannelData(0);

      for (let index = 0; index < frameCount; index += 1) {
        channel[index] = dataView.getInt16(index * 2, true) / 32768;
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      const startAt = Math.max(audioContext.currentTime + 0.02, playheadTimeRef.current);
      source.start(startAt);
      playheadTimeRef.current = startAt + audioBuffer.duration;
      scheduledSourcesRef.current.add(source);
      setStatusText("Speaking");
      clearSpeakingTimer();
      speakingTimerRef.current = window.setTimeout(() => {
        speakingTimerRef.current = null;

        if (stateRef.current === "connected") {
          setStatusText(isMicOn ? "Listening" : "Mic muted");
        }
      }, Math.max(450, audioBuffer.duration * 1000 + 220));
      source.onended = () => {
        scheduledSourcesRef.current.delete(source);
      };
    },
    [clearSpeakingTimer, getAudioContext, isMicOn]
  );

  const handleLiveMessage = useCallback(
    (message: LiveServerMessage) => {
      if (message.setupComplete) {
        setStatusText(isMicOn ? "Listening" : "Mic muted");
        return;
      }

      if (message.goAway?.timeLeft) {
        setStatusText("Ending soon");
      }

      if (message.serverContent?.interrupted) {
        stopAudioOutput();
        setStatusText(isMicOn ? "Listening" : "Mic muted");
      }

      const inputText = message.serverContent?.inputTranscription?.text;
      const outputText = message.serverContent?.outputTranscription?.text;

      if (inputText) {
        appendTranscript("user", inputText);
      }

      if (outputText) {
        appendTranscript("coach", outputText);
      }

      const parts = message.serverContent?.modelTurn?.parts ?? [];

      for (const part of parts) {
        const inlineData = "inlineData" in part ? part.inlineData : undefined;

        if (inlineData?.data) {
          void playLiveAudio(inlineData.data, inlineData.mimeType).catch(
            (error) => {
              Sentry.captureException(error, {
                tags: {
                  feature: "live-coach-audio-output",
                },
              });
              setStatusText("Audio blocked");
              appendTranscript(
                "system",
                "Speaker playback was blocked. Tap End, then Start again."
              );
            }
          );
        }
      }
    },
    [appendTranscript, isMicOn, playLiveAudio, stopAudioOutput]
  );

  const stopLocalMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const refreshCameraDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return [] as CameraDeviceOption[];
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices
      .filter((device) => device.kind === "videoinput")
      .map((device, index) => {
        const label = device.label || `Camera ${index + 1}`;

        return {
          deviceId: device.deviceId,
          facing: inferCameraFacing(label),
          label,
        } satisfies CameraDeviceOption;
      });

    setAvailableCameras(cameras);
    return cameras;
  }, []);

  const configureVideoTrack = useCallback(
    async (track: MediaStreamTrack, cameras: CameraDeviceOption[]) => {
      const settings = track.getSettings() as ZoomMediaTrackSettings;
      const activeCamera = cameras.find(
        (camera) => camera.deviceId === settings.deviceId
      );

      setActiveCameraLabel(
        getReadableCameraLabel(activeCamera?.label, facingMode)
      );

      const nextZoomRange = getZoomRange(track);
      setZoomRange(nextZoomRange);

      if (!nextZoomRange) {
        setZoomValue(1);
        return;
      }

      const targetZoom = nextZoomRange.min;

      try {
        await track.applyConstraints({
          advanced: [{ zoom: targetZoom } as ZoomMediaTrackConstraintSet],
        });
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            feature: "live-coach-camera-zoom",
          },
        });
      }

      const nextSettings = track.getSettings() as ZoomMediaTrackSettings;
      setZoomValue(nextSettings.zoom ?? targetZoom);
    },
    [facingMode]
  );

  const startLocalMedia = useCallback(async () => {
    stopLocalMedia();
    setCameraError("");
    setZoomRange(null);

    if (!isCameraOn && !isMicOn) {
      setStreamVersion((version) => version + 1);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: isMicOn
          ? {
              autoGainControl: true,
              echoCancellation: true,
              noiseSuppression: true,
            }
          : false,
        video: isCameraOn
          ? getVideoConstraints(facingMode, selectedCameraId)
          : false,
      });
      const cameras = await refreshCameraDevices().catch(
        () => [] as CameraDeviceOption[]
      );
      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings() as ZoomMediaTrackSettings | undefined;
      const preferredCamera =
        !selectedCameraId && isCameraOn
          ? getPreferredCamera(cameras, facingMode, {
              includeUnknownFallback: false,
            })
          : null;

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      if (track) {
        await configureVideoTrack(track, cameras);
      }

      if (
        preferredCamera?.deviceId &&
        settings?.deviceId &&
        preferredCamera.deviceId !== settings.deviceId
      ) {
        setSelectedCameraId(preferredCamera.deviceId);
      }

      setStreamVersion((version) => version + 1);
    } catch (error) {
      if (selectedCameraId && isCameraOn) {
        Sentry.captureException(error, {
          tags: {
            feature: "live-coach-camera-device",
          },
        });
        setSelectedCameraId("");
        setStreamVersion((version) => version + 1);
        return;
      }

      setCameraError("Camera or microphone permission was blocked.");
      setStreamVersion((version) => version + 1);
    }
  }, [
    configureVideoTrack,
    facingMode,
    isCameraOn,
    isMicOn,
    refreshCameraDevices,
    selectedCameraId,
    stopLocalMedia,
  ]);

  const applyCameraZoom = useCallback(
    async (value: number) => {
      const track = streamRef.current?.getVideoTracks()[0];

      if (!track || !zoomRange) {
        return;
      }

      const zoom = clampNumber(value, zoomRange.min, zoomRange.max);
      setZoomValue(zoom);

      try {
        await track.applyConstraints({
          advanced: [{ zoom } as ZoomMediaTrackConstraintSet],
        });
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            feature: "live-coach-camera-zoom",
          },
        });
      }
    },
    [zoomRange]
  );

  const switchCameraFacing = useCallback(() => {
    const nextFacingMode =
      facingMode === "environment" ? "user" : "environment";
    const preferredCamera = getPreferredCamera(
      availableCameras,
      nextFacingMode,
      { includeUnknownFallback: false }
    );

    setSelectedCameraId(preferredCamera?.deviceId ?? "");
    setFacingMode(nextFacingMode);
  }, [availableCameras, facingMode]);

  const stopAudioCapture = useCallback((sendEnd = false) => {
    audioProcessorRef.current?.disconnect();
    audioSourceRef.current?.disconnect();
    mutedGainRef.current?.disconnect();
    audioProcessorRef.current = null;
    audioSourceRef.current = null;
    mutedGainRef.current = null;

    if (sendEnd && sessionRef.current) {
      sessionRef.current.sendRealtimeInput({ audioStreamEnd: true });
    }
  }, []);

  const startAudioCapture = useCallback(async () => {
    stopAudioCapture();

    const session = sessionRef.current;
    const audioTracks = streamRef.current?.getAudioTracks() ?? [];

    if (!session || audioTracks.length === 0 || !isMicOn) {
      return;
    }

    const audioContext = getAudioContext();
    await audioContext.resume().catch(() => undefined);

    const audioStream = new MediaStream(audioTracks);
    const source = audioContext.createMediaStreamSource(audioStream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const mutedGain = audioContext.createGain();

    mutedGain.gain.value = 0;
    processor.onaudioprocess = (event) => {
      if (stateRef.current !== "connected" || !sessionRef.current) {
        return;
      }

      const input = event.inputBuffer.getChannelData(0);
      const pcm16 = downsampleToPcm16(input, audioContext.sampleRate, 16000);

      if (pcm16.byteLength === 0) {
        return;
      }

      sessionRef.current.sendRealtimeInput({
        audio: {
          data: arrayBufferToBase64(
            pcm16.buffer.slice(
              pcm16.byteOffset,
              pcm16.byteOffset + pcm16.byteLength
            )
          ),
          mimeType: "audio/pcm;rate=16000",
        },
      });
    };

    source.connect(processor);
    processor.connect(mutedGain);
    mutedGain.connect(audioContext.destination);
    audioSourceRef.current = source;
    audioProcessorRef.current = processor;
    mutedGainRef.current = mutedGain;
  }, [getAudioContext, isMicOn, stopAudioCapture]);

  const sendVideoFrame = useCallback(async () => {
    const session = sessionRef.current;
    const video = videoRef.current;

    if (!session || !video || !isCameraOn || video.readyState < 2) {
      return;
    }

    const canvas = cameraCanvasRef.current ?? document.createElement("canvas");
    cameraCanvasRef.current = canvas;
    const width = 360;
    const aspectRatio = video.videoHeight && video.videoWidth
      ? video.videoHeight / video.videoWidth
      : 4 / 3;

    canvas.width = width;
    canvas.height = Math.max(240, Math.round(width * aspectRatio));
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.64);
    });

    if (!blob || stateRef.current !== "connected") {
      return;
    }

    const buffer = await blob.arrayBuffer();
    session.sendRealtimeInput({
      video: {
        data: arrayBufferToBase64(buffer),
        mimeType: "image/jpeg",
      },
    });
  }, [isCameraOn]);

  const stopVideoFrames = useCallback(() => {
    if (frameTimerRef.current != null) {
      window.clearTimeout(frameTimerRef.current);
      frameTimerRef.current = null;
    }
  }, []);

  const startVideoFrames = useCallback(() => {
    stopVideoFrames();

    const tick = () => {
      if (stateRef.current !== "connected") {
        return;
      }

      void sendVideoFrame();
      frameTimerRef.current = window.setTimeout(tick, 1200);
    };

    tick();
  }, [sendVideoFrame, stopVideoFrames]);

  const stopMediaSenders = useCallback(
    (sendAudioEnd = false) => {
      stopAudioCapture(sendAudioEnd);
      stopVideoFrames();
    },
    [stopAudioCapture, stopVideoFrames]
  );

  const disconnect = useCallback(
    (silent = false) => {
      stopMediaSenders(true);
      stopAudioOutput();
      sessionRef.current?.close();
      sessionRef.current = null;
      setConnectionState("idle");
      setStatusText(liveReady ? "Ready" : "Preview");

      if (!silent) {
        appendTranscript("system", "Session ended.");
      }
    },
    [appendTranscript, liveReady, stopAudioOutput, stopMediaSenders]
  );

  const connect = useCallback(async () => {
    if (!liveReady) {
      setConnectionState("preview");
      setStatusText("Preview");
      appendTranscript("system", "Preview session started.");
      return;
    }

    try {
      setConnectionState("connecting");
      setStatusText("Starting audio");
      await primeAudioOutput();
      setStatusText("Connecting");
      await startLocalMedia();

      const response = await fetch("/api/live-coach/token", {
        method: "POST",
      });
      const data = await readLiveTokenResponse(response);

      if (!response.ok || !data.token) {
        throw new Error(data.error ?? "Could not start Gemini Live.");
      }

      const ai = new GoogleGenAI({
        apiKey: data.token,
        httpOptions: { apiVersion: "v1alpha" },
      });
      const session = await ai.live.connect({
        model: data.model ?? LIVE_COACH_MODEL,
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
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          realtimeInputConfig: {
            activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
            turnCoverage: TurnCoverage.TURN_INCLUDES_AUDIO_ACTIVITY_AND_ALL_VIDEO,
          },
        },
        callbacks: {
          onopen: () => {
            setConnectionState("connected");
            setStatusText(isMicOn ? "Listening" : "Mic muted");
            appendTranscript("system", "Coach connected.");
          },
          onmessage: handleLiveMessage,
          onerror: (error) => {
            Sentry.captureException(error, {
              tags: {
                feature: "live-coach-session",
              },
            });
            setConnectionState("error");
            setStatusText("Connection error");
          },
          onclose: () => {
            if (stateRef.current === "connected") {
              setConnectionState("idle");
              setStatusText("Ready");
            }
          },
        },
      });

      sessionRef.current = session;
      setConnectionState("connected");
      setStatusText(isMicOn ? "Listening" : "Mic muted");
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          feature: "live-coach-connect",
        },
      });
      setConnectionState("error");
      setStatusText("Could not connect");
      appendTranscript(
        "system",
        error instanceof Error ? error.message : "Could not start the coach."
      );
    }
  }, [
    appendTranscript,
    handleLiveMessage,
    isMicOn,
    liveReady,
    primeAudioOutput,
    startLocalMedia,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void startLocalMedia();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      stopLocalMedia();
    };
  }, [startLocalMedia, stopLocalMedia]);

  useEffect(() => {
    return () => {
      clearSpeakingTimer();
      stopMediaSenders(true);
      stopAudioOutput();
      sessionRef.current?.close();
      sessionRef.current = null;
      stopLocalMedia();
      audioContextRef.current?.close().catch(() => undefined);
    };
  }, [clearSpeakingTimer, stopAudioOutput, stopLocalMedia, stopMediaSenders]);

  useEffect(() => {
    if (connectionState !== "connected") {
      stopMediaSenders();
      return;
    }

    void startAudioCapture();
    startVideoFrames();

    return () => {
      stopMediaSenders();
    };
  }, [
    connectionState,
    isCameraOn,
    isMicOn,
    startAudioCapture,
    startVideoFrames,
    stopMediaSenders,
    streamVersion,
  ]);

  function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = messageText.trim();

    if (!text) {
      return;
    }

    if (liveReady && connectionState !== "connected") {
      appendTranscript("system", "Start the live call first.");
      return;
    }

    appendTranscript("user", text);
    setMessageText("");

    if (connectionState === "preview" || !liveReady) {
      const response = previewResponses[lineIdRef.current % previewResponses.length];
      window.setTimeout(() => appendTranscript("coach", response), 250);
      return;
    }

    if (sessionRef.current && connectionState === "connected") {
      sessionRef.current.sendClientContent({
        turns: text,
        turnComplete: true,
      });
      return;
    }

    appendTranscript("system", "Start the live session before sending.");
  }

  const isBusy = connectionState === "connecting";
  const isSessionActive =
    connectionState === "connected" || connectionState === "preview";
  const canSendText =
    messageText.trim().length > 0 &&
    (connectionState === "preview" ||
      connectionState === "connected" ||
      !liveReady);
  const latestSystemText = [...transcript]
    .reverse()
    .find((line) => line.role === "system")?.text;
  const switchCameraLabel =
    activeCameraLabel || (facingMode === "environment" ? "Rear" : "Front");
  const switchCameraAriaLabel =
    facingMode === "environment"
      ? "Switch to front camera"
      : "Switch to rear camera";
  const showCameraTuning = isCameraOn && (zoomRange || availableCameras.length > 0);
  const controlButtonClass =
    "size-12 rounded-full border-white/15 bg-black/45 text-white shadow-lg backdrop-blur-md hover:bg-white/15";
  const controlButtonStyle = {
    flex: "0 0 3.25rem",
    height: "3.25rem",
    width: "3.25rem",
  };
  const voicePrompt = getVoicePrompt({
    cameraError,
    connectionState,
    isMicOn,
    latestSystemText,
    liveReady,
    statusText,
  });

  return (
    <main className="fixed inset-0 z-[60] flex min-h-svh flex-col overflow-hidden bg-black text-white">
      <video
        ref={videoRef}
        autoPlay
        className={cn(
          "absolute inset-0 size-full bg-black object-cover object-center transition-opacity duration-300",
          facingMode === "user" && "-scale-x-100",
          (!isCameraOn || cameraError) && "opacity-0"
        )}
        muted
        playsInline
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.72),transparent_28%,transparent_52%,rgb(0_0_0/0.82))]" />

      {cameraError || !isCameraOn ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-white/70">
          <div className="flex size-16 items-center justify-center rounded-full bg-white/10">
            <Video className="size-8" />
          </div>
          <p className="max-w-xs text-sm">{cameraError || "Camera paused"}</p>
        </div>
      ) : null}

      <header className="relative z-10 flex items-center justify-between gap-3 px-4 pb-3 pt-[calc(0.85rem+env(safe-area-inset-top))]">
        <Button
          asChild
          className="size-11 rounded-full border-white/15 bg-black/45 text-white shadow-lg backdrop-blur-md hover:bg-white/15"
          size="icon"
          variant="outline"
        >
          <Link aria-label="Back to dashboard" href="/dashboard">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 rounded-full border border-white/12 bg-black/42 px-4 py-2 text-center shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold">
            <Bot className="size-4" />
            AI Coach
          </div>
          <div className="mt-0.5 truncate text-[11px] text-white/65">
            {statusText}
          </div>
        </div>
        <StatusDot state={connectionState} />
      </header>

      <section className="relative z-10 mt-auto flex w-full min-w-0 flex-col gap-3 px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))]">
        {showCameraTuning ? (
          <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-full border border-white/12 bg-black/48 px-3 py-2 shadow-xl backdrop-blur-md">
            <button
              aria-label={switchCameraAriaLabel}
              className="flex min-w-0 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[11px] font-medium text-white hover:bg-white/15 disabled:opacity-50"
              disabled={!isCameraOn}
              type="button"
              onClick={switchCameraFacing}
            >
              <FlipHorizontal2 className="size-3.5" />
              <span className="max-w-24 truncate">{switchCameraLabel}</span>
            </button>
            {zoomRange ? (
              <label className="flex min-w-0 flex-1 items-center gap-2 text-[11px] text-white/75">
                <ZoomIn className="size-4 shrink-0" />
                <input
                  aria-label="Camera zoom"
                  className="h-7 min-w-0 flex-1 accent-white"
                  max={zoomRange.max}
                  min={zoomRange.min}
                  step={zoomRange.step}
                  type="range"
                  value={zoomValue}
                  onChange={(event) => {
                    void applyCameraZoom(Number(event.target.value));
                  }}
                />
                <span className="w-9 shrink-0 text-right font-medium text-white">
                  {zoomValue.toFixed(zoomValue < 10 ? 1 : 0)}x
                </span>
              </label>
            ) : null}
          </div>
        ) : null}
        {isTextPanelOpen ? (
          <div className="max-h-[28svh] w-full min-w-0 overflow-y-auto rounded-lg border border-white/10 bg-black/45 p-2.5 backdrop-blur-md">
            <div className="flex flex-col gap-2">
              {transcript.map((line) => (
                <div
                  key={line.id}
                  className={cn(
                    "w-fit max-w-[88%] rounded-lg px-3 py-2 text-xs leading-relaxed",
                    line.role === "user" && "ml-auto bg-white text-black",
                    line.role === "coach" &&
                      "bg-primary text-primary-foreground",
                    line.role === "system" && "mx-auto bg-white/10 text-white/72"
                  )}
                >
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        ) : voicePrompt ? (
          <div className="mx-auto max-w-[92%] rounded-full bg-black/45 px-4 py-2 text-center text-xs leading-relaxed text-white/78 shadow-lg backdrop-blur-md">
            {voicePrompt}
          </div>
        ) : null}

        <div className="mx-auto flex w-full max-w-md min-w-0 items-center gap-2 rounded-full border border-white/12 bg-black/55 p-2 shadow-2xl backdrop-blur-xl">
            <Button
              aria-label={isMicOn ? "Mute microphone" : "Unmute microphone"}
              className={controlButtonClass}
              size="icon"
              style={controlButtonStyle}
              type="button"
              variant="outline"
              onClick={() => {
                const nextIsMicOn = !isMicOn;
                setIsMicOn(nextIsMicOn);

                if (connectionState === "connected" && statusText !== "Speaking") {
                  setStatusText(nextIsMicOn ? "Listening" : "Mic muted");
                }
              }}
            >
              {isMicOn ? <Mic /> : <MicOff />}
            </Button>
            <Button
              aria-label={isCameraOn ? "Turn camera off" : "Turn camera on"}
              className={controlButtonClass}
              size="icon"
              style={controlButtonStyle}
              type="button"
              variant="outline"
              onClick={() => setIsCameraOn((value) => !value)}
            >
              {isCameraOn ? <Camera /> : <CameraOff />}
            </Button>
            <Button
              aria-label={switchCameraAriaLabel}
              className={controlButtonClass}
              disabled={!isCameraOn}
              size="icon"
              style={controlButtonStyle}
              type="button"
              variant="outline"
              onClick={switchCameraFacing}
            >
              <FlipHorizontal2 />
            </Button>
            <Button
              aria-label={isTextPanelOpen ? "Hide text panel" : "Show text panel"}
              className={cn(
                controlButtonClass,
                isTextPanelOpen && "bg-white text-black hover:bg-white/90"
              )}
              size="icon"
              style={controlButtonStyle}
              type="button"
              variant="outline"
              onClick={() => setIsTextPanelOpen((value) => !value)}
            >
              <MessageCircle />
            </Button>
            <Button
              className={cn(
                "h-12 min-w-0 flex-1 overflow-hidden rounded-full px-4 text-sm font-semibold shadow-lg",
                isSessionActive
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              disabled={isBusy}
              style={{
                flex: "1 1 0",
                height: "3.25rem",
                minWidth: "7.5rem",
              }}
              type="button"
              onClick={() => {
                if (isSessionActive) {
                  disconnect();
                  return;
                }

                void connect();
              }}
            >
              {isBusy ? (
                <Loader2 className="animate-spin" />
              ) : isSessionActive ? (
                <PhoneOff data-icon="inline-start" />
              ) : (
                <Sparkles data-icon="inline-start" />
              )}
              <span className="truncate">
                {isBusy ? "Starting" : isSessionActive ? "End" : "Start"}
              </span>
            </Button>

          {isTextPanelOpen ? (
            <form
              className="absolute inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] flex gap-2 rounded-full border border-white/12 bg-black/65 p-2 shadow-2xl backdrop-blur-xl"
              onSubmit={handleSendMessage}
            >
              <Input
                aria-label="Message AI coach"
                className="h-11 w-0 min-w-0 flex-1 rounded-full border-white/15 bg-white/10 px-4 text-white placeholder:text-white/45 disabled:opacity-60"
                disabled={isBusy || (liveReady && connectionState !== "connected")}
                placeholder={
                  liveReady && connectionState !== "connected"
                    ? "Start first..."
                    : "Type a backup note..."
                }
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
              />
              <Button
                aria-label="Send message"
                className="size-11 shrink-0 rounded-full"
                disabled={!canSendText}
                size="icon"
                type="submit"
              >
                <Send />
              </Button>
            </form>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function StatusDot({ state }: { state: ConnectionState }) {
  const isLive = state === "connected";
  const isPreview = state === "preview";
  const isBusy = state === "connecting";

  return (
    <div
      className={cn(
        "flex h-10 w-[3.25rem] items-center justify-center rounded-full border border-white/15 bg-black/35 text-[11px] font-semibold text-white backdrop-blur",
        isLive && "border-primary/50 text-primary",
        isPreview && "text-chart-3",
        state === "error" && "text-destructive"
      )}
    >
      {isBusy ? <Loader2 className="size-4 animate-spin" /> : isLive ? "LIVE" : isPreview ? "DEMO" : "OFF"}
    </div>
  );
}

function getPreviewReason(missingItems: string[]) {
  if (missingItems.includes("GOOGLE_GENERATIVE_AI_API_KEY")) {
    return "Gemini Live needs the Google API key.";
  }

  if (missingItems.length > 0) {
    return "Preview mode is active.";
  }

  return "Live services are not enabled.";
}

function getVideoConstraints(
  facingMode: FacingMode,
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

function inferCameraFacing(label: string): CameraDeviceOption["facing"] {
  const normalized = label.toLowerCase();

  if (/(front|user|selfie)/.test(normalized)) {
    return "user";
  }

  if (/(back|rear|environment|world|wide|tele|macro)/.test(normalized)) {
    return "environment";
  }

  return "unknown";
}

function getCameraCandidates(
  cameras: CameraDeviceOption[],
  facingMode: FacingMode,
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

function getPreferredCamera(
  cameras: CameraDeviceOption[],
  facingMode: FacingMode,
  options?: { includeUnknownFallback?: boolean }
) {
  return getCameraCandidates(cameras, facingMode, options)[0] ?? null;
}

function getCameraScore(camera: CameraDeviceOption, facingMode: FacingMode) {
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

function getAndroidCameraIndex(label: string) {
  const match = label.match(/\bcamera(?:2)?\s*(\d+)\b/);

  if (!match) {
    return null;
  }

  return Number(match[1]);
}

function getReadableCameraLabel(label: string | undefined, facingMode: FacingMode) {
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

function getZoomRange(track: MediaStreamTrack): ZoomRange | null {
  if (!("getCapabilities" in track)) {
    return null;
  }

  const capabilities = track.getCapabilities() as ZoomMediaTrackCapabilities;
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

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getVoicePrompt({
  cameraError,
  connectionState,
  isMicOn,
  latestSystemText,
  liveReady,
  statusText,
}: VoicePromptInput) {
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

async function readLiveTokenResponse(response: Response): Promise<LiveTokenResponse> {
  const text = await response.text();

  if (!text) {
    return response.ok
      ? {}
      : { error: `Could not start Gemini Live (${response.status}).` };
  }

  try {
    return JSON.parse(text) as LiveTokenResponse;
  } catch {
    return {
      error:
        text.replace(/\s+/g, " ").slice(0, 180) ||
        `Could not start Gemini Live (${response.status}).`,
    };
  }
}

function getPcmSampleRate(mimeType?: string) {
  const match = mimeType?.match(/rate=(\d+)/);
  return match ? Number(match[1]) : null;
}

function base64ToUint8Array(base64: string) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBufferLike) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return window.btoa(binary);
}

function downsampleToPcm16(
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

function floatToPcm16(input: Float32Array) {
  const output = new Int16Array(input.length);

  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index] ?? 0));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return output;
}
