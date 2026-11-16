import { describe, expect, it } from 'vitest';
import { createInitialLearningSnapshot } from '../engine/aiLearningManager';
import {
  advanceTournamentAfterMatch,
  createInitialTournamentState,
  createNewMatchState,
  pauseMatchState,
  prepareAndLockRound,
  resumeMatchState,
  resolveRoundWithValidatedGesture,
  setCountdownStep,
} from '../engine/gameStateManager';

describe('Game State Manager & Modes', () => {
  it('completes Best of Three when a player reaches 2 wins', () => {
    let match = createNewMatchState('best_of_three', 'easy', 'bo3-1');
    let learning = createInitialLearningSnapshot();
    const allRounds = [];

    for (let step = 0; step < 6; step++) {
      if (match.phase === 'match_complete') break;
      match = prepareAndLockRound(match, allRounds, learning);
      match = setCountdownStep(match, 'SHOOT');
      const aiMove = match.sealedCommitment!.aiMove;
      // Pick the gesture that beats AI move so player wins deterministically
      const winningPlayerMove =
        aiMove === 'rock' ? 'paper' : aiMove === 'paper' ? 'scissors' : 'rock';
      const res = resolveRoundWithValidatedGesture(match, winningPlayerMove, learning, allRounds);
      expect(res.accepted).toBe(true);
      match = res.nextMatch;
      learning = res.nextLearning;
      if (res.roundRecord) allRounds.push(res.roundRecord);
    }

    expect(match.phase).toBe('match_complete');
    expect(match.winner).toBe('player');
    expect(match.playerScore).toBe(2);
  });

  it('supports pause and resume cleanly without losing sealed state', () => {
    let match = createNewMatchState('quick_play', 'normal');
    const learning = createInitialLearningSnapshot();
    match = prepareAndLockRound(match, [], learning);
    match = setCountdownStep(match, 2);

    const paused = pauseMatchState(match);
    expect(paused.phase).toBe('paused');
    expect(paused.sealedCommitment).not.toBeNull();

    const resumed = resumeMatchState(paused);
    expect(resumed.phase).toBe('countdown');
    expect(resumed.countdownValue).toBe(2);
  });

  it('advances tournament stages and crowns champion after 3 stage wins', () => {
    let tourney = createInitialTournamentState();
    expect(tourney.stages.length).toBe(3);

    for (let s = 0; s < 3; s++) {
      const activeStage = tourney.stages[tourney.currentStageIndex];
      const finishedMatch = {
        ...createNewMatchState('tournament', activeStage.difficulty),
        playerScore: activeStage.targetWins,
        aiScore: 1,
        winner: 'player' as const,
        phase: 'match_complete' as const,
      };
      tourney = advanceTournamentAfterMatch(tourney, finishedMatch);
    }

    expect(tourney.completed).toBe(true);
    expect(tourney.champion).toBe(true);
    expect(tourney.bestStreak).toBe(3);
  });
});
