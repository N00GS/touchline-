/**
 * Touchline Coach - Core Type Definitions
 * Strict Black/White/Grayscale mobile coaching system
 */

export type StandardPosition = 'GK' | 'CB' | 'FB/WB' | 'CM' | 'W' | 'ST';

export const STANDARD_POSITIONS: StandardPosition[] = ['GK', 'CB', 'FB/WB', 'CM', 'W', 'ST'];

export type PositionFilter = StandardPosition | 'All Positions';

export type SessionType = 'training' | 'match';

export type AttendanceStatus = 'Available' | 'Absent' | 'Injured';

export type ActivityUnit =
  | 'seconds'
  | 'minutes'
  | 'cm'
  | 'm'
  | 'reps'
  | 'points'
  | '%'
  | 'count'
  | 'rating_10'
  | 'stars_5';

export type WinningRule = 'lower_is_better' | 'higher_is_better';

export interface Player {
  id: string;
  name: string;
  shirtNumber: number;
  team: string; // e.g. "U16 Boys", "First XI", "Reserves"
  position: StandardPosition;
  medicalNote?: string;
  isInjured: boolean;
  isArchived: boolean;
  createdAt: string;
}

export interface PlayerMatchStat {
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  rating: number; // 1-10
}

export interface ActivityResult {
  id: string;
  sessionId: string;
  activityId: string;
  playerId: string;
  result: number;
  unit: ActivityUnit;
  timestamp: string; // ISO 8601
  notes?: string;
  isInvalid?: boolean;
  isPB?: boolean;
  targetHit?: boolean;
}

export interface Session {
  id: string;
  title: string;
  type: SessionType;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  location: string;
  team: string;
  notes?: string;
  attachmentUrl?: string; // Base64 image or tactical diagram
  attendance: Record<string, AttendanceStatus>; // playerId -> status
  matchDetails?: {
    opponent: string;
    isHome: boolean;
    touchlineScore?: number;
    opponentScore?: number;
    playerStats: Record<string, PlayerMatchStat>; // playerId -> stats
  };
  results: ActivityResult[];
  baseVersion: number;
  updatedAt: string;
}

export interface BenchmarkMatrix {
  // team/age group -> position -> target numerical value
  [team: string]: {
    [position: string]: number; // 'All Positions' or specific StandardPosition
  };
}

export interface Activity {
  id: string;
  name: string;
  category: 'Speed & Agility' | 'Endurance' | 'Strength' | 'Technical' | 'Subjective';
  unit: ActivityUnit;
  winningRule: WinningRule;
  description: string;
  benchmarks: BenchmarkMatrix;
}

export interface CoachProfile {
  name: string;
  role: string;
  club: string;
  licenseLevel: string;
  activeTeam: string;
  email: string;
}

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  entity: 'session' | 'player' | 'activity';
  payload: any;
  attempts: number;
  lastAttemptAt?: string;
  nextRetryTimestamp: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  error?: string;
}
