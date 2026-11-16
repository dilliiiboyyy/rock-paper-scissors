import {
  DetectedGesture,
  Difficulty,
  GameMode,
  Gesture,
  LearningSnapshot,
  MatchRecord,
  RoundOutcome,
  RoundPhase,
  RoundRecord,
  SealedAICommitment,
  TournamentStage,
  TournamentState,
} from '../types/game';
import { updateLearningSnapshot } from './aiLearningManager';
import { computeOutcome, lockAIPredictionForRound } from './aiPredictor';

export interface ActiveMatchState {
  matchId: string;
  mode: GameMode;
  difficulty: Difficulty;
  startedAt: number;
  phase: RoundPhase;
  previousPhaseBeforePause: RoundPhase | null;
  roundNumber: number;
  playerScore: number;
  aiScore: number;
  draws: number;
  currentPlayerStreak: number;
  currentAIStreak: number;
  longestPlayerStreak: number;
  longestAIStreak: number;
  countdownValue: 3 | 2 | 1 | 'SHOOT' | null;
  sealedCommitment: SealedAICommitment | null;
  lastResolvedRound: RoundRecord | null;
  matchRounds: RoundRecord[];
  processedRoundIds: Set<string>;
  winner: 'player' | 'ai' | 'draw' | null;
}

export function getTargetWinsForMode(mode: GameMode, tournamentStage?: TournamentStage): number | null {
  switch (mode) {
    case 'first_to_five':
      return 5;
    case 'best_of_three':
      return 2;
    case 'tournament':
      return tournamentStage?.targetWins ?? 3;
    case 'quick_play':
    case 'practice':
    case 'ai_challenge':
    default:
      return null;
  }
}

