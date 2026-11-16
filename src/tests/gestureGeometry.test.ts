import { describe, expect, it } from 'vitest';
import { HandLandmark } from '../types/game';
import {
  assessHandFraming,
  classifyGeometry,
  classifySecondaryPrototype,
} from '../vision/gestureGeometry';
import {
  canAcceptRoundGesture,
  createValidationState,
  markRoundGestureConfirmed,
  pushFrameToValidation,
} from '../vision/gestureValidation';

/**
 * Generates realistic synthetic 21-landmark hand coordinates for testing.
 */
function makeSyntheticHand(
  pose: 'rock' | 'paper' | 'scissors' | 'uncertain',
  options: { handedness?: 'Left' | 'Right'; scale?: number; offsetX?: number; offsetY?: number } = {}
): HandLandmark[] {
  const mirror = options.handedness === 'Left' ? -1 : 1;
  const scale = options.scale ?? 1.0;
  const ox = options.offsetX ?? 0.5;
  const oy = options.offsetY ?? 0.72;

  const pt = (dx: number, dy: number): HandLandmark => ({
    x: ox + dx * mirror * scale,
    y: oy + dy * scale,
    z: 0,
  });

  // Wrist & base MCPs
  const lm: HandLandmark[] = Array(21).fill(null).map(() => pt(0, 0));
  lm[0] = pt(0, 0); // Wrist
  lm[1] = pt(-0.04, -0.05);
  lm[2] = pt(-0.07, -0.1);
  lm[5] = pt(-0.04, -0.18); // Index MCP
  lm[9] = pt(0.0, -0.19); // Middle MCP
  lm[13] = pt(0.04, -0.18); // Ring MCP
  lm[17] = pt(0.08, -0.16); // Pinky MCP

  const setExtended = (mcpIdx: number, baseX: number, spreadX = 0) => {
    lm[mcpIdx + 1] = pt(baseX + spreadX * 0.3, -0.26);
    lm[mcpIdx + 2] = pt(baseX + spreadX * 0.65, -0.32);
    lm[mcpIdx + 3] = pt(baseX + spreadX, -0.38);
  };

  const setCurled = (mcpIdx: number, baseX: number) => {
    lm[mcpIdx + 1] = pt(baseX, -0.22);
    lm[mcpIdx + 2] = pt(baseX, -0.17);
    lm[mcpIdx + 3] = pt(baseX, -0.13);
  };

  if (pose === 'rock') {
    lm[3] = pt(-0.05, -0.14);
    lm[4] = pt(-0.01, -0.15); // tucked thumb
    setCurled(5, -0.04);
    setCurled(9, 0.0);
    setCurled(13, 0.04);
    setCurled(17, 0.08);
  } else if (pose === 'paper') {
    lm[3] = pt(-0.11, -0.14);
    lm[4] = pt(-0.14, -0.18); // extended thumb
    setExtended(5, -0.05, -0.01);
    setExtended(9, 0.0, 0);
    setExtended(13, 0.05, 0.01);
    setExtended(17, 0.09, 0.02);
  } else if (pose === 'scissors') {
    lm[3] = pt(-0.03, -0.14);
    lm[4] = pt(0.0, -0.14); // tucked thumb
    setExtended(5, -0.04, -0.05);
    setExtended(9, 0.0, 0.04);
    setCurled(13, 0.04);
    setCurled(17, 0.08);
  } else {
    // Ambiguous half-pose
    lm[3] = pt(-0.05, -0.14);
    lm[4] = pt(-0.01, -0.14);
    setExtended(5, -0.04, 0);
    setCurled(9, 0.0);
    setCurled(13, 0.04);
    setExtended(17, 0.08, 0);
  }

  return lm;
}

describe('Computer Vision Landmark Geometry & Validation', () => {
  it('classifies Rock, Paper, and Scissors accurately for both Right and Left hands', () => {
    for (const handedness of ['Right', 'Left'] as const) {
      for (const pose of ['rock', 'paper', 'scissors'] as const) {
        const landmarks = makeSyntheticHand(pose, { handedness });
        const geo = classifyGeometry(landmarks);
        const sec = classifySecondaryPrototype(geo.state.featureVector);
        expect(geo.gesture).toBe(pose);
        expect(geo.confidence).toBeGreaterThan(0.75);
        expect(sec.gesture).toBe(pose);
      }
    }
  });

  it('handles different camera distances (scale invariance)', () => {
    const close = makeSyntheticHand('scissors', { scale: 1.5 });
    const far = makeSyntheticHand('scissors', { scale: 0.55 });
    expect(classifyGeometry(close).gesture).toBe('scissors');
    expect(classifyGeometry(far).gesture).toBe('scissors');
  });

  it('flags uncertain/ambiguous gestures as uncertain rather than guessing', () => {
    const ambiguous = makeSyntheticHand('uncertain');
    const geo = classifyGeometry(ambiguous);
    expect(geo.gesture).toBe('uncertain');
  });

  it('detects no hand, multiple hands, too close, too far, and edge clipping issues', () => {
    expect(assessHandFraming([])).toContain('no_hand');

    const h1 = makeSyntheticHand('paper');
    const h2 = makeSyntheticHand('rock', { offsetX: 0.7 });
    expect(assessHandFraming([h1, h2])).toContain('multiple_hands');

    const tooFar = makeSyntheticHand('rock', { scale: 0.25 });
    expect(assessHandFraming([tooFar])).toContain('too_far');

    const clipped = makeSyntheticHand('paper', { offsetX: 0.02, offsetY: 0.4 });
    expect(assessHandFraming([clipped])).toContain('edge_clipped');
  });

  it('enforces temporal smoothing stability, cooldown, and duplicate round blocking', () => {
    let val = createValidationState();
    const baseTime = 10_000;

    // 2 frames is not enough stability yet
    for (let i = 0; i < 2; i++) {
      val = pushFrameToValidation(val, {
        gesture: 'rock',
        confidence: 0.9,
        timestamp: baseTime + i * 50,
        qualityIssues: [],
      });
    }
    expect(canAcceptRoundGesture(val, 'r1', baseTime + 100).allowed).toBe(false);

    // 4+ consistent frames passes window agreement
    for (let i = 2; i < 5; i++) {
      val = pushFrameToValidation(val, {
        gesture: 'rock',
        confidence: 0.9,
        timestamp: baseTime + i * 50,
        qualityIssues: [],
      });
    }
    const ok = canAcceptRoundGesture(val, 'r1', baseTime + 250);
    expect(ok.allowed).toBe(true);
    expect(ok.gesture).toBe('rock');

    // Mark confirmed -> blocks duplicate roundId and blocks next round during cooldown
    val = markRoundGestureConfirmed(val, 'r1', baseTime + 250);
    expect(canAcceptRoundGesture(val, 'r1', baseTime + 2000).allowed).toBe(false);
    expect(canAcceptRoundGesture(val, 'r2', baseTime + 400).allowed).toBe(false);
    expect(canAcceptRoundGesture(val, 'r2', baseTime + 1300).allowed).toBe(true);
  });
});
