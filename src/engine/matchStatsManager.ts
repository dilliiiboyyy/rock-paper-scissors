import { MatchRecord, RoundRecord } from '../types/game';

export interface AggregateStats {
  totalRounds: number;
  totalMatches: number;
  playerWins: number;
  aiWins: number;
  draws: number;
  playerWinRate: number;
  aiMatchWinRate: number;
  historicalPredictionAccuracy: number;
  avgPredictionConfidence: number;
  bestPlayerStreak: number;
  gestureDistribution: { rock: number; paper: number; scissors: number };
}

export function computeAggregateStats(
  rounds: readonly RoundRecord[],
  matches: readonly MatchRecord[]
): AggregateStats {
  const totalRounds = rounds.length;
  let playerWins = 0;
  let aiWins = 0;
  let draws = 0;
  let correctPredictions = 0;
  let confSum = 0;
  let currentStreak = 0;
  let bestPlayerStreak = 0;
  const gestureDistribution = { rock: 0, paper: 0, scissors: 0 };

  for (const r of rounds) {
    gestureDistribution[r.playerMove] += 1;
    confSum += r.predictionConfidence;
    if (r.wasPredictionCorrect) correctPredictions += 1;
    if (r.outcome === 'player_win') {
      playerWins += 1;
      currentStreak += 1;
      if (currentStreak > bestPlayerStreak) bestPlayerStreak = currentStreak;
    } else if (r.outcome === 'ai_win') {
      aiWins += 1;
      currentStreak = 0;
    } else {
      draws += 1;
    }
  }

  const decisive = playerWins + aiWins;
  return {
    totalRounds,
    totalMatches: matches.length,
    playerWins,
    aiWins,
    draws,
    playerWinRate: decisive > 0 ? playerWins / decisive : 0,
    aiMatchWinRate: decisive > 0 ? aiWins / decisive : 0,
    historicalPredictionAccuracy: totalRounds > 0 ? correctPredictions / totalRounds : 0,
    avgPredictionConfidence: totalRounds > 0 ? confSum / totalRounds : 0,
    bestPlayerStreak,
    gestureDistribution,
  };
}

export function exportStatsAsJSON(rounds: readonly RoundRecord[], matches: readonly MatchRecord[]): string {
  const summary = computeAggregateStats(rounds, matches);
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      summary,
      matches,
      rounds,
    },
    null,
    2
  );
}

export function exportRoundsAsCSV(rounds: readonly RoundRecord[]): string {
  const headers = [
    'round_id',
    'match_id',
    'round_number',
    'timestamp_iso',
    'mode',
    'difficulty',
    'player_move',
    'predicted_player_move',
    'ai_counter_move',
    'outcome',
    'prediction_correct',
    'prediction_confidence',
    'detected_strategy',
    'ai_locked_at_ms',
    'player_detected_at_ms',
  ];

  const rows = rounds.map((r) =>
    [
      r.id,
      r.matchId,
      r.roundNumber,
      new Date(r.timestamp).toISOString(),
      r.mode,
      r.difficulty,
      r.playerMove,
      r.predictedPlayerMove,
      r.aiCounterMove,
      r.outcome,
      r.wasPredictionCorrect ? 'true' : 'false',
      r.predictionConfidence.toFixed(3),
      r.detectedStrategy,
      r.aiLockedAtMs,
      r.playerDetectedAtMs,
    ].join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
