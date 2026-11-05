import { Activity, CoachProfile, Player, Session } from '../types/coach';
import { syncService } from './syncService';

const STORAGE_KEYS = {
  PLAYERS: 'touchline_players',
  SESSIONS: 'touchline_sessions',
  ACTIVITIES: 'touchline_activities',
  COACH_PROFILE: 'touchline_coach_profile',
  THEME: 'touchline_theme',
  ONBOARDING_COMPLETED: 'touchline_onboarding_completed',
  ACTIVE_TEAM_FILTER: 'touchline_active_team_filter',
  ANDROID_FRAME_ENABLED: 'touchline_android_frame_mode',
};

export const DEFAULT_ACTIVITIES: Activity[] = [
  {
    id: 'act_10m_sprint',
    name: '10m Acceleration Sprint',
    category: 'Speed & Agility',
    unit: 'seconds',
    winningRule: 'lower_is_better',
    description: 'First-step explosive speed test through timing gates from static start.',
    benchmarks: {
      'U16 Academy': {
        'All Positions': 1.82,
        'W': 1.71,
        'ST': 1.73,
        'FB/WB': 1.74,
        'CM': 1.80,
        'CB': 1.84,
        'GK': 1.88,
      },
      'First Team': {
        'All Positions': 1.74,
        'W': 1.66,
        'ST': 1.68,
        'FB/WB': 1.69,
        'CM': 1.73,
        'CB': 1.77,
        'GK': 1.82,
      },
    },
  },
  {
    id: 'act_30m_sprint',
    name: '30m Maximal Sprint',
    category: 'Speed & Agility',
    unit: 'seconds',
    winningRule: 'lower_is_better',
    description: 'Top-end linear speed measured over 30 meters.',
    benchmarks: {
      'U16 Academy': {
        'All Positions': 4.15,
        'W': 3.98,
        'ST': 4.02,
        'FB/WB': 4.06,
        'CM': 4.18,
        'CB': 4.22,
        'GK': 4.35,
      },
      'First Team': {
        'All Positions': 3.98,
        'W': 3.82,
        'ST': 3.86,
        'FB/WB': 3.90,
        'CM': 4.02,
        'CB': 4.08,
        'GK': 4.20,
      },
    },
  },
  {
    id: 'act_yoyo_endurance',
    name: 'Yo-Yo Intermittent Recovery (L1)',
    category: 'Endurance',
    unit: 'm',
    winningRule: 'higher_is_better',
    description: 'Repeated 2x20m shuttle runs with 10s active recovery period.',
    benchmarks: {
      'U16 Academy': {
        'All Positions': 1600,
        'CM': 1920,
        'FB/WB': 1840,
        'W': 1760,
        'ST': 1640,
        'CB': 1520,
        'GK': 1120,
      },
      'First Team': {
        'All Positions': 2100,
        'CM': 2400,
        'FB/WB': 2320,
        'W': 2240,
        'ST': 2080,
        'CB': 1960,
        'GK': 1480,
      },
    },
  },
  {
    id: 'act_vertical_jump',
    name: 'Countermovement Jump (CMJ)',
    category: 'Strength',
    unit: 'cm',
    winningRule: 'higher_is_better',
    description: 'Lower limb explosive power measured via jump mat or Vertec.',
    benchmarks: {
      'U16 Academy': {
        'All Positions': 42.0,
        'CB': 46.0,
        'GK': 47.0,
        'ST': 44.0,
        'CM': 41.0,
        'W': 42.0,
        'FB/WB': 41.5,
      },
      'First Team': {
        'All Positions': 48.0,
        'CB': 52.0,
        'GK': 53.0,
        'ST': 50.0,
        'CM': 47.0,
        'W': 48.0,
        'FB/WB': 47.5,
      },
    },
  },
  {
    id: 'act_tactical_decision',
    name: 'Tactical Awareness & Decision Making',
    category: 'Subjective',
    unit: 'rating_10',
    winningRule: 'higher_is_better',
    description: 'Pitch-side coach subjective rating (1-10) on spatial scanning and decision speed.',
    benchmarks: {
      'U16 Academy': {
        'All Positions': 7.0,
      },
      'First Team': {
        'All Positions': 8.0,
      },
    },
  },
  {
    id: 'act_pass_accuracy',
    name: 'Passing Accuracy Test',
    category: 'Technical',
    unit: '%',
    winningRule: 'higher_is_better',
    description: 'Target passing grid accuracy percentage over 20 paced balls.',
    benchmarks: {
      'U16 Academy': {
        'All Positions': 80,
        'CM': 88,
        'CB': 84,
        'FB/WB': 82,
      },
      'First Team': {
        'All Positions': 86,
        'CM': 92,
        'CB': 88,
        'FB/WB': 86,
      },
    },
  },
];

