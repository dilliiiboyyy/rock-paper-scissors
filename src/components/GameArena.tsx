import React, { useEffect, useRef } from 'react';
import {
  Flame,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  AIPersonalityMood,
  CVFrameResult,
  CameraQuality,
  DetectedGesture,
  Gesture,
  LearningSnapshot,
  RoundRecord,
} from '../types/game';
import { ActiveMatchState, getTargetWinsForMode } from '../engine/gameStateManager';
import { CameraDeviceInfo } from '../vision/cameraManager';
import { animationManager } from '../services/animationManager';
import { GesturePrintCard, MachinePortrait } from './GestureArtwork';
import { WebcamStage } from './WebcamStage';

interface GameArenaProps {
  match: ActiveMatchState;
  learning: LearningSnapshot;
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
  soundEnabled: boolean;
  reducedMotion: boolean;
  onStartRound: () => void;
  onPauseToggle: () => void;
  onRestartMatch: () => void;
  onToggleSound: () => void;
  onRequestEnableCamera: () => void;
  onStopCamera: () => void;
  onSwitchCamera: (deviceId: string) => void;
  onChangeQuality: (quality: CameraQuality) => void;
  onOpenCalibration: () => void;
  onToggleInputMode: (mode: 'webcam' | 'manual_fallback') => void;
  onManualGestureSelect: (gesture: Gesture) => void;
}

const MOOD_META: Record<AIPersonalityMood, { label: string; tone: string }> = {
  curious: { label: 'Curious', tone: 'Studying your opening rhythm' },
  confident: { label: 'Confident', tone: 'Reading your pattern cleanly' },
  competitive: { label: 'Competitive', tone: 'Pressing statistical advantage' },
  surprised: { label: 'Surprised', tone: 'Recalibrating after a pivot' },
  cautious: { label: 'Cautious', tone: 'Respecting your unpredictability' },
};

