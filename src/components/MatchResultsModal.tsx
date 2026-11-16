import React from 'react';
import { Download, RotateCcw, Trophy } from 'lucide-react';
import { MatchRecord, RoundRecord } from '../types/game';

interface MatchResultsModalProps {
  match: MatchRecord;
  matchRounds: RoundRecord[];
  onRematch: () => void;
  onBackToMenu: () => void;
  onViewAICenter: () => void;
  onExportMatchJSON: () => void;
}

export const MatchResultsModal: React.FC<MatchResultsModalProps> = ({
  match,
  matchRounds,
  onRematch,
  onBackToMenu,
  onViewAICenter,
  onExportMatchJSON,
}) => {
  const playerMoves = {
    rock: matchRounds.filter((r) => r.playerMove === 'rock').length,
    paper: matchRounds.filter((r) => r.playerMove === 'paper').length,
    scissors: matchRounds.filter((r) => r.playerMove === 'scissors').length,
  };

  const headline =
    match.winner === 'player'
      ? 'Victory Claimed'
      : match.winner === 'ai'
      ? 'The Machine Prevailed'
      : 'Match Drawn';

  const decisive = match.playerScore + match.aiScore;
  const playerWinRate = decisive > 0 ? Math.round((match.playerScore / decisive) * 100) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-results-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#252820]/70 p-4"
    >
      <div className="tactile-card w-full max-w-xl rounded-2xl p-6 sm:p-8 space-y-6 bg-[#F2EBDD]">
        <div className="flex items-start justify-between gap-4 border-b border-[#252820]/15 pb-4">
          <div>
            <div className="text-xs font-semibold text-[#55594D] capitalize">
              {match.mode.replace(/_/g, ' ')} · {match.difficulty} AI
            </div>
            <h2
              id="match-results-title"
              className="font-display text-3xl font-extrabold text-[#252820] mt-1"
            >
              {headline}
            </h2>
          </div>
          <Trophy
            className={`w-9 h-9 shrink-0 ${
              match.winner === 'player' ? 'text-[#D6AA57]' : 'text-[#55594D]'
            }`}
          />
        </div>

        {/* Score Summary */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-[#252820]/25 bg-[#F8F3E8] p-3">
            <div className="text-xs font-semibold text-[#55594D]">You</div>
            <div className="font-mono-tabular text-3xl font-extrabold text-[#252820]">
              {match.playerScore}
            </div>
          </div>
          <div className="rounded-xl border border-[#252820]/25 bg-[#F8F3E8] p-3">
            <div className="text-xs font-semibold text-[#55594D]">Draws</div>
            <div className="font-mono-tabular text-3xl font-extrabold text-[#55594D]">
              {match.draws}
            </div>
          </div>
          <div className="rounded-xl border border-[#252820]/25 bg-[#F8F3E8] p-3">
            <div className="text-xs font-semibold text-[#55594D]">The Machine</div>
            <div className="font-mono-tabular text-3xl font-extrabold text-[#D65D43]">
              {match.aiScore}
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-2 rounded-xl border border-[#252820]/20 bg-[#F8F3E8] p-4">
            <div className="font-display font-bold text-sm text-[#252820]">Your Performance</div>
            <div className="flex justify-between">
              <span className="text-[#55594D]">Decisive Win Rate</span>
              <span className="font-mono-tabular font-bold text-[#252820]">{playerWinRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#55594D]">Best Win Streak</span>
              <span className="font-mono-tabular font-bold text-[#252820]">
                {match.longestPlayerStreak}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#55594D]">Throws (R / P / S)</span>
              <span className="font-mono-tabular font-bold text-[#252820]">
                {playerMoves.rock} / {playerMoves.paper} / {playerMoves.scissors}
              </span>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-[#252820]/20 bg-[#F8F3E8] p-4">
            <div className="font-display font-bold text-sm text-[#252820]">AI Prediction Read</div>
            <div className="flex justify-between">
              <span className="text-[#55594D]">Prediction Accuracy</span>
              <span className="font-mono-tabular font-bold text-[#252820]">
                {Math.round(match.predictionAccuracy * 100)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#55594D]">Avg Confidence</span>
              <span className="font-mono-tabular font-bold text-[#252820]">
                {Math.round(match.avgPredictionConfidence * 100)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#55594D]">Total Rounds</span>
              <span className="font-mono-tabular font-bold text-[#252820]">
                {match.totalRounds}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onRematch}
              className="tactile-btn inline-flex items-center gap-2 rounded-xl border-2 border-[#252820] bg-[#D65D43] px-5 py-2.5 text-xs font-bold text-[#F2EBDD] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Rematch
            </button>
            <button
              type="button"
              onClick={onViewAICenter}
              className="tactile-btn rounded-xl border-2 border-[#252820] bg-[#D6AA57] px-4 py-2.5 text-xs font-bold text-[#252820] cursor-pointer"
            >
              Inspect AI Reads
            </button>
            <button
              type="button"
              onClick={onBackToMenu}
              className="rounded-xl border border-[#252820]/30 bg-transparent px-4 py-2.5 text-xs font-semibold text-[#252820] hover:border-[#252820] cursor-pointer"
            >
              Main Menu
            </button>
          </div>

          <button
            type="button"
            onClick={onExportMatchJSON}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#55594D] hover:text-[#252820] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
        </div>
      </div>
    </div>
  );
};
