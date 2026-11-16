import React, { useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  Keyboard,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import {
  CVFrameResult,
  CameraQuality,
  DetectedGesture,
  FrameQualityIssue,
  Gesture,
  HandLandmark,
} from '../types/game';
import { CameraDeviceInfo } from '../vision/cameraManager';

interface WebcamStageProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraActive: boolean;
  cameraError: string | null;
  cameraInitializing: boolean;
  modelLoadingStage: string | null;
  devices: CameraDeviceInfo[];
  selectedCameraId: string;
  cameraQuality: CameraQuality;
  frameResult: CVFrameResult | null;
  stableGesture: DetectedGesture;
  stabilityProgress: number;
  inputMode: 'webcam' | 'manual_fallback';
  onRequestEnableCamera: () => void;
  onStopCamera: () => void;
  onSwitchCamera: (deviceId: string) => void;
  onChangeQuality: (quality: CameraQuality) => void;
  onOpenCalibration: () => void;
  onToggleInputMode: (mode: 'webcam' | 'manual_fallback') => void;
  onManualGestureSelect?: (gesture: Gesture) => void;
  canManualSelectNow?: boolean;
}

const HAND_CONNECTIONS: ReadonlyArray<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

function drawHandOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  landmarks: HandLandmark[] | null
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.clearRect(0, 0, w, h);
  if (!landmarks || landmarks.length < 21) return;

  ctx.save();
  // Mirror horizontally to match mirrored video preview
  ctx.translate(w, 0);
  ctx.scale(-1, 1);

  ctx.strokeStyle = '#D6AA57';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const [a, b] of HAND_CONNECTIONS) {
    const p1 = landmarks[a];
    const p2 = landmarks[b];
    ctx.beginPath();
    ctx.moveTo(p1.x * w, p1.y * h);
    ctx.lineTo(p2.x * w, p2.y * h);
    ctx.stroke();
  }

  for (let i = 0; i < landmarks.length; i++) {
    const pt = landmarks[i];
    const isTip = i === 4 || i === 8 || i === 12 || i === 16 || i === 20;
    ctx.beginPath();
    ctx.arc(pt.x * w, pt.y * h, isTip ? 5.5 : 3.8, 0, Math.PI * 2);
    ctx.fillStyle = isTip ? '#D65D43' : '#F2EBDD';
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#252820';
    ctx.stroke();
  }
  ctx.restore();
}

function describeIssue(issue: FrameQualityIssue): string | null {
  switch (issue) {
    case 'multiple_hands':
      return 'Multiple hands detected — show only one hand';
    case 'low_light':
      return 'Low lighting — move toward brighter light';
    case 'too_close':
      return 'Hand too close — step back slightly';
    case 'too_far':
      return 'Hand too far — move closer to the lens';
    case 'edge_clipped':
      return 'Keep your entire hand inside the frame';
    case 'motion_blur':
      return 'Hold your hand steady for crisp tracking';
    default:
      return null;
  }
}

