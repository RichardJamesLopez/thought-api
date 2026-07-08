import { randomUUID } from 'crypto';
import { sqlite } from '../db/index.js';
import { marketTemplates, type MarketTemplate } from '../db/templates.js';
import { normalizeContextForStorage } from './context.js';
import { getDefaultMarketFunding } from '../utils.js';

export type SessionStatus = 'scheduled' | 'active' | 'completed';
export type SessionSlotLabel = 'AM' | 'PM';

export interface SessionRecord {
  id: string;
  slot_label: SessionSlotLabel;
  scheduled_start_utc: string;
  deadline_utc: string;
  status: SessionStatus;
}

export interface SessionMarketRecord {
  id: string;
  question: string;
  description: string;
  category: string;
  status: string;
  scheduled_start: string | null;
  deadline: string;
  session_id: string | null;
  session_order: number | null;
  answer_type: string;
  answer_options: string | null;
  response_constraints: string | null;
  context_json: string;
  reward_pool: number | null;
}

export interface SessionWithMarkets extends SessionRecord {
  local_date: string;
  local_time: string;
  markets: SessionMarketRecord[];
}

const DEFAULT_TZ = 'America/New_York';
const DEFAULT_AM_TIME = '09:00';
const DEFAULT_PM_TIME = '13:00';

function getSessionTimeZone(): string {
  return process.env.SESSION_TZ || DEFAULT_TZ;
}

function getConfiguredTime(slot: SessionSlotLabel): string {
  if (slot === 'AM') return process.env.SESSION_AM_TIME_ET || DEFAULT_AM_TIME;
  return process.env.SESSION_PM_TIME_ET || DEFAULT_PM_TIME;
}

function getDefaultTime(slot: SessionSlotLabel): string {
  return slot === 'AM' ? DEFAULT_AM_TIME : DEFAULT_PM_TIME;
}

function parseClockTime(raw: string, fallback: string): { hour: number; minute: number } {
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  const source = match ? raw : fallback;
  const [, hourRaw, minuteRaw] = source.match(/^(\d{1,2}):(\d{2})$/)!;
  const hour = Math.min(Math.max(parseInt(hourRaw, 10), 0), 23);
  const minute = Math.min(Math.max(parseInt(minuteRaw, 10), 0), 59);
  return { hour, minute };
}

