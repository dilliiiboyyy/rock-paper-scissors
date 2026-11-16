import {
  AIPersonalityMood,
  Gesture,
  LearningActivityEvent,
  LearningSnapshot,
  PerGestureAccuracy,
  PredictionBreakdown,
  RoundOutcome,
  RoundRecord,
} from '../types/game';
import { DEFAULT_EXPERT_RELIABILITY } from './aiPredictor';

export function createInitialLearningSnapshot(): LearningSnapshot {
  return {
    totalObservations: 0,
    gestureCounts: { rock: 0, paper: 0, scissors: 0 },
    predictionsMade: 0,
    correctPredictions: 0,
    incorrectPredictions: 0,
    rollingAccuracy: 0,
    baselineFrequencyAccuracy: 0,
    baselineRandomAccuracy: 0.333,
    perGestureAccuracy: {
      rock: { predicted: 0, correct: 0 },
      paper: { predicted: 0, correct: 0 },
      scissors: { predicted: 0, correct: 0 },
    },
    expertReliability: { ...DEFAULT_EXPERT_RELIABILITY },
    recentActivity: [],
    mood: 'curious',
    lastCommentary: 'Show your first move. I am ready to study your rhythm.',
    accuracyHistory: [],
  };
}

function capWord(g: Gesture): string {
  return g.charAt(0).toUpperCase() + g.slice(1);
}

export function determinePersonalityAndCommentary(
  snapshot: LearningSnapshot,
  round: {
    roundNumber: number;
    playerMove: Gesture;
    predictedPlayerMove: Gesture;
    wasPredictionCorrect: boolean;
    outcome: RoundOutcome;
    breakdown: PredictionBreakdown;
  },
  previousRounds: readonly RoundRecord[]
): { mood: AIPersonalityMood; commentary: string } {
  const { playerMove, predictedPlayerMove, wasPredictionCorrect, outcome, breakdown, roundNumber } =
    round;

  // Compute simple stats from real data
  const total = snapshot.totalObservations;
  const counts = snapshot.gestureCounts;
  const pct = (g: Gesture) => (total > 0 ? Math.round((counts[g] / total) * 100) : 33);

  // Recent AI streak
  let recentCorrect = 0;
  for (let i = previousRounds.length - 1; i >= Math.max(0, previousRounds.length - 4); i--) {
    if (previousRounds[i].wasPredictionCorrect) recentCorrect++;
  }
  if (wasPredictionCorrect) recentCorrect++;

  if (roundNumber <= 2) {
    return {
      mood: 'curious',
      commentary:
        roundNumber === 1
          ? `${capWord(playerMove)} to open. Taking note of your starting instinct.`
          : wasPredictionCorrect
          ? `Already reading your opening tell — ${capWord(playerMove)} landed right where I expected.`
          : `You went with ${capWord(playerMove)}. Collecting more data before drawing conclusions.`,
    };
  }

  if (breakdown.detectedStrategy === 'strategy_shift') {
    return {
      mood: 'surprised',
      commentary: wasPredictionCorrect
        ? `You tried switching away from your old pattern, and I caught the pivot.`
        : `Interesting. You've changed your strategy — expected ${capWord(predictedPlayerMove)}, saw ${capWord(playerMove)}.`,
    };
  }

  if (!wasPredictionCorrect && breakdown.confidence >= 0.52) {
    return {
      mood: 'surprised',
      commentary: `I expected ${capWord(predictedPlayerMove)} that time (${Math.round(
        breakdown.confidence * 100
      )}% confidence). You're learning to trick me.`,
    };
  }

  if (wasPredictionCorrect && recentCorrect >= 3) {
    return {
      mood: 'confident',
      commentary:
        breakdown.topPatterns.length > 0
          ? `You're becoming predictable — ${breakdown.topPatterns[0].pattern} showed up again.`
          : `Locked onto your rhythm. ${Math.round(snapshot.rollingAccuracy * 100)}% recent read accuracy.`,
    };
  }

  if (breakdown.detectedStrategy === 'frequency_bias' && pct(playerMove) >= 44) {
    return {
      mood: 'competitive',
      commentary: `I've noticed you choose ${capWord(playerMove)} quite often (${pct(playerMove)}% of throws).`,
    };
  }

  if (breakdown.detectedStrategy === 'cyclic') {
    return {
      mood: 'competitive',
      commentary: `I spotted a rotating cycle in your recent hands.`,
    };
  }

  if (breakdown.detectedStrategy === 'random') {
    return {
      mood: 'cautious',
      commentary:
        outcome === 'player_win'
          ? `Clean mix-up. Your distribution stays near balanced entropy.`
          : `Staying cautious — your throws have low predictability right now.`,
    };
  }

  if (wasPredictionCorrect) {
    return {
      mood: 'confident',
      commentary: `Read ${capWord(playerMove)} from your recent sequence.`,
    };
  }

  return {
    mood: 'competitive',
    commentary: `Expected ${capWord(predictedPlayerMove)}, got ${capWord(playerMove)}. Recalibrating weights.`,
  };
}

