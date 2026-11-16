import { DetectedGesture, FrameQualityIssue, Gesture, HandLandmark } from '../types/game';

/**
 * MediaPipe 21 Hand Landmark indices:
 * 0: WRIST
 * 1-4: THUMB (CMC, MCP, IP, TIP)
 * 5-8: INDEX (MCP, PIP, DIP, TIP)
 * 9-12: MIDDLE (MCP, PIP, DIP, TIP)
 * 13-16: RING (MCP, PIP, DIP, TIP)
 * 17-20: PINKY (MCP, PIP, DIP, TIP)
 */

function dist2D(a: HandLandmark, b: HandLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function dist3D(a: HandLandmark, b: HandLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z - b.z) * 0.5);
}

/**
 * Angle at joint B formed by segments BA and BC (in degrees, 0..180).
 * Straight extended finger is ~165-180 deg; curled finger is < 105 deg.
 */
function jointAngleDeg(a: HandLandmark, b: HandLandmark, c: HandLandmark): number {
  const bax = a.x - b.x;
  const bay = a.y - b.y;
  const baz = (a.z - b.z) * 0.4;
  const bcx = c.x - b.x;
  const bcy = c.y - b.y;
  const bcz = (c.z - b.z) * 0.4;

  const dot = bax * bcx + bay * bcy + baz * bcz;
  const magA = Math.hypot(bax, bay, baz);
  const magC = Math.hypot(bcx, bcy, bcz);
  if (magA < 1e-6 || magC < 1e-6) return 180;
  const cosTheta = Math.max(-1, Math.min(1, dot / (magA * magC)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

export interface FingerExtensionState {
  thumbExtended: boolean;
  indexExtended: boolean;
  middleExtended: boolean;
  ringExtended: boolean;
  pinkyExtended: boolean;
  extendedCount: number;
  palmScale: number;
  featureVector: number[];
}

/**
 * Scale- and rotation-invariant finger extension analysis for both Left & Right hands.
 */
export function analyzeFingerExtensions(landmarks: HandLandmark[]): FingerExtensionState {
  const wrist = landmarks[0];
  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  const pinkyMcp = landmarks[17];

  // Palm size reference: distance from wrist to middle MCP + palm width
  const palmLength = Math.max(1e-4, dist3D(wrist, middleMcp));
  const palmWidth = Math.max(1e-4, dist3D(indexMcp, pinkyMcp));
  const palmScale = (palmLength + palmWidth) * 0.5;

  const checkFinger = (mcpIdx: number, pipIdx: number, dipIdx: number, tipIdx: number) => {
    const mcp = landmarks[mcpIdx];
    const pip = landmarks[pipIdx];
    const dip = landmarks[dipIdx];
    const tip = landmarks[tipIdx];

    const tipToWrist = dist3D(tip, wrist);
    const pipToWrist = dist3D(pip, wrist);
    const tipToMcp = dist3D(tip, mcp) / palmScale;
    const pipAngle = jointAngleDeg(mcp, pip, dip);
    const dipAngle = jointAngleDeg(pip, dip, tip);

    const isExtended =
      tipToWrist > pipToWrist * 1.12 &&
      tipToMcp > 0.72 &&
      pipAngle > 132 &&
      dipAngle > 135;

    const extensionRatio = Math.min(1.5, tipToMcp / 1.1);
    const curlScore = Math.min(1, ((pipAngle + dipAngle) / 2 - 70) / 110);
    return { isExtended, extensionRatio, curlScore };
  };

  // Thumb check: uses distance from pinky MCP & index MCP plus IP joint angle
  const thumbCmc = landmarks[1];
  const thumbMcp = landmarks[2];
  const thumbIp = landmarks[3];
  const thumbTip = landmarks[4];
  const thumbToPinkyMcp = dist3D(thumbTip, pinkyMcp) / palmScale;
  const thumbToIndexMcp = dist3D(thumbTip, indexMcp) / palmScale;
  const thumbAngle = jointAngleDeg(thumbCmc, thumbMcp, thumbTip);
  const thumbExtended =
    thumbToPinkyMcp > 1.05 && thumbToIndexMcp > 0.55 && thumbAngle > 138;

  const index = checkFinger(5, 6, 7, 8);
  const middle = checkFinger(9, 10, 11, 12);
  const ring = checkFinger(13, 14, 15, 16);
  const pinky = checkFinger(17, 18, 19, 20);

  const extendedCount =
    (thumbExtended ? 1 : 0) +
    (index.isExtended ? 1 : 0) +
    (middle.isExtended ? 1 : 0) +
    (ring.isExtended ? 1 : 0) +
    (pinky.isExtended ? 1 : 0);

  // Normalized 10-element feature vector for secondary prototype classifier
  const indexMiddleSpread = dist2D(landmarks[8], landmarks[12]) / palmScale;
  const featureVector = [
    thumbExtended ? 1 : 0,
    index.extensionRatio,
    middle.extensionRatio,
    ring.extensionRatio,
    pinky.extensionRatio,
    Math.max(0, index.curlScore),
    Math.max(0, middle.curlScore),
    Math.max(0, ring.curlScore),
    Math.max(0, pinky.curlScore),
    Math.min(1.5, indexMiddleSpread),
  ];

  return {
    thumbExtended,
    indexExtended: index.isExtended,
    middleExtended: middle.isExtended,
    ringExtended: ring.isExtended,
    pinkyExtended: pinky.isExtended,
    extendedCount,
    palmScale,
    featureVector,
  };
}

/**
 * Primary Geometric Classification from 21 hand landmarks.
 */
export function classifyGeometry(landmarks: HandLandmark[]): {
  gesture: DetectedGesture;
  confidence: number;
  state: FingerExtensionState;
} {
  if (!landmarks || landmarks.length < 21) {
    return {
      gesture: 'none',
      confidence: 0,
      state: {
        thumbExtended: false,
        indexExtended: false,
        middleExtended: false,
        ringExtended: false,
        pinkyExtended: false,
        extendedCount: 0,
        palmScale: 0,
        featureVector: [],
      },
    };
  }

  const state = analyzeFingerExtensions(landmarks);
  const { indexExtended, middleExtended, ringExtended, pinkyExtended, thumbExtended } = state;

  // Rock: all 4 main fingers curled
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    const curlAvg =
      (state.featureVector[5] +
        state.featureVector[6] +
        state.featureVector[7] +
        state.featureVector[8]) /
      4;
    const compactness = Math.max(0, 1 - curlAvg);
    const conf = Math.min(0.98, 0.78 + compactness * 0.2 - (thumbExtended ? 0.08 : 0));
    return { gesture: 'rock', confidence: conf, state };
  }

  // Paper: index, middle, ring, pinky all extended (thumb optional/usually extended)
  if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
    const extAvg =
      (state.featureVector[1] +
        state.featureVector[2] +
        state.featureVector[3] +
        state.featureVector[4]) /
      4;
    const conf = Math.min(0.99, 0.76 + Math.min(0.2, extAvg * 0.14) + (thumbExtended ? 0.05 : 0));
    return { gesture: 'paper', confidence: conf, state };
  }

  // Scissors: index + middle extended, ring + pinky curled (thumb tucked or neutral)
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    const spreadBonus = state.featureVector[9] > 0.28 ? 0.08 : 0;
    const conf = Math.min(0.98, 0.84 + spreadBonus - (thumbExtended ? 0.04 : 0));
    return { gesture: 'scissors', confidence: conf, state };
  }

  // Near-match tolerances for slight ring/pinky drift in fast play
  const nonThumbExtended =
    (indexExtended ? 1 : 0) +
    (middleExtended ? 1 : 0) +
    (ringExtended ? 1 : 0) +
    (pinkyExtended ? 1 : 0);

  if (nonThumbExtended === 3 && indexExtended && middleExtended && ringExtended && !pinkyExtended) {
    return { gesture: 'paper', confidence: 0.66, state };
  }

  return { gesture: 'uncertain', confidence: 0.35, state };
}

