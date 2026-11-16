export type Gesture = 'rock' | 'paper' | 'scissors';

export type DetectedGesture = Gesture | 'none' | 'uncertain';

export type RoundOutcome = 'player_win' | 'ai_win' | 'draw';

export type GameMode =
  | 'quick_play'
  | 'first_to_five'
  | 'best_of_three'
  | 'practice'
  | 'ai_challenge'
  | 'tournament';

export type Difficulty = 'easy' | 'normal' | 'hard';

export type AIPersonalityMood =
  | 'curious'
  | 'confident'
  | 'competitive'
  | 'surprised'
  | 'cautious';

export type DetectedStrategy =
  | 'cold_start'
  | 'random'
  | 'frequency_bias'
  | 'markov_habit'
  | 'cyclic'
  | 'sequence_pattern'
  | 'strategy_shift';

export type RoundPhase =
  | 'idle'
  | 'preparing'
  | 'analyzing'
  | 'predicting'
  | 'locked'
  | 'countdown'
  | 'detecting'
  | 'validating'
  | 'revealing'
  | 'calculating'
  | 'updating'
  | 'round_complete'
  | 'match_complete'
  | 'paused';

export type InferenceBackend = 'auto' | 'webgpu' | 'webgl' | 'wasm';
export type ActiveBackend = 'webgpu' | 'webgl' | 'wasm';

export type CameraQuality = 'low' | 'balanced' | 'high';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export type FrameQualityIssue =
  | 'no_hand'
  | 'multiple_hands'
  | 'low_confidence'
  | 'too_close'
  | 'too_far'
  | 'edge_clipped'
  | 'low_light'
  | 'motion_blur';

export interface CVFrameResult {
  timestamp: number;
  handCount: number;
  landmarks: HandLandmark[] | null;
  allHandsLandmarks: HandLandmark[][];
  handedness: 'Left' | 'Right' | 'Unknown';
  gesture: DetectedGesture;
  confidence: number;
  mediapipeGesture: DetectedGesture;
  mediapipeConfidence: number;
  geometricGesture: DetectedGesture;
  geometricConfidence: number;
  secondaryGesture: DetectedGesture;
  secondaryConfidence: number;
  qualityIssues: FrameQualityIssue[];
  inferenceLatencyMs: number;
  fps: number;
  backend: ActiveBackend;
  brightnessScore: number;
  motionScore: number;
}

export interface GestureProbabilities {
  rock: number;
  paper: number;
  scissors: number;
}

export interface MethodContribution {
  method: 'frequency' | 'markov' | 'outcome_markov' | 'ngram' | 'recent';
  label: string;
  probabilities: GestureProbabilities;
  weight: number;
  supportCount: number;
}

export interface DiscoveredPattern {
  id: string;
  pattern: string;
  predictedNext: Gesture;
  confidence: number;
  occurrences: number;
  type: 'sequence' | 'transition' | 'bias' | 'shift';
}

export interface PredictionBreakdown {
  predictedPlayerMove: Gesture;
  aiCounterMove: Gesture;
  confidence: number;
  probabilities: GestureProbabilities;
  methodContributions: MethodContribution[];
  detectedStrategy: DetectedStrategy;
  topPatterns: DiscoveredPattern[];
  explanation: string;
}

export interface SealedAICommitment {
  roundId: string;
  roundNumber: number;
  lockedAtMs: number;
  predictedPlayerMove: Gesture;
  aiMove: Gesture;
  confidence: number;
  breakdown: PredictionBreakdown;
}

export interface RoundRecord {
  id: string;
  matchId: string;
  roundNumber: number;
  timestamp: number;
  mode: GameMode;
  difficulty: Difficulty;
  predictedPlayerMove: Gesture;
  aiCounterMove: Gesture;
  aiLockedAtMs: number;
  playerMove: Gesture;
  playerDetectedAtMs: number;
  outcome: RoundOutcome;
  predictionConfidence: number;
  wasPredictionCorrect: boolean;
  detectedStrategy: DetectedStrategy;
  commentary: string;
  mood: AIPersonalityMood;
}

export interface LearningActivityEvent {
  id: string;
  timestamp: number;
  roundNumber: number;
  type: 'pattern_discovered' | 'sequence_repeated' | 'strategy_shift' | 'confidence_change';
  message: string;
}

export interface PerGestureAccuracy {
  rock: { predicted: number; correct: number };
  paper: { predicted: number; correct: number };
  scissors: { predicted: number; correct: number };
}

export interface LearningSnapshot {
  totalObservations: number;
  gestureCounts: Record<Gesture, number>;
  predictionsMade: number;
  correctPredictions: number;
  incorrectPredictions: number;
  rollingAccuracy: number;
  baselineFrequencyAccuracy: number;
  baselineRandomAccuracy: number;
  perGestureAccuracy: PerGestureAccuracy;
  expertReliability: Record<'frequency' | 'markov' | 'outcome_markov' | 'ngram' | 'recent', number>;
  recentActivity: LearningActivityEvent[];
  mood: AIPersonalityMood;
  lastCommentary: string;
  accuracyHistory: Array<{ round: number; rollingAccuracy: number; confidence: number; aiWinRate: number }>;
}

export interface MatchRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  mode: GameMode;
  difficulty: Difficulty;
  playerScore: number;
  aiScore: number;
  draws: number;
  totalRounds: number;
  winner: 'player' | 'ai' | 'draw';
  predictionAccuracy: number;
  avgPredictionConfidence: number;
  longestPlayerStreak: number;
  longestAIStreak: number;
}

export interface TournamentStage {
  stageNumber: number;
  title: string;
  subtitle: string;
  difficulty: Difficulty;
  targetWins: number;
  status: 'locked' | 'active' | 'won' | 'lost';
  playerScore: number;
  aiScore: number;
}

export interface TournamentState {
  id: string;
  startedAt: number;
  currentStageIndex: number;
  stages: TournamentStage[];
  bestStreak: number;
  currentStreak: number;
  completed: boolean;
  champion: boolean;
}

export interface TournamentRecord {
  id: string;
  completedAt: number;
  champion: boolean;
  stagesWon: number;
  totalRounds: number;
  bestStreak: number;
}

export interface CalibrationStatus {
  rockVerified: boolean;
  paperVerified: boolean;
  scissorsVerified: boolean;
  completedAt: number | null;
}

export interface AppSettings {
  cameraId: string;
  cameraQuality: CameraQuality;
  inferenceBackend: InferenceBackend;
  difficulty: Difficulty;
  masterVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
  soundEnabled: boolean;
  ambienceEnabled: boolean;
  reducedMotion: boolean;
  privacyAcknowledged: boolean;
  tutorialCompleted: boolean;
  inputMode: 'webcam' | 'manual_fallback';
}