export const WebcamStage: React.FC<WebcamStageProps> = ({
  videoRef,
  cameraActive,
  cameraError,
  cameraInitializing,
  modelLoadingStage,
  devices,
  selectedCameraId,
  cameraQuality,
  frameResult,
  stableGesture,
  stabilityProgress,
  inputMode,
  onRequestEnableCamera,
  onStopCamera,
  onSwitchCamera,
  onChangeQuality,
  onOpenCalibration,
  onToggleInputMode,
  onManualGestureSelect,
  canManualSelectNow = false,
}) => {
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !cameraActive) return;
    drawHandOverlay(canvas, video, frameResult?.landmarks ?? null);
  }, [frameResult, cameraActive, videoRef]);

  const warningMessages = (frameResult?.qualityIssues ?? [])
    .map(describeIssue)
    .filter((m): m is string => Boolean(m));

  return (
    <div className="tactile-card rounded-2xl p-4 sm:p-5 flex flex-col gap-4 h-full">
      {/* Stage Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold text-[#252820]">Your Hand Feed</h2>
          <div className="flex items-center gap-2 text-xs text-[#55594D] font-mono-tabular">
            {inputMode === 'manual_fallback' ? (
              <span>Manual Keyboard Fallback</span>
            ) : cameraActive ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-[#D65D43]" aria-hidden="true" />
                <span>Camera Active · Local Only</span>
                {frameResult && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{frameResult.fps} fps</span>
                    <span aria-hidden="true">·</span>
                    <span>{frameResult.inferenceLatencyMs} ms</span>
                    <span aria-hidden="true">·</span>
                    <span className="uppercase">{frameResult.backend}</span>
                  </>
                )}
              </>
            ) : (
              <span>Camera Inactive · Consent Required</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onToggleInputMode(inputMode === 'webcam' ? 'manual_fallback' : 'webcam')
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#252820]/30 bg-[#F2EBDD] px-2.5 py-1.5 text-xs font-semibold text-[#252820] hover:border-[#252820] cursor-pointer whitespace-nowrap shrink-0"
            title="Switch between Webcam CV and Keyboard fallback if no camera is attached"
          >
            {inputMode === 'webcam' ? (
              <>
                <Keyboard className="w-3.5 h-3.5" />
                No Camera Mode
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                Use Webcam
              </>
            )}
          </button>

          {cameraActive && inputMode === 'webcam' && (
            <button
              type="button"
              onClick={onOpenCalibration}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#252820]/30 bg-[#F2EBDD] px-2.5 py-1.5 text-xs font-semibold text-[#252820] hover:border-[#252820] cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sliders className="w-3.5 h-3.5" />
              Calibrate
            </button>
          )}
        </div>
      </div>

      {/* Viewport */}
      {inputMode === 'manual_fallback' ? (
        <div className="flex-1 rounded-xl border-2 border-[#252820] bg-[#EAE1CE] p-6 flex flex-col items-center justify-center text-center gap-4 min-h-[290px]">
          <Keyboard className="w-10 h-10 text-[#252820]" />
          <div className="space-y-1 max-w-sm">
            <h3 className="font-display text-base font-bold text-[#252820]">
              Keyboard Fallback Input
            </h3>
            <p className="text-xs text-[#55594D]">
              Use this mode only when a webcam is unavailable. When the countdown hits SHOOT!,
              choose Rock (R / 1), Paper (P / 2), or Scissors (S / 3).
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 w-full max-w-sm pt-2">
            {(['rock', 'paper', 'scissors'] as const).map((g, idx) => (
              <button
                key={g}
                type="button"
                disabled={!canManualSelectNow}
                onClick={() => onManualGestureSelect?.(g)}
                className={`tactile-btn rounded-xl border-2 border-[#252820] py-3 px-2 text-xs font-bold capitalize cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                  g === 'rock'
                    ? 'bg-[#D65D43] text-[#F2EBDD]'
                    : g === 'paper'
                    ? 'bg-[#87977A] text-[#F2EBDD]'
                    : 'bg-[#D6AA57] text-[#252820]'
                }`}
              >
                {g} ({idx + 1})
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative flex-1 overflow-hidden rounded-xl border-2 border-[#252820] bg-[#252820] aspect-[4/3] min-h-[270px] flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover -scale-x-100 ${
              cameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          />
          <canvas
            ref={overlayCanvasRef}
            className="pointer-events-none absolute inset-0 w-full h-full object-cover"
          />

          {/* Pre-permission / Inactive / Loading Overlay */}
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#EAE1CE] p-6 text-center">
              {cameraError ? (
                <>
                  <CameraOff className="w-10 h-10 text-[#D65D43]" />
                  <div className="space-y-1 max-w-sm">
                    <h3 className="font-display font-bold text-base text-[#252820]">
                      Camera Unavailable
                    </h3>
                    <p className="text-xs text-[#55594D] leading-relaxed">{cameraError}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={onRequestEnableCamera}
                      className="tactile-btn inline-flex items-center gap-2 rounded-lg border-2 border-[#252820] bg-[#D65D43] px-4 py-2 text-xs font-bold text-[#F2EBDD] cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleInputMode('manual_fallback')}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#252820] bg-[#F8F3E8] px-4 py-2 text-xs font-semibold text-[#252820] cursor-pointer"
                    >
                      <Keyboard className="w-3.5 h-3.5" />
                      Use Keyboard Fallback
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Camera className="w-10 h-10 text-[#252820]" />
                  <div className="space-y-1 max-w-sm">
                    <h3 className="font-display font-bold text-base text-[#252820]">
                      Enable Webcam Hand Recognition
                    </h3>
                    <p className="text-xs text-[#55594D] leading-relaxed">
                      Your camera activates only after you grant permission. All 21-landmark
                      processing stays 100% on your device.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={cameraInitializing}
                    onClick={onRequestEnableCamera}
                    className="tactile-btn inline-flex items-center gap-2 rounded-xl border-2 border-[#252820] bg-[#D65D43] px-5 py-2.5 text-xs font-bold text-[#F2EBDD] cursor-pointer disabled:opacity-60"
                  >
                    <Camera className="w-4 h-4" />
                    {cameraInitializing ? 'Starting Camera...' : 'Enable Camera'}
                  </button>
                  {modelLoadingStage && (
                    <p className="text-xs font-medium text-[#55594D]">{modelLoadingStage}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Model Loading Banner while video already active */}
          {cameraActive && modelLoadingStage && (
            <div className="absolute inset-x-3 top-3 rounded-lg border border-[#252820] bg-[#F2EBDD]/95 px-3 py-2 text-xs font-semibold text-[#252820]">
              {modelLoadingStage}
            </div>
          )}

          {/* Live Framing/Lighting Warnings */}
          {cameraActive && warningMessages.length > 0 && (
            <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-lg border border-[#252820] bg-[#D6AA57]/95 px-3 py-2 text-xs font-bold text-[#252820]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{warningMessages[0]}</span>
            </div>
          )}
        </div>
      )}

      {/* Live Recognition Readout + Stability Bar */}
      {inputMode === 'webcam' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              {stableGesture === 'rock' ||
              stableGesture === 'paper' ||
              stableGesture === 'scissors' ? (
                <CheckCircle2 className="w-4 h-4 text-[#87977A]" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-[#D6AA57]" aria-hidden="true" />
              )}
              <span className="font-bold text-[#252820] capitalize">
                {stableGesture === 'none'
                  ? 'No hand in frame'
                  : stableGesture === 'uncertain'
                  ? 'Hold Rock, Paper, or Scissors clearly'
                  : `Detected: ${stableGesture}`}
              </span>
              {frameResult && frameResult.handedness !== 'Unknown' && (
                <span className="text-[#55594D]">· {frameResult.handedness} hand</span>
              )}
            </div>
            <span className="font-mono-tabular font-semibold text-[#55594D]">
              Conf {frameResult ? Math.round(frameResult.confidence * 100) : 0}%
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full border border-[#252820]/30 bg-[#EAE1CE]">
            <div
              className="h-full bg-[#87977A] transition-[width] duration-100"
              style={{ width: `${Math.round(stabilityProgress * 100)}%` }}
            />
          </div>

          {/* Camera Switching & Quality Bar */}
          {cameraActive && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex items-center gap-2">
                {devices.length > 1 && (
                  <select
                    aria-label="Select camera"
                    value={selectedCameraId}
                    onChange={(e) => onSwitchCamera(e.target.value)}
                    className="rounded-lg border border-[#252820]/40 bg-[#F2EBDD] px-2.5 py-1 text-xs font-semibold text-[#252820] max-w-[180px] truncate"
                  >
                    {devices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  aria-label="Camera resolution quality"
                  value={cameraQuality}
                  onChange={(e) => onChangeQuality(e.target.value as CameraQuality)}
                  className="rounded-lg border border-[#252820]/40 bg-[#F2EBDD] px-2.5 py-1 text-xs font-semibold text-[#252820]"
                >
                  <option value="low">320p Fast</option>
                  <option value="balanced">480p Balanced</option>
                  <option value="high">720p Sharp</option>
                </select>
              </div>

              <button
                type="button"
                onClick={onStopCamera}
                className="text-xs font-semibold text-[#D65D43] hover:underline cursor-pointer"
              >
                Stop Camera
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
