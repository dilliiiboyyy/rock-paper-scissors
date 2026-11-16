import { describe, expect, it } from 'vitest';
import { createInitialLearningSnapshot } from '../engine/aiLearningManager';
import { computeOutcome } from '../engine/aiPredictor';
import {
  createNewMatchState,
  prepareAndLockRound,
  resolveRoundWithValidatedGesture,
  setCountdownStep,
} from '../engine/gameStateManager';

describe('AI Fairness & Integrity Invariants', () => {
  it('locks AI decision strictly before countdown and before player gesture exists', () => {
    let match = createNewMatchState('first_to_five', 'hard', 'fairness-match');
    const learning = createInitialLearningSnapshot();

    match = prepareAndLockRound(match, [], learning, () => 0.1);
    expect(match.phase).toBe('locked');
    expect(match.sealedCommitment).not.toBeNull();
    const lockedMove = match.sealedCommitment!.aiMove;
    const lockedTimestamp = match.sealedCommitment!.lockedAtMs;

    match = setCountdownStep(match, 3);
    match = setCountdownStep(match, 2);
    match = setCountdownStep(match, 1);
    match = setCountdownStep(match, 'SHOOT');

    // Regardless of which valid gesture the player throws, AI move remains identical to pre-countdown commitment
    const branchRock = resolveRoundWithValidatedGesture(match, 'rock', learning, []);
    const branchPaper = resolveRoundWithValidatedGesture(match, 'paper', learning, []);
    const branchScissors = resolveRoundWithValidatedGesture(match, 'scissors', learning, []);

    expect(branchRock.roundRecord?.aiCounterMove).toBe(lockedMove);
    expect(branchPaper.roundRecord?.aiCounterMove).toBe(lockedMove);
    expect(branchScissors.roundRecord?.aiCounterMove).toBe(lockedMove);
    expect(branchRock.roundRecord!.aiLockedAtMs).toBe(lockedTimestamp);
    expect(branchRock.roundRecord!.playerDetectedAtMs).toBeGreaterThanOrEqual(lockedTimestamp);
  });

  it('rejects uncertain or missing gestures without mutating learning or score', () => {
    let match = createNewMatchState('quick_play', 'normal', 'invalid-test');
    const learning = createInitialLearningSnapshot();
    match = prepareAndLockRound(match, [], learning);
    match = setCountdownStep(match, 'SHOOT');

    const resUncertain = resolveRoundWithValidatedGesture(match, 'uncertain', learning, []);
    expect(resUncertain.accepted).toBe(false);
    expect(resUncertain.nextMatch.roundNumber).toBe(1);
    expect(resUncertain.nextLearning.totalObservations).toBe(0);

    const resNone = resolveRoundWithValidatedGesture(match, 'none', learning, []);
    expect(resNone.accepted).toBe(false);
    expect(resNone.nextLearning.totalObservations).toBe(0);
  });

  it('prevents duplicate frame submissions from resolving the same round twice', () => {
    let match = createNewMatchState('quick_play', 'normal', 'dup-test');
    const learning = createInitialLearningSnapshot();
    match = prepareAndLockRound(match, [], learning);
    match = setCountdownStep(match, 'SHOOT');

    const first = resolveRoundWithValidatedGesture(match, 'rock', learning, []);
    expect(first.accepted).toBe(true);

    // Attempt to re-resolve with stale match snapshot or same roundId
    const second = resolveRoundWithValidatedGesture(
      { ...first.nextMatch, sealedCommitment: match.sealedCommitment },
      'paper',
      first.nextLearning,
      [first.roundRecord!]
    );
    expect(second.accepted).toBe(false);
    expect(second.nextMatch.matchRounds.length).toBe(1);
  });

  it('computes all 9 Rock-Paper-Scissors matchup outcomes accurately', () => {
    expect(computeOutcome('rock', 'scissors')).toBe('player_win');
    expect(computeOutcome('paper', 'rock')).toBe('player_win');
    expect(computeOutcome('scissors', 'paper')).toBe('player_win');

    expect(computeOutcome('rock', 'paper')).toBe('ai_win');
    expect(computeOutcome('paper', 'scissors')).toBe('ai_win');
    expect(computeOutcome('scissors', 'rock')).toBe('ai_win');

    expect(computeOutcome('rock', 'rock')).toBe('draw');
    expect(computeOutcome('paper', 'paper')).toBe('draw');
    expect(computeOutcome('scissors', 'scissors')).toBe('draw');
  });
});
