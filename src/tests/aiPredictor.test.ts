import { describe, expect, it } from 'vitest';
import {
  computeOutcome,
  getCounterMove,
  lockAIPredictionForRound,
  predictNextMove,
} from '../engine/aiPredictor';
import { createInitialLearningSnapshot, updateLearningSnapshot } from '../engine/aiLearningManager';
import { Difficulty, Gesture, RoundRecord } from '../types/game';

function buildRoundRecord(
  index: number,
  playerMove: Gesture,
  predictedPlayerMove: Gesture,
  aiCounterMove: Gesture,
  confidence = 0.5
): RoundRecord {
  return {
    id: `r-${index}`,
    matchId: 'test-match',
    roundNumber: index + 1,
    timestamp: 1000 + index * 1000,
    mode: 'ai_challenge',
    difficulty: 'hard',
    predictedPlayerMove,
    aiCounterMove,
    aiLockedAtMs: 900 + index * 1000,
    playerMove,
    playerDetectedAtMs: 1000 + index * 1000,
    outcome: computeOutcome(playerMove, aiCounterMove),
    predictionConfidence: confidence,
    wasPredictionCorrect: predictedPlayerMove === playerMove,
    detectedStrategy: 'random',
    commentary: '',
    mood: 'curious',
  };
}

function evaluateRollingAccuracy(
  sequence: Gesture[],
  difficulty: Difficulty,
  seed = 42
): { aiAccuracy: number; freqBaselineAccuracy: number; finalBreakdown: ReturnType<typeof predictNextMove> } {
  let s = seed;
  const seededRng = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };

  const history: RoundRecord[] = [];
  let learning = createInitialLearningSnapshot();
  let aiCorrect = 0;
  let freqCorrect = 0;
  const counts: Record<Gesture, number> = { rock: 0, paper: 0, scissors: 0 };

  for (let i = 0; i < sequence.length; i++) {
    const breakdown = predictNextMove(
      history,
      difficulty,
      'ai_challenge',
      { expertReliability: learning.expertReliability, rollingAccuracy: learning.rollingAccuracy },
      seededRng
    );

    // Simple frequency baseline
    let freqBest: Gesture = 'rock';
    if (counts.paper > counts[freqBest]) freqBest = 'paper';
    if (counts.scissors > counts[freqBest]) freqBest = 'scissors';

    const actual = sequence[i];
    if (breakdown.predictedPlayerMove === actual) aiCorrect++;
    if (freqBest === actual) freqCorrect++;
    counts[actual]++;

    const record = buildRoundRecord(
      i,
      actual,
      breakdown.predictedPlayerMove,
      breakdown.aiCounterMove,
      breakdown.confidence
    );
    learning = updateLearningSnapshot(learning, record, breakdown, history);
    history.push(record);
  }

  const finalBreakdown = predictNextMove(history, difficulty, 'ai_challenge', {
    expertReliability: learning.expertReliability,
  });

  return {
    aiAccuracy: aiCorrect / sequence.length,
    freqBaselineAccuracy: freqCorrect / sequence.length,
    finalBreakdown,
  };
}

describe('AI Adaptive Prediction Engine', () => {
  it('learns and counters constant Always Rock / Paper / Scissors players', () => {
    for (const fixed of ['rock', 'paper', 'scissors'] as const) {
      const seq: Gesture[] = Array(18).fill(fixed);
      const { aiAccuracy, finalBreakdown } = evaluateRollingAccuracy(seq, 'hard');
      expect(aiAccuracy).toBeGreaterThan(0.75);
      expect(finalBreakdown.predictedPlayerMove).toBe(fixed);
      expect(finalBreakdown.aiCounterMove).toBe(getCounterMove(fixed));
    }
  });

  it('recognizes repeating cyclic sequence (R -> P -> S) and beats random & frequency baselines', () => {
    const cycle: Gesture[] = [];
    const base: Gesture[] = ['rock', 'paper', 'scissors'];
    for (let i = 0; i < 30; i++) cycle.push(base[i % 3]);

    const { aiAccuracy, freqBaselineAccuracy, finalBreakdown } = evaluateRollingAccuracy(
      cycle,
      'hard'
    );
    // Frequency baseline gets ~33% on balanced R->P->S, adaptive Markov/N-gram gets >70%
    expect(aiAccuracy).toBeGreaterThan(0.7);
    expect(aiAccuracy).toBeGreaterThan(freqBaselineAccuracy + 0.25);
    expect(finalBreakdown.detectedStrategy === 'cyclic' || finalBreakdown.detectedStrategy === 'sequence_pattern' || finalBreakdown.detectedStrategy === 'markov_habit').toBe(true);
  });

  it('recognizes alternating pattern (R -> P -> R -> P)', () => {
    const alt: Gesture[] = [];
    for (let i = 0; i < 24; i++) alt.push(i % 2 === 0 ? 'rock' : 'paper');

    const { aiAccuracy } = evaluateRollingAccuracy(alt, 'normal');
    expect(aiAccuracy).toBeGreaterThan(0.7);
  });

  it('adapts when a player abruptly shifts strategy mid-session', () => {
    const seq: Gesture[] = [
      ...Array(14).fill('rock' as Gesture),
      ...Array(12).fill('scissors' as Gesture),
    ];
    const history: RoundRecord[] = [];
    let learning = createInitialLearningSnapshot();

    for (let i = 0; i < seq.length; i++) {
      const commitment = lockAIPredictionForRound(
        `r-${i}`,
        i + 1,
        history,
        'hard',
        'ai_challenge',
        { expertReliability: learning.expertReliability }
      );
      const rec = buildRoundRecord(
        i,
        seq[i],
        commitment.predictedPlayerMove,
        commitment.aiMove,
        commitment.confidence
      );
      learning = updateLearningSnapshot(learning, rec, commitment.breakdown, history);
      history.push(rec);
    }

    const postShiftPrediction = predictNextMove(history, 'hard', 'ai_challenge', {
      expertReliability: learning.expertReliability,
    });
    expect(postShiftPrediction.predictedPlayerMove).toBe('scissors');
    expect(postShiftPrediction.aiCounterMove).toBe('rock');
  });

  it('remains calibrated near random baseline (~33%) without overconfidence on uniform random moves', () => {
    let s = 1337;
    const rng = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
    const randomSeq: Gesture[] = Array.from({ length: 60 }, () => {
      const v = rng();
      return v < 1 / 3 ? 'rock' : v < 2 / 3 ? 'paper' : 'scissors';
    });

    const { aiAccuracy, finalBreakdown } = evaluateRollingAccuracy(randomSeq, 'normal', 99);
    expect(aiAccuracy).toBeGreaterThan(0.18);
    expect(aiAccuracy).toBeLessThan(0.5);
    expect(finalBreakdown.confidence).toBeLessThan(0.55);
  });

  it('differentiates Easy vs Hard prediction strategies on multi-step N-gram sequences', () => {
    // Non-trivial 2-step sequence: R, R, P, S, R, R, P, S...
    const pattern: Gesture[] = ['rock', 'rock', 'paper', 'scissors'];
    const seq: Gesture[] = [];
    for (let i = 0; i < 28; i++) seq.push(pattern[i % pattern.length]);

    const easyRes = evaluateRollingAccuracy(seq, 'easy', 7);
    const hardRes = evaluateRollingAccuracy(seq, 'hard', 7);
    expect(hardRes.aiAccuracy).toBeGreaterThan(easyRes.aiAccuracy);
  });
});
