import React, { useState } from 'react';
import { Gesture } from '../types/game';

export const ASSET_PATHS = {
  machine: '/src/assets/images/machine_opponent_portrait_1794860631967.jpg',
  rock: '/src/assets/images/gesture_rock_print_1794860631100.jpg',
  paper: '/src/assets/images/gesture_paper_print_1794860631974.jpg',
  scissors: '/src/assets/images/gesture_scissors_print_1794860630701.jpg',
} as const;

export const GestureIconSVG: React.FC<{ gesture: Gesture; className?: string }> = ({
  gesture,
  className = 'w-8 h-8',
}) => {
  if (gesture === 'rock') {
    return (
      <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <rect x="14" y="20" width="36" height="28" rx="10" fill="#D65D43" stroke="#252820" strokeWidth="3.5" />
        <path d="M22 20v-4a4 4 0 0 1 8 0v4m0-4a4 4 0 0 1 8 0v4m0-3a4 4 0 0 1 8 0v7" stroke="#252820" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M14 31h14" stroke="#252820" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (gesture === 'paper') {
    return (
      <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <path
          d="M18 34V16a3.5 3.5 0 0 1 7 0v14m0-17a3.5 3.5 0 0 1 7 0v17m0-15a3.5 3.5 0 0 1 7 0v15m0-10a3.5 3.5 0 0 1 7 0v19c0 10-7 16-16 16s-16-6-16-15v-8a3.5 3.5 0 0 1 7 0"
          fill="#87977A"
          stroke="#252820"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <path
        d="M22 36L16 14a3.5 3.5 0 0 1 6.8-1.6L29 33m2-1l6.2-20.4a3.5 3.5 0 0 1 6.7 1.8L38 35"
        stroke="#252820"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <rect x="19" y="31" width="24" height="22" rx="9" fill="#D6AA57" stroke="#252820" strokeWidth="3.5" />
    </svg>
  );
};

export const GesturePrintCard: React.FC<{
  gesture: Gesture;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}> = ({ gesture, size = 'md', label }) => {
  const [imgFailed, setImgFailed] = useState(false);

  const dims =
    size === 'sm' ? 'w-20 h-20' : size === 'lg' ? 'w-40 h-40' : 'w-28 h-28';

  const bgAccent =
    gesture === 'rock'
      ? 'bg-[#D65D43]/15'
      : gesture === 'paper'
      ? 'bg-[#87977A]/15'
      : 'bg-[#D6AA57]/20';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`${dims} ${bgAccent} overflow-hidden rounded-xl border-2 border-[#252820] flex items-center justify-center`}
      >
        {!imgFailed ? (
          <img
            src={ASSET_PATHS[gesture]}
            alt={`${gesture} hand gesture print illustration`}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-3">
            <GestureIconSVG gesture={gesture} className="w-12 h-12" />
          </div>
        )}
      </div>
      {label && (
        <span className="text-xs font-semibold tracking-wide text-[#252820] capitalize">
          {label}
        </span>
      )}
    </div>
  );
};

export const MachinePortrait: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return (
      <div
        className={`${className} flex flex-col items-center justify-center bg-[#EAE1CE] border-2 border-[#252820] rounded-xl p-6 text-center`}
      >
        <svg viewBox="0 0 120 120" className="w-24 h-24 mb-2" fill="none" aria-hidden="true">
          <rect x="18" y="18" width="84" height="84" rx="14" fill="#252820" />
          <circle cx="60" cy="52" r="22" fill="#D6AA57" stroke="#F2EBDD" strokeWidth="4" />
          <circle cx="60" cy="52" r="8" fill="#252820" />
          <rect x="34" y="82" width="52" height="10" rx="3" fill="#D65D43" />
        </svg>
        <span className="font-display font-bold text-sm text-[#252820]">
          Adaptive Counter Automaton
        </span>
      </div>
    );
  }

  return (
    <img
      src={ASSET_PATHS.machine}
      alt="Retro-modern mechanical arcade intelligence machine illustration"
      referrerPolicy="no-referrer"
      onError={() => setImgFailed(true)}
      className={`${className} object-cover`}
    />
  );
};
