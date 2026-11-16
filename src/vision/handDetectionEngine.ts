import {
  FilesetResolver,
  GestureRecognizer,
  HandLandmarker,
} from '@mediapipe/tasks-vision';
import { ActiveBackend, CVFrameResult, FrameQualityIssue, HandLandmark, InferenceBackend } from '../types/game';
import { FrameQualityAnalysis } from './cameraManager';
import { fuseGestureClassifications } from './gestureClassifier';
import { assessHandFraming } from './gestureGeometry';

const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm';
const GESTURE_RECOGNIZER_MODEL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';
const HAND_LANDMARKER_MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const TFLITE_INFO_PATTERN =
  /^(?:INFO:\s*Created TensorFlow Lite|I\d{4}\s+.*xnnpack|W\d{4}\s+.*GL version)/i;

let consoleFilterInstalled = false;
function installMediaPipeInfoLogFilter(): void {
  if (consoleFilterInstalled || typeof console === 'undefined') return;
  consoleFilterInstalled = true;
  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const first = typeof args[0] === 'string' ? args[0] : '';
    if (TFLITE_INFO_PATTERN.test(first.trim())) {
      console.info(...args);
      return;
    }
    originalError(...args);
  };
}

export class HandDetectionEngine {
  private gestureRecognizer: GestureRecognizer | null = null;
  private handLandmarker: HandLandmarker | null = null;
  private activeBackend: ActiveBackend = 'wasm';
  private initialized = false;
  private initializingPromise: Promise<void> | null = null;
  private lastTimestampMs = -1;
  private fpsSamples: number[] = [];
  private lastFrameAtMs = 0;

  public async detectBestBackend(preferred: InferenceBackend): Promise<ActiveBackend> {
    if (preferred === 'wasm') return 'wasm';
    if (preferred === 'webgl') {
      return this.hasWebGL() ? 'webgl' : 'wasm';
    }
    if (preferred === 'webgpu') {
      if (await this.hasWebGPU()) return 'webgpu';
      return this.hasWebGL() ? 'webgl' : 'wasm';
    }
    if (await this.hasWebGPU()) {
      return 'webgpu';
    }
    if (this.hasWebGL()) return 'webgl';
    return 'wasm';
  }

  private async hasWebGPU(): Promise<boolean> {
    try {
      const nav = navigator as Navigator & { gpu?: { requestAdapter?: () => Promise<unknown> } };
      if (!nav.gpu?.requestAdapter) return false;
      const adapter = await nav.gpu.requestAdapter();
      return Boolean(adapter);
    } catch {
      return false;
    }
  }

