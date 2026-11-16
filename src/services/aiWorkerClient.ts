import { Difficulty, GameMode, RoundRecord, SealedAICommitment } from '../types/game';
import { lockAIPredictionForRound, PredictorConfig } from '../engine/aiPredictor';
import type { AIWorkerRequest, AIWorkerResponse } from '../workers/ai.worker';

export class AIWorkerClient {
  private worker: Worker | null = null;
  private pending = new Map<string, (commitment: SealedAICommitment) => void>();

  constructor() {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url), {
          type: 'module',
        });
        this.worker.onmessage = (event: MessageEvent<AIWorkerResponse>) => {
          const resolver = this.pending.get(event.data.requestId);
          if (resolver) {
            this.pending.delete(event.data.requestId);
            resolver(event.data.commitment);
          }
        };
        this.worker.onerror = () => {
          // Graceful fallback to synchronous execution if worker fails
          this.worker?.terminate();
          this.worker = null;
        };
      } catch {
        this.worker = null;
      }
    }
  }

  public async lockPrediction(
    roundId: string,
    roundNumber: number,
    history: readonly RoundRecord[],
    difficulty: Difficulty,
    mode: GameMode,
    config?: Partial<PredictorConfig>
  ): Promise<SealedAICommitment> {
    if (!this.worker) {
      return lockAIPredictionForRound(roundId, roundNumber, history, difficulty, mode, config);
    }

    return new Promise((resolve) => {
      const requestId = `${roundId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      this.pending.set(requestId, resolve);
      const req: AIWorkerRequest = {
        requestId,
        type: 'LOCK_PREDICTION',
        payload: {
          roundId,
          roundNumber,
          history: [...history],
          difficulty,
          mode,
          config,
        },
      };
      this.worker!.postMessage(req);
    });
  }

  public dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
  }
}
