import React from 'react';
import { Activity, Brain, Eye, TrendingUp } from 'lucide-react';
import { Difficulty, GameMode, Gesture, LearningSnapshot, RoundRecord } from '../types/game';
import { predictNextMove } from '../engine/aiPredictor';
import { computeAggregateStats } from '../engine/matchStatsManager';

interface AILearningCenterProps {
  rounds: RoundRecord[];
  learning: LearningSnapshot;
  difficulty: Difficulty;
  mode: GameMode;
}

export const AILearningCenter: React.FC<AILearningCenterProps> = ({
  rounds,
  learning,
  difficulty,
  mode,
}) => {
  const stats = computeAggregateStats(rounds, []);
  const previewBreakdown = predictNextMove(rounds, difficulty, mode, {
    expertReliability: learning.expertReliability,
    rollingAccuracy: learning.rollingAccuracy,
  });

  const totalThrows = Math.max(1, stats.totalRounds);
  const rockPct = Math.round((stats.gestureDistribution.rock / totalThrows) * 100);
  const paperPct = Math.round((stats.gestureDistribution.paper / totalThrows) * 100);
  const scissorsPct = Math.round((stats.gestureDistribution.scissors / totalThrows) * 100);

  let mostCommon: Gesture | 'None' = 'None';
  if (stats.totalRounds > 0) {
    mostCommon = 'rock';
    if (stats.gestureDistribution.paper > stats.gestureDistribution[mostCommon]) {
      mostCommon = 'paper';
    }
    if (stats.gestureDistribution.scissors > stats.gestureDistribution[mostCommon]) {
      mostCommon = 'scissors';
    }
  }

  // SVG Trend Chart points
  const chartPoints = learning.accuracyHistory.slice(-24);
  const chartW = 540;
  const chartH = 150;
  const toPolyline = (vals: number[]) => {
    if (vals.length === 0) return '';
    if (vals.length === 1) return `12,${chartH - vals[0] * (chartH - 24) - 12}`;
    return vals
      .map((v, i) => {
        const x = 12 + (i / (vals.length - 1)) * (chartW - 24);
        const y = chartH - 12 - v * (chartH - 24);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <main className="mx-auto max-w-[1380px] px-5 py-8 space-y-8">
      <div className="space-y-2">
        <div className="text-xs font-semibold text-[#55594D]">
          Real-Time Pattern Telemetry · Honest Rolling Evaluation
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#252820]">
          AI Learning & Intelligence Center
        </h1>
        <p className="max-w-3xl text-sm text-[#55594D]">
          Every metric below separates prediction confidence (how sure the ensemble is right now),
          historical prediction accuracy (how often the locked prediction matched your move), and
          actual match win rate.
        </p>
      </div>

      {/* Distinct 3-Measurement Strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="tactile-card rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#55594D]">
            <span>Next-Move Prediction Confidence</span>
            <Brain className="w-4 h-4 text-[#D6AA57]" />
          </div>
          <div className="font-mono-tabular text-3xl font-extrabold text-[#252820]">
            {Math.round(previewBreakdown.confidence * 100)}%
          </div>
          <div className="text-xs text-[#55594D]">
            Next predicted throw:{' '}
            <strong className="capitalize text-[#252820]">
              {previewBreakdown.predictedPlayerMove}
            </strong>{' '}
            (Strategy: {previewBreakdown.detectedStrategy.replace(/_/g, ' ')})
          </div>
        </div>

        <div className="tactile-card rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#55594D]">
            <span>Historical Prediction Accuracy</span>
            <Eye className="w-4 h-4 text-[#87977A]" />
          </div>
          <div className="font-mono-tabular text-3xl font-extrabold text-[#252820]">
            {learning.predictionsMade > 0
              ? `${Math.round(stats.historicalPredictionAccuracy * 100)}%`
              : '—'}
          </div>
          <div className="text-xs text-[#55594D] font-mono-tabular">
            {learning.correctPredictions} hits / {learning.incorrectPredictions} misses · Random
            baseline 33% · Freq baseline {Math.round(learning.baselineFrequencyAccuracy * 100)}%
          </div>
        </div>

        <div className="tactile-card rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#55594D]">
            <span>Actual Match Win Rate (AI)</span>
            <TrendingUp className="w-4 h-4 text-[#D65D43]" />
          </div>
          <div className="font-mono-tabular text-3xl font-extrabold text-[#D65D43]">
            {stats.playerWins + stats.aiWins > 0
              ? `${Math.round(stats.aiMatchWinRate * 100)}%`
              : '—'}
          </div>
          <div className="text-xs text-[#55594D] font-mono-tabular">
            AI {stats.aiWins}W · Player {stats.playerWins}W · {stats.draws} Draws
          </div>
        </div>
      </section>

      {/* Player Behavior & Ensemble Weights */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Player Behavior */}
        <div className="lg:col-span-5 tactile-card rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#252820]">Player Behavior</h2>
            <span className="font-mono-tabular text-xs font-semibold text-[#55594D]">
              {stats.totalRounds} gestures recorded
            </span>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Rock', pct: rockPct, count: stats.gestureDistribution.rock, color: '#D65D43' },
              { label: 'Paper', pct: paperPct, count: stats.gestureDistribution.paper, color: '#87977A' },
              {
                label: 'Scissors',
                pct: scissorsPct,
                count: stats.gestureDistribution.scissors,
                color: '#D6AA57',
              },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-[#252820]">{item.label}</span>
                  <span className="font-mono-tabular text-[#55594D]">
                    {item.count} ({stats.totalRounds > 0 ? item.pct : 0}%)
                  </span>
                </div>
                <div className="h-3 w-full rounded-full border border-[#252820]/25 bg-[#EAE1CE] overflow-hidden">
                  <div
                    className="h-full transition-[width] duration-200"
                    style={{
                      width: `${stats.totalRounds > 0 ? item.pct : 0}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[#252820]/15 pt-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#55594D]">Most Common Gesture</span>
              <span className="font-bold capitalize text-[#252820]">{mostCommon}</span>
            </div>
            <div>
              <div className="text-[#55594D] mb-1.5">Recent Gesture Sequence</div>
              {rounds.length === 0 ? (
                <div className="text-[#55594D]">No rounds recorded yet.</div>
              ) : (
                <div className="flex flex-wrap gap-1.5 font-mono-tabular">
                  {rounds.slice(-14).map((r) => (
                    <span
                      key={r.id}
                      className="rounded border border-[#252820]/25 bg-[#F2EBDD] px-2 py-0.5 text-xs font-bold text-[#252820] capitalize"
                    >
                      {r.playerMove[0].toUpperCase()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ensemble Breakdown & Patterns */}
        <div className="lg:col-span-7 tactile-card rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#252820]">
              Ensemble Sub-Models & Discovered Patterns
            </h2>
            <span className="text-xs font-semibold text-[#55594D] capitalize">
              {difficulty} difficulty
            </span>
          </div>

          {previewBreakdown.methodContributions.length === 0 ? (
            <div className="rounded-xl border border-[#252820]/15 bg-[#EAE1CE]/50 p-4 text-xs text-[#55594D]">
              Play at least 1 round to inspect live Frequency, Markov, Win/Lose Reaction, N-gram,
              and Recent Window weights.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#252820]/20 text-[#55594D]">
                    <th className="py-2 pr-3 font-semibold">Predictor</th>
                    <th className="py-2 px-2 font-semibold font-mono-tabular">Weight</th>
                    <th className="py-2 px-2 font-semibold font-mono-tabular">Rock</th>
                    <th className="py-2 px-2 font-semibold font-mono-tabular">Paper</th>
                    <th className="py-2 pl-2 font-semibold font-mono-tabular">Scissors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252820]/10 font-mono-tabular">
                  {previewBreakdown.methodContributions.map((mc) => (
                    <tr key={mc.method}>
                      <td className="py-2 pr-3 font-sans font-semibold text-[#252820]">
                        {mc.label}
                      </td>
                      <td className="py-2 px-2">{Math.round(mc.weight * 100)}%</td>
                      <td className="py-2 px-2">{Math.round(mc.probabilities.rock * 100)}%</td>
                      <td className="py-2 px-2">{Math.round(mc.probabilities.paper * 100)}%</td>
                      <td className="py-2 pl-2">{Math.round(mc.probabilities.scissors * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Patterns Discovered */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#252820]">Active Discovered Patterns</h3>
            {previewBreakdown.topPatterns.length === 0 ? (
              <p className="text-xs text-[#55594D]">{previewBreakdown.explanation}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {previewBreakdown.topPatterns.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-[#252820]/20 bg-[#F2EBDD] px-3 py-2 text-xs"
                  >
                    <div className="font-bold text-[#252820]">{p.pattern}</div>
                    <div className="text-[#55594D] font-mono-tabular">
                      Confidence {Math.round(p.confidence * 100)}% · Seen {p.occurrences}x
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Rolling Accuracy Chart & Per-Gesture Breakdown + Activity Log */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 tactile-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-[#252820]">
              Rolling Accuracy vs Confidence Over Time
            </h2>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 text-[#252820]">
                <span className="w-3 h-0.5 bg-[#D65D43]" /> Rolling Accuracy
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#55594D]">
                <span className="w-3 h-0.5 bg-[#87977A]" /> Confidence
              </span>
            </div>
          </div>

          {chartPoints.length < 2 ? (
            <div className="h-[160px] rounded-xl border border-[#252820]/15 bg-[#EAE1CE]/50 flex items-center justify-center text-xs text-[#55594D]">
              Play at least 2 rounds to plot accuracy and confidence trajectories.
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full h-[160px] rounded-xl border border-[#252820]/20 bg-[#F2EBDD]"
              role="img"
              aria-label="Rolling accuracy and confidence trend chart"
            >
              {/* 33% random baseline */}
              <line
                x1="12"
                y1={chartH - 12 - 0.333 * (chartH - 24)}
                x2={chartW - 12}
                y2={chartH - 12 - 0.333 * (chartH - 24)}
                stroke="#252820"
                strokeOpacity="0.22"
                strokeDasharray="4 4"
              />
              <polyline
                fill="none"
                stroke="#87977A"
                strokeWidth="2.5"
                points={toPolyline(chartPoints.map((c) => c.confidence))}
              />
              <polyline
                fill="none"
                stroke="#D65D43"
                strokeWidth="3"
                points={toPolyline(chartPoints.map((c) => c.rollingAccuracy))}
              />
            </svg>
          )}

          {/* Per-Gesture Accuracy */}
          <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
            {(['rock', 'paper', 'scissors'] as const).map((g) => {
              const row = learning.perGestureAccuracy[g];
              const acc = row.predicted > 0 ? Math.round((row.correct / row.predicted) * 100) : 0;
              return (
                <div
                  key={g}
                  className="rounded-xl border border-[#252820]/20 bg-[#F2EBDD] p-3 font-mono-tabular"
                >
                  <div className="font-sans font-bold capitalize text-[#252820]">{g} Calls</div>
                  <div className="text-lg font-extrabold text-[#252820]">
                    {row.predicted > 0 ? `${acc}%` : '—'}
                  </div>
                  <div className="text-[#55594D]">
                    {row.correct}/{row.predicted} hits
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Learning Activity Log */}
        <div className="lg:col-span-5 tactile-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#252820]">Learning Activity</h2>
            <Activity className="w-4 h-4 text-[#D65D43]" />
          </div>

          {learning.recentActivity.length === 0 ? (
            <p className="text-xs text-[#55594D]">
              Pattern discoveries, repeated sequence detections, and strategy shifts will appear
              here as you play.
            </p>
          ) : (
            <ul className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {learning.recentActivity.map((evt) => (
                <li
                  key={evt.id}
                  className="rounded-lg border border-[#252820]/15 bg-[#F2EBDD] px-3 py-2 text-xs"
                >
                  <div className="font-semibold text-[#252820]">{evt.message}</div>
                  <div className="mt-0.5 text-[11px] font-mono-tabular text-[#55594D]">
                    Round {evt.roundNumber} · {new Date(evt.timestamp).toLocaleTimeString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
};
