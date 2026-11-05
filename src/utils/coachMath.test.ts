import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBenchmarkDelta,
  resolveBenchmark,
  isPersonalBest,
  generateRepeatingSessions,
  getNextBackoffDelay,
  exportToMachineReadableCsv,
  parseAndImportCsv,
} from './coachMath';
import { Activity, Player, Session } from '../types/coach';

test('calculateBenchmarkDelta - lower is better (Sprint 10m)', () => {
  // Target: 1.75s, Result: 1.68s -> Hit! Delta: -0.07s
  const res = calculateBenchmarkDelta(1.68, 1.75, 'lower_is_better');
  assert.ok(res !== null);
  assert.equal(res.target, 1.75);
  assert.equal(res.delta, -0.07);
  assert.equal(res.isHit, true);
  assert.equal(res.formattedDelta, '-0.07');

  // Slower than benchmark: 1.82s vs 1.75s
  const slowRes = calculateBenchmarkDelta(1.82, 1.75, 'lower_is_better');
  assert.ok(slowRes !== null);
  assert.equal(slowRes.isHit, false);
  assert.equal(slowRes.delta, 0.07);
  assert.equal(slowRes.formattedDelta, '+0.07');
});

test('calculateBenchmarkDelta - higher is better (Vertical Jump)', () => {
  // Target: 45cm, Result: 50cm -> Hit! Delta: +5.00cm
  const res = calculateBenchmarkDelta(50, 45, 'higher_is_better');
  assert.ok(res !== null);
  assert.equal(res.target, 45);
  assert.equal(res.delta, 5);
  assert.equal(res.isHit, true);
  assert.equal(res.formattedDelta, '+5.00');

  // Below target: 40cm vs 45cm
  const lowRes = calculateBenchmarkDelta(40, 45, 'higher_is_better');
  assert.ok(lowRes !== null);
  assert.equal(lowRes.isHit, false);
  assert.equal(lowRes.delta, -5);
  assert.equal(lowRes.formattedDelta, '-5.00');
});

test('resolveBenchmark - priority of position over All Positions', () => {
  const activity: Activity = {
    id: 'act-1',
    name: '10m Sprint',
    category: 'Speed & Agility',
    unit: 'seconds',
    winningRule: 'lower_is_better',
    description: 'Sprint test',
    benchmarks: {
      'U16 Boys': {
        'All Positions': 1.80,
        'W': 1.72,
        'GK': 1.88,
      },
    },
  };

  // Specific position exists
  assert.equal(resolveBenchmark(activity, 'U16 Boys', 'W'), 1.72);
  assert.equal(resolveBenchmark(activity, 'U16 Boys', 'GK'), 1.88);
  // Falls back to All Positions for CB
  assert.equal(resolveBenchmark(activity, 'U16 Boys', 'CB'), 1.80);
});

test('isPersonalBest - checks lower is better and higher is better', () => {
  // Lower is better
  assert.equal(isPersonalBest(1.65, [1.70, 1.75, 1.80], 'lower_is_better'), true);
  assert.equal(isPersonalBest(1.72, [1.70, 1.75, 1.80], 'lower_is_better'), false);
  assert.equal(isPersonalBest(1.70, [], 'lower_is_better'), true);

  // Higher is better
  assert.equal(isPersonalBest(55, [50, 52, 48], 'higher_is_better'), true);
  assert.equal(isPersonalBest(49, [50, 52, 48], 'higher_is_better'), false);
});

test('getNextBackoffDelay - matches 1s, 3s, 7s requirement', () => {
  assert.equal(getNextBackoffDelay(1), 1000);
  assert.equal(getNextBackoffDelay(2), 3000);
  assert.equal(getNextBackoffDelay(3), 7000);
  assert.equal(getNextBackoffDelay(4), 15000);
});

