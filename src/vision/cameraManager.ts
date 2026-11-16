import { CameraQuality } from '../types/game';

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
}

export interface FrameQualityAnalysis {
  brightnessScore: number; // 0..255
  motionScore: number; // 0..1
  isLowLight: boolean;
  isHighMotionBlur: boolean;
}

const QUALITY_CONSTRAINTS: Record<CameraQuality, { width: number; height: number; frameRate: number }> = {
  low: { width: 320, height: 240, frameRate: 24 },
  balanced: { width: 640, height: 480, frameRate: 30 },
  high: { width: 1280, height: 720, frameRate: 30 },
};

export class CameraManager {
  private stream: MediaStream | null = null;
  private analysisCanvas: HTMLCanvasElement | null = null;
  private analysisCtx: CanvasRenderingContext2D | null = null;
  private prevLumaBuffer: Uint8Array | null = null;

  public async listVideoDevices(): Promise<CameraDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'videoinput')
      .map((d, idx) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${idx + 1}`,
      }));
  }

  public async startCamera(
    videoElement: HTMLVideoElement,
    options: { deviceId?: string; quality: CameraQuality; onTrackEnded?: () => void }
  ): Promise<{ stream: MediaStream; devices: CameraDeviceInfo[] }> {
    this.stopCamera(videoElement);

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Webcam API (getUserMedia) is not supported in this browser.');
    }

    const preset = QUALITY_CONSTRAINTS[options.quality];
    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: preset.width },
      height: { ideal: preset.height },
      frameRate: { ideal: preset.frameRate },
      ...(options.deviceId
        ? { deviceId: { exact: options.deviceId } }
        : { facingMode: 'user' }),
    };

    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false,
    });

    this.stream = stream;
    videoElement.srcObject = stream;
    videoElement.playsInline = true;
    videoElement.muted = true;

    const track = stream.getVideoTracks()[0];
    if (track && options.onTrackEnded) {
      track.onended = () => {
        options.onTrackEnded?.();
      };
    }

    await videoElement.play();
    const devices = await this.listVideoDevices();
    return { stream, devices };
  }

  public stopCamera(videoElement?: HTMLVideoElement | null): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }
    if (videoElement) {
      videoElement.srcObject = null;
    }
    this.prevLumaBuffer = null;
  }

  public isActive(): boolean {
    if (!this.stream) return false;
    return this.stream.getVideoTracks().some((t) => t.readyState === 'live');
  }

  /**
   * Downsamples video frame to 48x36 to measure ambient brightness & inter-frame motion blur
   * without storing any image data.
   */
  public analyzeFrameQuality(videoElement: HTMLVideoElement): FrameQualityAnalysis {
    if (videoElement.readyState < 2 || videoElement.videoWidth === 0) {
      return { brightnessScore: 128, motionScore: 0, isLowLight: false, isHighMotionBlur: false };
    }

    if (!this.analysisCanvas) {
      this.analysisCanvas = document.createElement('canvas');
      this.analysisCanvas.width = 48;
      this.analysisCanvas.height = 36;
      this.analysisCtx = this.analysisCanvas.getContext('2d', { willReadFrequently: true });
    }

    const ctx = this.analysisCtx;
    if (!ctx) {
      return { brightnessScore: 128, motionScore: 0, isLowLight: false, isHighMotionBlur: false };
    }

    ctx.drawImage(videoElement, 0, 0, 48, 36);
    const imgData = ctx.getImageData(0, 0, 48, 36).data;
    const pixelCount = 48 * 36;
    const luma = new Uint8Array(pixelCount);

    let lumaSum = 0;
    let diffSum = 0;
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      const y = Math.round(0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2]);
      luma[i] = y;
      lumaSum += y;
      if (this.prevLumaBuffer) {
        diffSum += Math.abs(y - this.prevLumaBuffer[i]);
      }
    }

    const brightnessScore = lumaSum / pixelCount;
    const motionScore = this.prevLumaBuffer ? Math.min(1, diffSum / (pixelCount * 42)) : 0;
    this.prevLumaBuffer = luma;

    return {
      brightnessScore,
      motionScore,
      isLowLight: brightnessScore < 48,
      isHighMotionBlur: motionScore > 0.58,
    };
  }
}