/**
 * Updates persistent AI learning metrics & expert reliability after a round is completed.
 * Never mutates input; returns a fresh snapshot.
 */
export function updateLearningSnapshot(
  prev: LearningSnapshot,
  round: RoundRecord,
  breakdown: PredictionBreakdown,
  allHistoryBeforeRound: readonly RoundRecord[]
): LearningSnapshot {
  const totalObservations = prev.totalObservations + 1;
  const gestureCounts = {
    ...prev.gestureCounts,
    [round.playerMove]: prev.gestureCounts[round.playerMove] + 1,
  };

  const predictionsMade = prev.predictionsMade + 1;
  const correctPredictions = prev.correctPredictions + (round.wasPredictionCorrect ? 1 : 0);
  const incorrectPredictions = prev.incorrectPredictions + (round.wasPredictionCorrect ? 0 : 1);

  const perGestureAccuracy: PerGestureAccuracy = {
    rock: { ...prev.perGestureAccuracy.rock },
    paper: { ...prev.perGestureAccuracy.paper },
    scissors: { ...prev.perGestureAccuracy.scissors },
  };
  perGestureAccuracy[round.predictedPlayerMove].predicted += 1;
  if (round.wasPredictionCorrect) {
    perGestureAccuracy[round.predictedPlayerMove].correct += 1;
  }

  // Rolling prediction accuracy over last 15 rounds
  const recentWindow = [...allHistoryBeforeRound.slice(-14), round];
  const rollingCorrect = recentWindow.filter((r) => r.wasPredictionCorrect).length;
  const rollingAccuracy = rollingCorrect / recentWindow.length;

  // Baseline frequency predictor accuracy (always predicting the prior most common gesture)
  const fullHistory = [...allHistoryBeforeRound, round];
  let freqBaselineCorrect = 0;
  const runningCounts: Record<Gesture, number> = { rock: 0, paper: 0, scissors: 0 };
  for (const r of fullHistory) {
    let best: Gesture = 'rock';
    if (runningCounts.paper > runningCounts[best]) best = 'paper';
    if (runningCounts.scissors > runningCounts[best]) best = 'scissors';
    if (r.playerMove === best) freqBaselineCorrect++;
    runningCounts[r.playerMove]++;
  }
  const baselineFrequencyAccuracy = freqBaselineCorrect / fullHistory.length;

  // Update expert reliability using exponential moving average of probability assigned to true player move
  const expertReliability = { ...prev.expertReliability };
  for (const mc of breakdown.methodContributions) {
    const pTrue = mc.probabilities[round.playerMove];
    expertReliability[mc.method] = Math.min(
      0.95,
      Math.max(0.1, expertReliability[mc.method] * 0.82 + pTrue * 0.18)
    );
  }

  // Generate meaningful learning activity events
  const newEvents: LearningActivityEvent[] = [];
  const now = round.timestamp;
  if (breakdown.detectedStrategy === 'strategy_shift') {
    newEvents.push({
      id: `evt-shift-${round.id}`,
      timestamp: now,
      roundNumber: round.roundNumber,
      type: 'strategy_shift',
      message: `Strategy shift detected on round ${round.roundNumber} — adapting recent window.`,
    });
  } else if (breakdown.topPatterns.length > 0 && round.wasPredictionCorrect) {
    const top = breakdown.topPatterns[0];
    newEvents.push({
      id: `evt-pat-${round.id}`,
      timestamp: now,
      roundNumber: round.roundNumber,
      type: top.type === 'sequence' ? 'sequence_repeated' : 'pattern_discovered',
      message: `Pattern confirmed (${top.pattern}) · ${Math.round(top.confidence * 100)}% pattern weight.`,
    });
  } else if (
    prev.accuracyHistory.length > 0 &&
    Math.abs(rollingAccuracy - prev.accuracyHistory[prev.accuracyHistory.length - 1].rollingAccuracy) >= 0.08
  ) {
    const prevAcc = prev.accuracyHistory[prev.accuracyHistory.length - 1].rollingAccuracy;
    newEvents.push({
      id: `evt-acc-${round.id}`,
      timestamp: now,
      roundNumber: round.roundNumber,
      type: 'confidence_change',
      message:
        rollingAccuracy > prevAcc
          ? `Rolling prediction accuracy rose to ${Math.round(rollingAccuracy * 100)}%.`
          : `Rolling prediction accuracy dipped to ${Math.round(rollingAccuracy * 100)}% after unexpected play.`,
    });
  }

  const aiWins = fullHistory.filter((r) => r.outcome === 'ai_win').length;
  const decisive = fullHistory.filter((r) => r.outcome !== 'draw').length;
  const aiWinRate = decisive > 0 ? aiWins / decisive : 0;

  const accuracyHistory = [
    ...prev.accuracyHistory.slice(-49),
    {
      round: fullHistory.length,
      rollingAccuracy,
      confidence: round.predictionConfidence,
      aiWinRate,
    },
  ];

  const intermediateSnapshot: LearningSnapshot = {
    totalObservations,
    gestureCounts,
    predictionsMade,
    correctPredictions,
    incorrectPredictions,
    rollingAccuracy,
    baselineFrequencyAccuracy,
    baselineRandomAccuracy: 1 / 3,
    perGestureAccuracy,
    expertReliability,
    recentActivity: [...newEvents, ...prev.recentActivity].slice(0, 20),
    mood: prev.mood,
    lastCommentary: prev.lastCommentary,
    accuracyHistory,
  };

  const { mood, commentary } = determinePersonalityAndCommentary(
    intermediateSnapshot,
    {
      roundNumber: round.roundNumber,
      playerMove: round.playerMove,
      predictedPlayerMove: round.predictedPlayerMove,
      wasPredictionCorrect: round.wasPredictionCorrect,
      outcome: round.outcome,
      breakdown,
    },
    allHistoryBeforeRound
  );

  return {
    ...intermediateSnapshot,
    mood,
    lastCommentary: commentary,
  };
}

export function rebuildLearningSnapshotFromRounds(rounds: readonly RoundRecord[]): LearningSnapshot {
  let snap = createInitialLearningSnapshot();
  const accumulated: RoundRecord[] = [];
  for (const r of rounds) {
    const fallbackBreakdown: PredictionBreakdown = {
      predictedPlayerMove: r.predictedPlayerMove,
      aiCounterMove: r.aiCounterMove,
      confidence: r.predictionConfidence,
      probabilities: { rock: 1 / 3, paper: 1 / 3, scissors: 1 / 3 },
      methodContributions: [],
      detectedStrategy: r.detectedStrategy,
      topPatterns: [],
      explanation: r.commentary,
    };
    snap = updateLearningSnapshot(snap, r, fallbackBreakdown, accumulated);
    accumulated.push(r);
  }
  return snap;
}
