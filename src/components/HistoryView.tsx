import React, { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { MatchRecord, RoundRecord } from '../types/game';
import { computeAggregateStats } from '../engine/matchStatsManager';

interface HistoryViewProps {
  matches: MatchRecord[];
  rounds: RoundRecord[];
  onExportJSON: () => void;
  onExportCSV: () => void;
  onClearHistory: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  matches,
  rounds,
  onExportJSON,
  onExportCSV,
  onClearHistory,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const stats = computeAggregateStats(rounds, matches);

  return (
    <main className="mx-auto max-w-[1380px] px-5 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[#55594D]">
            IndexedDB Local Storage · Exportable Telemetry
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#252820]">
            Match & Round History
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onExportCSV}
            disabled={rounds.length === 0}
            className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border-2 border-[#252820] bg-[#F8F3E8] px-4 py-2 text-xs font-bold text-[#252820] cursor-pointer disabled:opacity-45"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={onExportJSON}
            disabled={rounds.length === 0}
            className="tactile-btn inline-flex items-center gap-1.5 rounded-xl border-2 border-[#252820] bg-[#D6AA57] px-4 py-2 text-xs font-bold text-[#252820] cursor-pointer disabled:opacity-45"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>

          {confirmClear ? (
            <div className="inline-flex items-center gap-2 rounded-xl border-2 border-[#D65D43] bg-[#F8F3E8] px-3 py-1.5 text-xs">
              <span className="font-bold text-[#D65D43]">Delete all local history?</span>
              <button
                type="button"
                onClick={() => {
                  onClearHistory();
                  setConfirmClear(false);
                }}
                className="font-bold text-[#D65D43] underline cursor-pointer"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="font-semibold text-[#55594D] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              disabled={rounds.length === 0 && matches.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D65D43]/60 px-3.5 py-2 text-xs font-semibold text-[#D65D43] hover:bg-[#D65D43]/10 cursor-pointer disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete All Data
            </button>
          )}
        </div>
      </div>

      {/* Aggregate Strip */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="tactile-card rounded-2xl p-4">
          <div className="text-xs font-semibold text-[#55594D]">Total Rounds</div>
          <div className="font-mono-tabular text-2xl font-extrabold text-[#252820]">
            {stats.totalRounds}
          </div>
        </div>
        <div className="tactile-card rounded-2xl p-4">
          <div className="text-xs font-semibold text-[#55594D]">Your Win Rate</div>
          <div className="font-mono-tabular text-2xl font-extrabold text-[#87977A]">
            {stats.playerWins + stats.aiWins > 0
              ? `${Math.round(stats.playerWinRate * 100)}%`
              : '—'}
          </div>
        </div>
        <div className="tactile-card rounded-2xl p-4">
          <div className="text-xs font-semibold text-[#55594D]">AI Read Accuracy</div>
          <div className="font-mono-tabular text-2xl font-extrabold text-[#D65D43]">
            {stats.totalRounds > 0
              ? `${Math.round(stats.historicalPredictionAccuracy * 100)}%`
              : '—'}
          </div>
        </div>
        <div className="tactile-card rounded-2xl p-4">
          <div className="text-xs font-semibold text-[#55594D]">Best Win Streak</div>
          <div className="font-mono-tabular text-2xl font-extrabold text-[#252820]">
            {stats.bestPlayerStreak}
          </div>
        </div>
      </section>

      {/* Previous Matches */}
      <section className="tactile-card rounded-2xl p-5 space-y-4">
        <h2 className="font-display text-lg font-bold text-[#252820]">Completed Matches</h2>
        {matches.length === 0 ? (
          <p className="text-xs text-[#55594D]">
            Completed First-to-Five, Best-of-Three, and Tournament bouts appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#252820]/20 text-[#55594D]">
                  <th className="py-2 pr-3 font-semibold">Ended</th>
                  <th className="py-2 px-3 font-semibold">Mode</th>
                  <th className="py-2 px-3 font-semibold">Difficulty</th>
                  <th className="py-2 px-3 font-semibold font-mono-tabular">Score (You - AI)</th>
                  <th className="py-2 px-3 font-semibold">Winner</th>
                  <th className="py-2 pl-3 font-semibold font-mono-tabular">AI Read Acc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252820]/10 font-mono-tabular">
                {matches.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2.5 pr-3 font-sans">
                      {new Date(m.endedAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-sans capitalize">
                      {m.mode.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 px-3 font-sans capitalize">{m.difficulty}</td>
                    <td className="py-2.5 px-3 font-bold">
                      {m.playerScore} - {m.aiScore} ({m.draws}D)
                    </td>
                    <td className="py-2.5 px-3 font-sans font-bold capitalize">
                      {m.winner === 'player' ? 'You' : m.winner === 'ai' ? 'Machine' : 'Draw'}
                    </td>
                    <td className="py-2.5 pl-3">{Math.round(m.predictionAccuracy * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Rounds Audit Log (Proves pre-countdown AI locking timestamps) */}
      <section className="tactile-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-[#252820]">
            Recent Round Audit Log
          </h2>
          <span className="text-xs text-[#55594D]">
            Last {Math.min(25, rounds.length)} rounds · Shows sealed pre-countdown AI lock
          </span>
        </div>

        {rounds.length === 0 ? (
          <p className="text-xs text-[#55594D]">No rounds played yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#252820]/20 text-[#55594D]">
                  <th className="py-2 pr-2 font-semibold">#</th>
                  <th className="py-2 px-2 font-semibold">You</th>
                  <th className="py-2 px-2 font-semibold">AI Locked</th>
                  <th className="py-2 px-2 font-semibold">AI Predicted</th>
                  <th className="py-2 px-2 font-semibold">Outcome</th>
                  <th className="py-2 px-2 font-semibold font-mono-tabular">Conf</th>
                  <th className="py-2 pl-2 font-semibold font-mono-tabular">Lock Lead</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252820]/10 font-mono-tabular">
                {[...rounds]
                  .reverse()
                  .slice(0, 25)
                  .map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-2">{r.roundNumber}</td>
                      <td className="py-2 px-2 font-sans capitalize font-semibold">
                        {r.playerMove}
                      </td>
                      <td className="py-2 px-2 font-sans capitalize font-semibold">
                        {r.aiCounterMove}
                      </td>
                      <td className="py-2 px-2 font-sans capitalize">
                        {r.predictedPlayerMove} {r.wasPredictionCorrect ? '(Hit)' : '(Miss)'}
                      </td>
                      <td className="py-2 px-2 font-sans font-bold">
                        {r.outcome === 'player_win'
                          ? 'Win'
                          : r.outcome === 'ai_win'
                          ? 'Loss'
                          : 'Draw'}
                      </td>
                      <td className="py-2 px-2">{Math.round(r.predictionConfidence * 100)}%</td>
                      <td className="py-2 pl-2">
                        {Math.max(0, r.playerDetectedAtMs - r.aiLockedAtMs)}ms prior
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};
