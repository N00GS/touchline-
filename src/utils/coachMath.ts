/**
 * Pure calculation and data transformation logic for Touchline Coach
 */
import { Activity, Player, Session, WinningRule } from '../types/coach';

/**
 * Calculates benchmark target and delta for a player performing an activity.
 * Returns null if no benchmark exists.
 */
export function calculateBenchmarkDelta(
  result: number,
  benchmarkValue: number | undefined,
  winningRule: WinningRule
): {
  target: number;
  delta: number;
  isHit: boolean;
  formattedDelta: string;
} | null {
  if (benchmarkValue === undefined || benchmarkValue === null || isNaN(benchmarkValue)) {
    return null;
  }

  const delta = Number((result - benchmarkValue).toFixed(2));
  // If lower is better (e.g. 10m sprint time in seconds):
  // hit if result <= benchmark. Delta <= 0 is better.
  // If higher is better (e.g. jump height in cm, reps):
  // hit if result >= benchmark. Delta >= 0 is better.
  const isHit = winningRule === 'lower_is_better' ? result <= benchmarkValue : result >= benchmarkValue;

  const sign = delta > 0 ? '+' : '';
  const formattedDelta = `${sign}${delta.toFixed(2)}`;

  return {
    target: benchmarkValue,
    delta,
    isHit,
    formattedDelta,
  };
}

/**
 * Resolves the most specific benchmark for a player (Position-specific first, falling back to 'All Positions')
 */
export function resolveBenchmark(
  activity: Activity,
  team: string,
  position: string
): number | undefined {
  const teamMatrix = activity.benchmarks?.[team];
  if (!teamMatrix) {
    // Check if there is a default or any team fallback
    const firstTeam = Object.keys(activity.benchmarks || {})[0];
    if (firstTeam && activity.benchmarks[firstTeam]) {
      return activity.benchmarks[firstTeam][position] ?? activity.benchmarks[firstTeam]['All Positions'];
    }
    return undefined;
  }

  if (teamMatrix[position] !== undefined && !isNaN(teamMatrix[position])) {
    return teamMatrix[position];
  }

  if (teamMatrix['All Positions'] !== undefined && !isNaN(teamMatrix['All Positions'])) {
    return teamMatrix['All Positions'];
  }

  return undefined;
}

/**
 * Checks whether the current result is a Personal Best (PB) compared to historical results.
 */
export function isPersonalBest(
  currentResult: number,
  previousResults: number[],
  winningRule: WinningRule
): boolean {
  if (!previousResults || previousResults.length === 0) {
    return true; // First recorded result is technically their PB
  }

  const validPrevious = previousResults.filter((r) => !isNaN(r));
  if (validPrevious.length === 0) return true;

  if (winningRule === 'lower_is_better') {
    const historicalBest = Math.min(...validPrevious);
    return currentResult < historicalBest;
  } else {
    const historicalBest = Math.max(...validPrevious);
    return currentResult > historicalBest;
  }
}

/**
 * Generates repeating session dates for future weeks without accidental duplication.
 */
export function generateRepeatingSessions(
  baseSession: Session,
  weeksToRepeat: number,
  existingDates: Set<string>
): Session[] {
  const newSessions: Session[] = [];
  const baseDate = new Date(`${baseSession.date}T00:00:00`);

  for (let i = 1; i <= weeksToRepeat; i++) {
    const nextDate = new Date(baseDate);
    nextDate.setDate(baseDate.getDate() + i * 7);

    const dateString = nextDate.toISOString().split('T')[0];

    // Avoid duplication if a session already exists for this team on that date with same title
    const key = `${dateString}_${baseSession.team}_${baseSession.title}`;
    if (!existingDates.has(key)) {
      newSessions.push({
        ...baseSession,
        id: `sess_${Date.now()}_rep_${i}_${Math.random().toString(36).substring(2, 6)}`,
        date: dateString,
        attendance: {},
        results: [],
        baseVersion: 1,
        updatedAt: new Date().toISOString(),
      });
      existingDates.add(key);
    }
  }

  return newSessions;
}

