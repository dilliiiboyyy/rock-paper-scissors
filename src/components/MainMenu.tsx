import React from 'react';
import { BookOpen, Camera, Play, ShieldCheck, Trophy } from 'lucide-react';
import { Difficulty, GameMode, LearningSnapshot } from '../types/game';
import { GesturePrintCard, MachinePortrait } from './GestureArtwork';

interface MainMenuProps {
  selectedMode: GameMode;
  selectedDifficulty: Difficulty;
  onSelectMode: (mode: GameMode) => void;
  onSelectDifficulty: (diff: Difficulty) => void;
  onStartGame: () => void;
  onOpenCalibration: () => void;
  onOpenTutorial: () => void;
  onOpenTournament: () => void;
  learning: LearningSnapshot;
  totalRoundsPlayed: number;
}

const MODE_OPTIONS: Array<{
  id: GameMode;
  title: string;
  summary: string;
}> = [
  { id: 'first_to_five', title: 'First to Five', summary: 'Race to 5 round victories' },
  { id: 'best_of_three', title: 'Best of Three', summary: 'Quick 2-win tactical bout' },
  { id: 'quick_play', title: 'Quick Play', summary: 'Unlimited rounds, running score' },
  { id: 'ai_challenge', title: 'AI Challenge', summary: 'Full adaptive ensemble pressure' },
  { id: 'practice', title: 'Practice Mode', summary: 'Gentle opponent for gesture tuning' },
  { id: 'tournament', title: 'Tournament', summary: '3-stage escalating arcade bracket' },
];

const DIFFICULTY_OPTIONS: Array<{ id: Difficulty; label: string; detail: string }> = [
  { id: 'easy', label: 'Easy', detail: 'Shallow frequency & exploratory throws' },
  { id: 'normal', label: 'Normal', detail: 'Markov transitions & 2-gram sequence reads' },
  { id: 'hard', label: 'Hard', detail: '3-gram sequences, Win/Lose shifts & zero noise' },
];

export const MainMenu: React.FC<MainMenuProps> = ({
  selectedMode,
  selectedDifficulty,
  onSelectMode,
  onSelectDifficulty,
  onStartGame,
  onOpenCalibration,
  onOpenTutorial,
  onOpenTournament,
  learning,
  totalRoundsPlayed,
}) => {
  return (
    <main className="mx-auto max-w-[1380px] px-5 py-8 md:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Hero Column */}
        <section className="lg:col-span-7 flex flex-col justify-between gap-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide text-[#55594D]">
              <span>Local Webcam Computer Vision</span>
              <span aria-hidden="true">·</span>
              <span>Pre-Countdown Sealed AI</span>
              <span aria-hidden="true">·</span>
              <span>Zero Footage Uploaded</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#252820] leading-[1.05] text-balance">
              The Machine That Learns Your Hand
            </h1>

            <p className="max-w-2xl text-base sm:text-lg text-[#252820]/80 leading-relaxed">
              Face a retro-modern arcade opponent powered by real-time 21-landmark hand tracking
              and an adaptive ensemble predictor. Every round, the machine locks its counter-move
              before the countdown starts—then studies your rhythm to catch your next habit.
            </p>
          </div>

          {/* Mode Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#252820]">
                1. Select Game Mode
              </h2>
              <button
                type="button"
                onClick={onOpenTournament}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D65D43] hover:underline cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5" />
                Open Tournament Bracket
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {MODE_OPTIONS.map((m) => {
                const active = selectedMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectMode(m.id)}
                    className={`text-left rounded-xl border-2 p-3.5 transition-all cursor-pointer ${
                      active
                        ? 'border-[#252820] bg-[#D6AA57]/25 shadow-[3px_3px_0_0_#252820]'
                        : 'border-[#252820]/25 bg-[#F8F3E8] hover:border-[#252820]'
                    }`}
                  >
                    <div className="font-display font-bold text-sm text-[#252820]">{m.title}</div>
                    <div className="mt-0.5 text-xs text-[#55594D]">{m.summary}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty Selection */}
          <div className="space-y-3">
            <h2 className="font-display text-base font-bold text-[#252820]">
              2. AI Adaptation Depth
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DIFFICULTY_OPTIONS.map((d) => {
                const active = selectedDifficulty === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onSelectDifficulty(d.id)}
                    className={`text-left rounded-xl border-2 p-3 transition-all cursor-pointer ${
                      active
                        ? 'border-[#252820] bg-[#87977A]/25 shadow-[3px_3px_0_0_#252820]'
                        : 'border-[#252820]/25 bg-[#F8F3E8] hover:border-[#252820]'
                    }`}
                  >
                    <div className="font-display font-bold text-sm text-[#252820]">{d.label}</div>
                    <div className="mt-0.5 text-xs text-[#55594D]">{d.detail}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onStartGame}
              className="tactile-btn inline-flex items-center gap-2.5 rounded-xl border-2 border-[#252820] bg-[#D65D43] px-7 py-3.5 text-sm font-bold text-[#F2EBDD] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              {selectedMode === 'tournament' ? 'Enter Tournament' : 'Start Playing'}
            </button>

            <button
              type="button"
              onClick={onOpenCalibration}
              className="tactile-btn inline-flex items-center gap-2 rounded-xl border-2 border-[#252820] bg-[#F8F3E8] px-5 py-3.5 text-sm font-bold text-[#252820] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Calibrate Hand
            </button>

            <button
              type="button"
              onClick={onOpenTutorial}
              className="inline-flex items-center gap-2 rounded-xl border border-[#252820]/30 bg-transparent px-4 py-3.5 text-sm font-semibold text-[#252820] hover:border-[#252820] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              How It Works
            </button>
          </div>
        </section>

        {/* Right Artwork & Memory Showcase Column */}
        <aside className="lg:col-span-5 flex flex-col justify-between gap-6">
          <div className="tactile-card rounded-2xl p-5 flex flex-col gap-5 h-full justify-between">
            <div className="relative overflow-hidden rounded-xl border-2 border-[#252820] bg-[#F2EBDD] aspect-[4/3]">
              <MachinePortrait className="w-full h-full" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#252820]/90 via-[#252820]/45 to-transparent p-4 text-[#F2EBDD]">
                <div className="text-xs font-medium text-[#D6AA57]">
                  Local Opponent Memory
                </div>
                <div className="font-display text-lg font-bold">
                  {totalRoundsPlayed > 0
                    ? `${totalRoundsPlayed} rounds studied · ${Math.round(
                        learning.rollingAccuracy * 100
                      )}% recent read rate`
                    : 'Fresh Opponent · Ready for Round 1'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 justify-items-center py-1">
              <GesturePrintCard gesture="rock" size="sm" label="Rock" />
              <GesturePrintCard gesture="paper" size="sm" label="Paper" />
              <GesturePrintCard gesture="scissors" size="sm" label="Scissors" />
            </div>

            <div className="flex items-start gap-3 border-t border-[#252820]/15 pt-4 text-xs text-[#55594D] leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-[#87977A] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#252820]">Local Privacy Guarantee:</strong> Webcam frames
                are analyzed in-browser via MediaPipe. Video is never recorded or transmitted.
                Only anonymous gesture history is saved in IndexedDB.
              </span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
};