export function createNewMatchState(
  mode: GameMode,
  difficulty: Difficulty,
  matchId = `match-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
): ActiveMatchState {
  return {
    matchId,
    mode,
    difficulty,
    startedAt: Date.now(),
    phase: 'idle',
    previousPhaseBeforePause: null,
    roundNumber: 1,
    playerScore: 0,
    aiScore: 0,
    draws: 0,
    currentPlayerStreak: 0,
    currentAIStreak: 0,
    longestPlayerStreak: 0,
    longestAIStreak: 0,
    countdownValue: null,
    sealedCommitment: null,
    lastResolvedRound: null,
    matchRounds: [],
    processedRoundIds: new Set<string>(),
    winner: null,
  };
}

/**
 * Steps 1-5 of the mandatory 11-step round order:
 * 1. Prepare the round
 * 2. Analyze historical player data
 * 3. Predict the next player gesture
 * 4. Select the AI counter-gesture
 * 5. Lock the AI decision (sealed before countdown & before player gesture exists)
 */
export function prepareAndLockRound(
  match: ActiveMatchState,
  allLearningHistory: readonly RoundRecord[],
  learningSnapshot: LearningSnapshot,
  rng: () => number = Math.random
): ActiveMatchState {
  if (match.phase === 'match_complete') {
    throw new Error('Cannot start a new round after match completion.');
  }
  const roundId = `${match.matchId}-r${match.roundNumber}`;
  const commitment = lockAIPredictionForRound(
    roundId,
    match.roundNumber,
    allLearningHistory,
    match.difficulty,
    match.mode,
    {
      expertReliability: learningSnapshot.expertReliability,
      rollingAccuracy: learningSnapshot.rollingAccuracy,
    },
    rng
  );

  return {
    ...match,
    phase: 'locked',
    sealedCommitment: commitment,
    countdownValue: 3,
  };
}

/**
 * Step 6: Advance countdown phase (3 -> 2 -> 1 -> SHOOT)
 */
export function setCountdownStep(
  match: ActiveMatchState,
  step: 3 | 2 | 1 | 'SHOOT'
): ActiveMatchState {
  if (!match.sealedCommitment) {
    throw new Error('Fairness violation: AI decision must be locked before countdown.');
  }
  return {
    ...match,
    phase: step === 'SHOOT' ? 'detecting' : 'countdown',
    countdownValue: step,
  };
}

/**
 * Steps 7-11:
 * 7. Detect the player's gesture
 * 8. Validate the gesture (reject invalid/uncertain/duplicate rounds)
 * 9. Reveal both gestures simultaneously
 * 10. Calculate the result
 * 11. Update the learning engine
 */
export function resolveRoundWithValidatedGesture(
  match: ActiveMatchState,
  detectedGesture: DetectedGesture,
  learningSnapshot: LearningSnapshot,
  allHistoryBeforeRound: readonly RoundRecord[],
  tournamentStage?: TournamentStage
): {
  accepted: boolean;
  reason?: string;
  nextMatch: ActiveMatchState;
  nextLearning: LearningSnapshot;
  roundRecord: RoundRecord | null;
  completedMatchRecord: MatchRecord | null;
} {
  // Step 8: Validate gesture
  if (detectedGesture === 'none' || detectedGesture === 'uncertain') {
    return {
      accepted: false,
      reason: 'Uncertain or missing gesture cannot complete a round.',
      nextMatch: match,
      nextLearning: learningSnapshot,
      roundRecord: null,
      completedMatchRecord: null,
    };
  }

  const commitment = match.sealedCommitment;
  if (!commitment) {
    return {
      accepted: false,
      reason: 'No sealed AI commitment exists for this round.',
      nextMatch: match,
      nextLearning: learningSnapshot,
      roundRecord: null,
      completedMatchRecord: null,
    };
  }

  // Prevent duplicate round resolution from repeated frames
  if (match.processedRoundIds.has(commitment.roundId)) {
    return {
      accepted: false,
      reason: 'Duplicate frame/round submission rejected.',
      nextMatch: match,
      nextLearning: learningSnapshot,
      roundRecord: null,
      completedMatchRecord: null,
    };
  }

  const playerMove: Gesture = detectedGesture;
  const playerDetectedAtMs = Date.now();

  // Fairness invariant: aiMove came from commitment locked BEFORE player gesture was detected
  const outcome: RoundOutcome = computeOutcome(playerMove, commitment.aiMove);
  const wasPredictionCorrect = commitment.predictedPlayerMove === playerMove;

  const tentativeRecord: RoundRecord = {
    id: commitment.roundId,
    matchId: match.matchId,
    roundNumber: commitment.roundNumber,
    timestamp: playerDetectedAtMs,
    mode: match.mode,
    difficulty: match.difficulty,
    predictedPlayerMove: commitment.predictedPlayerMove,
    aiCounterMove: commitment.aiMove,
    aiLockedAtMs: commitment.lockedAtMs,
    playerMove,
    playerDetectedAtMs,
    outcome,
    predictionConfidence: commitment.confidence,
    wasPredictionCorrect,
    detectedStrategy: commitment.breakdown.detectedStrategy,
    commentary: '',
    mood: learningSnapshot.mood,
  };

  // Step 11: Update learning engine (practice mode still records stats but uses gentle easy predictor)
  const nextLearning = updateLearningSnapshot(
    learningSnapshot,
    tentativeRecord,
    commitment.breakdown,
    allHistoryBeforeRound
  );

  const finalRoundRecord: RoundRecord = {
    ...tentativeRecord,
    commentary: nextLearning.lastCommentary,
    mood: nextLearning.mood,
  };

  let playerScore = match.playerScore;
  let aiScore = match.aiScore;
  let draws = match.draws;
  let currentPlayerStreak = match.currentPlayerStreak;
  let currentAIStreak = match.currentAIStreak;

  if (outcome === 'player_win') {
    playerScore += 1;
    currentPlayerStreak += 1;
    currentAIStreak = 0;
  } else if (outcome === 'ai_win') {
    aiScore += 1;
    currentAIStreak += 1;
    currentPlayerStreak = 0;
  } else {
    draws += 1;
  }

  const longestPlayerStreak = Math.max(match.longestPlayerStreak, currentPlayerStreak);
  const longestAIStreak = Math.max(match.longestAIStreak, currentAIStreak);

  const processedRoundIds = new Set(match.processedRoundIds);
  processedRoundIds.add(commitment.roundId);

  const matchRounds = [...match.matchRounds, finalRoundRecord];
  const targetWins = getTargetWinsForMode(match.mode, tournamentStage);
  let winner: 'player' | 'ai' | 'draw' | null = null;
  let nextPhase: RoundPhase = 'round_complete';

  if (targetWins !== null && (playerScore >= targetWins || aiScore >= targetWins)) {
    winner = playerScore >= targetWins ? 'player' : 'ai';
    nextPhase = 'match_complete';
  }

  const nextMatch: ActiveMatchState = {
    ...match,
    phase: nextPhase,
    roundNumber: nextPhase === 'match_complete' ? match.roundNumber : match.roundNumber + 1,
    playerScore,
    aiScore,
    draws,
    currentPlayerStreak,
    currentAIStreak,
    longestPlayerStreak,
    longestAIStreak,
    countdownValue: null,
    sealedCommitment: null,
    lastResolvedRound: finalRoundRecord,
    matchRounds,
    processedRoundIds,
    winner,
  };

  let completedMatchRecord: MatchRecord | null = null;
  if (nextPhase === 'match_complete' && winner) {
    const correctCount = matchRounds.filter((r) => r.wasPredictionCorrect).length;
    const avgConf =
      matchRounds.reduce((acc, r) => acc + r.predictionConfidence, 0) /
      Math.max(1, matchRounds.length);
    completedMatchRecord = {
      id: match.matchId,
      startedAt: match.startedAt,
      endedAt: Date.now(),
      mode: match.mode,
      difficulty: match.difficulty,
      playerScore,
      aiScore,
      draws,
      totalRounds: matchRounds.length,
      winner,
      predictionAccuracy: correctCount / Math.max(1, matchRounds.length),
      avgPredictionConfidence: avgConf,
      longestPlayerStreak,
      longestAIStreak,
    };
  }

  return {
    accepted: true,
    nextMatch,
    nextLearning,
    roundRecord: finalRoundRecord,
    completedMatchRecord,
  };
}

export function pauseMatchState(match: ActiveMatchState): ActiveMatchState {
  if (match.phase === 'paused' || match.phase === 'match_complete') return match;
  return {
    ...match,
    previousPhaseBeforePause: match.phase,
    phase: 'paused',
  };
}

export function resumeMatchState(match: ActiveMatchState): ActiveMatchState {
  if (match.phase !== 'paused') return match;
  return {
    ...match,
    phase: match.previousPhaseBeforePause ?? 'idle',
    previousPhaseBeforePause: null,
  };
}

export function createInitialTournamentState(): TournamentState {
  return {
    id: `tourney-${Date.now()}`,
    startedAt: Date.now(),
    currentStageIndex: 0,
    bestStreak: 0,
    currentStreak: 0,
    completed: false,
    champion: false,
    stages: [
      {
        stageNumber: 1,
        title: 'Stage I · Opening Calibration',
        subtitle: 'First to 3 wins against cautious adaptive logic',
        difficulty: 'easy',
        targetWins: 3,
        status: 'active',
        playerScore: 0,
        aiScore: 0,
      },
      {
        stageNumber: 2,
        title: 'Stage II · Pattern Duel',
        subtitle: 'First to 4 wins with full Markov & 2-gram prediction',
        difficulty: 'normal',
        targetWins: 4,
        status: 'locked',
        playerScore: 0,
        aiScore: 0,
      },
      {
        stageNumber: 3,
        title: 'Stage III · Championship Final',
        subtitle: 'First to 5 wins against rapid-adapting Hard AI',
        difficulty: 'hard',
        targetWins: 5,
        status: 'locked',
        playerScore: 0,
        aiScore: 0,
      },
    ],
  };
}

export function advanceTournamentAfterMatch(
  tournament: TournamentState,
  match: ActiveMatchState
): TournamentState {
  const idx = tournament.currentStageIndex;
  const stages = tournament.stages.map((s) => ({ ...s }));
  const current = stages[idx];
  if (!current) return tournament;

  const wonStage = match.winner === 'player';
  current.playerScore = match.playerScore;
  current.aiScore = match.aiScore;
  current.status = wonStage ? 'won' : 'lost';

  const currentStreak = wonStage ? tournament.currentStreak + 1 : 0;
  const bestStreak = Math.max(tournament.bestStreak, currentStreak);

  if (wonStage && idx + 1 < stages.length) {
    stages[idx + 1].status = 'active';
    return {
      ...tournament,
      stages,
      currentStageIndex: idx + 1,
      currentStreak,
      bestStreak,
      completed: false,
      champion: false,
    };
  }

  return {
    ...tournament,
    stages,
    currentStreak,
    bestStreak,
    completed: true,
    champion: wonStage && idx === stages.length - 1,
  };
}
