# Tactile Oracle — Adaptive Rock-Paper-Scissors Arcade

A real-time webcam Rock-Paper-Scissors arcade experience where a machine opponent learns your behavioral patterns, predicts your next move before the countdown starts, and adapts as you change strategies.

## Installation & Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in a modern desktop or mobile browser.

## Build & Verification

```bash
npm run lint     # TypeScript type-check
npm test         # Automated Vitest suite (AI, fairness, CV geometry, game state)
npm run build    # Production Vite + PWA bundle
```

## Computer Vision Architecture

- **Primary Pipeline**: `@mediapipe/tasks-vision` (`GestureRecognizer` + `HandLandmarker`) running on video streams with 21 3D hand landmarks, left/right handedness, and gesture confidence scores.
- **Secondary Validation**: Pure TypeScript scale- and rotation-invariant 21-landmark geometric analyzer (`src/vision/gestureGeometry.ts`) paired with a 10-feature prototype softmax classifier, fused with MediaPipe scores in `src/vision/gestureClassifier.ts`.
- **Technology Selection Rationale**: TensorFlow.js and ONNX Runtime Web were evaluated and intentionally omitted to avoid multi-megabyte redundant runtime overhead, as MediaPipe Tasks Vision + our sub-millisecond normalized landmark prototype classifier deliver superior latency and reliability.
- **Hardware Acceleration & Fallback**: Automatically probes WebGPU (`navigator.gpu`), then WebGL, and falls back gracefully to CPU WebAssembly (`wasm`) if hardware acceleration is unavailable.
- **Validation & Quality Guards**: Temporal sliding-window smoothing, stability thresholds, post-round cooldowns, duplicate round rejection, low-light brightness checks, motion-blur detection, distance/clipping warnings, and multi-hand blocking.

## Adaptive AI Architecture & Fairness

1. **Frequency Analysis**: Laplace-smoothed throw distribution.
2. **Markov Transitions**: 1st-order transition matrix $P(M_t \mid M_{t-1})$ and outcome-conditioned Win-Stay / Lose-Shift transitions $P(M_t \mid M_{t-1}, O_{t-1})$.
3. **N-Gram Sequences**: 2-gram and 3-gram exact pattern matchers with recency decay.
4. **Recent Behavior Window**: Exponentially weighted short window with Total Variation Distance shift detection.
5. **Weighted Ensemble**: Dynamically updates each sub-predictor's empirical reliability weight and blends weak signals toward a balanced mixed strategy.
6. **Honest Pre-Countdown Locking**: `lockAIPredictionForRound` seals the AI's prediction and counter-move into a `SealedAICommitment` **before** the `3-2-1-SHOOT!` countdown starts. The current round's player gesture never touches prediction code.

## Fallback Behavior

- **Camera Denied / Unavailable**: Clear recovery prompt with retry and an explicit **No Camera Mode (Keyboard Fallback)** (`R`/`1`, `P`/`2`, `S`/`3`) clearly marked as manual input.
- **WebGPU/WebGL Unavailable**: Automatic fallback to MediaPipe CPU WASM delegate.
- **Web Worker Unavailable**: `AIWorkerClient` automatically falls back to synchronous local execution.
- **Offline Play**: Configured via `vite-plugin-pwa` with Workbox runtime caching for app assets, fonts, and MediaPipe WASM/model bundles.
