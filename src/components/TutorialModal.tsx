import React from 'react';
import { Lock, ShieldCheck, Sparkles, X } from 'lucide-react';
import { GesturePrintCard } from './GestureArtwork';

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
  onStartPlaying: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
  open,
  onClose,
  onStartPlaying,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#252820]/70 p-4"
    >
      <div className="tactile-card w-full max-w-2xl rounded-2xl bg-[#F2EBDD] p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-[#252820]/15 pb-3">
          <div>
            <div className="text-xs font-semibold text-[#55594D]">First-Time Arcade Guide</div>
            <h2 id="tutorial-title" className="font-display text-2xl font-extrabold text-[#252820]">
              How to Play Tactile Oracle
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tutorial"
            className="rounded-lg border border-[#252820]/25 p-1.5 text-[#252820] hover:bg-[#EAE1CE] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 justify-items-center py-1">
          <GesturePrintCard gesture="rock" size="sm" label="Rock (Closed Fist)" />
          <GesturePrintCard gesture="paper" size="sm" label="Paper (Open Palm)" />
          <GesturePrintCard gesture="scissors" size="sm" label="Scissors (2 Fingers)" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-[#252820]/20 bg-[#F8F3E8] p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[#252820]">
              <Lock className="w-4 h-4 text-[#D65D43]" />
              1. Honest AI Lock
            </div>
            <p className="text-[#55594D] leading-relaxed">
              Before the 3-2-1 countdown starts, the AI analyzes your past throws and seals its
              counter-move. It never peeks at your live camera frame to cheat.
            </p>
          </div>

          <div className="rounded-xl border border-[#252820]/20 bg-[#F8F3E8] p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[#252820]">
              <Sparkles className="w-4 h-4 text-[#D6AA57]" />
              2. Adaptive Strategy
            </div>
            <p className="text-[#55594D] leading-relaxed">
              The machine combines Frequency, Markov transitions, N-gram sequences, and recent
              shifts. Mix up your rhythm to outsmart it!
            </p>
          </div>

          <div className="rounded-xl border border-[#252820]/20 bg-[#F8F3E8] p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[#252820]">
              <ShieldCheck className="w-4 h-4 text-[#87977A]" />
              3. Local Only
            </div>
            <p className="text-[#55594D] leading-relaxed">
              Your webcam stays on your device. No video is saved or uploaded. Keyboard shortcuts:
              Spacebar starts/pauses rounds; R / P / S work in No Camera Mode.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#252820]/30 px-4 py-2.5 text-xs font-semibold text-[#252820] cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartPlaying();
            }}
            className="tactile-btn rounded-xl border-2 border-[#252820] bg-[#D65D43] px-5 py-2.5 text-xs font-bold text-[#F2EBDD] cursor-pointer"
          >
            Enter the Arena
          </button>
        </div>
      </div>
    </div>
  );
};
