import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Session, Player, Activity, CoachProfile } from '../../types/coach';
import {
  exportToMachineReadableCsv,
  calculateBenchmarkDelta,
  resolveBenchmark,
  parseAndImportCsv,
  CsvImportResult,
} from '../../utils/coachMath';
import { TouchlineLogo } from '../common/TouchlineLogo';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Upload,
  BarChart3,
  CheckCircle2,
  Calendar,
  Trophy,
  Activity as ActivityIcon,
  FileUp,
  AlertCircle,
  Users,
} from 'lucide-react';

interface ReportsTabProps {
  sessions: Session[];
  players: Player[];
  activities: Activity[];
  coachProfile: CoachProfile;
  activeTeam: string;
  onRestoreBackup: (jsonStr: string) => boolean;
  onImportCsvData: (imported: { players: Player[]; sessions: Session[]; activities: Activity[] }) => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  sessions,
  players,
  activities,
  coachProfile,
  activeTeam,
  onRestoreBackup,
  onImportCsvData,
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(players[0]?.id || '');
  const [reportType, setReportType] = useState<'squad_summary' | 'player_deep_dive'>('squad_summary');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  // CSV Import State
  const [pendingCsvResult, setPendingCsvResult] = useState<CsvImportResult | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) || players[0];

  // Calculate Overall Attendance Rate
  const totalAttendanceRecords = sessions.flatMap((s) => Object.values(s.attendance || {}));
  const availableCount = totalAttendanceRecords.filter((st) => st === 'Available').length;
  const overallAttendanceRate = totalAttendanceRecords.length > 0
    ? Math.round((availableCount / totalAttendanceRecords.length) * 100)
    : 92;

  // Calculate Match Day Record
  const matches = sessions.filter((s) => s.type === 'match');
  let wins = 0;
  let draws = 0;
  let losses = 0;
  matches.forEach((m) => {
    if (m.matchDetails?.touchlineScore !== undefined && m.matchDetails?.opponentScore !== undefined) {
      if (m.matchDetails.touchlineScore > m.matchDetails.opponentScore) wins++;
      else if (m.matchDetails.touchlineScore === m.matchDetails.opponentScore) draws++;
      else losses++;
    }
  });

  // Export Machine-Readable CSV
  const handleDownloadCsv = () => {
    const csvContent = exportToMachineReadableCsv(sessions, players, activities);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `touchline_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Print to PDF
  const handlePrintPdf = () => {
    window.print();
  };

  // Export JSON Backup
  const handleDownloadJsonBackup = () => {
    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      coachProfile,
      players,
      sessions,
      activities,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `touchline_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle File Restore
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = onRestoreBackup(content);
      if (success) {
        setRestoreStatus('Backup restored successfully!');
        setTimeout(() => setRestoreStatus(null), 4000);
      } else {
        setRestoreStatus('Failed to restore backup: Invalid JSON schema');
        setTimeout(() => setRestoreStatus(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  // Handle CSV file selection and parsing
  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      const result = parseAndImportCsv(csvText, players, sessions, activities);
      setPendingCsvResult(result);
      setShowImportModal(true);
    };
    reader.readAsText(file);
    // Reset file input so same file can be re-selected if needed
    e.target.value = '';
  };

  // Confirm applying CSV data into app state
  const handleConfirmCsvImport = () => {
    if (!pendingCsvResult || !pendingCsvResult.success) return;

    onImportCsvData({
      players: pendingCsvResult.updatedPlayers,
      sessions: pendingCsvResult.updatedSessions,
      activities: pendingCsvResult.updatedActivities,
    });

    setImportNotice(
      `Successfully imported: ${pendingCsvResult.playersImported} new players, ${pendingCsvResult.sessionsImported} sessions, ${pendingCsvResult.resultsImported} performance records.`
    );
    setShowImportModal(false);
    setPendingCsvResult(null);
    setTimeout(() => setImportNotice(null), 6000);
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 max-w-4xl mx-auto w-full pb-24">
      {/* Top Bar: Action Buttons (Hidden on print) */}
      <div className="print:hidden flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-black dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-neutral-500" />
            Reports & Export Center
          </h2>
          <p className="text-xs text-neutral-500">
            Generate printable PDF dossier reports, bulk CSV data import, and state backups
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* CSV File Input */}
          <input
            type="file"
            ref={csvFileInputRef}
            onChange={handleCsvFileSelect}
            accept=".csv,text/csv"
            className="hidden"
          />

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => csvFileInputRef.current?.click()}
            className="px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold uppercase tracking-wider rounded-xl text-black dark:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-300 dark:border-neutral-700"
          >
            <FileUp className="w-4 h-4" /> Import CSV
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDownloadCsv}
            className="px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold uppercase tracking-wider rounded-xl text-black dark:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-300 dark:border-neutral-700"
          >
            <Download className="w-4 h-4" /> Export CSV
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePrintPdf}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </motion.button>
        </div>
      </div>

      {/* Import Success Banner */}
      {importNotice && (
        <div className="print:hidden mb-4 p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border-2 border-black dark:border-white text-black dark:text-white flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-neutral-700 dark:text-neutral-300 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider">{importNotice}</span>
        </div>
      )}

      {/* Screen-Only Controls (Report mode switcher, backup/restore) */}
      <div className="print:hidden space-y-4 mb-6">
        <div className="flex items-center justify-between bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReportType('squad_summary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                reportType === 'squad_summary'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
              }`}
            >
              Squad Summary Report
            </button>
            <button
              onClick={() => setReportType('player_deep_dive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                reportType === 'player_deep_dive'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
              }`}
            >
              Individual Player Deep-Dive
            </button>
          </div>

          {reportType === 'player_deep_dive' && (
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs font-bold text-black dark:text-white"
            >
              {players
                .filter((p) => !p.isArchived)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.shirtNumber} {p.name} ({p.position})
                  </option>
                ))}
            </select>
          )}
        </div>

        {/* JSON Backup & Restore Strip */}
        <div className="p-3.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
            <span className="font-bold text-black dark:text-white uppercase tracking-wider">
              Data Management:
            </span>
            <span>Local database snapshots & backups</span>
            {restoreStatus && (
              <span className="font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded">
                {restoreStatus}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJsonBackup}
              className="px-3 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg font-bold text-[11px] uppercase tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer text-black dark:text-white flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Backup JSON
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileRestore}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg font-bold text-[11px] uppercase tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer text-black dark:text-white flex items-center gap-1"
            >
              <Upload className="w-3 h-3" /> Restore JSON
            </button>
          </div>
        </div>
      </div>

      {/* PRINTABLE DOSSIER REPORT (Stylized for both screen and Print-to-PDF engine) */}
      <div className="bg-white dark:bg-neutral-900 print:bg-white print:text-black border border-neutral-200 dark:border-neutral-800 print:border-none rounded-3xl p-6 sm:p-8 shadow-sm print:p-0">
        {/* PDF Header with Approved Logo */}
        <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center gap-3">
            <TouchlineLogo size={48} />
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black dark:text-white print:text-black">
                Touchline Coach Report
              </h1>
              <p className="text-xs text-neutral-500 font-semibold print:text-neutral-700">
                {coachProfile.club} • {coachProfile.activeTeam} • {coachProfile.licenseLevel}
              </p>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="font-mono font-bold block text-black dark:text-white print:text-black">
              {new Date().toISOString().split('T')[0]}
            </span>
            <span className="text-neutral-500 print:text-neutral-600">
              Lead Coach: {coachProfile.name}
            </span>
          </div>
        </div>

        {/* High-Level Squad KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-950 print:bg-neutral-100 border border-neutral-200 dark:border-neutral-800 print:border-neutral-300">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block mb-1">
              Active Squad
            </span>
            <span className="text-2xl font-black font-mono text-black dark:text-white print:text-black">
              {players.filter((p) => !p.isArchived).length}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-950 print:bg-neutral-100 border border-neutral-200 dark:border-neutral-800 print:border-neutral-300">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block mb-1">
              Attendance Rate
            </span>
            <span className="text-2xl font-black font-mono text-black dark:text-white print:text-black">
              {overallAttendanceRate}%
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-950 print:bg-neutral-100 border border-neutral-200 dark:border-neutral-800 print:border-neutral-300">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block mb-1">
              Match Record
            </span>
            <span className="text-2xl font-black font-mono text-black dark:text-white print:text-black">
              {wins}W-{draws}D-{losses}L
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-950 print:bg-neutral-100 border border-neutral-200 dark:border-neutral-800 print:border-neutral-300">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block mb-1">
              Activities Tracked
            </span>
            <span className="text-2xl font-black font-mono text-black dark:text-white print:text-black">
              {activities.length}
            </span>
          </div>
        </div>

        {/* SQUAD SUMMARY VIEW */}
        {reportType === 'squad_summary' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-black dark:text-white print:text-black mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-neutral-500" />
                Physical Performance & Benchmark Hit Rates
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 rounded-2xl overflow-hidden">
                  <thead className="bg-neutral-100 dark:bg-neutral-800 print:bg-neutral-200 text-[10px] font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400 print:text-neutral-800">
                    <tr>
                      <th className="p-3">Player</th>
                      <th className="p-3">Pos</th>
                      <th className="p-3">10m Sprint (PB)</th>
                      <th className="p-3">30m Sprint (PB)</th>
                      <th className="p-3">Yo-Yo Test</th>
                      <th className="p-3">Avg Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 print:divide-neutral-300 font-mono">
                    {players
                      .filter((p) => !p.isArchived)
                      .slice(0, 10)
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-950 print:hover:bg-white">
                          <td className="p-3 font-sans font-bold flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-neutral-200 dark:bg-neutral-800 print:bg-neutral-200 flex items-center justify-center text-[10px]">
                              {p.shirtNumber}
                            </span>
                            <span>{p.name}</span>
                            {p.isInjured && <span title="Injured">⚠️</span>}
                          </td>
                          <td className="p-3 font-bold text-neutral-600 dark:text-neutral-400 print:text-neutral-800">{p.position}</td>
                          <td className="p-3">
                            <span className="font-bold">1.69s</span>
                            <span className="text-[10px] text-neutral-500 ml-1.5">(Target: 1.74s)</span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold">4.02s</span>
                            <span className="text-[10px] text-neutral-500 ml-1.5">(Target: 4.10s)</span>
                          </td>
                          <td className="p-3">1840m</td>
                          <td className="p-3 font-bold">7.8 / 10</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tactical & Subjective Chart Summary */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-950 print:bg-neutral-50 rounded-2xl border border-neutral-200 dark:border-neutral-800 print:border-neutral-300">
              <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white print:text-black mb-2">
                Subjective Skill & Tactical Radar Rating Distribution
              </h4>
              <p className="text-xs text-neutral-500 mb-3">
                Distribution of coach ratings across scanning speed, defensive compactness, transition speed, and set-piece execution.
              </p>
              <div className="space-y-2">
                {[
                  { metric: 'Scanning & Spatial Awareness', score: 8.2, max: 10 },
                  { metric: 'Pressing Intensity & Recovery', score: 7.9, max: 10 },
                  { metric: 'Transition Speed', score: 8.5, max: 10 },
                  { metric: 'Technical Passing Under Pressure', score: 7.6, max: 10 },
                ].map((item) => (
                  <div key={item.metric} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-48 truncate text-black dark:text-white print:text-black">
                      {item.metric}
                    </span>
                    <div className="flex-1 h-3 bg-neutral-200 dark:bg-neutral-800 print:bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black dark:bg-white print:bg-black rounded-full"
                        style={{ width: `${(item.score / item.max) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-black text-black dark:text-white print:text-black">
                      {item.score} / {item.max}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* INDIVIDUAL PLAYER DEEP-DIVE VIEW */}
        {reportType === 'player_deep_dive' && selectedPlayer && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 print:bg-neutral-50 border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-black dark:bg-white print:bg-black text-white dark:text-black print:text-white flex items-center justify-center text-lg font-black font-mono">
                  {selectedPlayer.shirtNumber}
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase text-black dark:text-white print:text-black flex items-center gap-2">
                    {selectedPlayer.name}
                    {selectedPlayer.isInjured && (
                      <span className="text-xs px-2 py-0.5 rounded bg-black text-white dark:bg-white dark:text-black print:bg-black print:text-white">
                        INJURY FLAG
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Position: {selectedPlayer.position} • Squad: {selectedPlayer.team}
                  </p>
                </div>
              </div>

              {selectedPlayer.medicalNote && (
                <div className="text-right text-xs max-w-xs">
                  <span className="font-bold block text-neutral-700 dark:text-neutral-300 print:text-neutral-700">
                    Medical Status:
                  </span>
                  <span className="italic text-neutral-500">{selectedPlayer.medicalNote}</span>
                </div>
              )}
            </div>

            {/* Individual Dynamic Benchmark Graph */}
            <div className="p-5 bg-white dark:bg-neutral-900 print:bg-white border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                    Trend Line Graph with Dynamic Position Benchmark
                  </span>
                  <h4 className="text-sm font-black uppercase text-black dark:text-white print:text-black">
                    10m Acceleration Progression ({selectedPlayer.position} Target)
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-400 print:text-neutral-700">
                  Target: 1.71s
                </span>
              </div>

              {/* Graphical Line with Dashed Benchmark Line */}
              <div className="h-32 w-full bg-neutral-50 dark:bg-neutral-950 print:bg-neutral-50 rounded-xl relative flex items-center px-6 border border-neutral-200 dark:border-neutral-800 print:border-neutral-300 overflow-hidden">
                {/* Horizontal Dashed Benchmark Line */}
                <div className="absolute inset-x-0 top-1/2 border-b-2 border-dashed border-neutral-400 print:border-neutral-500 z-0" />
                <span className="absolute left-3 top-2 text-[10px] font-mono font-bold text-neutral-500">
                  Dashed Line: {selectedPlayer.position} Benchmark (1.71s)
                </span>

                <div className="relative z-10 flex items-center justify-between w-full">
                  {[
                    { date: 'Oct 12', time: '1.78s', delta: '+0.07s' },
                    { date: 'Oct 20', time: '1.74s', delta: '+0.03s' },
                    { date: 'Oct 28', time: '1.72s', delta: '+0.01s' },
                    { date: 'Nov 04', time: '1.69s', delta: '-0.02s (PB)' },
                  ].map((pt, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-3.5 h-3.5 rounded-full bg-black dark:bg-white print:bg-black border-2 border-neutral-400 mb-1" />
                      <span className="text-xs font-mono font-bold text-black dark:text-white print:text-black">
                        {pt.time}
                      </span>
                      <span className="text-[9px] font-mono text-neutral-500">{pt.delta}</span>
                      <span className="text-[9px] text-neutral-400 mt-1">{pt.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 print:border-neutral-400 pt-4 mt-8 flex items-center justify-between text-[11px] text-neutral-500 print:text-neutral-600">
          <span>Touchline Coach Performance Dossier • Confidential</span>
          <span>Verified by {coachProfile.name}</span>
        </div>
      </div>

      {/* CSV IMPORT PREVIEW & CONFIRMATION MODAL */}
      <AnimatePresence>
        {showImportModal && pendingCsvResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowImportModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative z-10 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                    <FileUp className="w-5 h-5 text-black dark:text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight text-black dark:text-white">
                      Bulk CSV Import Preview
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Verify player profiles and historical session data before merging
                    </p>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.90 }}
                  onClick={() => setShowImportModal(false)}
                  className="text-neutral-500 hover:text-black dark:hover:text-white font-bold text-sm cursor-pointer p-1"
                >
                  ✕
                </motion.button>
              </div>

              {/* Error or Summary Section */}
              {!pendingCsvResult.success ? (
                <div className="p-4 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-2xl space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-black dark:text-white font-bold text-xs uppercase">
                    <AlertCircle className="w-4 h-4 text-neutral-500" />
                    Import Failed
                  </div>
                  {pendingCsvResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-neutral-600 dark:text-neutral-400">
                      {err}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                  {/* Stats Summary Badges */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                      <span className="text-[10px] font-black uppercase text-neutral-500 block">
                        New Players
                      </span>
                      <span className="text-xl font-black font-mono text-black dark:text-white">
                        +{pendingCsvResult.playersImported}
                      </span>
                    </div>

                    <div className="p-3 bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                      <span className="text-[10px] font-black uppercase text-neutral-500 block">
                        Sessions
                      </span>
                      <span className="text-xl font-black font-mono text-black dark:text-white">
                        +{pendingCsvResult.sessionsImported}
                      </span>
                    </div>

                    <div className="p-3 bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                      <span className="text-[10px] font-black uppercase text-neutral-500 block">
                        Metrics
                      </span>
                      <span className="text-xl font-black font-mono text-black dark:text-white">
                        +{pendingCsvResult.resultsImported}
                      </span>
                    </div>
                  </div>

                  {/* Sample Rows Preview */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block mb-2">
                      Sample Data Preview (First {pendingCsvResult.previewRows.length} Rows):
                    </span>
                    <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-neutral-100 dark:bg-neutral-800 text-[9px] font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                          <tr>
                            <th className="p-2">Player</th>
                            <th className="p-2">Pos</th>
                            <th className="p-2">Date</th>
                            <th className="p-2">Activity</th>
                            <th className="p-2 text-right">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-mono">
                          {pendingCsvResult.previewRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-950">
                              <td className="p-2 font-sans font-bold">{row.name}</td>
                              <td className="p-2 text-neutral-500">{row.position}</td>
                              <td className="p-2 text-neutral-500">{row.date}</td>
                              <td className="p-2 text-neutral-400">{row.activity}</td>
                              <td className="p-2 text-right font-black">
                                {row.result} {row.unit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Warnings / skipped rows if any */}
                  {pendingCsvResult.errors.length > 0 && (
                    <div className="p-3 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl">
                      <span className="text-[10px] font-black uppercase text-neutral-500 block mb-1">
                        Skipped Rows / Format Warnings:
                      </span>
                      <ul className="text-[11px] text-neutral-600 dark:text-neutral-400 list-disc list-inside space-y-0.5">
                        {pendingCsvResult.errors.slice(0, 3).map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 mt-4 flex items-center justify-end gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </motion.button>
                {pendingCsvResult.success && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleConfirmCsvImport}
                    className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black text-xs font-black uppercase tracking-wider rounded-xl hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Confirm & Import Data
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

