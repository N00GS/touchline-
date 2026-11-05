/**
 * Touchline Coach - Main Mobile Application Entry
 * Strict Black, White, and Grayscale design system
 */

import React, { useState, useEffect } from 'react';
import { storageService } from './services/storage';
import { syncService, SyncStatus } from './services/syncService';
import { Player, Session, Activity, CoachProfile, ActivityResult } from './types/coach';
import { TouchlineLogo } from './components/common/TouchlineLogo';
import {
  FatalError,
  FatalErrorInfo,
  HomeBoundary,
  SquadBoundary,
  SessionsBoundary,
  LiveTimerBoundary,
  ReportsBoundary,
} from './components/common/ErrorBoundaries';

// Tab Components
import { HomeCalendarTab } from './components/home/HomeCalendarTab';
import { SquadTab } from './components/squad/SquadTab';
import { SessionsAndActivitiesTab } from './components/sessions/SessionsAndActivitiesTab';
import { LiveTimerTab } from './components/timer/LiveTimerTab';
import { ReportsTab } from './components/reports/ReportsTab';

// Drawer & Onboarding
import { ProfileDrawer } from './components/profile/ProfileDrawer';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';

// Icons
import {
  Calendar,
  Users,
  Dumbbell,
  Timer,
  FileSpreadsheet,
  Cloud,
  CheckCircle2,
  RefreshCw,
  User,
  WifiOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ActiveTab = 'home' | 'squad' | 'sessions' | 'timer' | 'reports';

export default function App() {
  // Global Application State
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  const [androidFrameMode, setAndroidFrameMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [showProfileDrawer, setShowProfileDrawer] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [fatalError, setFatalError] = useState<FatalErrorInfo | null>(null);

  // Core Data Stores
  const [coachProfile, setCoachProfile] = useState<CoachProfile>(storageService.getCoachProfile());
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activities, setActivities] = useState<Activity[]>(storageService.getActivities());

  // Sync Outbox State
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());

  // Active Team Filter (defaulting to coach's active team or 'U16 Academy')
  const [activeTeam, setActiveTeam] = useState<string>('U16 Academy');

  // Timer cross-navigation context
  const [timerTargetSessionId, setTimerTargetSessionId] = useState<string | undefined>(undefined);
  const [timerTargetActivityId, setTimerTargetActivityId] = useState<string | undefined>(undefined);

  // Initialize on mount
  useEffect(() => {
    // Theme setup
    const savedTheme = storageService.getTheme();
    setThemeState(savedTheme);
    storageService.setTheme(savedTheme);

    // Frame setup
    const savedFrame = storageService.isAndroidFrameMode();
    setAndroidFrameMode(savedFrame);

    // Check autostart query param
    const urlParams = new URLSearchParams(window.location.search);
    const autostart = urlParams.get('autostart') === '1';

    // Onboarding check
    const isOnboarded = storageService.isOnboardingCompleted();
    if (!isOnboarded && !autostart) {
      setShowOnboarding(true);
    } else {
      // If onboarded or autostart, ensure sample squad exists for smooth evaluation
      const initialPlayers = storageService.getPlayers();
      if (initialPlayers.length === 0) {
        storageService.loadSampleData();
      }
    }

    // Load data
    setPlayers(storageService.getPlayers());
    setSessions(storageService.getSessions());
    setActivities(storageService.getActivities());
    setCoachProfile(storageService.getCoachProfile());

    // Subscribe to outbox sync status
    const unsubscribeSync = syncService.subscribe((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribeSync();
    };
  }, []);

  // Compute available teams
  const availableTeams = Array.from(
    new Set([coachProfile.activeTeam, ...players.map((p) => p.team), ...sessions.map((s) => s.team)].filter(Boolean))
  );

  // Theme Toggle Handler
  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    storageService.setTheme(next);
  };

  // Android Frame Mode Handler
  const handleToggleAndroidFrame = () => {
    const next = !androidFrameMode;
    setAndroidFrameMode(next);
    storageService.setAndroidFrameMode(next);
  };

  // Onboarding Complete Handler
  const handleOnboardingComplete = (profile: CoachProfile, newPlayers: Player[]) => {
    storageService.saveCoachProfile(profile);
    setCoachProfile(profile);

    if (newPlayers.length > 0) {
      storageService.savePlayers(newPlayers);
      setPlayers(newPlayers);
    } else {
      // Default to sample squad if none added
      storageService.loadSampleData();
      setPlayers(storageService.getPlayers());
      setSessions(storageService.getSessions());
    }

    storageService.setOnboardingCompleted(true);
    setShowOnboarding(false);
  };

  const handleSkipOnboarding = () => {
    // If skipping, load starter squad so user immediately has players to time
    const existing = storageService.getPlayers();
    if (existing.length === 0) {
      storageService.loadSampleData();
      setPlayers(storageService.getPlayers());
      setSessions(storageService.getSessions());
    }
    storageService.setOnboardingCompleted(true);
    setShowOnboarding(false);
  };

  // Data Mutations
  const handleSavePlayer = (player: Player) => {
    const exists = players.some((p) => p.id === player.id);
    const updated = exists ? players.map((p) => (p.id === player.id ? player : p)) : [...players, player];
    setPlayers(updated);
    storageService.savePlayers(updated);
  };

  const handleArchivePlayerToggle = (playerId: string, shouldArchive: boolean) => {
    const updated = players.map((p) => (p.id === playerId ? { ...p, isArchived: shouldArchive } : p));
    setPlayers(updated);
    storageService.savePlayers(updated);
  };

  const handleSaveSession = (session: Session) => {
    const exists = sessions.some((s) => s.id === session.id);
    const updated = exists ? sessions.map((s) => (s.id === session.id ? session : s)) : [session, ...sessions];
    setSessions(updated);
    storageService.saveSessions(updated);
  };

  const handleSaveMultipleSessions = (newSessions: Session[]) => {
    const updated = [...newSessions, ...sessions];
    setSessions(updated);
    storageService.saveSessions(updated);
  };

  const handleDeleteSession = (sessionId: string) => {
    const updated = sessions.filter((s) => s.id !== sessionId);
    setSessions(updated);
    storageService.saveSessions(updated);
  };

  const handleSaveActivity = (activity: Activity) => {
    const exists = activities.some((a) => a.id === activity.id);
    const updated = exists ? activities.map((a) => (a.id === activity.id ? activity : a)) : [...activities, activity];
    setActivities(updated);
    storageService.saveActivities(updated);
  };

  const handleSaveLiveResults = (sessionId: string, newResults: ActivityResult[]) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const updatedSession: Session = {
      ...session,
      results: [...(session.results || []), ...newResults],
      updatedAt: new Date().toISOString(),
      baseVersion: session.baseVersion + 1,
    };

    handleSaveSession(updatedSession);
  };

  const handleOpenLiveTimerForSession = (session: Session, activityId?: string) => {
    setTimerTargetSessionId(session.id);
    if (activityId) setTimerTargetActivityId(activityId);
    setActiveTab('timer');
  };

  const handleResetData = () => {
    storageService.loadSampleData();
    setPlayers(storageService.getPlayers());
    setSessions(storageService.getSessions());
    setActivities(storageService.getActivities());
    setCoachProfile(storageService.getCoachProfile());
    setShowProfileDrawer(false);
  };

  const handleRestoreBackup = (jsonStr: string): boolean => {
    const success = storageService.restoreFullBackupJson(jsonStr);
    if (success) {
      setPlayers(storageService.getPlayers());
      setSessions(storageService.getSessions());
      setActivities(storageService.getActivities());
      setCoachProfile(storageService.getCoachProfile());
    }
    return success;
  };

  const handleImportCsvData = (imported: {
    players: Player[];
    sessions: Session[];
    activities: Activity[];
  }) => {
    setPlayers(imported.players);
    storageService.savePlayers(imported.players);

    setSessions(imported.sessions);
    storageService.saveSessions(imported.sessions);

    setActivities(imported.activities);
    storageService.saveActivities(imported.activities);
  };

  // If irrecoverable fatal error occurred
  if (fatalError) {
    return (
      <FatalError
        error={fatalError}
        onReset={() => {
          storageService.purgeAllData();
          window.location.reload();
        }}
        onRetry={() => setFatalError(null)}
      />
    );
  }

  // Navigation items config
  const NAV_ITEMS = [
    { id: 'home', label: 'Home', icon: Calendar },
    { id: 'squad', label: 'My squad', icon: Users },
    { id: 'sessions', label: 'Sessions', icon: Dumbbell },
    { id: 'timer', label: 'Live timer', icon: Timer },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
  ] as const;

  // Application Shell Content
  const appContent = (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7] dark:bg-[#000000] text-neutral-900 dark:text-neutral-50 selection:bg-neutral-800 selection:text-white transition-colors">
      {/* APPLE FROSTED GLASS TOP HEADER */}
      <header className="sticky top-0 z-30 apple-glass bg-white/75 dark:bg-black/75 border-b border-black/[0.06] dark:border-white/[0.08] px-4 py-2.5 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        {/* Brand Asset: Approved C & Football Logo */}
        <motion.div
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => setActiveTab('home')}
        >
          <TouchlineLogo size={32} showText subtitle={activeTeam} />
        </motion.div>

        {/* Pitch-side Cloud Sync Status & Settings Button */}
        <div className="flex items-center gap-2">
          {/* Offline Outbox Status Pill */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => syncService.triggerSync()}
            title={
              syncStatus.isOnline
                ? syncStatus.queuedCount > 0
                  ? `${syncStatus.queuedCount} items waiting in outbox queue. Tap to force sync.`
                  : 'Cloud Synced (Supabase)'
                : 'Offline Pitch-side Mode (Changes queued locally)'
            }
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium tracking-tight bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] border border-black/[0.05] dark:border-white/[0.08] cursor-pointer transition-colors"
          >
            {syncStatus.isSyncing ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-neutral-600 dark:text-neutral-400" />
                <span className="hidden sm:inline font-sans text-[11px]">Syncing</span>
              </>
            ) : !syncStatus.isOnline ? (
              <>
                <WifiOff className="w-3 h-3 text-neutral-500" />
                <span className="hidden sm:inline font-sans text-[11px]">Offline</span>
              </>
            ) : syncStatus.queuedCount > 0 ? (
              <>
                <Cloud className="w-3 h-3 text-neutral-600 dark:text-neutral-400" />
                <span>{syncStatus.queuedCount} Queued</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-neutral-700 dark:text-neutral-300" />
                <span className="hidden sm:inline font-sans text-[11px]">Synced</span>
              </>
            )}
          </motion.button>

          {/* Profile & Settings Trigger Icon */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowProfileDrawer(true)}
            aria-label="Open Settings and Profile"
            className="w-8 h-8 rounded-full bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.14] border border-black/[0.05] dark:border-white/[0.08] flex items-center justify-center transition-colors cursor-pointer text-black dark:text-white"
          >
            <User className="w-4 h-4" />
          </motion.button>
        </div>
      </header>

      {/* MAIN VIEWPORT WITH FLUID ANIMATE PRESENCE TRANSITIONS */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex-1 flex flex-col"
          >
            {activeTab === 'home' && (
              <HomeBoundary>
                <HomeCalendarTab
                  sessions={sessions}
                  players={players}
                  activeTeam={activeTeam}
                  availableTeams={availableTeams}
                  onTeamChange={setActiveTeam}
                  onSaveSession={handleSaveSession}
                  onSaveMultipleSessions={handleSaveMultipleSessions}
                  onDeleteSession={handleDeleteSession}
                  onOpenSessionDetails={(session) => {
                    setTimerTargetSessionId(session.id);
                    setActiveTab('sessions');
                  }}
                />
              </HomeBoundary>
            )}

            {activeTab === 'squad' && (
              <SquadBoundary>
                <SquadTab
                  players={players}
                  activeTeam={activeTeam}
                  availableTeams={availableTeams}
                  onSavePlayer={handleSavePlayer}
                  onArchiveToggle={handleArchivePlayerToggle}
                />
              </SquadBoundary>
            )}

            {activeTab === 'sessions' && (
              <SessionsBoundary>
                <SessionsAndActivitiesTab
                  sessions={sessions}
                  activities={activities}
                  players={players}
                  activeTeam={activeTeam}
                  onSaveSession={handleSaveSession}
                  onSaveActivity={handleSaveActivity}
                  onOpenLiveTimerForSession={handleOpenLiveTimerForSession}
                />
              </SessionsBoundary>
            )}

            {activeTab === 'timer' && (
              <LiveTimerBoundary>
                <LiveTimerTab
                  sessions={sessions}
                  activities={activities}
                  players={players}
                  activeTeam={activeTeam}
                  selectedSessionId={timerTargetSessionId}
                  selectedActivityId={timerTargetActivityId}
                  onSaveSessionResults={handleSaveLiveResults}
                />
              </LiveTimerBoundary>
            )}

            {activeTab === 'reports' && (
              <ReportsBoundary>
                <ReportsTab
                  sessions={sessions}
                  players={players}
                  activities={activities}
                  coachProfile={coachProfile}
                  activeTeam={activeTeam}
                  onRestoreBackup={handleRestoreBackup}
                  onImportCsvData={handleImportCsvData}
                />
              </ReportsBoundary>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* APPLE DOCK-STYLE FLOATING BOTTOM NAVIGATION */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-30 apple-glass bg-white/80 dark:bg-black/80 border-t border-black/[0.06] dark:border-white/[0.08] px-3 py-1.5 flex items-center justify-around print:hidden select-none"
      >
        <div className="w-full max-w-lg mx-auto flex items-center justify-between">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.90 }}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-colors cursor-pointer ${
                  isActive
                    ? 'text-black dark:text-white font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300 font-normal'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="apple-nav-pill"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    className="absolute inset-0 bg-black/[0.06] dark:bg-white/[0.1] rounded-2xl -z-10"
                  />
                )}
                <Icon className={`w-4 h-4 mb-0.5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </nav>

      {/* PROFILE & SETTINGS RIGHT-HAND SLIDE-OVER DRAWER */}
      <ProfileDrawer
        isOpen={showProfileDrawer}
        onClose={() => setShowProfileDrawer(false)}
        coachProfile={coachProfile}
        onSaveProfile={(prof) => {
          setCoachProfile(prof);
          storageService.saveCoachProfile(prof);
        }}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        androidFrameMode={androidFrameMode}
        onToggleAndroidFrame={handleToggleAndroidFrame}
        syncStatus={syncStatus}
        onTriggerSync={() => syncService.triggerSync()}
        onReopenOnboarding={() => setShowOnboarding(true)}
        onResetData={handleResetData}
      />

      {/* GUIDED FIRST-INSTALL ONBOARDING WIZARD */}
      {showOnboarding && (
        <OnboardingWizard
          initialProfile={coachProfile}
          onComplete={handleOnboardingComplete}
          onSkip={handleSkipOnboarding}
        />
      )}
    </div>
  );

  // If Android Frame mode is enabled, wrap in an Android device shell
  if (androidFrameMode) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-2 sm:p-6">
        <div className="w-full max-w-[420px] h-[860px] bg-black rounded-[48px] border-[10px] border-neutral-800 shadow-2xl overflow-hidden flex flex-col relative ring-1 ring-neutral-700">
          {/* Android Status Bar */}
          <div className="h-7 bg-neutral-950 px-6 flex items-center justify-between text-[11px] font-mono text-neutral-400 select-none shrink-0 z-50">
            <span>09:41</span>
            {/* Center camera punch hole */}
            <div className="w-3.5 h-3.5 bg-black rounded-full border border-neutral-800" />
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <span>100%</span>
            </div>
          </div>

          {/* App container within Android frame */}
          <div className="flex-1 overflow-y-auto relative flex flex-col">
            {appContent}
          </div>

          {/* Android Bottom Navigation Pill */}
          <div className="h-4 bg-neutral-950 flex items-center justify-center shrink-0 z-50">
            <div className="w-32 h-1 bg-neutral-600 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return appContent;
}
