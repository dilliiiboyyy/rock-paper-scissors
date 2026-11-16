import React from 'react';
import { Camera, CheckCircle2, X } from 'lucide-react';
import { CalibrationStatus, DetectedGesture } from '../types/game';
import { GesturePrintCard } from './GestureArtwork';

interface CalibrationModalProps {
  open: boolean;
  cameraActive: boolean;
  stableGesture: DetectedGesture;
  calibration: CalibrationStatus;
  onEnableCamera: () => void;
  onResetCalibration: () => void;
  onClose: () => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  open,
  cameraActive,
  stableGesture,
  calibration,
  onEnableCamera,
  onResetCalibration,
  onClose,
}) => {
  if (!open) return null;

  const allDone =
    calibration.rockVerified && calibration.paperVerified && calibration.scissorsVerified;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="calibration-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#252820]/70 p-4"
    >
      <div className="tactile-card w-full max-w-lg rounded-2xl bg-[#F2EBDD] p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-[#252820]/15 pb-3">
          <div>
            <div className="text-xs font-semibold text-[#55594D]">Optional Setup Check</div>
            <h2 id="calibration-title" className="font-display text-2xl font-extrabold text-[#252820]">
              Hand Recognition Calibration
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calibration modal"
            className="rounded-lg border border-[#252820]/25 p-1.5 text-[#252820] hover:bg-[#EAE1CE] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#55594D] leading-relaxed">
          Hold one hand roughly 40–70 cm from the lens under even lighting. Show Rock, Paper, and
          Scissors in sequence until all three indicators verify.
        </p>

        {!cameraActive ? (
          <div className="rounded-xl border border-[#252820]/25 bg-[#EAE1CE] p-5 text-center space-y-3">
            <p className="text-xs font-semibold text-[#252820]">
              Enable your camera to test all three hand gestures live.
            </p>
            <button
              type="button"
              onClick={onEnableCamera}
              className="tactile-btn inline-flex items-center gap-2 rounded-xl border-2 border-[#252820] bg-[#D65D43] px-5 py-2.5 text-xs font-bold text-[#F2EBDD] cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Enable Camera Now
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-[#252820]/25 bg-[#F8F3E8] px-4 py-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-[#55594D]">Live Stable Reading:</span>
            <span className="font-display text-base font-extrabold capitalize text-[#252820]">
              {stableGesture === 'none' ? 'Waiting for hand...' : stableGesture}
            </span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 justify-items-center">
          {(
            [
              { key: 'rock', verified: calibration.rockVerified },
              { key: 'paper', verified: calibration.paperVerified },
              { key: 'scissors', verified: calibration.scissorsVerified },
            ] as const
          ).map((item) => (
            <div
              key={item.key}
              className={`w-full rounded-xl border-2 p-3 flex flex-col items-center gap-2 ${
                item.verified
                  ? 'border-[#87977A] bg-[#87977A]/20'
                  : 'border-[#252820]/20 bg-[#F8F3E8]'
              }`}
            >
              <GesturePrintCard gesture={item.key} size="sm" />
              <div className="flex items-center gap-1 text-xs font-bold capitalize text-[#252820]">
                {item.verified && <CheckCircle2 className="w-3.5 h-3.5 text-[#87977A]" />}
                {item.key}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onResetCalibration}
            className="text-xs font-semibold text-[#55594D] hover:text-[#252820] cursor-pointer"
          >
            Reset Checks
          </button>
          <button
            type="button"
            onClick={onClose}
            className="tactile-btn rounded-xl border-2 border-[#252820] bg-[#D6AA57] px-5 py-2.5 text-xs font-bold text-[#252820] cursor-pointer"
          >
            {allDone ? 'Calibration Complete' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
