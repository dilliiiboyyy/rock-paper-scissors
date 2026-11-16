import { Difficulty, GameMode, RoundRecord, SealedAICommitment } from '../types/game';
import { lockAIPredictionForRound, PredictorConfig } from '../engine/aiPredictor';

export interface AIWorkerRequest {
  requestId: string;
  type: 'LOCK_PREDICTION';
  payload: {
    roundId: string;
    roundNumber: number;
    history: RoundRecord[];
    difficulty: Difficulty;
    mode: GameMode;
    config?: Partial<PredictorConfig>;
  };
}

export interface AIWorkerResponse {
  requestId: string;
  commitment: SealedAICommitment;
}

self.onmessage = (event: MessageEvent<AIWorkerRequest>) => {
  const { requestId, type, payload } = event.data;
  if (type === 'LOCK_PREDICTION') {
    const commitment = lockAIPredictionForRound(
      payload.roundId,
      payload.roundNumber,
      payload.history,
      payload.difficulty,
      payload.mode,
      payload.config
    );
    const response: AIWorkerResponse = { requestId, commitment };
    self.postMessage(response);
  }
};
