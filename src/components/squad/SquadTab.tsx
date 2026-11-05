import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, StandardPosition, STANDARD_POSITIONS } from '../../types/coach';
import {
  Search,
  Plus,
  AlertTriangle,
  Archive,
  RotateCcw,
  Edit2,
  Users,
} from 'lucide-react';

interface SquadTabProps {
  players: Player[];
  activeTeam: string;
  availableTeams: string[];
  onSavePlayer: (player: Player) => void;
  onArchiveToggle: (playerId: string, shouldArchive: boolean) => void;
}

export const SquadTab: React.FC<SquadTabProps> = ({
  players,
  activeTeam,
  availableTeams,
  onSavePlayer,
  onArchiveToggle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('All Positions');
  const [viewArchived, setViewArchived] = useState<boolean>(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form states
  const [name, setName] = useState('');
  const [shirtNumber, setShirtNumber] = useState<number>(1);
  const [team, setTeam] = useState(activeTeam === 'All Teams' ? 'U16 Academy' : activeTeam);
  const [position, setPosition] = useState<StandardPosition>('CM');
  const [isInjured, setIsInjured] = useState(false);
  const [medicalNote, setMedicalNote] = useState('');

  const openAddModal = () => {
    setName('');
    setShirtNumber(players.length + 1);
    setTeam(activeTeam === 'All Teams' ? (availableTeams[0] || 'U16 Academy') : activeTeam);
    setPosition('CM');
    setIsInjured(false);
    setMedicalNote('');
    setEditingPlayer(null);
    setShowAddModal(true);
  };

  const openEditModal = (player: Player) => {
    setEditingPlayer(player);
    setName(player.name);
    setShirtNumber(player.shirtNumber);
    setTeam(player.team);
    setPosition(player.position);
    setIsInjured(player.isInjured);
    setMedicalNote(player.medicalNote || '');
    setShowAddModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingPlayer) {
      const updated: Player = {
        ...editingPlayer,
        name: name.trim(),
        shirtNumber: Number(shirtNumber),
        team,
        position,
        isInjured,
        medicalNote: medicalNote.trim() || undefined,
      };
      onSavePlayer(updated);
    } else {
      const created: Player = {
        id: `ply_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        shirtNumber: Number(shirtNumber),
        team,
        position,
        isInjured,
        medicalNote: medicalNote.trim() || undefined,
        isArchived: false,
        createdAt: new Date().toISOString(),
      };
      onSavePlayer(created);
    }

    setShowAddModal(false);
  };

  // Filter players
  const filteredPlayers = players.filter((p) => {
    // Archive check
    if (viewArchived ? !p.isArchived : p.isArchived) return false;

    // Team check
    if (activeTeam !== 'All Teams' && p.team !== activeTeam) return false;

    // Position check
    if (selectedPosition !== 'All Positions' && p.position !== selectedPosition) return false;

    // Search check
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.shirtNumber.toString().includes(q) ||
        p.position.toLowerCase().includes(q)
      );
    }

    return true;
  });

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 max-w-4xl mx-auto w-full pb-24">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-black dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-neutral-500" />
            {viewArchived ? 'Archived / Inactive Players' : 'Active Squad'}
          </h2>
          <p className="text-xs text-neutral-500">
            {filteredPlayers.length} {filteredPlayers.length === 1 ? 'player' : 'players'} listed
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewArchived(!viewArchived)}
            className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewArchived
                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-800'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            {viewArchived ? 'View Active' : 'View Archived'}
          </button>

          {!viewArchived && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Player
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3.5 mb-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, # or position..."
            className="w-full pl-9 pr-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white placeholder:text-neutral-500 focus:outline-none"
          />
        </div>

        {/* Position Filter */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {['All Positions', ...STANDARD_POSITIONS].map((pos) => (
            <motion.button
              key={pos}
              whileTap={{ scale: 0.94 }}
              onClick={() => setSelectedPosition(pos)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${
                selectedPosition === pos
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
              }`}
            >
              {pos}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Squad List */}
      <div className="space-y-2.5">
        {filteredPlayers.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
            <Users className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-neutral-500">No players match the current filter.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredPlayers.map((player) => (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                whileHover={{ y: -1 }}
                className="p-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex items-center justify-between gap-3 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Shirt Badge */}
                  <div className="w-10 h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-black text-sm shrink-0">
                    {player.shirtNumber}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-black dark:text-white">
                        {player.name}
                      </h3>

                      {/* Prominent Medical / Injury Flag */}
                      {player.isInjured && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-black text-[10px] font-black uppercase tracking-wider border border-neutral-400 shadow-sm"
                          title={player.medicalNote || 'Active injury flag'}
                        >
                          <AlertTriangle className="w-3 h-3 text-white dark:text-black" />
                          INJURED
                        </span>
                      )}

                      {player.isArchived && (
                        <span className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-[10px] font-bold text-neutral-500">
                          ARCHIVED
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
                      <span className="font-bold text-neutral-800 dark:text-neutral-200">
                        {player.position}
                      </span>
                      <span>•</span>
                      <span>{player.team}</span>
                      {player.medicalNote && (
                        <>
                          <span>•</span>
                          <span className="text-[11px] italic text-neutral-600 dark:text-neutral-400 truncate max-w-[200px]">
                            {player.medicalNote}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(player)}
                    aria-label={`Edit ${player.name}`}
                    className="p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {player.isArchived ? (
                    <button
                      onClick={() => onArchiveToggle(player.id, false)}
                      className="p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Restore to Active Squad"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onArchiveToggle(player.id, true)}
                      className="p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Archive / Deactivate (Preserves historical data)"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Add / Edit Player Modal */}
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
              onSubmit={handleFormSubmit}
              className="relative z-10 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-black uppercase tracking-tight text-black dark:text-white">
                {editingPlayer ? 'Edit Player Profile' : 'Add New Player'}
              </h3>

              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    # Shirt
                  </label>
                  <input
                    type="number"
                    value={shirtNumber}
                    onChange={(e) => setShirtNumber(parseInt(e.target.value) || 1)}
                    required
                    min={1}
                    max={99}
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-center text-sm font-black text-black dark:text-white"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Jude Bellingham"
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-sm font-semibold text-black dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    Team / Squad
                  </label>
                  <input
                    type="text"
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    required
                    placeholder="e.g. U16 Academy"
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    Position
                  </label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value as StandardPosition)}
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl text-xs font-semibold text-black dark:text-white"
                  >
                    {STANDARD_POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Medical / Injury Section */}
              <div className="p-3.5 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-neutral-500" />
                    Active Medical / Injury Flag
                  </span>
                  <input
                    type="checkbox"
                    id="injuredCheckbox"
                    checked={isInjured}
                    onChange={(e) => setIsInjured(e.target.checked)}
                    className="w-4 h-4 accent-black dark:accent-white cursor-pointer"
                  />
                </div>

                {isInjured && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
                      Medical Note / Return to Play Status
                    </label>
                    <input
                      type="text"
                      value={medicalNote}
                      onChange={(e) => setMedicalNote(e.target.value)}
                      placeholder="e.g. Ankle sprain - non-contact warmup only"
                      className="w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs font-medium text-black dark:text-white"
                    />
                  </div>
                )}
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
                  {editingPlayer ? 'Update Player' : 'Save Player'}
                </motion.button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