/**
 * Exponential backoff algorithm for offline pitch-side sync retry:
 * 1s, 3s, 7s, then capped at 15s.
 */
export function getNextBackoffDelay(attempts: number): number {
  if (attempts <= 0) return 1000;
  if (attempts === 1) return 1000;
  if (attempts === 2) return 3000;
  if (attempts === 3) return 7000;
  return 15000;
}

/**
 * Machine-Readable CSV Export
 * Standardized header:
 * Player_ID,Name,Team,Position,Date,Session_Type,Activity,Result,Unit,Target_Benchmark,Benchmark_Delta,Session_Notes
 * Enforce ISO 8601 dates (YYYY-MM-DD), raw numerical results, quote-wrapped text fields, blank cells for missing benchmarks.
 */
export function exportToMachineReadableCsv(
  sessions: Session[],
  players: Player[],
  activities: Activity[]
): string {
  const header = 'Player_ID,Name,Team,Position,Date,Session_Type,Activity,Result,Unit,Target_Benchmark,Benchmark_Delta,Session_Notes';

  const playerMap = new Map<string, Player>();
  for (const p of players) {
    playerMap.set(p.id, p);
  }

  const activityMap = new Map<string, Activity>();
  for (const a of activities) {
    activityMap.set(a.id, a);
  }

  const rows: string[] = [header];

  for (const session of sessions) {
    const sessionDate = session.date; // YYYY-MM-DD
    const sessionType = session.type === 'match' ? 'Match' : 'Training';
    const sessionNotesEscaped = session.notes ? `"${session.notes.replace(/"/g, '""')}"` : '""';

    if (session.results && session.results.length > 0) {
      for (const res of session.results) {
        if (res.isInvalid) continue;
        const player = playerMap.get(res.playerId);
        const activity = activityMap.get(res.activityId);

        const playerId = res.playerId;
        const playerName = player ? `"${player.name.replace(/"/g, '""')}"` : '"Unknown Player"';
        const team = player ? `"${player.team.replace(/"/g, '""')}"` : `"${session.team.replace(/"/g, '""')}"`;
        const position = player ? player.position : 'All Positions';
        const activityName = activity ? `"${activity.name.replace(/"/g, '""')}"` : '"Unknown Activity"';
        const unit = res.unit;
        const rawResult = res.result;

        let targetBenchmarkStr = '';
        let benchmarkDeltaStr = '';

        if (activity && player) {
          const target = resolveBenchmark(activity, player.team, player.position);
          if (target !== undefined && !isNaN(target)) {
            targetBenchmarkStr = target.toString();
            const delta = Number((res.result - target).toFixed(2));
            const sign = delta > 0 ? '+' : '';
            benchmarkDeltaStr = `${sign}${delta.toFixed(2)}`;
          }
        }

        const row = `${playerId},${playerName},${team},${position},${sessionDate},${sessionType},${activityName},${rawResult},${unit},${targetBenchmarkStr},${benchmarkDeltaStr},${sessionNotesEscaped}`;
        rows.push(row);
      }
    }
  }

  return rows.join('\n');
}

/**
 * Splits a CSV text into array of rows, honoring quoted fields containing newlines and commas
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // handle CRLF
      }
      currentRow.push(currentField.trim());
      if (currentRow.length > 0 && currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export interface CsvImportResult {
  success: boolean;
  playersImported: number;
  sessionsImported: number;
  resultsImported: number;
  errors: string[];
  previewRows: Array<{
    playerId: string;
    name: string;
    team: string;
    position: string;
    date: string;
    sessionType: string;
    activity: string;
    result: number;
    unit: string;
  }>;
  updatedPlayers: Player[];
  updatedSessions: Session[];
  updatedActivities: Activity[];
}

/**
 * Parses and imports players, sessions, and performance data from CSV matching the established structure:
 * Player_ID,Name,Team,Position,Date,Session_Type,Activity,Result,Unit,Target_Benchmark,Benchmark_Delta,Session_Notes
 */
