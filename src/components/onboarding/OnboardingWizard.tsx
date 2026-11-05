import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TouchlineLogo } from '../common/TouchlineLogo';
import { CoachProfile, Player, StandardPosition, STANDARD_POSITIONS } from '../../types/coach';
import { UserCheck, Users, Timer, CheckCircle, ChevronRight, ChevronLeft, Plus, Trash2, Sparkles } from 'lucide-react';
import { SAMPLE_PLAYERS } from '../../services/storage';

interface OnboardingProps {
  initialProfile: CoachProfile;
  onComplete: (profile: CoachProfile, players: Player[]) => void;
  onSkip: () => void;
}

export const OnboardingWizard: React.FC<OnboardingProps> = ({
  initialProfile,
  onComplete,
  onSkip,
}) => {
  const [step, setStep] = useState<number>(1);
  const [profile, setProfile] = useState<CoachProfile>(initialProfile);
  const [players, setPlayers] = useState<Player[]>([]);

  // Draft player form state
  const [draftName, setDraftName] = useState('');
  const [draftNumber, setDraftNumber] = useState<number>(players.length + 1);
  const [draftPosition, setDraftPosition] = useState<StandardPosition>('CM');

  const handleAddPlayer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!draftName.trim()) return;

    const newPlayer: Player = {
      id: `ply_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: draftName.trim(),
      shirtNumber: Number(draftNumber) || players.length + 1,
      team: profile.activeTeam || 'First Team',
      position: draftPosition,
      isInjured: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    setPlayers([...players, newPlayer]);
    setDraftName('');
    setDraftNumber(players.length + 2);
  };

  const handleRemovePlayer = (id: string) => {
    setPlayers(players.filter((p) => p.id !== id));
  };

  const handleLoadSampleSquad = () => {
    setPlayers(SAMPLE_PLAYERS.filter((p) => !p.isArchived));
  };

  const handleFinish = () => {
    onComplete(profile, players);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-y-auto p-4 sm:p-6">
      {/* Header */}
      <div className="w-full max-w-xl mx-auto flex items-center justify-between py-2 border-b border-neutral-800">
        <TouchlineLogo size={36} showText subtitle="Setup Wizard" />
        <button
          onClick={onSkip}
          className="text-xs uppercase tracking-wider font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          Skip Setup
        </button>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-xl mx-auto my-auto py-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 px-2">
          {[
            { num: 1, label: 'Coach' },
            { num: 2, label: 'Team' },
            { num: 3, label: 'Squad' },
            { num: 4, label: 'Review' },
          ].map((item) => (
            <div key={item.num} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                  step === item.num
                    ? 'bg-white text-black'
                    : step > item.num
                    ? 'bg-neutral-700 text-white'
                    : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
                }`}
              >
                {step > item.num ? '✓' : item.num}
              </div>
              <span
                className={`text-xs font-semibold uppercase tracking-wider hidden sm:inline ${
                  step === item.num ? 'text-white' : 'text-neutral-500'
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Coach Profile */}
        {step === 1 && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold uppercase tracking-tight">Coach Profile</h2>
                <p className="text-xs text-neutral-400">Enter your credentials for reports and pitch-side logs</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="e.g. Coach Marcus Vance"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                  Role / Title
                </label>
                <input
                  type="text"
                  value={profile.role}
                  onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                  placeholder="e.g. Head Coach / Academy Director"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                  Club / Academy
                </label>
                <input
                  type="text"
                  value={profile.club}
                  onChange={(e) => setProfile({ ...profile, club: e.target.value })}
                  placeholder="e.g. Touchline Youth Academy"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                  License / Accreditation
                </label>
                <input
                  type="text"
                  value={profile.licenseLevel}
                  onChange={(e) => setProfile({ ...profile, licenseLevel: e.target.value })}
                  placeholder="e.g. UEFA A / USSF National A"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Team Setup */}
        {step === 2 && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold uppercase tracking-tight">Team Configuration</h2>
                <p className="text-xs text-neutral-400">Set the default squad group for schedules and metrics</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                  Primary Team / Squad
                </label>
                <input
                  type="text"
                  value={profile.activeTeam}
                  onChange={(e) => setProfile({ ...profile, activeTeam: e.target.value })}
                  placeholder="e.g. U16 Academy, First Team"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 block mb-1">
                  Standard Position System
                </span>
                <p className="text-xs text-neutral-400 mb-3">
                  Touchline Coach standardizes players into 6 tactical categories with positional target benchmarks:
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {STANDARD_POSITIONS.map((pos) => (
                    <div key={pos} className="py-2 px-2 bg-neutral-950 border border-neutral-800 rounded-lg font-bold">
                      {pos}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Squad Setup */}
        {step === 3 && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-tight">Add Your Squad</h2>
                  <p className="text-xs text-neutral-400">Add players now or populate realistic starter roster</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLoadSampleSquad}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold rounded-lg text-neutral-200 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Sample Squad
              </button>
            </div>

            {/* Quick Add Form */}
            <form onSubmit={handleAddPlayer} className="mb-4 p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase">#</label>
                  <input
                    type="number"
                    value={draftNumber}
                    onChange={(e) => setDraftNumber(parseInt(e.target.value) || 1)}
                    className="w-full px-2 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-center font-bold"
                  />
                </div>
                <div className="col-span-6">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase">Player Name</label>
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="e.g. Jack Grealish"
                    className="w-full px-2 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-4">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase">Position</label>
                  <select
                    value={draftPosition}
                    onChange={(e) => setDraftPosition(e.target.value as StandardPosition)}
                    className="w-full px-2 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-semibold"
                  >
                    {STANDARD_POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Player
              </button>
            </form>

            {/* Current Added Players */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {players.length === 0 ? (
                <div className="text-center py-6 text-neutral-500 text-xs italic">
                  No players added yet. Add players above or tap &quot;Sample Squad&quot;.
                </div>
              ) : (
                players.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 bg-neutral-900/70 border border-neutral-800 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-neutral-800 flex items-center justify-center font-black">
                        {p.shirtNumber}
                      </span>
                      <span className="font-semibold">{p.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[10px] font-bold text-neutral-400">
                        {p.position}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemovePlayer(p.id)}
                      className="p-1 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 4: Tutorial & Review */}
        {step === 4 && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold uppercase tracking-tight">Ready for Pitch-side</h2>
                <p className="text-xs text-neutral-400">Quick pitch-side navigation guide</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-start gap-3">
                <Timer className="w-5 h-5 text-white shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold block text-white">Live Timer & Mass Split/Lap:</span>
                  <span className="text-neutral-400 leading-normal">
                    Tap &quot;Split/Lap&quot; rapidly at the finish line when players cross in a pack. Assign split times to grid players immediately after the heat.
                  </span>
                </div>
              </div>

              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-start gap-3">
                <Users className="w-5 h-5 text-white shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold block text-white">Medical & Availability Tracking:</span>
                  <span className="text-neutral-400 leading-normal">
                    Medical warning icons automatically flag injured players across the squad view and the live timing grid.
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-neutral-900/50 border border-neutral-800 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-400">Coach:</span>
                <span className="font-semibold">{profile.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Club & Team:</span>
                <span className="font-semibold">{profile.club} ({profile.activeTeam})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Squad Size:</span>
                <span className="font-semibold">{players.length} players ready</span>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between mt-6">
          {step > 1 ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setStep(step - 1)}
              className="px-4 py-2.5 rounded-xl border border-neutral-800 bg-neutral-900 text-xs font-bold uppercase tracking-wider text-neutral-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </motion.button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setStep(step + 1)}
              className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer ml-auto shadow-sm"
            >
              Next <ChevronRight className="w-4 h-4" />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleFinish}
              className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer ml-auto shadow-sm"
            >
              Enter Touchline Coach <CheckCircle className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="w-full text-center py-2 text-[11px] text-neutral-600 uppercase tracking-widest">
        Touchline Coach System • Built for Android Mobile
      </div>
    </div>
  );
};