export const SAMPLE_PLAYERS: Player[] = [
  { id: 'ply_1', name: 'Alfie Hughes', shirtNumber: 1, team: 'U16 Academy', position: 'GK', isInjured: false, isArchived: false, createdAt: '2026-10-01' },
  { id: 'ply_2', name: 'Callum Davies', shirtNumber: 2, team: 'U16 Academy', position: 'FB/WB', isInjured: false, isArchived: false, createdAt: '2026-10-01' },
  { id: 'ply_3', name: 'Ethan Walker', shirtNumber: 3, team: 'U16 Academy', position: 'FB/WB', isInjured: false, isArchived: false, createdAt: '2026-10-01' },
  { id: 'ply_4', name: 'Declan Rice Jr', shirtNumber: 4, team: 'U16 Academy', position: 'CB', isInjured: false, isArchived: false, createdAt: '2026-10-01' },
  { id: 'ply_5', name: 'Liam O’Connor', shirtNumber: 5, team: 'U16 Academy', position: 'CB', isInjured: true, medicalNote: 'Mild hamstring strain - light duties only', isArchived: false, createdAt: '2026-10-01' },
  { id: 'ply_6', name: 'Kobe Mainoo', shirtNumber: 6, team: 'U16 Academy', position: 'CM', isInjured: false, isArchived: false, createdAt: '2026-10-01' },
  { id: 'ply_7', name: 'Bukayo Saka Jr', shirtNumber: 7, team: 'U16 Academy', position: 'W', isInjured: false, isArchived: false, createdAt: '2026-10-01' },
  { id: 'ply_8', name: 'Harvey Barnes', shirtNumber: 8, team: 'U16 Academy', position: 'CM', isInjured: false, isArchived: false, createdAt: '2026-10-01' },
  { id: 'ply_9', name: 'Harry Kane Jr', shirtNumber: 9, team: 'U16 Academy', position: 'ST', isInjured: false, isArchived: false, createdAt: '2026-10-01' },
  { id: 'ply_10', name: 'Cole Palmer Jr', shirtNumber: 10, team: 'U16 Academy', position: 'W', isInjured: false, isArchived: false, createdAt: '2026-10-01' },
  { id: 'ply_11', name: 'Phil Foden Jr', shirtNumber: 11, team: 'U16 Academy', position: 'W', isInjured: false, isArchived: false, createdAt: '2026-10-01' },
  { id: 'ply_12', name: 'Archie Gray', shirtNumber: 12, team: 'U16 Academy', position: 'CM', isInjured: false, isArchived: false, createdAt: '2026-10-01' },
  { id: 'ply_13', name: 'Mason Mount', shirtNumber: 14, team: 'U16 Academy', position: 'CM', isInjured: true, medicalNote: 'Ankle sprain rehabilitation', isArchived: false, createdAt: '2026-10-01' },
  { id: 'ply_14', name: 'Rico Lewis', shirtNumber: 17, team: 'U16 Academy', position: 'FB/WB', isInjured: false, isArchived: false, createdAt: '2026-10-01' },
  { id: 'ply_15', name: 'Ollie Watkins Jr', shirtNumber: 19, team: 'U16 Academy', position: 'ST', isInjured: false, isArchived: false, createdAt: '2026-10-01' },
  { id: 'ply_16', name: 'Former Player', shirtNumber: 99, team: 'U16 Academy', position: 'CM', isInjured: false, isArchived: true, medicalNote: 'Transferred out', createdAt: '2026-08-01' },
];