export const GameArena: React.FC<GameArenaProps> = ({
  match,
  learning,
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
  soundEnabled,
  reducedMotion,
  onStartRound,
  onPauseToggle,
  onRestartMatch,
  onToggleSound,
  onRequestEnableCamera,
  onStopCamera,
  onSwitchCamera,
  onChangeQuality,
  onOpenCalibration,
  onToggleInputMode,
  onManualGestureSelect,
}) => {
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastCelebratedRoundRef = useRef<string | null>(null);

  const targetWins = getTargetWinsForMode(match.mode);
  const isCountingOrDetecting =
    match.phase === 'locked' ||
    match.phase === 'countdown' ||
    match.phase === 'detecting' ||
    match.phase === 'validating';

  const isMatchPoint =
    targetWins !== null &&
    (match.playerScore === targetWins - 1 || match.aiScore === targetWins - 1);

  // Trigger particle burst on newly resolved win or streak
  useEffect(() => {
    const last = match.lastResolvedRound;
    if (!last || last.id === lastCelebratedRoundRef.current) return;
    lastCelebratedRoundRef.current = last.id;

    if (last.outcome === 'player_win') {
      animationManager.spawnBurst(particleCanvasRef.current, reducedMotion, '#87977A');
    } else if (last.outcome === 'ai_win') {
      animationManager.spawnBurst(particleCanvasRef.current, reducedMotion, '#D65D43');
    }
  }, [match.lastResolvedRound, reducedMotion]);

  const canStartNextRound =
    (match.phase === 'idle' || match.phase === 'round_complete') &&
    (inputMode === 'manual_fallback' || cameraActive);

  const lastRound: RoundRecord | null = match.lastResolvedRound;
  const moodInfo = MOOD_META[learning.mood];

  return (
    <main className="relative mx-auto max-w-[1380px] px-5 py-6 space-y-6">
      <canvas
        ref={particleCanvasRef}
        className="pointer-events-none fixed inset-0 z-30 h-full w-full"
        aria-hidden="true"
      />

      {/* Arena Action & Scoreboard Header */}
      <section className="tactile-card rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#252820]/15 pb-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#55594D]">
            <span className="font-display text-sm font-bold text-[#252820] capitalize">
              {match.mode.replace(/_/g, ' ')}
            </span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{match.difficulty} AI</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">Round {match.roundNumber}</span>
            {targetWins !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">First to {targetWins}</span>
              </>
            )}
            {isMatchPoint && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-bold text-[#D65D43]">Deciding Match Point</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleSound}
              aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#252820]/30 bg-[#F2EBDD] px-3 py-1.5 text-xs font-semibold text-[#252820] hover:border-[#252820] cursor-pointer whitespace-nowrap shrink-0"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              {soundEnabled ? 'Sound On' : 'Muted'}
            </button>

            <button
              type="button"
              onClick={onPauseToggle}
              disabled={match.phase === 'match_complete'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#252820]/30 bg-[#F2EBDD] px-3 py-1.5 text-xs font-semibold text-[#252820] hover:border-[#252820] cursor-pointer disabled:opacity-45 whitespace-nowrap shrink-0"
            >
              {match.phase === 'paused' ? (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onRestartMatch}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#252820]/30 bg-[#F2EBDD] px-3 py-1.5 text-xs font-semibold text-[#252820] hover:border-[#252820] cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restart
            </button>
          </div>
        </div>

        {/* Arcade Scoreboard */}
        <div className="grid grid-cols-3 items-center gap-4 text-center">
          <div className="rounded-xl border border-[#252820]/20 bg-[#F2EBDD] p-3">
            <div className="text-xs font-semibold text-[#55594D]">You</div>
            <div className="font-mono-tabular text-4xl font-extrabold text-[#252820]">
              {match.playerScore}
            </div>
            {match.currentPlayerStreak >= 2 && (
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#87977A]">
                <Flame className="w-3.5 h-3.5" />
                {match.currentPlayerStreak} win streak
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-[#55594D]">Draws</div>
            <div className="font-mono-tabular text-2xl font-bold text-[#55594D]">
              {match.draws}
            </div>
            {match.phase === 'paused' ? (
              <div className="font-display text-sm font-bold text-[#D65D43]">Match Paused</div>
            ) : isCountingOrDetecting ? (
              <div className="font-display text-sm font-bold text-[#D65D43]">
                {match.countdownValue === 'SHOOT'
                  ? 'SHOW HAND NOW!'
                  : `Countdown: ${match.countdownValue ?? ''}`}
              </div>
            ) : (
              <button
                type="button"
                disabled={!canStartNextRound}
                onClick={onStartRound}
                className="tactile-btn mt-1 inline-flex items-center gap-2 rounded-xl border-2 border-[#252820] bg-[#D65D43] px-5 py-2.5 text-xs sm:text-sm font-bold text-[#F2EBDD] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {match.roundNumber === 1 && !lastRound ? 'Throw Round 1' : 'Next Round'}
              </button>
            )}
          </div>

          <div className="rounded-xl border border-[#252820]/20 bg-[#F2EBDD] p-3">
            <div className="text-xs font-semibold text-[#55594D]">The Machine</div>
            <div className="font-mono-tabular text-4xl font-extrabold text-[#D65D43]">
              {match.aiScore}
            </div>
            {match.currentAIStreak >= 2 && (
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#D65D43]">
                <Flame className="w-3.5 h-3.5" />
                {match.currentAIStreak} AI streak
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main 2-Column Duel Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Webcam / Player Input */}
        <div className="lg:col-span-6">
          <WebcamStage
            videoRef={videoRef}
            cameraActive={cameraActive}
            cameraError={cameraError}
            cameraInitializing={cameraInitializing}
            modelLoadingStage={modelLoadingStage}
            devices={devices}
            selectedCameraId={selectedCameraId}
            cameraQuality={cameraQuality}
            frameResult={frameResult}
            stableGesture={stableGesture}
            stabilityProgress={stabilityProgress}
            inputMode={inputMode}
            onRequestEnableCamera={onRequestEnableCamera}
            onStopCamera={onStopCamera}
            onSwitchCamera={onSwitchCamera}
            onChangeQuality={onChangeQuality}
            onOpenCalibration={onOpenCalibration}
            onToggleInputMode={onToggleInputMode}
            onManualGestureSelect={onManualGestureSelect}
            canManualSelectNow={match.phase === 'detecting'}
          />
        </div>

        {/* Right: AI Opponent Stage & Simultaneous Reveal */}
        <div className="lg:col-span-6">
          <div className="tactile-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-5 h-full">
            {/* Opponent Header */}
            <div className="flex items-center justify-between gap-4 border-b border-[#252820]/15 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-[#252820] shrink-0">
                  <MachinePortrait className="w-full h-full" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-[#252820]">
                    The Machine Opponent
                  </h2>
                  <div className="text-xs text-[#55594D]">
                    Mood: <strong className="text-[#252820]">{moodInfo.label}</strong> ·{' '}
                    {moodInfo.tone}
                  </div>
                </div>
              </div>

              <div className="text-right font-mono-tabular">
                <div className="text-xs text-[#55594D]">Read Accuracy</div>
                <div className="text-sm font-bold text-[#252820]">
                  {learning.predictionsMade > 0
                    ? `${Math.round(learning.rollingAccuracy * 100)}%`
                    : '—'}
                </div>
              </div>
            </div>

            {/* Center Duel / Countdown / Simultaneous Reveal Stage */}
            <div className="flex-1 rounded-xl border-2 border-[#252820] bg-[#EAE1CE] p-5 flex flex-col items-center justify-center min-h-[250px] text-center gap-4">
              {match.phase === 'paused' ? (
                <div className="space-y-3">
                  <div className="font-display text-2xl font-extrabold text-[#252820]">
                    Match Paused
                  </div>
                  <p className="text-xs text-[#55594D]">
                    Resume when you are ready to continue from Round {match.roundNumber}.
                  </p>
                  <button
                    type="button"
                    onClick={onPauseToggle}
                    className="tactile-btn rounded-xl border-2 border-[#252820] bg-[#D6AA57] px-5 py-2.5 text-xs font-bold text-[#252820] cursor-pointer"
                  >
                    Resume Match
                  </button>
                </div>
              ) : isCountingOrDetecting ? (
                <div className="space-y-4">
                  {/* Sealed Pre-Countdown AI Commitment Indicator */}
                  <div className="inline-flex items-center gap-2 rounded-lg border border-[#252820]/30 bg-[#F2EBDD] px-3 py-1.5 text-xs font-semibold text-[#252820]">
                    <Lock className="w-3.5 h-3.5 text-[#D65D43]" />
                    AI move sealed before countdown ·{' '}
                    <span className="font-mono-tabular">
                      {Math.round((match.sealedCommitment?.confidence ?? 0.33) * 100)}% read conf
                    </span>
                  </div>

                  <div
                    className={`font-display font-extrabold tracking-tight transition-transform ${
                      match.countdownValue === 'SHOOT'
                        ? 'text-5xl sm:text-6xl text-[#D65D43] scale-105'
                        : 'text-7xl text-[#252820]'
                    }`}
                  >
                    {match.countdownValue === 'SHOOT' ? 'SHOOT!' : match.countdownValue}
                  </div>

                  <p className="text-xs font-medium text-[#55594D]">
                    {match.countdownValue === 'SHOOT'
                      ? inputMode === 'webcam'
                        ? 'Hold your gesture steady in front of the camera to lock it in!'
                        : 'Press R (1), P (2), or S (3) to throw your hand!'
                      : 'Prepare your hand gesture — the AI cannot change its locked move.'}
                  </p>
                </div>
              ) : lastRound ? (
                <div className="w-full space-y-4">
                  <div
                    className={`font-display text-2xl font-extrabold ${
                      lastRound.outcome === 'player_win'
                        ? 'text-[#87977A]'
                        : lastRound.outcome === 'ai_win'
                        ? 'text-[#D65D43]'
                        : 'text-[#252820]'
                    }`}
                  >
                    {lastRound.outcome === 'player_win'
                      ? 'You Win This Round'
                      : lastRound.outcome === 'ai_win'
                      ? 'The Machine Wins This Round'
                      : 'Round Drawn'}
                  </div>

                  <div className="flex items-center justify-center gap-6 sm:gap-10">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-[#55594D]">You Threw</div>
                      <GesturePrintCard gesture={lastRound.playerMove} size="md" label={lastRound.playerMove} />
                    </div>
                    <div className="font-display text-xl font-extrabold text-[#252820]">vs</div>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-[#55594D]">AI Locked</div>
                      <GesturePrintCard
                        gesture={lastRound.aiCounterMove}
                        size="md"
                        label={lastRound.aiCounterMove}
                      />
                    </div>
                  </div>

                  <div className="text-xs text-[#55594D] font-mono-tabular">
                    AI predicted <strong className="capitalize text-[#252820]">{lastRound.predictedPlayerMove}</strong>{' '}
                    ({Math.round(lastRound.predictionConfidence * 100)}% conf) ·{' '}
                    {lastRound.wasPredictionCorrect ? 'Prediction Hit' : 'Prediction Missed'}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-w-sm">
                  <div className="font-display text-2xl font-extrabold text-[#252820]">
                    Ready for Round 1
                  </div>
                  <p className="text-xs text-[#55594D] leading-relaxed">
                    {inputMode === 'webcam' && !cameraActive
                      ? 'Enable your webcam on the left (or switch to No Camera Mode), then press Throw Round 1.'
                      : 'Press Throw Round 1 (or Spacebar). The AI will seal its move first, count down 3-2-1-SHOOT!, and read your hand.'}
                  </p>
                </div>
              )}
            </div>

            {/* AI Commentary & Compact Round Strip */}
            <div className="space-y-3">
              <div className="rounded-xl border border-[#252820]/25 bg-[#F2EBDD] px-4 py-3 text-xs sm:text-sm text-[#252820]">
                <span className="font-bold text-[#D65D43] mr-1.5">Machine:</span>
                “{learning.lastCommentary}”
              </div>

              {match.matchRounds.length > 0 && (
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
                  <span className="font-semibold text-[#55594D] shrink-0">Recent:</span>
                  <div className="flex items-center gap-2">
                    {match.matchRounds.slice(-8).map((r) => (
                      <div
                        key={r.id}
                        title={`R${r.roundNumber}: You ${r.playerMove} vs AI ${r.aiCounterMove}`}
                        className={`rounded-md border px-2 py-1 font-mono-tabular shrink-0 ${
                          r.outcome === 'player_win'
                            ? 'border-[#87977A] bg-[#87977A]/20 text-[#252820]'
                            : r.outcome === 'ai_win'
                            ? 'border-[#D65D43] bg-[#D65D43]/20 text-[#252820]'
                            : 'border-[#252820]/25 bg-[#F8F3E8] text-[#55594D]'
                        }`}
                      >
                        R{r.roundNumber} {r.playerMove[0].toUpperCase()}/{r.aiCounterMove[0].toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
