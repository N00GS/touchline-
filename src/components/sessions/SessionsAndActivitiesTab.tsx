import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Session,
  Activity,
  Player,
  ActivityUnit,
  WinningRule,
  STANDARD_POSITIONS,
  StandardPosition,
  ActivityResult,
} from '../../types/coach';
import { calculateBenchmarkDelta, resolveBenchmark, isPersonalBest } from '../../utils/coachMath';
import {
  Trophy,
  Dumbbell,
  Plus,
  Paperclip,
  Target,
  BarChart3,
  Award,
  Clock,
  Sparkles,
} from 'lucide-react';

interface SessionsAndActivitiesTabProps {
  sessions: Session[];
  activities: Activity[];
  players: Player[];
  activeTeam: string;
  onSaveSession: (session: Session) => void;
  onSaveActivity: (activity: Activity) => void;
  onOpenLiveTimerForSession: (session: Session, activityId?: string) => void;
}

export const SessionsAndActivitiesTab: React.FC<SessionsAndActivitiesTabProps> = ({
  sessions,
  activities,
  players,
  activeTeam,
  onSaveSession,
  onSaveActivity,
  onOpenLiveTimerForSession,
}) => {
  const [subView, setSubView] = useState<'sessions' | 'activities'>('sessions');
  const [selectedSession, setSelectedSession] = useState<Session | null>(sessions[0] || null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(activities[0] || null);

  // Custom Activity Modal
  const [showAddActivityModal, setShowAddActivityModal] = useState<boolean>(false);
  const [newActName, setNewActName] = useState('');
  const [newActCategory, setNewActCategory] = useState<Activity['category']>('Speed & Agility');
  const [newActUnit, setNewActUnit] = useState<ActivityUnit>('seconds');
  const [newActWinningRule, setNewActWinningRule] = useState<WinningRule>('lower_is_better');
  const [newActDescription, setNewActDescription] = useState('');
  const [newActBenchmarkAll, setNewActBenchmarkAll] = useState<number>(2.0);

  // Manual Result Entry Modal for selected Session
  const [showAddResultModal, setShowAddResultModal] = useState<boolean>(false);
  const [manualPlayerId, setManualPlayerId] = useState<string>(players[0]?.id || '');
  const [manualActivityId, setManualActivityId] = useState<string>(activities[0]?.id || '');
  const [manualResultVal, setManualResultVal] = useState<number>(0);

  // Attachment modal / preview
  const [showAttachmentViewer, setShowAttachmentViewer] = useState<boolean>(false);

  // Handle create custom activity
  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActName.trim()) return;

    const teamKey = activeTeam === 'All Teams' ? 'U16 Academy' : activeTeam;

    const created: Activity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newActName.trim(),
      category: newActCategory,
      unit: newActUnit,
      winningRule: newActWinningRule,
      description: newActDescription.trim(),
      benchmarks: {
        [teamKey]: {
          'All Positions': Number(newActBenchmarkAll),
        },
      },
    };

    onSaveActivity(created);
    setSelectedActivity(created);
    setShowAddActivityModal(false);
    setNewActName('');
    setNewActDescription('');
  };

  // Handle update Benchmark Matrix
  const handleUpdateBenchmark = (
    activity: Activity,
    teamKey: string,
    positionKey: string,
    val: number
  ) => {
    const updatedBenchmarks = { ...activity.benchmarks };
    if (!updatedBenchmarks[teamKey]) {
      updatedBenchmarks[teamKey] = {};
    }
    updatedBenchmarks[teamKey][positionKey] = val;

    const updatedActivity = {
      ...activity,
      benchmarks: updatedBenchmarks,
    };
    onSaveActivity(updatedActivity);
    setSelectedActivity(updatedActivity);
  };

  // Handle Match Stat Entry
  const handleUpdateMatchStat = (
    session: Session,
    playerId: string,
    field: 'minutesPlayed' | 'goals' | 'assists' | 'yellowCards' | 'redCards' | 'rating',
    val: number
  ) => {
    const currentStats = session.matchDetails?.playerStats || {};
    const playerStat = currentStats[playerId] || {
      minutesPlayed: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      rating: 6,
    };

    const updated = {
      ...currentStats,
      [playerId]: {
        ...playerStat,
        [field]: val,
      },
    };

    const updatedSession: Session = {
      ...session,
      matchDetails: {
        ...session.matchDetails!,
        playerStats: updated,
      },
      updatedAt: new Date().toISOString(),
      baseVersion: session.baseVersion + 1,
    };

    onSaveSession(updatedSession);
    setSelectedSession(updatedSession);
  };

  // Handle Manual Result Save
  const handleSaveManualResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !manualPlayerId || !manualActivityId) return;

    const targetActivity = activities.find((a) => a.id === manualActivityId);
    if (!targetActivity) return;

    // Determine previous results for PB check
    const previous = (selectedSession.results || [])
      .filter((r) => r.activityId === manualActivityId && r.playerId === manualPlayerId && !r.isInvalid)
      .map((r) => r.result);

    const isPB = isPersonalBest(manualResultVal, previous, targetActivity.winningRule);
    const targetPlayer = players.find((p) => p.id === manualPlayerId);
    const benchmarkVal = targetPlayer
      ? resolveBenchmark(targetActivity, targetPlayer.team, targetPlayer.position)
      : undefined;

    const deltaInfo = calculateBenchmarkDelta(manualResultVal, benchmarkVal, targetActivity.winningRule);

    const newResult: ActivityResult = {
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: selectedSession.id,
      activityId: manualActivityId,
      playerId: manualPlayerId,
      result: Number(manualResultVal),
      unit: targetActivity.unit,
      timestamp: new Date().toISOString(),
      isPB,
      targetHit: deltaInfo?.isHit || false,
    };

    const updatedSession: Session = {
      ...selectedSession,
      results: [...(selectedSession.results || []), newResult],
      updatedAt: new Date().toISOString(),
      baseVersion: selectedSession.baseVersion + 1,
    };

    onSaveSession(updatedSession);
    setSelectedSession(updatedSession);
    setShowAddResultModal(false);
  };

  // Handle Mock Whiteboard layout attachment
  const handleAttachTacticalLayout = () => {
    if (!selectedSession) return;
    // Generate a clean SVG tactical whiteboard representation
    const tacticalSvgData =
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23111"/><rect x="20" y="20" width="560" height="360" fill="none" stroke="%23fff" stroke-width="4"/><line x1="300" y1="20" x2="300" y2="380" stroke="%23fff" stroke-width="3"/><circle cx="300" cy="200" r="50" fill="none" stroke="%23fff" stroke-width="3"/><circle cx="300" cy="200" r="4" fill="%23fff"/><rect x="20" y="120" width="100" height="160" fill="none" stroke="%23fff" stroke-width="3"/><rect x="480" y="120" width="100" height="160" fill="none" stroke="%23fff" stroke-width="3"/><text x="180" y="100" fill="%23fff" font-family="sans-serif" font-size="16" font-weight="bold">HIGH PRESS 4-3-3</text><circle cx="120" cy="200" r="12" fill="%23fff"/><text x="116" y="205" fill="%23000" font-weight="bold">1</text><circle cx="200" cy="100" r="12" fill="%23fff"/><circle cx="200" cy="170" r="12" fill="%23fff"/><circle cx="200" cy="230" r="12" fill="%23fff"/><circle cx="200" cy="300" r="12" fill="%23fff"/><circle cx="320" cy="140" r="12" fill="%23fff"/><circle cx="320" cy="260" r="12" fill="%23fff"/><circle cx="420" cy="120" r="12" fill="%23fff"/><circle cx="440" cy="200" r="12" fill="%23fff"/><circle cx="420" cy="280" r="12" fill="%23fff"/></svg>';

    const updated: Session = {
      ...selectedSession,
      attachmentUrl: tacticalSvgData,
      updatedAt: new Date().toISOString(),
      baseVersion: selectedSession.baseVersion + 1,
    };
    onSaveSession(updated);
    setSelectedSession(updated);
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 max-w-4xl mx-auto w-full pb-24">
      {/* Sub-view switcher */}
      <div className="flex items-center justify-between gap-3 mb-5 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl relative">
          <button
            onClick={() => setSubView('sessions')}
            className={`relative px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 z-10 ${
              subView === 'sessions'
                ? 'text-white dark:text-black font-black'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            {subView === 'sessions' && (
              <motion.div
                layoutId="session-subview-pill"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                className="absolute inset-0 bg-black dark:bg-white rounded-lg -z-10 shadow-sm"
              />
            )}
            <Trophy className="w-3.5 h-3.5" /> Sessions & Matches
          </button>
          <button
            onClick={() => setSubView('activities')}
            className={`relative px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 z-10 ${
              subView === 'activities'
                ? 'text-white dark:text-black font-black'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`}
          >
            {subView === 'activities' && (
              <motion.div
                layoutId="session-subview-pill"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                className="absolute inset-0 bg-black dark:bg-white rounded-lg -z-10 shadow-sm"
              />
            )}
            <Dumbbell className="w-3.5 h-3.5" /> Activities & Benchmarks
          </button>
        </div>

        {subView === 'activities' ? (
          <button
            onClick={() => setShowAddActivityModal(true)}
            className="px-3.5 py-1.5 bg-black dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> New Activity
          </button>
        ) : null}
      </div>

      {/* VIEW 1: SESSIONS & MATCH DAYS */}
      {subView === 'sessions' && (
        <div className="space-y-4">
          {/* Session Selector Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {sessions.map((s) => (
              <motion.button
                key={s.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedSession(s)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider shrink-0 transition-colors cursor-pointer text-left ${
                  selectedSession?.id === s.id
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="text-[10px] opacity-75">{s.date} • {s.type}</div>
                <div className="font-bold truncate max-w-[140px]">{s.title}</div>
              </motion.button>
            ))}
          </div>

          {selectedSession && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        selectedSession.type === 'match'
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      {selectedSession.type === 'match' ? 'Match / Fixture' : 'Training Session'}
                    </span>
                    <span className="text-xs font-bold text-neutral-500">
                      {selectedSession.team} • {selectedSession.date} at {selectedSession.time}
                    </span>
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">
                    {selectedSession.title}
                  </h3>
                  {selectedSession.notes && (
                    <p className="text-xs text-neutral-500 mt-1">{selectedSession.notes}</p>
                  )}
                </div>

                {/* Session Actions */}
                <div className="flex items-center gap-2">
                  {selectedSession.attachmentUrl ? (
                    <button
                      onClick={() => setShowAttachmentViewer(true)}
                      className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold uppercase rounded-xl flex items-center gap-1.5 cursor-pointer text-black dark:text-white"
                    >
                      <Paperclip className="w-3.5 h-3.5" /> View Tactical Board
                    </button>
                  ) : (
                    <button
                      onClick={handleAttachTacticalLayout}
                      className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold uppercase rounded-xl flex items-center gap-1.5 cursor-pointer text-neutral-700 dark:text-neutral-300"
                    >
                      <Paperclip className="w-3.5 h-3.5" /> Attach Whiteboard
                    </button>
                  )}

                  <button
                    onClick={() => onOpenLiveTimerForSession(selectedSession)}
                    className="px-3.5 py-1.5 bg-black dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Clock className="w-3.5 h-3.5" /> Live Timer
                  </button>
                </div>
              </div>

              {/* Whiteboard preview inline if attached */}
              {selectedSession.attachmentUrl && showAttachmentViewer && (
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                      Tactical Whiteboard Layout
                    </span>
                    <button
                      onClick={() => setShowAttachmentViewer(false)}
                      className="text-xs text-neutral-400 hover:text-white font-bold cursor-pointer"
                    >
                      Hide
                    </button>
                  </div>
                  <img
                    src={selectedSession.attachmentUrl}
                    alt="Tactical Layout"
                    className="w-full max-h-64 object-contain rounded-lg border border-neutral-800"
                  />
                </div>
              )}

              {/* MATCH DETAILS SECTION */}
              {selectedSession.type === 'match' && selectedSession.matchDetails && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-neutral-500">Fixture</span>
                      <h4 className="text-base font-black uppercase text-black dark:text-white">
                        {selectedSession.team} vs {selectedSession.matchDetails.opponent}
                      </h4>
                    </div>
                    <div className="text-center font-mono">
                      <span className="text-xs font-bold uppercase block text-neutral-500">Score</span>
                      <span className="text-2xl font-black text-black dark:text-white">
                        {selectedSession.matchDetails.touchlineScore ?? 0} - {selectedSession.matchDetails.opponentScore ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Player Match Stats Table */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white mb-2">
                      Player Match Ratings & Statistics
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                        <thead className="bg-neutral-100 dark:bg-neutral-800 text-[10px] font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                          <tr>
                            <th className="p-2.5">Player</th>
                            <th className="p-2.5 text-center">Mins</th>
                            <th className="p-2.5 text-center">Goals</th>
                            <th className="p-2.5 text-center">Assists</th>
                            <th className="p-2.5 text-center">Yellow</th>
                            <th className="p-2.5 text-center">Red</th>
                            <th className="p-2.5 text-center">Rating (1-10)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                          {players
                            .filter((p) => !p.isArchived)
                            .slice(0, 8)
                            .map((p) => {
                              const stat = selectedSession.matchDetails?.playerStats[p.id] || {
                                minutesPlayed: 0,
                                goals: 0,
                                assists: 0,
                                yellowCards: 0,
                                redCards: 0,
                                rating: 6,
                              };
                              return (
                                <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-950">
                                  <td className="p-2.5 font-bold flex items-center gap-2">
                                    <span className="w-5 h-5 rounded bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-mono text-[10px]">
                                      {p.shirtNumber}
                                    </span>
                                    <span>{p.name}</span>
                                    <span className="text-[10px] text-neutral-400 font-normal">({p.position})</span>
                                  </td>
                                  <td className="p-2 text-center">
                                    <input
                                      type="number"
                                      min={0}
                                      max={120}
                                      value={stat.minutesPlayed}
                                      onChange={(e) =>
                                        handleUpdateMatchStat(selectedSession, p.id, 'minutesPlayed', parseInt(e.target.value) || 0)
                                      }
                                      className="w-14 px-1.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-center font-mono font-bold"
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    <input
                                      type="number"
                                      min={0}
                                      value={stat.goals}
                                      onChange={(e) =>
                                        handleUpdateMatchStat(selectedSession, p.id, 'goals', parseInt(e.target.value) || 0)
                                      }
                                      className="w-12 px-1 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-center font-mono font-bold"
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    <input
                                      type="number"
                                      min={0}
                                      value={stat.assists}
                                      onChange={(e) =>
                                        handleUpdateMatchStat(selectedSession, p.id, 'assists', parseInt(e.target.value) || 0)
                                      }
                                      className="w-12 px-1 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-center font-mono font-bold"
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    <input
                                      type="number"
                                      min={0}
                                      max={2}
                                      value={stat.yellowCards}
                                      onChange={(e) =>
                                        handleUpdateMatchStat(selectedSession, p.id, 'yellowCards', parseInt(e.target.value) || 0)
                                      }
                                      className="w-12 px-1 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-center font-mono font-bold"
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    <input
                                      type="number"
                                      min={0}
                                      max={1}
                                      value={stat.redCards}
                                      onChange={(e) =>
                                        handleUpdateMatchStat(selectedSession, p.id, 'redCards', parseInt(e.target.value) || 0)
                                      }
                                      className="w-12 px-1 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-center font-mono font-bold"
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    <input
                                      type="number"
                                      min={1}
                                      max={10}
                                      value={stat.rating}
                                      onChange={(e) =>
                                        handleUpdateMatchStat(selectedSession, p.id, 'rating', parseInt(e.target.value) || 6)
                                      }
                                      className="w-14 px-1 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-center font-mono font-black"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* RECORDED ACTIVITY RESULTS SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-neutral-500" />
                    Recorded Fitness & Activity Results ({selectedSession.results?.length || 0})
                  </h4>
                  <button
                    onClick={() => setShowAddResultModal(true)}
                    className="px-3 py-1 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-xs font-bold uppercase rounded-lg text-black dark:text-white cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Manual Entry
                  </button>
                </div>

                {!selectedSession.results || selectedSession.results.length === 0 ? (
                  <div className="py-8 text-center text-neutral-400 text-xs bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    No results recorded for this session yet. Launch Live Timer or enter results manually.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedSession.results.map((res) => {
                      const player = players.find((p) => p.id === res.playerId);
                      const activity = activities.find((a) => a.id === res.activityId);
                      const target = player && activity ? resolveBenchmark(activity, player.team, player.position) : undefined;
                      const delta = target && activity ? calculateBenchmarkDelta(res.result, target, activity.winningRule) : null;

                      return (
                        <motion.div
                          key={res.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          whileHover={{ y: -1 }}
                          className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded bg-neutral-200 dark:bg-neutral-800 text-xs font-black flex items-center justify-center font-mono">
                              {player?.shirtNumber || '#'}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-black dark:text-white">
                                  {player?.name || 'Unknown'}
                                </span>
                                {res.isPB && (
                                  <span className="px-1.5 py-0.2 rounded bg-black dark:bg-white text-white dark:text-black font-black text-[9px] uppercase tracking-wider">
                                    PB
                                  </span>
                                )}
                                {res.targetHit && (
                                  <span className="px-1.5 py-0.2 rounded bg-neutral-300 dark:bg-neutral-700 text-black dark:text-white font-black text-[9px] uppercase tracking-wider">
                                    Target Hit
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-neutral-500">
                                {activity?.name} ({player?.position})
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-black font-mono text-black dark:text-white">
                              {res.result} <span className="text-[10px] font-normal text-neutral-400">{res.unit}</span>
                            </div>
                            {delta && (
                              <span className="text-[10px] font-mono font-bold text-neutral-500">
                                Δ {delta.formattedDelta} (Target: {delta.target})
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ACTIVITIES & BENCHMARK MATRIX */}
      {subView === 'activities' && (
        <div className="space-y-4">
          {/* Activity Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {activities.map((act) => (
              <motion.button
                key={act.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedActivity(act)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider shrink-0 transition-colors cursor-pointer text-left ${
                  selectedActivity?.id === act.id
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="text-[10px] opacity-75">{act.category}</div>
                <div className="font-bold">{act.name}</div>
              </motion.button>
            ))}
          </div>

          {selectedActivity && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                      {selectedActivity.category}
                    </span>
                    <span className="text-xs font-semibold text-neutral-500">
                      Unit: {selectedActivity.unit} • {selectedActivity.winningRule === 'lower_is_better' ? 'Lower is better' : 'Higher is better'}
                    </span>
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">
                    {selectedActivity.name}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">{selectedActivity.description}</p>
                </div>
              </div>

              {/* Dynamic Benchmark Matrix Configuration */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-neutral-500" />
                    Target Benchmark Matrix ({activeTeam})
                  </h4>
                  <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                    Dynamic graph reference lines
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Baseline 'All Positions' */}
                  <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800">
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block mb-1">
                      All Positions (Default)
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={selectedActivity.benchmarks?.[activeTeam]?.[`All Positions`] ?? selectedActivity.benchmarks?.['U16 Academy']?.['All Positions'] ?? ''}
                      onChange={(e) =>
                        handleUpdateBenchmark(
                          selectedActivity,
                          activeTeam === 'All Teams' ? 'U16 Academy' : activeTeam,
                          'All Positions',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-2 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-mono font-black text-black dark:text-white text-center"
                    />
                  </div>

                  {/* Standard Positions */}
                  {STANDARD_POSITIONS.map((pos) => {
                    const currentVal = selectedActivity.benchmarks?.[activeTeam]?.[pos] ?? selectedActivity.benchmarks?.['U16 Academy']?.[pos] ?? '';
                    return (
                      <div key={pos} className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                        <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block mb-1">
                          {pos} Target
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={currentVal}
                          placeholder="Inherit baseline"
                          onChange={(e) =>
                            handleUpdateBenchmark(
                              selectedActivity,
                              activeTeam === 'All Teams' ? 'U16 Academy' : activeTeam,
                              pos,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full px-2 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-mono font-bold text-black dark:text-white text-center"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Benchmark Simulation Visualizer */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 block">
                  Dynamic Benchmark Snapping Preview (Line Graph Simulation)
                </span>
                <div className="h-24 w-full bg-white dark:bg-neutral-900 rounded-lg border border-neutral-300 dark:border-neutral-800 relative flex items-center px-4 overflow-hidden">
                  {/* Dashed gray benchmark line */}
                  <div className="absolute inset-x-0 top-1/2 border-b-2 border-dashed border-neutral-400 dark:border-neutral-600 z-0" />
                  <span className="absolute right-3 top-1 text-[10px] font-mono font-bold text-neutral-500 bg-white dark:bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700">
                    Target Benchmark Line
                  </span>
                  <div className="relative z-10 flex items-center justify-around w-full">
                    {[
                      { label: 'Heat 1', val: 1.82 },
                      { label: 'Heat 2', val: 1.76 },
                      { label: 'Heat 3 (PB)', val: 1.69 },
                    ].map((h, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div className="w-3.5 h-3.5 rounded-full bg-black dark:bg-white border-2 border-neutral-400 mb-1" />
                        <span className="text-[10px] font-mono font-bold text-neutral-700 dark:text-neutral-300">{h.val}s</span>
                        <span className="text-[9px] text-neutral-500">{h.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Result Entry Modal */}
      <AnimatePresence>
        {showAddResultModal && selectedSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowAddResultModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />
            <motion.form
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onSubmit={handleSaveManualResult}
              className="relative z-10 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-black uppercase tracking-tight text-black dark:text-white">
                Log Activity Result
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  Select Activity
                </label>
                <select
                  value={manualActivityId}
                  onChange={(e) => setManualActivityId(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-xs font-bold text-black dark:text-white"
                >
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  Select Player
                </label>
                <select
                  value={manualPlayerId}
                  onChange={(e) => setManualPlayerId(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-xs font-bold text-black dark:text-white"
                >
                  {players
                    .filter((p) => !p.isArchived)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.shirtNumber} {p.name} ({p.position})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  Result Value
                </label>
                <input
                  type="number"
                  step="any"
                  value={manualResultVal}
                  onChange={(e) => setManualResultVal(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-sm font-mono font-black text-black dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setShowAddResultModal(false)}
                  className="px-4 py-2 text-xs font-bold uppercase text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black font-bold uppercase text-xs rounded-xl hover:opacity-90 cursor-pointer shadow-sm"
                >
                  Save Result
                </motion.button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Add Custom Activity Modal */}
      <AnimatePresence>
        {showAddActivityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowAddActivityModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />
            <motion.form
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onSubmit={handleCreateActivity}
              className="relative z-10 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-black uppercase tracking-tight text-black dark:text-white">
                Create Custom Activity
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  Activity Name
                </label>
                <input
                  type="text"
                  value={newActName}
                  onChange={(e) => setNewActName(e.target.value)}
                  placeholder="e.g. 5-10-5 Pro Agility Shuttle"
                  required
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-sm font-semibold text-black dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    Category
                  </label>
                  <select
                    value={newActCategory}
                    onChange={(e) => setNewActCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white"
                  >
                    <option value="Speed & Agility">Speed & Agility</option>
                    <option value="Endurance">Endurance</option>
                    <option value="Strength">Strength</option>
                    <option value="Technical">Technical</option>
                    <option value="Subjective">Subjective</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    Measurement Unit
                  </label>
                  <select
                    value={newActUnit}
                    onChange={(e) => setNewActUnit(e.target.value as ActivityUnit)}
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white"
                  >
                    <option value="seconds">Seconds (s)</option>
                    <option value="minutes">Minutes (min)</option>
                    <option value="cm">Centimeters (cm)</option>
                    <option value="m">Meters (m)</option>
                    <option value="reps">Reps</option>
                    <option value="points">Points</option>
                    <option value="%">Percent (%)</option>
                    <option value="count">Count only</option>
                    <option value="rating_10">Rating 1-10</option>
                    <option value="stars_5">Stars 1-5</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    Winning Rule
                  </label>
                  <select
                    value={newActWinningRule}
                    onChange={(e) => setNewActWinningRule(e.target.value as WinningRule)}
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white"
                  >
                    <option value="lower_is_better">Lower is better</option>
                    <option value="higher_is_better">Higher is better</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    Baseline Target
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newActBenchmarkAll}
                    onChange={(e) => setNewActBenchmarkAll(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-xs font-mono font-bold text-black dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  Description & Protocol
                </label>
                <textarea
                  value={newActDescription}
                  onChange={(e) => setNewActDescription(e.target.value)}
                  placeholder="Testing procedure, setup cone distances..."
                  rows={2}
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setShowAddActivityModal(false)}
                  className="px-4 py-2 text-xs font-bold uppercase text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black font-bold uppercase text-xs rounded-xl hover:opacity-90 cursor-pointer shadow-sm"
                >
                  Create Activity
                </motion.button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
