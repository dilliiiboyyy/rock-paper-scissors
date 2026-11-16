import { DetectedGesture, Gesture } from '../types/game';
import {
  classifyGeometry,
  classifySecondaryPrototype,
} from './gestureGeometry';
import { HandLandmark } from '../types/game';

function mapMediaPipeLabel(categoryName: string): DetectedGesture {
  switch (categoryName) {
    case 'Closed_Fist':
      return 'rock';
    case 'Open_Palm':
      return 'paper';
    case 'Victory':
      return 'scissors';
    default:
      return 'uncertain';
  }
}

export interface FusedClassification {
  gesture: DetectedGesture;
  confidence: number;
  mediapipeGesture: DetectedGesture;
  mediapipeConfidence: number;
  geometricGesture: DetectedGesture;
  geometricConfidence: number;
  secondaryGesture: DetectedGesture;
  secondaryConfidence: number;
}

/**
 * Combines MediaPipe GestureRecognizer output with 21-landmark Geometric Classification
 * and the Secondary 10D Prototype Classifier for robust consensus.
 */
export function fuseGestureClassifications(
  landmarks: HandLandmark[] | null,
  mpCategoryName: string | null,
  mpScore: number
): FusedClassification {
  if (!landmarks || landmarks.length < 21) {
    return {
      gesture: 'none',
      confidence: 0,
      mediapipeGesture: 'none',
      mediapipeConfidence: 0,
      geometricGesture: 'none',
      geometricConfidence: 0,
      secondaryGesture: 'none',
      secondaryConfidence: 0,
    };
  }

  const mpGesture = mpCategoryName ? mapMediaPipeLabel(mpCategoryName) : 'uncertain';
  const mpConf = mpGesture === 'uncertain' ? 0 : mpScore;

  const geo = classifyGeometry(landmarks);
  const secondary = classifySecondaryPrototype(geo.state.featureVector);

  // Weighted voting across the three independent signals
  const votes: Record<Gesture, number> = { rock: 0, paper: 0, scissors: 0 };

  if (geo.gesture === 'rock' || geo.gesture === 'paper' || geo.gesture === 'scissors') {
    votes[geo.gesture] += geo.confidence * 0.48;
  }
  if (mpGesture === 'rock' || mpGesture === 'paper' || mpGesture === 'scissors') {
    votes[mpGesture] += mpConf * 0.34;
  }
  if (
    secondary.gesture === 'rock' ||
    secondary.gesture === 'paper' ||
    secondary.gesture === 'scissors'
  ) {
    votes[secondary.gesture] += secondary.confidence * 0.18;
  }

  const totalVote = votes.rock + votes.paper + votes.scissors;
  if (totalVote <= 0.15) {
    return {
      gesture: 'uncertain',
      confidence: 0.2,
      mediapipeGesture: mpGesture,
      mediapipeConfidence: mpConf,
      geometricGesture: geo.gesture,
      geometricConfidence: geo.confidence,
      secondaryGesture: secondary.gesture,
      secondaryConfidence: secondary.confidence,
    };
  }

  let best: Gesture = 'rock';
  if (votes.paper > votes[best]) best = 'paper';
  if (votes.scissors > votes[best]) best = 'scissors';

  // Normalize confidence relative to consensus agreement
  const rawScore = votes[best];
  const agreementBonus =
    (geo.gesture === best ? 0.06 : 0) +
    (mpGesture === best ? 0.05 : 0) +
    (secondary.gesture === best ? 0.04 : 0);

  const finalConfidence = Math.min(0.99, Math.max(0.25, rawScore + agreementBonus));
  const finalGesture: DetectedGesture = finalConfidence >= 0.56 ? best : 'uncertain';

  return {
    gesture: finalGesture,
    confidence: Math.round(finalConfidence * 1000) / 1000,
    mediapipeGesture: mpGesture,
    mediapipeConfidence: Math.round(mpConf * 1000) / 1000,
    geometricGesture: geo.gesture,
    geometricConfidence: Math.round(geo.confidence * 1000) / 1000,
    secondaryGesture: secondary.gesture,
    secondaryConfidence: Math.round(secondary.confidence * 1000) / 1000,
  };
}