/**
 * Secondary Lightweight Prototype/Cosine Classifier on normalized 10D landmark features.
 * Independent from rule thresholds; computes softmax similarity to calibrated RPS prototypes.
 */
const PROTOTYPES: Record<Gesture, number[]> = {
  rock: [0.05, 0.32, 0.3, 0.28, 0.26, 0.1, 0.1, 0.1, 0.1, 0.18],
  paper: [0.95, 1.05, 1.08, 1.04, 0.96, 0.92, 0.94, 0.92, 0.9, 0.34],
  scissors: [0.15, 1.05, 1.06, 0.3, 0.28, 0.92, 0.93, 0.12, 0.12, 0.58],
};

export function classifySecondaryPrototype(featureVector: number[]): {
  gesture: DetectedGesture;
  confidence: number;
} {
  if (featureVector.length !== 10) {
    return { gesture: 'none', confidence: 0 };
  }

  const logits: Record<Gesture, number> = { rock: 0, paper: 0, scissors: 0 };
  for (const g of ['rock', 'paper', 'scissors'] as const) {
    const proto = PROTOTYPES[g];
    let sqDist = 0;
    for (let i = 0; i < 10; i++) {
      const diff = featureVector[i] - proto[i];
      sqDist += diff * diff;
    }
    logits[g] = Math.exp(-sqDist * 1.85);
  }

  const sum = logits.rock + logits.paper + logits.scissors;
  if (sum <= 1e-8) {
    return { gesture: 'uncertain', confidence: 0.33 };
  }

  const probs = {
    rock: logits.rock / sum,
    paper: logits.paper / sum,
    scissors: logits.scissors / sum,
  };

  let best: Gesture = 'rock';
  if (probs.paper > probs[best]) best = 'paper';
  if (probs.scissors > probs[best]) best = 'scissors';

  const conf = probs[best];
  return {
    gesture: conf >= 0.55 ? best : 'uncertain',
    confidence: conf,
  };
}

/**
 * Evaluates hand framing/distance/multi-hand positioning quality from landmarks.
 */
export function assessHandFraming(allHands: HandLandmark[][]): FrameQualityIssue[] {
  const issues: FrameQualityIssue[] = [];
  if (!allHands || allHands.length === 0) {
    issues.push('no_hand');
    return issues;
  }
  if (allHands.length > 1) {
    issues.push('multiple_hands');
  }

  const hand = allHands[0];
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  for (const pt of hand) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const area = width * height;

  if (area > 0.62 || width > 0.85 || height > 0.88) {
    issues.push('too_close');
  } else if (area < 0.018 || (width < 0.11 && height < 0.12)) {
    issues.push('too_far');
  }

  if (minX < 0.025 || maxX > 0.975 || minY < 0.025 || maxY > 0.975) {
    issues.push('edge_clipped');
  }

  return issues;
}
