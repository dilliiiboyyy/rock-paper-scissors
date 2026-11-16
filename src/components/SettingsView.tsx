import React, { useState } from 'react';
import { Download, RefreshCw, Shield, Smartphone, Trash2 } from 'lucide-react';
import { AppSettings, CameraQuality, Difficulty, InferenceBackend } from '../types/game';
import { CameraDeviceInfo } from '../vision/cameraManager';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SettingsViewProps {
  settings: AppSettings;
  devices: CameraDeviceInfo[];
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onResetAILearning: () => void;
  onClearAllData: () => void;
  onOpenCalibration: () => void;
  onOpenTutorial: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  devices,
  onUpdateSettings,
  onResetAILearning,
  onClearAllData,
  onOpenCalibration,
  onOpenTutorial,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [confirmResetAI, setConfirmResetAI] = useState(false);
  const [confirmWipeAll, setConfirmWipeAll] = useState(false);

  return (
    <main className="mx-auto max-w-[1100px] px-5 py-8 space-y-8">
      <div className="space-y-2">
        <div className="text-xs font-semibold text-[#55594D]">
          Hardware, Audio, Adaptation & Privacy Controls
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#252820]">
          Arcade Settings
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Camera & Computer Vision */}
        <section className="tactile-card rounded-2xl p-5 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#252820]">
            Camera & Vision Engine
          </h2>

          <div className="space-y-1.5">
            <label htmlFor="setting-camera" className="block text-xs font-bold text-[#252820]">
              Camera Device
            </label>
            <select
              id="setting-camera"
              value={settings.cameraId}
              onChange={(e) => onUpdateSettings({ cameraId: e.target.value })}
              className="w-full rounded-xl border border-[#252820]/40 bg-[#F2EBDD] px-3 py-2 text-xs font-semibold text-[#252820]"
            >
              <option value="">Default Front Camera</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="setting-quality" className="block text-xs font-bold text-[#252820]">
              Camera Quality
            </label>
            <select
              id="setting-quality"
              value={settings.cameraQuality}
              onChange={(e) => onUpdateSettings({ cameraQuality: e.target.value as CameraQuality })}
              className="w-full rounded-xl border border-[#252820]/40 bg-[#F2EBDD] px-3 py-2 text-xs font-semibold text-[#252820]"
            >
              <option value="low">Low (320×240 · Lowest CPU)</option>
              <option value="balanced">Balanced (640×480 · Recommended)</option>
              <option value="high">High (1280×720 · Sharpest Landmarks)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="setting-backend" className="block text-xs font-bold text-[#252820]">
              Inference Acceleration
            </label>
            <select
              id="setting-backend"
              value={settings.inferenceBackend}
              onChange={(e) =>
                onUpdateSettings({ inferenceBackend: e.target.value as InferenceBackend })
              }
              className="w-full rounded-xl border border-[#252820]/40 bg-[#F2EBDD] px-3 py-2 text-xs font-semibold text-[#252820]"
            >
              <option value="auto">Auto (WebGPU → WebGL → WASM Fallback)</option>
              <option value="webgpu">Prefer WebGPU</option>
              <option value="webgl">Prefer WebGL</option>
              <option value="wasm">CPU WebAssembly (Most Compatible)</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={onOpenCalibration}
              className="tactile-btn rounded-xl border-2 border-[#252820] bg-[#D6AA57] px-4 py-2 text-xs font-bold text-[#252820] cursor-pointer"
            >
              Run Hand Calibration
            </button>
            <button
              type="button"
              onClick={onOpenTutorial}
              className="rounded-xl border border-[#252820]/30 px-4 py-2 text-xs font-semibold text-[#252820] hover:border-[#252820] cursor-pointer"
            >
              View Tutorial
            </button>
          </div>
        </section>

        {/* Audio & Accessibility */}
        <section className="tactile-card rounded-2xl p-5 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#252820]">
            Sound & Accessibility
          </h2>

          <label className="flex items-center justify-between text-xs font-bold text-[#252820] cursor-pointer">
            <span>Enable Web Audio Sound</span>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
              className="h-4 w-4 accent-[#D65D43]"
            />
          </label>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-[#55594D]">Master Volume</span>
              <span className="font-mono-tabular font-bold">
                {Math.round(settings.masterVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.masterVolume}
              onChange={(e) => onUpdateSettings({ masterVolume: parseFloat(e.target.value) })}
              className="w-full accent-[#D65D43]"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-[#55594D]">Effects Volume</span>
              <span className="font-mono-tabular font-bold">
                {Math.round(settings.sfxVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.sfxVolume}
              onChange={(e) => onUpdateSettings({ sfxVolume: parseFloat(e.target.value) })}
              className="w-full accent-[#87977A]"
            />
          </div>

          <label className="flex items-center justify-between text-xs font-bold text-[#252820] cursor-pointer">
            <span>Arcade Room Ambience</span>
            <input
              type="checkbox"
              checked={settings.ambienceEnabled}
              onChange={(e) => onUpdateSettings({ ambienceEnabled: e.target.checked })}
              className="h-4 w-4 accent-[#D6AA57]"
            />
          </label>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-[#55594D]">Ambience Volume</span>
              <span className="font-mono-tabular font-bold">
                {Math.round(settings.ambienceVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.ambienceVolume}
              onChange={(e) => onUpdateSettings({ ambienceVolume: parseFloat(e.target.value) })}
              className="w-full accent-[#D6AA57]"
            />
          </div>

          <label className="flex items-center justify-between border-t border-[#252820]/15 pt-3 text-xs font-bold text-[#252820] cursor-pointer">
            <span>Reduced Motion (Accessibility)</span>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => onUpdateSettings({ reducedMotion: e.target.checked })}
              className="h-4 w-4 accent-[#252820]"
            />
          </label>
        </section>

        {/* AI Difficulty & Memory Reset */}
        <section className="tactile-card rounded-2xl p-5 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#252820]">
            AI Opponent & Local Memory
          </h2>

          <div className="space-y-1.5">
            <label htmlFor="setting-diff" className="block text-xs font-bold text-[#252820]">
              Default AI Difficulty
            </label>
            <select
              id="setting-diff"
              value={settings.difficulty}
              onChange={(e) => onUpdateSettings({ difficulty: e.target.value as Difficulty })}
              className="w-full rounded-xl border border-[#252820]/40 bg-[#F2EBDD] px-3 py-2 text-xs font-semibold text-[#252820]"
            >
              <option value="easy">Easy (Limited adaptation)</option>
              <option value="normal">Normal (Balanced ensemble)</option>
              <option value="hard">Hard (Rapid shift & 3-gram sequences)</option>
            </select>
          </div>

          <div className="space-y-2.5 pt-2">
            {confirmResetAI ? (
              <div className="flex items-center justify-between rounded-xl border border-[#D65D43] bg-[#D65D43]/10 p-3 text-xs">
                <span className="font-bold text-[#252820]">Reset AI pattern memory?</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onResetAILearning();
                      setConfirmResetAI(false);
                    }}
                    className="font-bold text-[#D65D43] underline cursor-pointer"
                  >
                    Reset Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetAI(false)}
                    className="font-semibold text-[#55594D] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmResetAI(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#252820] bg-[#F2EBDD] px-4 py-2.5 text-xs font-bold text-[#252820] hover:bg-[#D6AA57]/25 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset AI Learning (Fresh Opponent)
              </button>
            )}

            {confirmWipeAll ? (
              <div className="flex items-center justify-between rounded-xl border border-[#D65D43] bg-[#D65D43]/10 p-3 text-xs">
                <span className="font-bold text-[#D65D43]">Wipe all rounds, matches & AI?</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllData();
                      setConfirmWipeAll(false);
                    }}
                    className="font-bold text-[#D65D43] underline cursor-pointer"
                  >
                    Delete All
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmWipeAll(false)}
                    className="font-semibold text-[#55594D] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmWipeAll(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#D65D43]/60 px-4 py-2.5 text-xs font-bold text-[#D65D43] hover:bg-[#D65D43]/10 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete All Locally Stored History
              </button>
            )}
          </div>
        </section>

        {/* Privacy & Offline App Install */}
        <section className="tactile-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#87977A]" />
            <h2 className="font-display text-lg font-bold text-[#252820]">
              Privacy & Offline Support
            </h2>
          </div>

          <p className="text-xs text-[#55594D] leading-relaxed">
            Webcam frames are processed strictly inside your browser tab. Video frames are never
            stored in IndexedDB, never sent to any external server, and immediately discarded after
            21-landmark extraction. After initial load, core assets and cached MediaPipe models
            work offline.
          </p>

          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={install}
              className="tactile-btn inline-flex items-center gap-2 rounded-xl border-2 border-[#252820] bg-[#D65D43] px-4 py-2.5 text-xs font-bold text-[#F2EBDD] cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Install Offline Arcade App
            </button>
          )}

          {!isInstalled && !isInstallable && isIOS && (
            <button
              type="button"
              onClick={() => setShowIOSGuide(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#252820]/30 px-4 py-2 text-xs font-semibold text-[#252820] cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              Install on iOS Safari
            </button>
          )}

          {isInstalled && (
            <div className="text-xs font-semibold text-[#87977A]">
              Running as an installed standalone PWA.
            </div>
          )}

          {showIOSGuide && (
            <div className="rounded-xl border border-[#252820]/30 bg-[#F2EBDD] p-3 text-xs text-[#252820] space-y-1">
              <div className="font-bold">Install on iPhone / iPad</div>
              <div>1. Tap the Share icon in Safari.</div>
              <div>2. Tap Add to Home Screen.</div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-1 font-bold text-[#D65D43] underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