export function parseAndImportCsv(
  csvText: string,
  currentPlayers: Player[],
  currentSessions: Session[],
  currentActivities: Activity[]
): CsvImportResult {
  const errors: string[] = [];
  const rows = parseCsvRows(csvText.trim());

  if (rows.length < 2) {
    return {
      success: false,
      playersImported: 0,
      sessionsImported: 0,
      resultsImported: 0,
      errors: ['CSV file is empty or missing data rows.'],
      previewRows: [],
      updatedPlayers: currentPlayers,
      updatedSessions: currentSessions,
      updatedActivities: currentActivities,
    };
  }

  const rawHeader = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  // Look for expected headers
  const getIndex = (name: string): number => {
    return rawHeader.findIndex((h) => h.includes(name.toLowerCase()));
  };

  const idIdx = getIndex('player_id');
  const nameIdx = getIndex('name');
  const teamIdx = getIndex('team');
  const posIdx = getIndex('position');
  const dateIdx = getIndex('date');
  const typeIdx = getIndex('session_type');
  const actIdx = getIndex('activity');
  const resultIdx = getIndex('result');
  const unitIdx = getIndex('unit');
  const targetIdx = getIndex('target_benchmark');
  const notesIdx = getIndex('session_notes');

  if (nameIdx === -1 || dateIdx === -1 || resultIdx === -1) {
    return {
      success: false,
      playersImported: 0,
      sessionsImported: 0,
      resultsImported: 0,
      errors: [
        'Invalid CSV structure. Missing required columns: Name, Date, Result. Expected standard header: Player_ID,Name,Team,Position,Date,Session_Type,Activity,Result,Unit,Target_Benchmark,Benchmark_Delta,Session_Notes',
      ],
      previewRows: [],
      updatedPlayers: currentPlayers,
      updatedSessions: currentSessions,
      updatedActivities: currentActivities,
    };
  }

  const playersMap = new Map<string, Player>();
  currentPlayers.forEach((p) => playersMap.set(p.id, { ...p }));

  const activitiesMap = new Map<string, Activity>();
  currentActivities.forEach((a) => activitiesMap.set(a.name.toLowerCase(), { ...a }));

  const sessionsMap = new Map<string, Session>();
  currentSessions.forEach((s) => sessionsMap.set(`${s.date}_${s.team}_${s.type}`, { ...s }));

  const previewRows: CsvImportResult['previewRows'] = [];
  let nextShirtNumber = Math.max(0, ...currentPlayers.map((p) => p.shirtNumber || 0)) + 1;

  let newPlayersCount = 0;
  let newSessionsCount = 0;
  let newResultsCount = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < 3 || row.every((c) => c === '')) continue;

    const rawId = idIdx !== -1 && row[idIdx] ? row[idIdx] : '';
    const rawName = row[nameIdx] || 'Unnamed Player';
    const rawTeam = teamIdx !== -1 && row[teamIdx] ? row[teamIdx] : 'U16 Academy';
    const rawPos = posIdx !== -1 && row[posIdx] ? row[posIdx] : 'CM';
    const rawDate = row[dateIdx] || new Date().toISOString().split('T')[0];
    const rawType = typeIdx !== -1 && row[typeIdx]?.toLowerCase().includes('match') ? 'match' : 'training';
    const rawActivity = actIdx !== -1 && row[actIdx] ? row[actIdx] : '10m Sprint';
    const rawResultVal = parseFloat(row[resultIdx]);
    const rawUnit = unitIdx !== -1 && row[unitIdx] ? (row[unitIdx] as any) : 'seconds';
    const rawTarget = targetIdx !== -1 && row[targetIdx] ? parseFloat(row[targetIdx]) : undefined;
    const rawNotes = notesIdx !== -1 && row[notesIdx] ? row[notesIdx] : '';

    if (isNaN(rawResultVal)) {
      errors.push(`Row ${r + 1}: Non-numerical result "${row[resultIdx]}" skipped.`);
      continue;
    }

    // Standardize position
    const validPositions = ['GK', 'CB', 'FB/WB', 'CM', 'W', 'ST'];
    const stdPosition = validPositions.includes(rawPos.toUpperCase())
      ? (rawPos.toUpperCase() as any)
      : 'CM';

    // 1. Resolve or create Player
    let player = rawId ? playersMap.get(rawId) : undefined;
    if (!player) {
      // Check by name and team
      player = Array.from(playersMap.values()).find(
        (p) => p.name.toLowerCase() === rawName.toLowerCase() && p.team.toLowerCase() === rawTeam.toLowerCase()
      );
    }

    if (!player) {
      const generatedId = rawId || `ply_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      player = {
        id: generatedId,
        name: rawName,
        shirtNumber: nextShirtNumber++,
        team: rawTeam,
        position: stdPosition,
        isInjured: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
      };
      playersMap.set(player.id, player);
      newPlayersCount++;
    }

    // 2. Resolve or create Activity
    let activity = activitiesMap.get(rawActivity.toLowerCase());
    if (!activity) {
      const isSeconds = rawUnit.toLowerCase().includes('sec');
      const winningRule = isSeconds ? 'lower_is_better' : 'higher_is_better';
      activity = {
        id: `act_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: rawActivity,
        category: 'Speed & Agility',
        unit: rawUnit,
        winningRule,
        description: `Imported activity for ${rawActivity}`,
        benchmarks: rawTarget
          ? {
              [rawTeam]: {
                'All Positions': rawTarget,
              },
            }
          : {},
      };
      activitiesMap.set(rawActivity.toLowerCase(), activity);
    } else if (rawTarget && (!activity.benchmarks?.[rawTeam] || !activity.benchmarks[rawTeam]['All Positions'])) {
      if (!activity.benchmarks) activity.benchmarks = {};
      if (!activity.benchmarks[rawTeam]) activity.benchmarks[rawTeam] = {};
      activity.benchmarks[rawTeam]['All Positions'] = rawTarget;
    }

    // 3. Resolve or create Session
    const sessionKey = `${rawDate}_${rawTeam}_${rawType}`;
    let session = sessionsMap.get(sessionKey);
    if (!session) {
      session = {
        id: `sess_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: rawNotes ? rawNotes.slice(0, 40) : `${rawActivity} Assessment`,
        type: rawType,
        date: rawDate,
        time: '17:00',
        location: 'Main Ground',
        team: rawTeam,
        notes: rawNotes,
        attendance: { [player.id]: 'Available' },
        results: [],
        baseVersion: 1,
        updatedAt: new Date().toISOString(),
      };
      sessionsMap.set(sessionKey, session);
      newSessionsCount++;
    } else {
      if (!session.attendance[player.id]) {
        session.attendance[player.id] = 'Available';
      }
    }

    // 4. Attach Activity Result to Session
    const resId = `res_imp_${session.id}_${player.id}_${Math.random().toString(36).substring(2, 6)}`;
    const resultObj = {
      id: resId,
      sessionId: session.id,
      activityId: activity.id,
      playerId: player.id,
      result: rawResultVal,
      unit: rawUnit,
      timestamp: `${rawDate}T12:00:00Z`,
      notes: rawNotes,
    };
    session.results.push(resultObj);
    newResultsCount++;

    if (previewRows.length < 10) {
      previewRows.push({
        playerId: player.id,
        name: player.name,
        team: player.team,
        position: player.position,
        date: rawDate,
        sessionType: rawType === 'match' ? 'Match' : 'Training',
        activity: activity.name,
        result: rawResultVal,
        unit: rawUnit,
      });
    }
  }

  return {
    success: true,
    playersImported: newPlayersCount,
    sessionsImported: newSessionsCount,
    resultsImported: newResultsCount,
    errors,
    previewRows,
    updatedPlayers: Array.from(playersMap.values()),
    updatedSessions: Array.from(sessionsMap.values()),
    updatedActivities: Array.from(activitiesMap.values()),
  };
}