test('generateRepeatingSessions - generates 3 weekly sessions without duplication', () => {
  const baseSession: Session = {
    id: 'sess-base',
    title: 'Tactical Pressing & Speed',
    type: 'training',
    date: '2026-11-10',
    time: '18:00',
    location: 'Pitch 1',
    team: 'U16 Boys',
    attendance: {},
    results: [],
    baseVersion: 1,
    updatedAt: new Date().toISOString(),
  };

  const existing = new Set<string>();
  existing.add('2026-11-10_U16 Boys_Tactical Pressing & Speed');

  const generated = generateRepeatingSessions(baseSession, 3, existing);
  assert.equal(generated.length, 3);
  assert.equal(generated[0].date, '2026-11-17');
  assert.equal(generated[1].date, '2026-11-24');
  assert.equal(generated[2].date, '2026-12-01');

  // If one of the dates already exists, it does not duplicate
  const existingWithCollision = new Set<string>();
  existingWithCollision.add('2026-11-24_U16 Boys_Tactical Pressing & Speed');
  const generatedWithCol = generateRepeatingSessions(baseSession, 3, existingWithCollision);
  assert.equal(generatedWithCol.length, 2);
});

test('exportToMachineReadableCsv - exact standardized header and formatting', () => {
  const player: Player = {
    id: 'p-1',
    name: 'Marcus Rashford',
    shirtNumber: 10,
    team: 'U16 Boys',
    position: 'W',
    isInjured: false,
    isArchived: false,
    createdAt: '2026-11-01',
  };

  const activity: Activity = {
    id: 'act-1',
    name: '10m Sprint',
    category: 'Speed & Agility',
    unit: 'seconds',
    winningRule: 'lower_is_better',
    description: '10m acceleration',
    benchmarks: {
      'U16 Boys': {
        W: 1.72,
      },
    },
  };

  const session: Session = {
    id: 'sess-1',
    title: 'Speed & Agility Assessment',
    type: 'training',
    date: '2026-11-05',
    time: '10:00',
    location: 'Training Ground Pitch A',
    team: 'U16 Boys',
    notes: 'Sunny, dry pitch',
    attendance: { 'p-1': 'Available' },
    results: [
      {
        id: 'r-1',
        sessionId: 'sess-1',
        activityId: 'act-1',
        playerId: 'p-1',
        result: 1.68,
        unit: 'seconds',
        timestamp: '2026-11-05T10:15:00Z',
      },
    ],
    baseVersion: 1,
    updatedAt: '2026-11-05T10:30:00Z',
  };

  const csv = exportToMachineReadableCsv([session], [player], [activity]);
  const lines = csv.split('\n');

  assert.equal(
    lines[0],
    'Player_ID,Name,Team,Position,Date,Session_Type,Activity,Result,Unit,Target_Benchmark,Benchmark_Delta,Session_Notes'
  );
  assert.equal(
    lines[1],
    'p-1,"Marcus Rashford","U16 Boys",W,2026-11-05,Training,"10m Sprint",1.68,seconds,1.72,-0.04,"Sunny, dry pitch"'
  );
});

test('parseAndImportCsv - parses flat CSV, creates new players, sessions and results', () => {
  const sampleCsv = `Player_ID,Name,Team,Position,Date,Session_Type,Activity,Result,Unit,Target_Benchmark,Benchmark_Delta,Session_Notes
"p-101","Kylian Mbappe","U16 Boys",ST,2026-11-02,Training,"10m Sprint",1.64,seconds,1.73,-0.09,"Pre-season sprint check"
"p-102","Eduardo Camavinga","U16 Boys",CM,2026-11-02,Training,"10m Sprint",1.76,seconds,1.80,-0.04,"Pre-season sprint check"
"","Warren Zaire-Emery","U16 Boys",CM,2026-11-03,Match,"Tactical Rating",8.5,rating_10,8.0,+0.50,"Derby fixture"`;

  const importResult = parseAndImportCsv(sampleCsv, [], [], []);
  assert.equal(importResult.success, true);
  assert.equal(importResult.playersImported, 3);
  assert.equal(importResult.sessionsImported, 2);
  assert.equal(importResult.resultsImported, 3);

  // Check players created
  const mbappe = importResult.updatedPlayers.find((p) => p.name === 'Kylian Mbappe');
  assert.ok(mbappe);
  assert.equal(mbappe?.position, 'ST');
  assert.equal(mbappe?.team, 'U16 Boys');

  // Check auto-generated player ID for blank ID
  const warren = importResult.updatedPlayers.find((p) => p.name === 'Warren Zaire-Emery');
  assert.ok(warren);
  assert.ok(warren?.id.startsWith('ply_imp_'));

  // Check sessions created
  assert.equal(importResult.updatedSessions.length, 2);
  const sprintSession = importResult.updatedSessions.find((s) => s.date === '2026-11-02');
  assert.ok(sprintSession);
  assert.equal(sprintSession?.results.length, 2);
});