export const DEFAULT_COACH_PROFILE: CoachProfile = {
  name: 'Head Coach Marcus Vance',
  role: 'Lead Academy Coach',
  club: 'AFC Touchline',
  licenseLevel: 'UEFA A License',
  activeTeam: 'U16 Academy',
  email: 'm.vance@touchlinecoach.app',
};

export const SAMPLE_SESSIONS: Session[] = [
  {
    id: 'sess_sample_1',
    title: 'Matchday 12 vs West Rovers',
    type: 'match',
    date: '2026-11-07',
    time: '14:30',
    location: 'Touchline Arena Pitch 1',
    team: 'U16 Academy',
    notes: 'Key league fixture. Focus on high press and transition speed.',
    attendance: {
      ply_1: 'Available',
      ply_2: 'Available',
      ply_3: 'Available',
      ply_4: 'Available',
      ply_5: 'Injured',
      ply_6: 'Available',
      ply_7: 'Available',
      ply_8: 'Available',
      ply_9: 'Available',
      ply_10: 'Available',
      ply_11: 'Available',
      ply_12: 'Available',
      ply_13: 'Injured',
      ply_14: 'Available',
      ply_15: 'Available',
    },
    matchDetails: {
      opponent: 'West Rovers U16',
      isHome: true,
      touchlineScore: 3,
      opponentScore: 1,
      playerStats: {
        ply_9: { minutesPlayed: 80, goals: 2, assists: 0, yellowCards: 0, redCards: 0, rating: 9 },
        ply_10: { minutesPlayed: 75, goals: 1, assists: 1, yellowCards: 0, redCards: 0, rating: 8 },
        ply_6: { minutesPlayed: 80, goals: 0, assists: 2, yellowCards: 1, redCards: 0, rating: 8 },
        ply_1: { minutesPlayed: 80, goals: 0, assists: 0, yellowCards: 0, redCards: 0, rating: 8 },
      },
    },
    results: [],
    baseVersion: 1,
    updatedAt: '2026-11-05T08:00:00Z',
  },
  {
    id: 'sess_sample_2',
    title: 'Midweek Speed & Agility Testing',
    type: 'training',
    date: '2026-11-04',
    time: '17:30',
    location: 'Speed Track & Pitch 3',
    team: 'U16 Academy',
    notes: 'Timing gates calibration completed. Dry conditions, 14°C.',
    attendance: {
      ply_1: 'Available',
      ply_2: 'Available',
      ply_3: 'Available',
      ply_4: 'Available',
      ply_5: 'Injured',
      ply_6: 'Available',
      ply_7: 'Available',
      ply_8: 'Available',
      ply_9: 'Available',
      ply_10: 'Available',
      ply_11: 'Available',
    },
    results: [
      { id: 'res_1', sessionId: 'sess_sample_2', activityId: 'act_10m_sprint', playerId: 'ply_7', result: 1.69, unit: 'seconds', timestamp: '2026-11-04T17:45:00Z', isPB: true, targetHit: true },
      { id: 'res_2', sessionId: 'sess_sample_2', activityId: 'act_10m_sprint', playerId: 'ply_10', result: 1.70, unit: 'seconds', timestamp: '2026-11-04T17:46:00Z', isPB: true, targetHit: true },
      { id: 'res_3', sessionId: 'sess_sample_2', activityId: 'act_10m_sprint', playerId: 'ply_9', result: 1.74, unit: 'seconds', timestamp: '2026-11-04T17:47:00Z', isPB: false, targetHit: false },
      { id: 'res_4', sessionId: 'sess_sample_2', activityId: 'act_10m_sprint', playerId: 'ply_4', result: 1.83, unit: 'seconds', timestamp: '2026-11-04T17:48:00Z', isPB: true, targetHit: true },
      { id: 'res_5', sessionId: 'sess_sample_2', activityId: 'act_10m_sprint', playerId: 'ply_6', result: 1.79, unit: 'seconds', timestamp: '2026-11-04T17:49:00Z', isPB: false, targetHit: true },
    ],
    baseVersion: 1,
    updatedAt: '2026-11-04T18:45:00Z',
  },
  {
    id: 'sess_sample_3',
    title: 'Tactical Pressing & Shape',
    type: 'training',
    date: '2026-11-10',
    time: '18:00',
    location: 'Main Training Ground',
    team: 'U16 Academy',
    notes: 'Defensive block compactness and quick counter transition.',
    attendance: {},
    results: [],
    baseVersion: 1,
    updatedAt: '2026-11-05T09:00:00Z',
  },
];

