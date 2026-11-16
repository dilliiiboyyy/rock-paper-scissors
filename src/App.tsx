import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActiveMatchState,
  advanceTournamentAfterMatch,
  createInitialTournamentState,
  createNewMatchState,
  pauseMatchState,
  resumeMatchState,
  resolveRoundWithValidatedGesture,
  setCountdownStep,
} from './engine/gameStateManager';
import { createInitialLearningSnapshot } from './engine/aiLearningManager';
import { exportRoundsAsCSV, exportStatsAsJSON } from './engine/matchStatsManager';
import {
  AppSettings,
  CVFrameResult,
  CalibrationStatus,
  CameraQuality,
  Difficulty,
  GameMode,
  Gesture,
  LearningSnapshot,
  MatchRecord,
  RoundRecord,
  TournamentRecord,
  TournamentState,
} from './types/game';
import { CameraDeviceInfo, CameraManager } from './vision/cameraManager';
import { HandDetectionEngine } from './vision/handDetectionEngine';
import {
  ValidationState,
  canAcceptRoundGesture,
  createValidationState,
  markRoundGestureConfirmed,
  pushFrameToValidation,
  updateCalibrationStatus,
} from './vision/gestureValidation';
import { AIWorkerClient } from './services/aiWorkerClient';
import { audioManager } from './services/audioManager';
import { animationManager } from './services/animationManager';
import { DEFAULT_SETTINGS, localPersistence } from './services/localPersistence';
import { useOnlineStatus } from './hooks/usePWAInstall';
import { AppScreen, TopBar } from './components/TopBar';
import { MainMenu } from './components/MainMenu';
import { GameArena } from './components/GameArena';
import { AILearningCenter } from './components/AILearningCenter';
import { TournamentView } from './components/TournamentView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { MatchResultsModal } from './components/MatchResultsModal';
import { CalibrationModal } from './components/CalibrationModal';
import { TutorialModal } from './components/TutorialModal';

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function App() {
  const isOnline = useOnlineStatus();

  const [screen, setScreen] = useState<AppScreen>('menu');
  const [selectedMode, setSelectedMode] = useState<GameMode>('first_to_five');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [pastTournaments, setPastTournaments] = useState<TournamentRecord[]>([]);
  const [learning, setLearning] = useState<LearningSnapshot>(() =>
    createInitialLearningSnapshot()
  );

  const [match, setMatch] = useState<ActiveMatchState>(() =>
    createNewMatchState('first_to_five', 'normal')
  );
  const [tournament, setTournament] = useState<TournamentState>(() =>
    createInitialTournamentState()
  );
  const [completedModalMatch, setCompletedModalMatch] = useState<{
    match: MatchRecord;
    rounds: RoundRecord[];
  } | null>(null);

  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [calibrationStatus, setCalibrationStatus] = useState<CalibrationStatus>({
    rockVerified: false,
    paperVerified: false,
    scissorsVerified: false,
    completedAt: null,
  });

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Camera & Vision refs/state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraManagerRef = useRef<CameraManager | null>(null);
  const handEngineRef = useRef<HandDetectionEngine | null>(null);
  const aiWorkerRef = useRef<AIWorkerClient | null>(null);
  const validationRef = useRef<ValidationState>(createValidationState());
  const countdownTimerRef = useRef<number | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraInitializing, setCameraInitializing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelLoadingStage, setModelLoadingStage] = useState<string | null>(null);
  const [devices, setDevices] = useState<CameraDeviceInfo[]>([]);
  const [frameResult, setFrameResult] = useState<CVFrameResult | null>(null);
  const [validationSnapshot, setValidationSnapshot] = useState<ValidationState>(() =>
    createValidationState()
  );

  // Initialize singletons and load IndexedDB state
  useEffect(() => {
    cameraManagerRef.current = new CameraManager();
    handEngineRef.current = new HandDetectionEngine();
    aiWorkerRef.current = new AIWorkerClient();

    let mounted = true;
    void localPersistence.loadAll().then((loaded) => {
      if (!mounted) return;
      setRounds(loaded.rounds);
      setMatches(loaded.matches);
      setPastTournaments(loaded.tournaments);
      setLearning(loaded.learning);
      setSettings(loaded.settings);
      audioManager.syncSettings(loaded.settings);
      setMatch(createNewMatchState(selectedMode, loaded.settings.difficulty));
    });

    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);

    return () => {
      mounted = false;
      document.removeEventListener('fullscreenchange', onFsChange);
      if (countdownTimerRef.current) window.clearTimeout(countdownTimerRef.current);
      cameraManagerRef.current?.stopCamera(videoRef.current);
      handEngineRef.current?.dispose();
      aiWorkerRef.current?.dispose();
      animationManager.stop();
      audioManager.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync audio & reduced motion body class
  useEffect(() => {
    audioManager.syncSettings(settings);
    if (settings.reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void localPersistence.saveSettings(next);
      return next;
    });
  }, []);

  const stopCamera = useCallback(() => {
    cameraManagerRef.current?.stopCamera(videoRef.current);
    setCameraActive(false);
    setFrameResult(null);
    validationRef.current = createValidationState();
    setValidationSnapshot(validationRef.current);
  }, []);

  const enableCamera = useCallback(
    async (overrideDeviceId?: string, overrideQuality?: CameraQuality) => {
      audioManager.unlock();
      const video = videoRef.current;
      const camMgr = cameraManagerRef.current;
      const engine = handEngineRef.current;
      if (!video || !camMgr || !engine) return;

      setCameraError(null);
      setCameraInitializing(true);

      try {
        const deviceId = overrideDeviceId ?? (settings.cameraId || undefined);
        const quality = overrideQuality ?? settings.cameraQuality;
        const { devices: list } = await camMgr.startCamera(video, {
          deviceId,
          quality,
          onTrackEnded: () => {
            setCameraActive(false);
            setCameraError('Camera disconnected. Reconnect your webcam and click Retry Camera.');
          },
        });
        setDevices(list);
        setCameraActive(true);

        if (!engine.isReady()) {
          await engine.initialize(settings.inferenceBackend, (stage) => {
            setModelLoadingStage(stage);
          });
        }
        setModelLoadingStage(null);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Camera access was denied or no webcam device was found.';
        setCameraError(msg);
        setCameraActive(false);
      } finally {
        setCameraInitializing(false);
        setModelLoadingStage(null);
      }
    },
    [settings.cameraId, settings.cameraQuality, settings.inferenceBackend]
  );

  // Throttled real-time CV processing loop (~18 fps max to save CPU while staying responsive)
  useEffect(() => {
    if (!cameraActive || settings.inputMode !== 'webcam') return;
    if (screen !== 'arena' && !calibrationOpen) return;

    let rafId = 0;
    let lastProcessedAt = 0;
    const minIntervalMs = 55;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (now - lastProcessedAt < minIntervalMs) return;
      lastProcessedAt = now;

      const video = videoRef.current;
      const camMgr = cameraManagerRef.current;
      const engine = handEngineRef.current;
      if (!video || !camMgr || !engine || !engine.isReady()) return;

      const frameQuality = camMgr.analyzeFrameQuality(video);
      const res = engine.processVideoFrame(video, frameQuality);
      setFrameResult(res);

      const nextValidation = pushFrameToValidation(validationRef.current, res);
      validationRef.current = nextValidation;
      setValidationSnapshot(nextValidation);

      if (calibrationOpen) {
        setCalibrationStatus((prev) =>
          updateCalibrationStatus(prev, nextValidation.stableGesture)
        );
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [cameraActive, settings.inputMode, screen, calibrationOpen]);

  const handleResolvedRound = useCallback(
    (
      result: ReturnType<typeof resolveRoundWithValidatedGesture>,
      currentTournament: TournamentState
    ) => {
      if (!result.accepted || !result.roundRecord) return;
      audioManager.playReveal();

      const r = result.roundRecord;
      if (r.outcome === 'player_win') {
        if (result.nextMatch.currentPlayerStreak >= 3) {
          audioManager.playStreakCelebration();
        } else {
          audioManager.playVictory();
        }
      } else if (r.outcome === 'ai_win') {
        audioManager.playDefeat();
      } else {
        audioManager.playDraw();
      }

      setMatch(result.nextMatch);
      setLearning(result.nextLearning);
      setRounds((prev) => [...prev, r]);
      void localPersistence.saveRound(r);
      void localPersistence.saveLearningSnapshot(result.nextLearning);

      if (result.completedMatchRecord) {
        const cm = result.completedMatchRecord;
        setMatches((prev) => [cm, ...prev]);
        void localPersistence.saveMatch(cm);

        if (result.nextMatch.mode === 'tournament') {
          const nextT = advanceTournamentAfterMatch(currentTournament, result.nextMatch);
          setTournament(nextT);
          if (nextT.completed) {
            if (nextT.champion) audioManager.playTournamentChampion();
            const record: TournamentRecord = {
              id: nextT.id,
              completedAt: Date.now(),
              champion: nextT.champion,
              stagesWon: nextT.stages.filter((s) => s.status === 'won').length,
              totalRounds: result.nextMatch.matchRounds.length,
              bestStreak: nextT.bestStreak,
            };
            setPastTournaments((prev) => [record, ...prev]);
            void localPersistence.saveTournament(record);
            setScreen('tournament');
            return;
          }
        }
        setCompletedModalMatch({ match: cm, rounds: result.nextMatch.matchRounds });
      }
    },
    []
  );

  // Detect player gesture automatically when round phase reaches 'detecting'
  useEffect(() => {
    if (match.phase !== 'detecting' || settings.inputMode !== 'webcam') return;
    const commitment = match.sealedCommitment;
    if (!commitment) return;

    const check = canAcceptRoundGesture(validationSnapshot, commitment.roundId, Date.now());
    if (!check.allowed || !check.gesture) return;

    audioManager.playGestureLocked();
    validationRef.current = markRoundGestureConfirmed(
      validationRef.current,
      commitment.roundId,
      Date.now()
    );
    setValidationSnapshot(validationRef.current);

    const activeStage =
      match.mode === 'tournament'
        ? tournament.stages[tournament.currentStageIndex]
        : undefined;

    const res = resolveRoundWithValidatedGesture(
      match,
      check.gesture,
      learning,
      rounds,
      activeStage
    );
    handleResolvedRound(res, tournament);
  }, [
    match,
    validationSnapshot,
    settings.inputMode,
    learning,
    rounds,
    tournament,
    handleResolvedRound,
  ]);

  // Countdown scheduler (3 -> 2 -> 1 -> SHOOT!)
  useEffect(() => {
    if (match.phase !== 'locked' && match.phase !== 'countdown') return;

    const current = match.countdownValue;
    if (!current || current === 'SHOOT') return;

    audioManager.playCountdownTick(current);

    countdownTimerRef.current = window.setTimeout(() => {
      const nextStep: 3 | 2 | 1 | 'SHOOT' =
        current === 3 ? 2 : current === 2 ? 1 : 'SHOOT';
      if (nextStep === 'SHOOT') {
        audioManager.playCountdownTick('SHOOT');
      }
      setMatch((prev) => {
        if (prev.phase === 'paused' || !prev.sealedCommitment) return prev;
        return setCountdownStep(prev, nextStep);
      });
    }, 620);

    return () => {
      if (countdownTimerRef.current) {
        window.clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [match.phase, match.countdownValue]);

  const startRound = useCallback(async () => {
    audioManager.unlock();
    if (match.phase !== 'idle' && match.phase !== 'round_complete') return;

    const worker = aiWorkerRef.current;
    const roundId = `${match.matchId}-r${match.roundNumber}`;

    // Mandatory fairness order: analyze + predict + lock AI commitment BEFORE countdown starts!
    const commitment = worker
      ? await worker.lockPrediction(
          roundId,
          match.roundNumber,
          rounds,
          match.difficulty,
          match.mode,
          {
            expertReliability: learning.expertReliability,
            rollingAccuracy: learning.rollingAccuracy,
          }
        )
      : undefined;

    if (!commitment) return;

    setMatch((prev) => ({
      ...prev,
      phase: 'locked',
      sealedCommitment: commitment,
      countdownValue: 3,
    }));
  }, [match.phase, match.matchId, match.roundNumber, match.difficulty, match.mode, rounds, learning]);

  const handleManualGestureSelect = useCallback(
    (gesture: Gesture) => {
      if (match.phase !== 'detecting' || !match.sealedCommitment) return;
      audioManager.playGestureLocked();
      const activeStage =
        match.mode === 'tournament'
          ? tournament.stages[tournament.currentStageIndex]
          : undefined;
      const res = resolveRoundWithValidatedGesture(
        match,
        gesture,
        learning,
        rounds,
        activeStage
      );
      handleResolvedRound(res, tournament);
    },
    [match, learning, rounds, tournament, handleResolvedRound]
  );

  // Keyboard accessibility shortcuts inside Arena
  useEffect(() => {
    if (screen !== 'arena') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (match.phase === 'idle' || match.phase === 'round_complete') {
          void startRound();
        } else if (match.phase === 'paused') {
          setMatch((p) => resumeMatchState(p));
        } else if (match.phase === 'countdown' || match.phase === 'locked') {
          setMatch((p) => pauseMatchState(p));
        }
      } else if (settings.inputMode === 'manual_fallback' && match.phase === 'detecting') {
        const k = e.key.toLowerCase();
        if (k === '1' || k === 'r') handleManualGestureSelect('rock');
        if (k === '2' || k === 'p') handleManualGestureSelect('paper');
        if (k === '3' || k === 's') handleManualGestureSelect('scissors');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, match.phase, settings.inputMode, startRound, handleManualGestureSelect]);

  const launchMatch = useCallback(
    (modeToLaunch: GameMode, diffOverride?: Difficulty) => {
      audioManager.unlock();
      if (modeToLaunch === 'tournament') {
        const activeStage = tournament.stages[tournament.currentStageIndex];
        setMatch(createNewMatchState('tournament', activeStage?.difficulty ?? 'easy'));
      } else {
        setMatch(createNewMatchState(modeToLaunch, diffOverride ?? settings.difficulty));
      }
      setCompletedModalMatch(null);
      setScreen('arena');
      if (!settings.tutorialCompleted) {
        setTutorialOpen(true);
        updateSettings({ tutorialCompleted: true });
      }
    },
    [tournament, settings.difficulty, settings.tutorialCompleted, updateSettings]
  );

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore if fullscreen blocked by browser sandbox
    }
  }, []);

  const handleResetAILearning = useCallback(async () => {
    await localPersistence.resetLearningOnly();
    setRounds([]);
    setLearning(createInitialLearningSnapshot());
  }, []);

  const handleClearAllData = useCallback(async () => {
    await localPersistence.clearAllHistoryAndLearning();
    setRounds([]);
    setMatches([]);
    setPastTournaments([]);
    setLearning(createInitialLearningSnapshot());
    setTournament(createInitialTournamentState());
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        activeScreen={screen}
        onNavigate={(next) => {
          audioManager.unlock();
          setScreen(next);
        }}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onQuickPlay={() => launchMatch(selectedMode)}
      />

      {!isOnline && (
        <div className="bg-[#D6AA57] border-b border-[#252820] px-4 py-1.5 text-center text-xs font-bold text-[#252820]">
          Offline Mode Active — Local vision cache and IndexedDB learning remain operational.
        </div>
      )}

      {screen === 'menu' && (
        <MainMenu
          selectedMode={selectedMode}
          selectedDifficulty={settings.difficulty}
          onSelectMode={(m) => setSelectedMode(m)}
          onSelectDifficulty={(d) => updateSettings({ difficulty: d })}
          onStartGame={() => {
            if (selectedMode === 'tournament') {
              setScreen('tournament');
            } else {
              launchMatch(selectedMode);
            }
          }}
          onOpenCalibration={() => setCalibrationOpen(true)}
          onOpenTutorial={() => setTutorialOpen(true)}
          onOpenTournament={() => setScreen('tournament')}
          learning={learning}
          totalRoundsPlayed={rounds.length}
        />
      )}

      {screen === 'arena' && (
        <GameArena
          match={match}
          learning={learning}
          videoRef={videoRef}
          cameraActive={cameraActive}
          cameraError={cameraError}
          cameraInitializing={cameraInitializing}
          modelLoadingStage={modelLoadingStage}
          devices={devices}
          selectedCameraId={settings.cameraId}
          cameraQuality={settings.cameraQuality}
          frameResult={frameResult}
          stableGesture={validationSnapshot.stableGesture}
          stabilityProgress={validationSnapshot.stabilityProgress}
          inputMode={settings.inputMode}
          soundEnabled={settings.soundEnabled}
          reducedMotion={settings.reducedMotion}
          onStartRound={() => void startRound()}
          onPauseToggle={() =>
            setMatch((prev) =>
              prev.phase === 'paused' ? resumeMatchState(prev) : pauseMatchState(prev)
            )
          }
          onRestartMatch={() => {
            setCompletedModalMatch(null);
            setMatch(createNewMatchState(match.mode, match.difficulty));
          }}
          onToggleSound={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
          onRequestEnableCamera={() => void enableCamera()}
          onStopCamera={stopCamera}
          onSwitchCamera={(id) => {
            updateSettings({ cameraId: id });
            if (cameraActive) void enableCamera(id);
          }}
          onChangeQuality={(q) => {
            updateSettings({ cameraQuality: q });
            if (cameraActive) void enableCamera(undefined, q);
          }}
          onOpenCalibration={() => setCalibrationOpen(true)}
          onToggleInputMode={(mode) => {
            if (mode === 'manual_fallback' && cameraActive) {
              stopCamera();
            }
            updateSettings({ inputMode: mode });
          }}
          onManualGestureSelect={handleManualGestureSelect}
        />
      )}

      {screen === 'ai_center' && (
        <AILearningCenter
          rounds={rounds}
          learning={learning}
          difficulty={settings.difficulty}
          mode={selectedMode}
        />
      )}

      {screen === 'tournament' && (
        <TournamentView
          tournament={tournament}
          pastTournaments={pastTournaments}
          onPlayCurrentStage={() => launchMatch('tournament')}
          onStartNewTournament={() => setTournament(createInitialTournamentState())}
        />
      )}

      {screen === 'history' && (
        <HistoryView
          matches={matches}
          rounds={rounds}
          onExportJSON={() =>
            downloadTextFile(
              `tactile-oracle-stats-${Date.now()}.json`,
              exportStatsAsJSON(rounds, matches),
              'application/json'
            )
          }
          onExportCSV={() =>
            downloadTextFile(
              `tactile-oracle-rounds-${Date.now()}.csv`,
              exportRoundsAsCSV(rounds),
              'text/csv'
            )
          }
          onClearHistory={() => void handleClearAllData()}
        />
      )}

      {screen === 'settings' && (
        <SettingsView
          settings={settings}
          devices={devices}
          onUpdateSettings={updateSettings}
          onResetAILearning={() => void handleResetAILearning()}
          onClearAllData={() => void handleClearAllData()}
          onOpenCalibration={() => setCalibrationOpen(true)}
          onOpenTutorial={() => setTutorialOpen(true)}
        />
      )}

      {/* Hidden video element if calibration modal opened outside arena */}
      {screen !== 'arena' && calibrationOpen && (
        <video ref={videoRef} playsInline muted className="hidden" />
      )}

      {completedModalMatch && (
        <MatchResultsModal
          match={completedModalMatch.match}
          matchRounds={completedModalMatch.rounds}
          onRematch={() => launchMatch(completedModalMatch.match.mode, completedModalMatch.match.difficulty)}
          onBackToMenu={() => {
            setCompletedModalMatch(null);
            setScreen('menu');
          }}
          onViewAICenter={() => {
            setCompletedModalMatch(null);
            setScreen('ai_center');
          }}
          onExportMatchJSON={() =>
            downloadTextFile(
              `match-${completedModalMatch.match.id}.json`,
              exportStatsAsJSON(completedModalMatch.rounds, [completedModalMatch.match]),
              'application/json'
            )
          }
        />
      )}

      <CalibrationModal
        open={calibrationOpen}
        cameraActive={cameraActive}
        stableGesture={validationSnapshot.stableGesture}
        calibration={calibrationStatus}
        onEnableCamera={() => void enableCamera()}
        onResetCalibration={() =>
          setCalibrationStatus({
            rockVerified: false,
            paperVerified: false,
            scissorsVerified: false,
            completedAt: null,
          })
        }
        onClose={() => setCalibrationOpen(false)}
      />

      <TutorialModal
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        onStartPlaying={() => launchMatch(selectedMode)}
      />
    </div>
  );
}
