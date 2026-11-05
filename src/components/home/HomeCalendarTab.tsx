import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Session, Player, AttendanceStatus, SessionType } from '../../types/coach';
import { generateRepeatingSessions } from '../../utils/coachMath';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Repeat,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trophy,
} from 'lucide-react';

interface HomeCalendarTabProps {
  sessions: Session[];
  players: Player[];
  activeTeam: string;
  availableTeams: string[];
  onTeamChange: (team: string) => void;
  onSaveSession: (session: Session) => void;
  onSaveMultipleSessions: (sessions: Session[]) => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenSessionDetails: (session: Session) => void;
}

export const HomeCalendarTab: React.FC<HomeCalendarTabProps> = ({
  sessions,
  players,
  activeTeam,
  availableTeams,
  onTeamChange,
  onSaveSession,
  onSaveMultipleSessions,
  onOpenSessionDetails,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 10, 1)); // Default to Nov 2026
  const [selectedDateString, setSelectedDateString] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showRepeatModal, setShowRepeatModal] = useState<Session | null>(null);
  const [repeatWeeksCount, setRepeatWeeksCount] = useState<number>(4);
  const [attendanceModalSession, setAttendanceModalSession] = useState<Session | null>(null);

  // New session form state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<SessionType>('training');
  const [newDate, setNewDate] = useState(selectedDateString);
  const [newTime, setNewTime] = useState('18:00');
  const [newLocation, setNewLocation] = useState('Main Pitch');
  const [newNotes, setNewNotes] = useState('');
  const [newOpponent, setNewOpponent] = useState('');

  // Calendar math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateString(today.toISOString().split('T')[0]);
  };

  // Filtered sessions
  const filteredSessions = sessions.filter((s) => {
    if (activeTeam === 'All Teams' || !activeTeam) return true;
    return s.team === activeTeam;
  });

  // Sessions for selected day
  const daySessions = filteredSessions.filter((s) => s.date === selectedDateString);

  // Handle create session
  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newSession: Session = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newTitle.trim(),
      type: newType,
      date: newDate,
      time: newTime,
      location: newLocation,
      team: activeTeam === 'All Teams' ? 'U16 Academy' : activeTeam,
      notes: newNotes,
      matchDetails:
        newType === 'match'
          ? {
              opponent: newOpponent || 'Opponent FC',
              isHome: true,
              playerStats: {},
            }
          : undefined,
      attendance: {},
      results: [],
      baseVersion: 1,
      updatedAt: new Date().toISOString(),
    };

    onSaveSession(newSession);
    setShowAddModal(false);
    setNewTitle('');
    setNewNotes('');
    setNewOpponent('');
  };

  // Handle repeating session
  const handleExecuteRepeat = () => {
    if (!showRepeatModal) return;

    const existingKeys = new Set(
      sessions.map((s) => `${s.date}_${s.team}_${s.title}`)
    );

    const generated = generateRepeatingSessions(
      showRepeatModal,
      repeatWeeksCount,
      existingKeys
    );

    if (generated.length > 0) {
      onSaveMultipleSessions(generated);
    }

    setShowRepeatModal(null);
  };

  // Handle Attendance status update
  const handleUpdatePlayerAttendance = (
    session: Session,
    playerId: string,
    status: AttendanceStatus
  ) => {
    const updatedAttendance = { ...session.attendance, [playerId]: status };
    const updatedSession: Session = {
      ...session,
      attendance: updatedAttendance,
      updatedAt: new Date().toISOString(),
      baseVersion: session.baseVersion + 1,
    };
    onSaveSession(updatedSession);
    setAttendanceModalSession(updatedSession);
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 max-w-4xl mx-auto w-full pb-24">
      {/* Top Bar: Team Filter & Quick Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => onTeamChange('All Teams')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer ${
              activeTeam === 'All Teams'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
            }`}
          >
            All Teams
          </button>
          {availableTeams.map((team) => (
            <button
              key={team}
              onClick={() => onTeamChange(team)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer ${
                activeTeam === team
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              {team}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setNewDate(selectedDateString);
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Schedule Session
        </button>
      </div>

      {/* Calendar Header */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-black dark:text-white">
              {monthNames[month]} {year}
            </h2>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-black dark:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextMonth}
              aria-label="Next Month"
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-black dark:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <span key={d} className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 py-1">
              {d}
            </span>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty prefix slots */}
          {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-10 sm:h-12 rounded-lg bg-neutral-50/50 dark:bg-neutral-950/30" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
            const formattedMonth = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
            const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

            const isSelected = selectedDateString === dateStr;
            const dayEvents = filteredSessions.filter((s) => s.date === dateStr);
            const hasMatch = dayEvents.some((s) => s.type === 'match');
            const hasTraining = dayEvents.some((s) => s.type === 'training');

            return (
              <motion.button
                key={dateStr}
                whileTap={{ scale: 0.92 }}
                onClick={() => setSelectedDateString(dateStr)}
                className={`h-11 sm:h-14 rounded-xl flex flex-col items-center justify-between p-1 transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-black ring-2 ring-neutral-400'
                    : 'bg-neutral-50 dark:bg-neutral-950 hover:bg-neutral-100 dark:hover:bg-neutral-800 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200'
                }`}
              >
                <span className="text-xs sm:text-sm font-bold">{dayNum}</span>
                {/* Event dots */}
                <div className="flex items-center gap-1 mb-0.5">
                  {hasMatch && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-neutral-300 dark:bg-neutral-700' : 'bg-black dark:bg-white'
                      }`}
                      title="Match Day"
                    />
                  )}
                  {hasTraining && (
                    <span
                      className={`w-1.5 h-1.5 rounded-sm ${
                        isSelected ? 'bg-neutral-400 dark:bg-neutral-600' : 'bg-neutral-500'
                      }`}
                      title="Training Session"
                    />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda */}
      <motion.div
        key={selectedDateString}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3 border-b border-neutral-200 dark:border-neutral-800 pb-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-neutral-500" />
            <h3 className="text-sm font-black uppercase tracking-wider text-black dark:text-white">
              Schedule for {selectedDateString}
            </h3>
          </div>
          <span className="text-xs font-semibold text-neutral-500">
            {daySessions.length} {daySessions.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        {daySessions.length === 0 ? (
          <div className="py-8 text-center text-neutral-400 dark:text-neutral-500 text-xs">
            No training sessions or fixtures scheduled on this date.
          </div>
        ) : (
          <div className="space-y-3">
            {daySessions.map((session) => {
              // Calculate attendance numbers
              const attendanceKeys = Object.keys(session.attendance || {});
              const availableCount = attendanceKeys.filter(
                (k) => session.attendance[k] === 'Available'
              ).length;
              const injuredCount = attendanceKeys.filter(
                (k) => session.attendance[k] === 'Injured'
              ).length;
              const absentCount = attendanceKeys.filter(
                (k) => session.attendance[k] === 'Absent'
              ).length;

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  whileHover={{ y: -2 }}
                  className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-neutral-400 dark:hover:border-neutral-700 transition-colors"
                >
                  <div className="flex-1 cursor-pointer" onClick={() => onOpenSessionDetails(session)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          session.type === 'match'
                            ? 'bg-black text-white dark:bg-white dark:text-black'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                        }`}
                      >
                        {session.type === 'match' ? 'Match' : 'Training'}
                      </span>
                      <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                        {session.team}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-black dark:text-white">
                      {session.title}
                    </h4>

                    {session.type === 'match' && session.matchDetails && (
                      <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
                        <Trophy className="w-3.5 h-3.5" /> vs {session.matchDetails.opponent}
                        {session.matchDetails.touchlineScore !== undefined && (
                          <span className="font-mono font-bold ml-1">
                            ({session.matchDetails.touchlineScore} - {session.matchDetails.opponentScore})
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {session.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {session.location}
                      </span>
                    </div>

                    {/* Attendance breakdown pills */}
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-800">
                        <CheckCircle2 className="w-3 h-3 text-neutral-600 dark:text-neutral-300" />
                        {availableCount} Available
                      </span>
                      {injuredCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-800">
                          <AlertTriangle className="w-3 h-3 text-neutral-600 dark:text-neutral-300" />
                          {injuredCount} Injured
                        </span>
                      )}
                      {absentCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-800">
                          <XCircle className="w-3 h-3 text-neutral-600 dark:text-neutral-300" />
                          {absentCount} Absent
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-200 dark:border-neutral-800">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAttendanceModalSession(session)}
                      className="flex-1 sm:flex-initial px-3 py-1.5 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-black dark:text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" /> Squad RSVP
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowRepeatModal(session)}
                      className="px-3 py-1.5 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Repeat across upcoming weeks"
                    >
                      <Repeat className="w-3.5 h-3.5" /> Repeat
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Repeat Session Modal */}
      <AnimatePresence>
        {showRepeatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowRepeatModal(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative z-10 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-lg font-black uppercase tracking-tight text-black dark:text-white mb-2">
                Repeat Scheduled Session
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
                Repeats &quot;{showRepeatModal.title}&quot; on subsequent weeks without accidental duplication.
              </p>

              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  Number of Weeks to Repeat
                </label>
                <select
                  value={repeatWeeksCount}
                  onChange={(e) => setRepeatWeeksCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-sm font-semibold text-black dark:text-white"
                >
                  <option value={2}>2 additional weeks</option>
                  <option value={4}>4 additional weeks (1 month)</option>
                  <option value={8}>8 additional weeks (2 months)</option>
                  <option value={12}>12 additional weeks (Quarter)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowRepeatModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleExecuteRepeat}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 cursor-pointer shadow-sm"
                >
                  Generate Repeating Sessions
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Attendance Modal */}
      <AnimatePresence>
        {attendanceModalSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setAttendanceModalSession(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative z-10 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-2xl p-6 max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-black dark:text-white">
                    Squad Availability & RSVP
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {attendanceModalSession.title} ({attendanceModalSession.date})
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.90 }}
                  onClick={() => setAttendanceModalSession(null)}
                  className="text-neutral-500 hover:text-black dark:hover:text-white font-bold text-sm cursor-pointer p-1"
                >
                  ✕
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {players
                  .filter((p) => !p.isArchived && (attendanceModalSession.team === 'All Teams' || p.team === attendanceModalSession.team))
                  .map((player) => {
                    const status = attendanceModalSession.attendance[player.id] || 'Available';
                    return (
                      <motion.div
                        key={player.id}
                        whileHover={{ y: -1 }}
                        className="p-3 bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold text-xs flex items-center justify-center">
                            {player.shirtNumber}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-black dark:text-white">
                                {player.name}
                              </span>
                              {player.isInjured && (
                                <span className="text-xs font-bold text-neutral-500" title={player.medicalNote || 'Active medical note'}>
                                  ⚠️
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-neutral-500 font-medium">
                              {player.position}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {(['Available', 'Injured', 'Absent'] as AttendanceStatus[]).map((st) => (
                            <motion.button
                              key={st}
                              whileTap={{ scale: 0.94 }}
                              onClick={() => handleUpdatePlayerAttendance(attendanceModalSession, player.id, st)}
                              className={`px-2 py-1 text-[10px] font-bold uppercase rounded-lg border transition-colors cursor-pointer ${
                                status === st
                                  ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                                  : 'bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-800 hover:border-neutral-400'
                              }`}
                            >
                              {st}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
              </div>

              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 mt-4 flex justify-end">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setAttendanceModalSession(null)}
                  className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black font-bold uppercase text-xs rounded-xl cursor-pointer shadow-sm"
                >
                  Done
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Session Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />
            <motion.form
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onSubmit={handleCreateSession}
              className="relative z-10 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-black uppercase tracking-tight text-black dark:text-white">
                Schedule New Session or Fixture
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  Classification
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => setNewType('training')}
                    className={`py-2 text-xs font-bold uppercase rounded-xl border transition-colors cursor-pointer ${
                      newType === 'training'
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                        : 'bg-neutral-100 dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-800'
                    }`}
                  >
                    Training Session
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => setNewType('match')}
                    className={`py-2 text-xs font-bold uppercase rounded-xl border transition-colors cursor-pointer ${
                      newType === 'match'
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                        : 'bg-neutral-100 dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-800'
                    }`}
                  >
                    Match / Fixture
                  </motion.button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  Session Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={newType === 'match' ? 'Matchday 13 vs North United' : 'Speed & Tactical Pressing'}
                  required
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-sm font-semibold text-black dark:text-white"
                />
              </div>

              {newType === 'match' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    Opponent Club
                  </label>
                  <input
                    type="text"
                    value={newOpponent}
                    onChange={(e) => setNewOpponent(e.target.value)}
                    placeholder="e.g. North United FC"
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-sm font-semibold text-black dark:text-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-sm font-semibold text-black dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-sm font-semibold text-black dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  Pitch / Location
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Pitch 1 or Away Stadium"
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-sm font-semibold text-black dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  Notes
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Objectives, equipment required..."
                  rows={2}
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold uppercase text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black font-bold uppercase text-xs rounded-xl hover:opacity-90 cursor-pointer shadow-sm"
                >
                  Save Session
                </motion.button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
