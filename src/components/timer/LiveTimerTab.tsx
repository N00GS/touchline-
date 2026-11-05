import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Player,
  Session,
  ActivityResult,
} from '../../types/coach';
import { calculateBenchmarkDelta, resolveBenchmark, isPersonalBest } from '../../utils/coachMath';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Flag,
  AlertTriangle,
  Award,
  Undo2,
  Settings,
  Flame,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LiveTimerTabProps {
  sessions: Session[];
  activities: Activity[];
  players: Player[];
  activeTeam: string;
  selectedSessionId?: string;
  selectedActivityId?: string;
  onSaveSessionResults: (sessionId: string, newResults: ActivityResult[]) => void;
}

interface CapturedSplit {
  id: string;
  timeMs: number;
  formatted: string;
  assignedPlayerId?: string;
}

export const LiveTimerTab: React.FC<LiveTimerTabProps> = ({
  sessions,
  activities,
  players,
  activeTeam,
  selectedSessionId,
  selectedActivityId,
  onSaveSessionResults,
}) => {
  // Setup state
  const [targetSessionId, setTargetSessionId] = useState<string>(
    selectedSessionId || sessions[0]?.id || ''
  );
  const [targetActivityId, setTargetActivityId] = useState<string>(
    selectedActivityId || activities[0]?.id || ''
  );
  const [teamFilter, setTeamFilter] = useState<string>(activeTeam === 'All Teams' ? 'U16 Academy' : activeTeam);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [isTimingActive, setIsTimingActive] = useState<boolean>(false);
  const [showSetupDrawer, setShowSetupDrawer] = useState<boolean>(false);

  // Timer engine state
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedMsRef = useRef<number>(0);

  // Pitch-side Mass Split / Lap pack queue
  const [splits, setSplits] = useState<CapturedSplit[]>([]);
  // Player assigned times in current heat
  const [playerResults, setPlayerResults] = useState<Record<string, { timeSeconds: number; isPB?: boolean; targetHit?: boolean; isInvalid?: boolean }>>({});
  // False start / undo log
  const [historyStack, setHistoryStack] = useState<Array<{ type: string; data: any }>>([]);

  // Filter available players for timing
  const activeSquad = players.filter((p) => !p.isArchived && (teamFilter === 'All Teams' || p.team === teamFilter));

  // Initialize selected players with all active team members if set is empty
  useEffect(() => {
    if (selectedPlayerIds.size === 0 && activeSquad.length > 0) {
      setSelectedPlayerIds(new Set(activeSquad.slice(0, 25).map((p) => p.id)));
    }
  }, [teamFilter, activeSquad.length]);

  // Selected Activity & Session references
  const currentActivity = activities.find((a) => a.id === targetActivityId) || activities[0];
  const currentSession = sessions.find((s) => s.id === targetSessionId) || sessions[0];

  // High-precision stopwatch ticker
  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = performance.now();
      timerRef.current = setInterval(() => {
        const now = performance.now();
        const delta = now - startTimeRef.current;
        setElapsedMs(accumulatedMsRef.current + delta);
      }, 33); // ~30 fps ticker
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  // Format Milliseconds to MM:SS.SS
  const formatTime = (ms: number): string => {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const hundredths = Math.floor((ms % 1000) / 10);

    const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const sStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
    const hStr = hundredths < 10 ? `0${hundredths}` : `${hundredths}`;

    return `${mStr}:${sStr}.${hStr}`;
  };

  // Timer Controls
  const handleStart = () => {
    setIsTimingActive(true);
    setIsRunning(true);
  };

  const handlePauseResume = () => {
    if (isRunning) {
      accumulatedMsRef.current = elapsedMs;
      setIsRunning(false);
    } else {
      setIsRunning(true);
    }
  };

  // Restart: resets clock, preserves recorded attempts
  const handleRestart = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    accumulatedMsRef.current = 0;
    setElapsedMs(0);
  };

  // Finish: commits results to session
  const handleFinishHeat = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const newResults: ActivityResult[] = [];
    const nowIso = new Date().toISOString();

    for (const [playerId, res] of Object.entries(playerResults)) {
      if (res.isInvalid) continue;
      newResults.push({
        id: `res_live_${Date.now()}_${playerId}`,
        sessionId: currentSession.id,
        activityId: currentActivity.id,
        playerId,
        result: res.timeSeconds,
        unit: currentActivity.unit,
        timestamp: nowIso,
        isPB: res.isPB,
        targetHit: res.targetHit,
      });
    }

    if (newResults.length > 0) {
      onSaveSessionResults(currentSession.id, newResults);
    }

    // Reset for next heat
    setIsTimingActive(false);
    accumulatedMsRef.current = 0;
    setElapsedMs(0);
    setSplits([]);
    setPlayerResults({});
  };

  // Mass Finish: Rapid Tap Split / Lap
  const handleCaptureSplit = () => {
    if (!isRunning && elapsedMs === 0) return;

    const currentMs = elapsedMs;
    const splitObj: CapturedSplit = {
      id: `split_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timeMs: currentMs,
      formatted: formatTime(currentMs),
    };

    setSplits((prev) => [splitObj, ...prev]);

    // Push to undo stack
    setHistoryStack((prev) => [...prev, { type: 'ADD_SPLIT', data: splitObj }]);
  };

  // Assign a captured split to a player card
  const handleAssignSplitToPlayer = (playerId: string, split: CapturedSplit) => {
    const timeSeconds = Number((split.timeMs / 1000).toFixed(2));
    const player = players.find((p) => p.id === playerId);

    // Evaluate PB and Benchmark Hit
    const historicalResults = (currentSession.results || [])
      .filter((r) => r.activityId === currentActivity.id && r.playerId === playerId && !r.isInvalid)
      .map((r) => r.result);

    const isPB = isPersonalBest(timeSeconds, historicalResults, currentActivity.winningRule);
    const benchmarkVal = player
      ? resolveBenchmark(currentActivity, player.team, player.position)
      : undefined;

    const deltaInfo = calculateBenchmarkDelta(timeSeconds, benchmarkVal, currentActivity.winningRule);

    const resEntry = {
      timeSeconds,
      isPB,
      targetHit: deltaInfo?.isHit || false,
      isInvalid: false,
    };

    setPlayerResults((prev) => ({
      ...prev,
      [playerId]: resEntry,
    }));

    // Mark split as assigned
    setSplits((prev) =>
      prev.map((s) => (s.id === split.id ? { ...s, assignedPlayerId: playerId } : s))
    );

    setHistoryStack((prev) => [
      ...prev,
      { type: 'ASSIGN_PLAYER', data: { playerId, splitId: split.id, prevEntry: playerResults[playerId] } },
    ]);
  };

  // Direct Player Grid Tap to Log Split
  const handlePlayerGridTap = (playerId: string) => {
    if (!isRunning && elapsedMs === 0) return;

    // Capture split timestamp
    const currentMs = elapsedMs;
    const timeSeconds = Number((currentMs / 1000).toFixed(2));
    const player = players.find((p) => p.id === playerId);

    const historicalResults = (currentSession.results || [])
      .filter((r) => r.activityId === currentActivity.id && r.playerId === playerId && !r.isInvalid)
      .map((r) => r.result);

    const isPB = isPersonalBest(timeSeconds, historicalResults, currentActivity.winningRule);
    const benchmarkVal = player
      ? resolveBenchmark(currentActivity, player.team, player.position)
      : undefined;

    const deltaInfo = calculateBenchmarkDelta(timeSeconds, benchmarkVal, currentActivity.winningRule);

    const previousEntry = playerResults[playerId];
    const newEntry = {
      timeSeconds,
      isPB,
      targetHit: deltaInfo?.isHit || false,
      isInvalid: false,
    };

    setPlayerResults((prev) => ({
      ...prev,
      [playerId]: newEntry,
    }));

    setHistoryStack((prev) => [
      ...prev,
      { type: 'GRID_RECORD', data: { playerId, prevEntry: previousEntry } },
    ]);
  };

  // Undo / Invalidate False Start
  const handleUndoOrInvalidate = () => {
    if (historyStack.length === 0) return;
    const lastAction = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, prev.length - 1));

    if (lastAction.type === 'ADD_SPLIT') {
      setSplits((prev) => prev.filter((s) => s.id !== lastAction.data.id));
    } else if (lastAction.type === 'GRID_RECORD' || lastAction.type === 'ASSIGN_PLAYER') {
      const { playerId, prevEntry, splitId } = lastAction.data;
      setPlayerResults((prev) => {
        const next = { ...prev };
        if (prevEntry) {
          next[playerId] = prevEntry;
        } else {
          delete next[playerId];
        }
        return next;
      });
      if (splitId) {
        setSplits((prev) =>
          prev.map((s) => (s.id === splitId ? { ...s, assignedPlayerId: undefined } : s))
        );
      }
    }
  };

  // Toggle player selection in setup
  const togglePlayerSelect = (id: string) => {
    const next = new Set(selectedPlayerIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPlayerIds(next);
  };

  // Select all / deselect all
  const selectAllSquad = () => {
    setSelectedPlayerIds(new Set(activeSquad.slice(0, 25).map((p) => p.id)));
  };

  // Selected player list mapped to grid (up to 25 for 5x5 layout)
  const gridPlayers = activeSquad
    .filter((p) => selectedPlayerIds.has(p.id))
    .slice(0, 25);

  const unassignedSplits = splits.filter((s) => !s.assignedPlayerId);

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-4 max-w-4xl mx-auto w-full pb-28 select-none">
      {/* Pitch-side Header / Quick Settings Toggle */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-black text-white dark:bg-white dark:text-black font-black text-xs uppercase tracking-wider">
            {currentActivity.name}
          </span>
          <span className="text-xs font-semibold text-neutral-500 hidden sm:inline">
            {currentSession.title}
          </span>
        </div>

        <button
          onClick={() => setShowSetupDrawer(!showSetupDrawer)}
          className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
          {showSetupDrawer ? 'Hide Setup' : 'Setup Activity'}
        </button>
      </div>

      {/* SETUP DRAWER (Collapses when timing starts or coach toggles) */}
      {(showSetupDrawer || (!isTimingActive && elapsedMs === 0)) && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-2xl p-4 mb-4 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
              Pitch-side Session & Player Setup
            </h3>
            <span className="text-[11px] text-neutral-500">
              {gridPlayers.length} / 25 players selected for 5x5 grid
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
                Scheduled Session
              </label>
              <select
                value={targetSessionId}
                onChange={(e) => setTargetSessionId(e.target.value)}
                className="w-full px-2.5 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-xs font-bold text-black dark:text-white"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.date})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
                Activity / Drill
              </label>
              <select
                value={targetActivityId}
                onChange={(e) => setTargetActivityId(e.target.value)}
                className="w-full px-2.5 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-xs font-bold text-black dark:text-white"
              >
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
                Team Filter
              </label>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="w-full px-2.5 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-xs font-bold text-black dark:text-white"
              >
                <option value="All Teams">All Teams</option>
                <option value="U16 Academy">U16 Academy</option>
                <option value="First Team">First Team</option>
              </select>
            </div>
          </div>

          {/* Player Checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-neutral-500">
                Tap Players to include in 5x5 timing grid:
              </span>
              <button
                type="button"
                onClick={selectAllSquad}
                className="text-[10px] font-bold uppercase text-neutral-600 dark:text-neutral-400 hover:underline cursor-pointer"
              >
                Select Max 25
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800">
              {activeSquad.map((p) => {
                const isSelected = selectedPlayerIds.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlayerSelect(p.id)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                        : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-800'
                    }`}
                  >
                    <span>#{p.shirtNumber}</span>
                    <span>{p.name}</span>
                    {p.isInjured && <span title="Medical Note">⚠️</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* BIG PITCH-SIDE HIGH CONTRAST DIGITAL DISPLAY */}
      <div className="bg-black text-white border border-neutral-800 rounded-3xl p-5 mb-4 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Subtle radial titanium highlight */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_70%)] pointer-events-none" />

        <div className="relative z-10 w-full flex items-center justify-between mb-2 px-2">
          <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
            PITCH-SIDE CHRONOMETER
          </span>
          <span className="text-[10px] font-mono font-bold text-neutral-300 uppercase">
            TARGET: {currentActivity.winningRule === 'lower_is_better' ? 'MIN TIME' : 'MAX'}
          </span>
        </div>

        {/* Huge High-Contrast Stopwatch digits */}
        <div className="relative z-10 font-mono font-black text-5xl sm:text-7xl tracking-tight my-2 text-white tabular-nums drop-shadow-[0_2px_12px_rgba(255,255,255,0.15)] select-none">
          {formatTime(elapsedMs)}
        </div>

        {/* Live Timer Control Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 mt-3 w-full">
          {!isRunning && elapsedMs === 0 ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={handleStart}
              className="flex-1 max-w-[200px] py-3.5 px-6 bg-white hover:bg-neutral-100 text-black font-black uppercase text-xs sm:text-sm tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_4px_20px_rgba(255,255,255,0.15)]"
            >
              <Play className="w-4 h-4 fill-current" /> START HEAT
            </motion.button>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={handlePauseResume}
                className={`py-2.5 px-5 font-black uppercase text-xs tracking-wider rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isRunning
                    ? 'bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700'
                    : 'bg-white hover:bg-neutral-100 text-black shadow-lg'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" /> Resume
                  </>
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={handleRestart}
                className="py-2.5 px-4 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/80 font-bold uppercase text-xs tracking-wider rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer"
                title="Resets clock, preserves recorded attempts"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restart
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={handleUndoOrInvalidate}
                disabled={historyStack.length === 0}
                className="py-2.5 px-3 bg-neutral-900/80 hover:bg-neutral-800 disabled:opacity-40 text-neutral-300 border border-neutral-700/80 font-bold uppercase text-xs rounded-2xl flex items-center justify-center gap-1 cursor-pointer"
                title="Undo / Invalidate false start"
              >
                <Undo2 className="w-3.5 h-3.5" /> Undo
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleFinishHeat}
                className="py-2.5 px-5 bg-white hover:bg-neutral-100 text-black font-black uppercase text-xs tracking-wider rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer ml-auto shadow-md"
              >
                <CheckCircle className="w-4 h-4" /> Finish Heat
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* UNASSIGNED MASS SPLITS PACK DRAWER */}
      {unassignedSplits.length > 0 && (
        <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 rounded-2xl p-3 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-neutral-500" />
              Captured Pack Finish Splits ({unassignedSplits.length} unassigned)
            </span>
            <span className="text-[10px] text-neutral-500">
              Tap a split, then tap a player card to assign
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {unassignedSplits.map((s, idx) => (
              <motion.div
                key={s.id}
                initial={{ scale: 0.85, opacity: 0, y: -4 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-xl flex items-center gap-2 text-xs font-mono font-black shrink-0"
              >
                <span className="text-neutral-500">#{splits.length - idx}</span>
                <span className="text-black dark:text-white">{s.formatted}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 5x5 RESPONSIVE TOUCH-FRIENDLY PLAYER GRID */}
      <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 rounded-3xl p-3 sm:p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
            5x5 Pitch-side Squad Grid (Tap Card to Record)
          </span>
          <span className="text-[10px] font-semibold text-neutral-500">
            {Object.keys(playerResults).length} / {gridPlayers.length} recorded
          </span>
        </div>

        {gridPlayers.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-500">
            No players selected. Use the setup drawer above to select players for timing.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
            {gridPlayers.map((player) => {
              const res = playerResults[player.id];
              const benchmarkTarget = resolveBenchmark(currentActivity, player.team, player.position);

              return (
                <motion.button
                  key={player.id}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    if (unassignedSplits.length > 0) {
                      handleAssignSplitToPlayer(player.id, unassignedSplits[0]);
                    } else {
                      handlePlayerGridTap(player.id);
                    }
                  }}
                  className={`min-h-[92px] p-3 rounded-2xl border flex flex-col justify-between text-left transition-all cursor-pointer relative overflow-hidden select-none ${
                    res
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-md'
                      : 'bg-neutral-50 dark:bg-neutral-900/60 hover:bg-neutral-100 dark:hover:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100'
                  }`}
                >
                  {/* Top Bar: Shirt #, Position, Medical Flag */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                        res
                          ? 'bg-white text-black dark:bg-black dark:text-white'
                          : 'bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white'
                      }`}
                    >
                      {player.shirtNumber}
                    </span>

                    <div className="flex items-center gap-1">
                      {player.isInjured && (
                        <span
                          className="text-xs"
                          title={player.medicalNote || 'Active injury flag'}
                        >
                          ⚠️
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-black uppercase px-1 rounded ${
                          res
                            ? 'bg-neutral-800 text-neutral-300 dark:bg-neutral-200 dark:text-neutral-700'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        {player.position}
                      </span>
                    </div>
                  </div>

                  {/* Player Name */}
                  <div className="my-1">
                    <div className="text-xs font-black truncate leading-tight">
                      {player.name}
                    </div>
                    {benchmarkTarget !== undefined && !res && (
                      <div className="text-[9px] text-neutral-500 font-mono">
                        Target: {benchmarkTarget}s
                      </div>
                    )}
                  </div>

                  {/* Bottom: Recorded Result + LIVE BADGES */}
                  <div className="flex items-center justify-between w-full min-h-[22px]">
                    {res ? (
                      <>
                        <span className="font-mono font-black text-sm tabular-nums">
                          {res.timeSeconds}s
                        </span>
                        <div className="flex items-center gap-1">
                          {res.isPB && (
                            <motion.span
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                              className="px-1.5 py-0.5 rounded font-black text-[9px] uppercase tracking-wider bg-white text-black dark:bg-black dark:text-white shadow-sm"
                            >
                              PB
                            </motion.span>
                          )}
                          {res.targetHit && (
                            <motion.span
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                              className="px-1.5 py-0.5 rounded font-black text-[9px] uppercase tracking-wider bg-neutral-700 text-white dark:bg-neutral-300 dark:text-black"
                            >
                              HIT
                            </motion.span>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold">
                        Ready
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* LARGE FIXED BOTTOM MASS FINISH (SPLIT / LAP) BUTTON */}
      {isTimingActive && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="fixed bottom-16 inset-x-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent flex justify-center z-40 select-none"
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCaptureSplit}
            className="w-full max-w-md py-4 px-8 bg-white hover:bg-neutral-100 text-black font-black uppercase text-base sm:text-lg tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all cursor-pointer shadow-[0_8px_30px_rgba(255,255,255,0.2)] border-2 border-black"
          >
            <Flag className="w-5 h-5 fill-black" />
            <span>SPLIT / LAP (PACK FINISH)</span>
          </motion.button>
        </motion.div>
      )}
    </div>
  );
};