class StorageService {
  public getPlayers(): Player[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PLAYERS);
      if (data) {
        return JSON.parse(data);
      }
      // On fresh start, if not onboarded, empty squad until user creates or seeds
      const onboarded = localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      if (!onboarded) {
        return [];
      }
      return SAMPLE_PLAYERS;
    } catch {
      return [];
    }
  }

  public savePlayers(players: Player[]) {
    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
    syncService.enqueue({
      entity: 'player',
      action: 'update',
      payload: players,
    });
  }

  public getSessions(): Session[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (data) {
        return JSON.parse(data);
      }
      const onboarded = localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      if (!onboarded) {
        return [];
      }
      return SAMPLE_SESSIONS;
    } catch {
      return [];
    }
  }

  public saveSessions(sessions: Session[]) {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    syncService.enqueue({
      entity: 'session',
      action: 'update',
      payload: sessions,
    });
  }

  public getActivities(): Activity[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      if (data) {
        return JSON.parse(data);
      }
      return DEFAULT_ACTIVITIES;
    } catch {
      return DEFAULT_ACTIVITIES;
    }
  }

  public saveActivities(activities: Activity[]) {
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
    syncService.enqueue({
      entity: 'activity',
      action: 'update',
      payload: activities,
    });
  }

  public getCoachProfile(): CoachProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COACH_PROFILE);
      if (data) {
        return JSON.parse(data);
      }
      return DEFAULT_COACH_PROFILE;
    } catch {
      return DEFAULT_COACH_PROFILE;
    }
  }

  public saveCoachProfile(profile: CoachProfile) {
    localStorage.setItem(STORAGE_KEYS.COACH_PROFILE, JSON.stringify(profile));
  }

  public isOnboardingCompleted(): boolean {
    return localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === 'true';
  }

  public setOnboardingCompleted(completed: boolean) {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, completed ? 'true' : 'false');
  }

  public getTheme(): 'dark' | 'light' {
    return (localStorage.getItem(STORAGE_KEYS.THEME) as 'dark' | 'light') || 'dark';
  }

  public setTheme(theme: 'dark' | 'light') {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  public isAndroidFrameMode(): boolean {
    return localStorage.getItem(STORAGE_KEYS.ANDROID_FRAME_ENABLED) === 'true';
  }

  public setAndroidFrameMode(enabled: boolean) {
    localStorage.setItem(STORAGE_KEYS.ANDROID_FRAME_ENABLED, enabled ? 'true' : 'false');
  }

  public loadSampleData() {
    this.savePlayers(SAMPLE_PLAYERS);
    this.saveSessions(SAMPLE_SESSIONS);
    this.saveActivities(DEFAULT_ACTIVITIES);
    this.saveCoachProfile(DEFAULT_COACH_PROFILE);
    this.setOnboardingCompleted(true);
  }

  public exportFullBackupJson(): string {
    const backup = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      coachProfile: this.getCoachProfile(),
      players: this.getPlayers(),
      sessions: this.getSessions(),
      activities: this.getActivities(),
    };
    return JSON.stringify(backup, null, 2);
  }

  public restoreFullBackupJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.players && Array.isArray(parsed.players)) {
        this.savePlayers(parsed.players);
      }
      if (parsed.sessions && Array.isArray(parsed.sessions)) {
        this.saveSessions(parsed.sessions);
      }
      if (parsed.activities && Array.isArray(parsed.activities)) {
        this.saveActivities(parsed.activities);
      }
      if (parsed.coachProfile) {
        this.saveCoachProfile(parsed.coachProfile);
      }
      this.setOnboardingCompleted(true);
      return true;
    } catch (e) {
      console.error('Failed to restore backup', e);
      return false;
    }
  }

  public purgeAllData() {
    localStorage.removeItem(STORAGE_KEYS.PLAYERS);
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVITIES);
    localStorage.removeItem(STORAGE_KEYS.COACH_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
  }
}

export const storageService = new StorageService();
