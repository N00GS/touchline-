import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CoachProfile } from '../../types/coach';
import { SyncStatus, syncService, SUPABASE_URL } from '../../services/syncService';
import { TouchlineLogo } from '../common/TouchlineLogo';
import {
  X,
  User,
  Moon,
  Sun,
  Smartphone,
  Cloud,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  coachProfile: CoachProfile;
  onSaveProfile: (profile: CoachProfile) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  androidFrameMode: boolean;
  onToggleAndroidFrame: () => void;
  syncStatus: SyncStatus;
  onTriggerSync: () => void;
  onReopenOnboarding: () => void;
  onResetData: () => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  isOpen,
  onClose,
  coachProfile,
  onSaveProfile,
  theme,
  onToggleTheme,
  androidFrameMode,
  onToggleAndroidFrame,
  syncStatus,
  onTriggerSync,
  onReopenOnboarding,
  onResetData,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileDraft, setProfileDraft] = useState<CoachProfile>(coachProfile);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(profileDraft);
    setIsEditing(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Side Panel sliding in from right */}
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-screen max-w-md bg-white dark:bg-neutral-950 border-l border-neutral-200 dark:border-neutral-800 text-black dark:text-white flex flex-col shadow-2xl pointer-events-auto"
            >
              {/* Panel Header */}
              <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <TouchlineLogo size={36} showText subtitle="Settings & Cloud" />
                <motion.button
                  whileTap={{ scale: 0.90 }}
                  onClick={onClose}
                  aria-label="Close Settings Drawer"
                  className="p-2 rounded-xl text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Panel Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Coach Profile Card */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-neutral-500" />
                  Coach Profile
                </span>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs font-bold uppercase text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleSave} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-neutral-500 block mb-0.5">Name</label>
                    <input
                      type="text"
                      value={profileDraft.name}
                      onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-neutral-500 block mb-0.5">Club / Organization</label>
                    <input
                      type="text"
                      value={profileDraft.club}
                      onChange={(e) => setProfileDraft({ ...profileDraft, club: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-neutral-500 block mb-0.5">License Level</label>
                    <input
                      type="text"
                      value={profileDraft.licenseLevel}
                      onChange={(e) => setProfileDraft({ ...profileDraft, licenseLevel: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Save Changes
                  </button>
                </form>
              ) : (
                <div className="space-y-1.5 text-xs">
                  <div className="font-black text-sm text-black dark:text-white">{coachProfile.name}</div>
                  <div className="text-neutral-500">{coachProfile.role} • {coachProfile.club}</div>
                  <div className="text-neutral-400 font-mono text-[11px]">{coachProfile.licenseLevel}</div>
                </div>
              )}
            </div>

            {/* Application Theme & Mobile Viewport Options */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white block">
                Display & Viewport
              </span>

              {/* Theme Toggle (Strict Black, White, and Grayscale) */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  Theme ({theme === 'dark' ? 'Dark Mode' : 'Light Mode'})
                </span>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onToggleTheme}
                  className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-bold uppercase tracking-wider bg-white dark:bg-neutral-950 cursor-pointer"
                >
                  Switch to {theme === 'dark' ? 'Light' : 'Dark'}
                </motion.button>
              </div>

              {/* Android Frame Mockup Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Android Phone Frame
                </span>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onToggleAndroidFrame}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider cursor-pointer ${
                    androidFrameMode
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                      : 'bg-white dark:bg-neutral-950 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {androidFrameMode ? 'Enabled' : 'Disabled'}
                </motion.button>
              </div>
            </div>

            {/* Phase 2: Supabase Cloud & Offline-First Workspace */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                  <Cloud className="w-4 h-4 text-neutral-500" />
                  Supabase Cloud & Outbox
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-neutral-500">
                  {syncStatus.isOnline ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-neutral-700 dark:text-neutral-300" /> Online
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-neutral-500" /> Pitch-side Offline
                    </>
                  )}
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Project Endpoint:</span>
                  <span className="font-mono text-[10px] text-neutral-600 dark:text-neutral-400 truncate max-w-[200px]">
                    {SUPABASE_URL}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Outbox Queue:</span>
                  <span className="font-mono font-bold text-black dark:text-white">
                    {syncStatus.queuedCount} items waiting
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">OCC Conflicts Caught:</span>
                  <span className="font-mono text-neutral-600 dark:text-neutral-400">
                    {syncStatus.conflictCount} (409 Rejections)
                  </span>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onTriggerSync}
                disabled={syncStatus.isSyncing}
                className="w-full py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-black dark:text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                {syncStatus.isSyncing ? 'Syncing Outbox...' : 'Force Cloud Sync'}
              </motion.button>
            </div>

            {/* Android Delivery & App Specs */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-2 text-xs">
              <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-neutral-500" />
                Android Package & Delivery
              </span>
              <div className="flex justify-between text-neutral-500">
                <span>Application ID:</span>
                <span className="font-mono text-black dark:text-white font-bold">com.touchlinecoach.app</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Deep Link URI:</span>
                <span className="font-mono text-[11px] text-neutral-600 dark:text-neutral-400">touchlinecoach://auth/callback</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Target Architecture:</span>
                <span className="font-mono text-black dark:text-white">Android 14+ (ARM64)</span>
              </div>
            </div>

            {/* System Actions */}
            <div className="space-y-2 pt-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  onClose();
                  onReopenOnboarding();
                }}
                className="w-full py-2.5 px-4 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer text-black dark:text-white"
              >
                <Sparkles className="w-4 h-4" /> Re-launch Setup Wizard
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onResetData}
                className="w-full py-2.5 px-4 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              >
                <RotateCcw className="w-4 h-4" /> Reset Squad & Sample Data
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )}
</AnimatePresence>
  );
};
