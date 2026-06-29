import type { Skill } from '../types/skill';
import { skillExecutor } from './SkillExecutor';
import {
  extractEmailParts,
  extractEventDetails,
  extractMapQuery,
  extractPhoneNumber,
  extractReminderContent,
  extractSearchQuery,
  formatClock,
  formatEventList,
  parseTargetDate,
  parseTimeFromText,
  toYmd,
} from './skillDateParse';

const readNow = async (): Promise<Date> => {
  const raw = await skillExecutor.runIntent('get_current_date_and_time', {});
  const payload = typeof raw.result === 'string' ? JSON.parse(raw.result) : raw.result;
  const iso = typeof payload?.iso === 'string' ? payload.iso : '';
  const parsed = iso ? new Date(iso) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const runScheduleNotification = async (userText: string): Promise<string> => {
  console.log('text_skill_notify');
  const now = await readNow();
  const { title, message } = extractReminderContent(userText);
  const time = parseTimeFromText(userText) || { hour: 9, minute: 0 };
  const targetDate = parseTargetDate(userText, now);
  const repeatDaily = /\bdaily\b|every day/i.test(userText);

  await skillExecutor.runIntent('schedule_notification', {
    title,
    message,
    hour: time.hour,
    minute: time.minute,
    year: targetDate.getFullYear(),
    month: targetDate.getMonth() + 1,
    day: targetDate.getDate(),
    repeat_daily: repeatDaily,
  });

  const when = repeatDaily
    ? `every day at ${formatClock(time.hour, time.minute)}`
    : `${toYmd(targetDate)} at ${formatClock(time.hour, time.minute)}`;

  return `Scheduled notification "${title}" for ${when}.`;
};

const runReadCalendarEvents = async (userText: string): Promise<string> => {
  console.log('text_skill_calendar_read');
  const now = await readNow();
  const targetDate = parseTargetDate(userText, now);
  const date = toYmd(targetDate);
  const raw = await skillExecutor.runIntent('read_calendar_events', { date });
  const events = typeof raw.result === 'string' ? JSON.parse(raw.result) : [];
  return formatEventList(date, Array.isArray(events) ? events : []);
};

const runCreateCalendarEvent = async (userText: string): Promise<string> => {
  console.log('text_skill_calendar_create');
  const now = await readNow();
  const details = extractEventDetails(userText, now);
  if (!details) {
    throw new Error('event_parse_fail');
  }

  await skillExecutor.runIntent('create_calendar_event', {
    title: details.title,
    start: details.start.toISOString(),
    end: details.end.toISOString(),
    notes: userText.trim(),
  });

  return `Opened calendar event form for "${details.title}" on ${toYmd(details.start)} at ${formatClock(details.start.getHours(), details.start.getMinutes())}.`;
};

const runSendEmail = async (userText: string): Promise<string> => {
  console.log('text_skill_email');
  const parts = extractEmailParts(userText);
  if (!parts) {
    throw new Error('email_parse_fail');
  }

  await skillExecutor.runIntent('send_email', {
    extra_email: parts.to,
    extra_subject: parts.subject,
    extra_text: parts.body,
  });

  return `Drafted email to ${parts.to}.`;
};

const runQuickCall = async (userText: string): Promise<string> => {
  console.log('text_skill_call');
  const phoneNumber = extractPhoneNumber(userText);
  if (!phoneNumber) {
    throw new Error('phone_parse_fail');
  }

  await skillExecutor.runIntent('call_phone', { phoneNumber });
  return `Opened dialer for ${phoneNumber}.`;
};

const runQuickSms = async (userText: string): Promise<string> => {
  console.log('text_skill_sms');
  const phoneNumber = extractPhoneNumber(userText);
  if (!phoneNumber) {
    throw new Error('phone_parse_fail');
  }

  const bodyMatch = userText.match(/(?:saying|message|text)[:\s]+(.+)/i);
  const body = bodyMatch?.[1]?.trim() || '';

  await skillExecutor.runIntent('send_sms', { phoneNumber, body });
  return `Drafted SMS to ${phoneNumber}.`;
};

const runOpenMap = async (userText: string): Promise<string> => {
  console.log('text_skill_map');
  const location = extractMapQuery(userText);
  if (!location) {
    throw new Error('location_parse_fail');
  }

  await skillExecutor.runIntent('open_map', { location });
  return `Opened maps for ${location}.`;
};

const runWebSearch = async (userText: string): Promise<string> => {
  console.log('text_skill_search');
  const query = extractSearchQuery(userText);
  if (!query) {
    throw new Error('search_parse_fail');
  }

  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
  await skillExecutor.runIntent('open_url', { url });
  return `Opened web search for "${query}".`;
};

const runKitchenAdventure = (userText: string): string | null => {
  if (!/kitchen adventure|start kitchen/i.test(userText)) {
    return null;
  }

  console.log('text_skill_kitchen');
  return [
    '### The Stainless Steel Plains',
    '',
    '*The air smells of burnt toast and ancient grease.*',
    '',
    '---',
    '',
    '**The Situation:**',
    'You are a brave Toaster at the edge of the counter. A Citrus Flash Flood blocks the path to the Sacred Sourdough Starter.',
    '',
    '**What do you do?**',
    '1. Pop up to scout ahead',
    '2. Call for the Blender\'s help',
    '3. Retreat to the Tundra of the Sub-Zero',
  ].join('\n');
};

const runLearnPrompt = (userText: string): string | null => {
  const trimmed = userText.trim().toLowerCase();
  if (trimmed !== 'i want to learn something new!' && trimmed !== 'i want to learn something new') {
    return null;
  }

  console.log('text_skill_learn_a');
  return 'I\'d love to help you learn something today! What topic sounds interesting to you?';
};

export const runTextSkill = async (skill: Skill, userText: string): Promise<string | null> => {
  try {
    switch (skill.id) {
      case 'schedule-notification':
        return await runScheduleNotification(userText);
      case 'read-calendar-events':
        return await runReadCalendarEvents(userText);
      case 'create-calendar-event':
        return await runCreateCalendarEvent(userText);
      case 'send-email':
        return await runSendEmail(userText);
      case 'quick-call':
        return await runQuickCall(userText);
      case 'quick-sms':
        return await runQuickSms(userText);
      case 'route-planner':
      case 'interactive-map':
        return await runOpenMap(userText);
      case 'web-search':
        return await runWebSearch(userText);
      case 'kitchen-adventure':
        return runKitchenAdventure(userText);
      case 'learn-something-new':
        return runLearnPrompt(userText);
      default:
        console.log('text_skill_unhandled', skill.id);
        return null;
    }
  } catch (error) {
    console.log('text_skill_fail', skill.id, error instanceof Error ? error.message : 'unknown');
    return null;
  }
};