function parseNowOffset(raw: string): number | null {
  const match = raw.match(/^now\+(\d+)(m|h)$/i);
  if (!match) return null;
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  return unit === 'h' ? amount * 60 * 60 * 1000 : amount * 60 * 1000;
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

function dateKeyFor(date: Date, timeZone = getSessionTimeZone()): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return d.toISOString().slice(0, 10);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

function localDateTimeToUtc(dateKey: string, hour: number, minute: number, timeZone: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  const firstUtc = utcGuess - firstOffset;
  const secondOffset = getTimeZoneOffsetMs(new Date(firstUtc), timeZone);
  return new Date(utcGuess - secondOffset);
}

function localTimeForIso(iso: string, timeZone = getSessionTimeZone()): string {
  const p = zonedParts(new Date(iso), timeZone);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

function sessionStartFor(dateKey: string, slot: SessionSlotLabel, timeZone: string, now: Date): Date {
  const configured = getConfiguredTime(slot);
  const offsetMs = parseNowOffset(configured);
  if (offsetMs !== null && dateKey === dateKeyFor(now, timeZone)) {
    return new Date(now.getTime() + offsetMs);
  }

  const { hour, minute } = parseClockTime(configured, getDefaultTime(slot));
  return localDateTimeToUtc(dateKey, hour, minute, timeZone);
}

function buildSessionSchedule(startDateKey: string, days: number, now = new Date()): SessionRecord[] {
  const timeZone = getSessionTimeZone();
  const slots: Omit<SessionRecord, 'deadline_utc' | 'status'>[] = [];

  for (let offset = 0; offset <= days; offset++) {
    const dateKey = addDays(startDateKey, offset);
    for (const slot of ['AM', 'PM'] as const) {
      const start = sessionStartFor(dateKey, slot, timeZone, now);
      slots.push({
        id: `${dateKey}-${slot}`,
        slot_label: slot,
        scheduled_start_utc: start.toISOString(),
      });
    }
  }

  slots.sort((a, b) => a.scheduled_start_utc.localeCompare(b.scheduled_start_utc));

  return slots.slice(0, Math.max(days * 2, 0)).map((slot, index) => {
    const next = slots[index + 1];
    return {
      ...slot,
      deadline_utc: next?.scheduled_start_utc ?? new Date(new Date(slot.scheduled_start_utc).getTime() + 4 * 60 * 60 * 1000).toISOString(),
      status: 'scheduled',
    };
  });
}

export function ensureUpcomingSessions(days = 14, from = new Date()): SessionRecord[] {
  const startDateKey = dateKeyFor(from);
  const generated = buildSessionSchedule(startDateKey, days, from);
  const upsert = sqlite.prepare(`
    INSERT INTO sessions (id, slot_label, scheduled_start_utc, deadline_utc, status)
    VALUES (?, ?, ?, ?, 'scheduled')
    ON CONFLICT(id) DO NOTHING
  `);

  const tx = sqlite.transaction((sessions: SessionRecord[]) => {
    for (const session of sessions) {
      upsert.run(session.id, session.slot_label, session.scheduled_start_utc, session.deadline_utc);
    }
  });
  tx(generated);

  return generated;
}

export function ensureCurrentDaySessions(): SessionRecord[] {
  return ensureUpcomingSessions(1);
}

export function planNextFourWeeks(): SessionRecord[] {
  return ensureUpcomingSessions(28);
}

export function getNextSession(now = new Date()): SessionRecord | null {
  ensureUpcomingSessions(2, now);
  return sqlite.prepare(`
    SELECT * FROM sessions
    WHERE scheduled_start_utc > ?
    ORDER BY scheduled_start_utc ASC
    LIMIT 1
  `).get(now.toISOString()) as SessionRecord | undefined ?? null;
}

export function getSessionById(id: string): SessionRecord | null {
  return sqlite.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as SessionRecord | undefined ?? null;
}

export function getDueScheduledSessions(now = new Date()): SessionRecord[] {
  ensureUpcomingSessions(2, now);
  return sqlite.prepare(`
    SELECT * FROM sessions
    WHERE status = 'scheduled' AND scheduled_start_utc <= ?
    ORDER BY scheduled_start_utc ASC
  `).all(now.toISOString()) as SessionRecord[];
}

export function getExpiredActiveSessions(now = new Date()): SessionRecord[] {
  return sqlite.prepare(`
    SELECT * FROM sessions
    WHERE status = 'active' AND deadline_utc <= ?
    ORDER BY deadline_utc ASC
  `).all(now.toISOString()) as SessionRecord[];
}

export function markSessionStatus(id: string, status: SessionStatus) {
  sqlite.prepare('UPDATE sessions SET status = ? WHERE id = ?').run(status, id);
}

export function getSessionsWithMarkets(days = 14): SessionWithMarkets[] {
  ensureUpcomingSessions(days);
  const now = new Date();
  const timeZone = getSessionTimeZone();
  const startDateKey = dateKeyFor(now, timeZone);
  const startOfDay = localDateTimeToUtc(startDateKey, 0, 0, timeZone);
  const until = new Date(startOfDay.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  const rows = sqlite.prepare(`
    SELECT * FROM sessions
    WHERE scheduled_start_utc >= ? AND scheduled_start_utc < ?
    ORDER BY scheduled_start_utc ASC
  `).all(startOfDay.toISOString(), until) as SessionRecord[];

  const marketStmt = sqlite.prepare(`
    SELECT id, question, description, category, status, scheduled_start, deadline, session_id,
           session_order, answer_type, answer_options, response_constraints, context_json, reward_pool
    FROM markets
    WHERE session_id = ?
    ORDER BY COALESCE(session_order, 999999), created_at ASC
  `);

  return rows.map((session) => ({
    ...session,
    local_date: dateKeyFor(new Date(session.scheduled_start_utc), timeZone),
    local_time: localTimeForIso(session.scheduled_start_utc, timeZone),
    markets: marketStmt.all(session.id) as SessionMarketRecord[],
  }));
}

export function getMarketTemplatesForScheduling(): Array<MarketTemplate & { index: number }> {
  return marketTemplates.map((template, index) => ({ ...template, index }));
}

export function nextSessionOrder(sessionId: string): number {
  const row = sqlite.prepare('SELECT COALESCE(MAX(session_order), -1) + 1 AS next_order FROM markets WHERE session_id = ?').get(sessionId) as { next_order: number };
  return row.next_order;
}

export function reorderSessionMarkets(sessionId: string, marketIds: string[]) {
  if (marketIds.length === 0) return;
  const session = getSessionById(sessionId);
  if (!session) return;
  const update = sqlite.prepare(`
    UPDATE markets
    SET session_id = ?, session_order = ?, scheduled_start = ?, deadline = ?
    WHERE id = ?
  `);
  const tx = sqlite.transaction((ids: string[]) => {
    ids.forEach((id, index) => {
      update.run(sessionId, index, session.scheduled_start_utc, session.deadline_utc, id);
    });
  });
  tx(marketIds);
}

export function createScheduledMarketValues(session: SessionRecord, template: MarketTemplate, order: number) {
  const defaultFunding = getDefaultMarketFunding();
  const rewardPool = template.reward_pool && template.reward_pool > 0 ? template.reward_pool : defaultFunding;
  const normalizedContext = normalizeContextForStorage(template.context);
  return {
    id: randomUUID(),
    question: template.question,
    description: template.description,
    context_json: JSON.stringify(normalizedContext),
    category: template.category,
    status: 'scheduled',
    created_by: 'admin',
    deadline: session.deadline_utc,
    created_at: new Date().toISOString(),
    funded_amount: rewardPool,
    platform_fee: 0,
    reward_pool: rewardPool,
    reward_distributed: 0,
    answer_type: template.answer_type || 'binary',
    answer_options: template.answer_options ? JSON.stringify(template.answer_options) : null,
    response_constraints: template.response_constraints ? JSON.stringify(template.response_constraints) : null,
    knowledge_source: template.knowledge_source || 'local_only',
    tags: template.tags ? JSON.stringify(template.tags) : null,
    scheduled_start: session.scheduled_start_utc,
    session_id: session.id,
    session_order: order,
    creator_type: 'admin',
    research_theme: template.research_theme || null,
  };
}