  private hasWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
      return false;
    }
  }

  public async initialize(
    preferredBackend: InferenceBackend = 'auto',
    onProgress?: (stage: string) => void
  ): Promise<ActiveBackend> {
    if (this.initialized) return this.activeBackend;
    if (this.initializingPromise) {
      await this.initializingPromise;
      return this.activeBackend;
    }

    installMediaPipeInfoLogFilter();

    this.initializingPromise = (async () => {
      onProgress?.('Checking GPU / WASM acceleration...');
      const selected = await this.detectBestBackend(preferredBackend);
      const useGpuDelegate = selected === 'webgpu' || selected === 'webgl';

      onProgress?.('Loading MediaPipe vision runtime...');
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

      const createWithDelegate = async (delegate: 'GPU' | 'CPU') => {
        onProgress?.(`Loading Gesture Recognizer (${delegate})...`);
        const gr = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: GESTURE_RECOGNIZER_MODEL,
            delegate,
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });
        return { gr };
      };

      try {
        const { gr } = await createWithDelegate(useGpuDelegate ? 'GPU' : 'CPU');
        this.gestureRecognizer = gr;
        this.activeBackend = selected;
      } catch {
        // Graceful fallback to CPU WASM delegate
        onProgress?.('GPU delegate unavailable — falling back to WASM...');
        try {
          const { gr } = await createWithDelegate('CPU');
          this.gestureRecognizer = gr;
          this.activeBackend = 'wasm';
        } catch {
          onProgress?.('Falling back to 21-Landmark Hand Tracker...');
          this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: HAND_LANDMARKER_MODEL,
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.55,
            minHandPresenceConfidence: 0.55,
            minTrackingConfidence: 0.55,
          });
          this.activeBackend = 'wasm';
        }
      }

      this.initialized = true;
    })();

    try {
      await this.initializingPromise;
    } finally {
      this.initializingPromise = null;
    }

    return this.activeBackend;
  }

  public getBackend(): ActiveBackend {
    return this.activeBackend;
  }

  public isReady(): boolean {
    return this.initialized && Boolean(this.gestureRecognizer || this.handLandmarker);
  }

  /**
   * Processes one video frame.
   * Uses GestureRecognizer as primary pipeline (returns landmarks, handedness, AND gesture label/score),
   * falling back to HandLandmarker if GestureRecognizer misses landmarks.
   */
  public processVideoFrame(
    video: HTMLVideoElement,
    frameQuality: FrameQualityAnalysis
  ): CVFrameResult {
    const startPerf = performance.now();
    const nowMs = Math.max(this.lastTimestampMs + 1, Math.round(startPerf));
    this.lastTimestampMs = nowMs;

    if (this.lastFrameAtMs > 0) {
      const dt = Math.max(1, startPerf - this.lastFrameAtMs);
      this.fpsSamples.push(1000 / dt);
      if (this.fpsSamples.length > 20) this.fpsSamples.shift();
    }
    this.lastFrameAtMs = startPerf;
    const avgFps =
      this.fpsSamples.length > 0
        ? Math.round(this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length)
        : 0;

    if (!this.isReady() || video.readyState < 2 || video.videoWidth === 0) {
      return {
        timestamp: Date.now(),
        handCount: 0,
        landmarks: null,
        allHandsLandmarks: [],
        handedness: 'Unknown',
        gesture: 'none',
        confidence: 0,
        mediapipeGesture: 'none',
        mediapipeConfidence: 0,
        geometricGesture: 'none',
        geometricConfidence: 0,
        secondaryGesture: 'none',
        secondaryConfidence: 0,
        qualityIssues: ['no_hand'],
        inferenceLatencyMs: 0,
        fps: avgFps,
        backend: this.activeBackend,
        brightnessScore: frameQuality.brightnessScore,
        motionScore: frameQuality.motionScore,
      };
    }

    let allHands: HandLandmark[][] = [];
    let handedness: 'Left' | 'Right' | 'Unknown' = 'Unknown';
    let mpCategory: string | null = null;
    let mpScore = 0;

    if (this.gestureRecognizer) {
      const rec = this.gestureRecognizer.recognizeForVideo(video, nowMs);
      if (rec.landmarks && rec.landmarks.length > 0) {
        allHands = rec.landmarks.map((hand) =>
          hand.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z }))
        );
      }
      if (rec.handedness?.[0]?.[0]?.categoryName) {
        const h = rec.handedness[0][0].categoryName;
        handedness = h === 'Left' ? 'Left' : h === 'Right' ? 'Right' : 'Unknown';
      }
      if (rec.gestures?.[0]?.[0]) {
        mpCategory = rec.gestures[0][0].categoryName;
        mpScore = rec.gestures[0][0].score;
      }
    }

    // Secondary HandLandmarker validation if primary returned no hand during active frame
    if (allHands.length === 0 && this.handLandmarker) {
      const hlRes = this.handLandmarker.detectForVideo(video, nowMs);
      if (hlRes.landmarks && hlRes.landmarks.length > 0) {
        allHands = hlRes.landmarks.map((hand) =>
          hand.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z }))
        );
        if (hlRes.handednesses?.[0]?.[0]?.categoryName) {
          const h = hlRes.handednesses[0][0].categoryName;
          handedness = h === 'Left' ? 'Left' : h === 'Right' ? 'Right' : 'Unknown';
        }
      }
    }

    const primaryLandmarks = allHands[0] ?? null;
    const fused = fuseGestureClassifications(primaryLandmarks, mpCategory, mpScore);
    const qualityIssues: FrameQualityIssue[] = assessHandFraming(allHands);

    if (frameQuality.isLowLight) qualityIssues.push('low_light');
    if (frameQuality.isHighMotionBlur) qualityIssues.push('motion_blur');
    if (primaryLandmarks && fused.confidence < 0.62 && !qualityIssues.includes('low_confidence')) {
      qualityIssues.push('low_confidence');
    }

    const inferenceLatencyMs = Math.round((performance.now() - startPerf) * 10) / 10;

    return {
      timestamp: Date.now(),
      handCount: allHands.length,
      landmarks: primaryLandmarks,
      allHandsLandmarks: allHands,
      handedness,
      gesture: fused.gesture,
      confidence: fused.confidence,
      mediapipeGesture: fused.mediapipeGesture,
      mediapipeConfidence: fused.mediapipeConfidence,
      geometricGesture: fused.geometricGesture,
      geometricConfidence: fused.geometricConfidence,
      secondaryGesture: fused.secondaryGesture,
      secondaryConfidence: fused.secondaryConfidence,
      qualityIssues,
      inferenceLatencyMs,
      fps: avgFps,
      backend: this.activeBackend,
      brightnessScore: Math.round(frameQuality.brightnessScore),
      motionScore: Math.round(frameQuality.motionScore * 100) / 100,
    };
  }

  public dispose(): void {
    this.gestureRecognizer?.close();
    this.handLandmarker?.close();
    this.gestureRecognizer = null;
    this.handLandmarker = null;
    this.initialized = false;
  }
}
