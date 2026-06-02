"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";

import {
  getVideoConstraints,
  getPreferredCamera,
  getReadableCameraLabel,
  getZoomRange,
  clampNumber,
  inferCameraFacing,
} from "@/lib/audio-media-utils";

type FacingMode = "environment" | "user";

type CameraDeviceOption = {
  deviceId: string;
  facing: FacingMode | "unknown";
  label: string;
};

type ZoomRange = {
  max: number;
  min: number;
  step: number;
};

type ZoomMediaTrackSettings = MediaTrackSettings & {
  zoom?: number;
};

type ZoomMediaTrackConstraintSet = MediaTrackConstraintSet & {
  zoom?: number;
};

export function useCameraStream({
  isMicOn,
  sessionActive,
  onVideoFrame,
}: {
  isMicOn: boolean;
  sessionActive: boolean;
  onVideoFrame: (base64Frame: string) => void;
}) {
  const [activeCameraLabel, setActiveCameraLabel] = useState("");
  const [availableCameras, setAvailableCameras] = useState<CameraDeviceOption[]>([]);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [zoomRange, setZoomRange] = useState<ZoomRange | null>(null);
  const [zoomValue, setZoomValue] = useState(1);
  const [streamVersion, setStreamVersion] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameTimerRef = useRef<number | null>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

  const sendVideoFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !isCameraOn || video.readyState < 2) {
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

    if (!blob) {
      return;
    }

    const buffer = await blob.arrayBuffer();
    
    // Convert arrayBuffer to Base64 in JavaScript
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = "";
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    const base64Frame = window.btoa(binary);
    onVideoFrame(base64Frame);
  }, [isCameraOn, onVideoFrame]);

  const stopVideoFrames = useCallback(() => {
    if (frameTimerRef.current != null) {
      window.clearTimeout(frameTimerRef.current);
      frameTimerRef.current = null;
    }
  }, []);

  const startVideoFrames = useCallback(() => {
    stopVideoFrames();

    const tick = () => {
      if (!sessionActive) {
        return;
      }
      void sendVideoFrame();
      frameTimerRef.current = window.setTimeout(tick, 1200);
    };

    tick();
  }, [sendVideoFrame, stopVideoFrames, sessionActive]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void startLocalMedia();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      stopLocalMedia();
    };
  }, [startLocalMedia, stopLocalMedia]);

  return {
    activeCameraLabel,
    availableCameras,
    cameraError,
    facingMode,
    isCameraOn,
    setIsCameraOn,
    selectedCameraId,
    zoomRange,
    zoomValue,
    streamVersion,
    streamRef,
    videoRef,
    stopLocalMedia,
    startLocalMedia,
    applyCameraZoom,
    switchCameraFacing,
    startVideoFrames,
    stopVideoFrames,
  };
}
