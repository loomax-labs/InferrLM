import type { Skill } from '../types/skill';
import { skillExecutor } from './SkillExecutor';
import { kitchenSessionStore, isKitchenStartPhrase } from './KitchenSessionStore';
import {
  buildNotifyTarget,
  extractEmailParts,
  extractEventDetails,
  extractMapQuery,
  extractPhoneNumber,
  extractReminderContent,
  extractSearchQuery,
  formatClock,
  formatEventList,
  formatNotifyWhen,
  parseTargetDate,
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
  const { date, repeatDaily } = buildNotifyTarget(userText, now);

  const raw = await skillExecutor.runIntent('schedule_notification', {
    title,
    message,
    trigger_at: date.toISOString(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    repeat_daily: repeatDaily,
  });

  let fireAt = date;
  if (typeof raw.result === 'string') {
    try {
      const payload = JSON.parse(raw.result);
      if (typeof payload?.fireAt === 'string') {
        fireAt = new Date(payload.fireAt);
      }
      console.log('text_skill_notify_id', payload?.id);
    } catch {
    }
  }

  const when = repeatDaily
    ? `every day at ${formatClock(date.getHours(), date.getMinutes())}`
    : formatNotifyWhen(fireAt);

  return `Scheduled notification "${title}" for ${when}. Keep notifications enabled; it will alert even if the app is in the background.`;
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

const runCreateCalendarEvent = async (userText: string): Promise<string | null> => {
  console.log('text_skill_calendar_create');
  const now = await readNow();
  const details = extractEventDetails(userText, now);
  if (!details) {
    if (/\b(calendar|event|meeting|appointment)\b/i.test(userText)) {
      console.log('text_skill_event_need_details');
      return 'What event should I add? Example: Team meeting tomorrow at 2 PM';
    }
    return null;
  }

  await skillExecutor.runIntent('create_calendar_event', {
    title: details.title,
    start: details.start.toISOString(),
    end: details.end.toISOString(),
    notes: userText.trim(),
  });

  return `Opened calendar event form for "${details.title}" on ${toYmd(details.start)} at ${formatClock(details.start.getHours(), details.start.getMinutes())}.`;
};

const runSendEmail = async (userText: string): Promise<string | null> => {
  console.log('text_skill_email');
  const parts = extractEmailParts(userText);
  if (!parts) {
    if (/\b(email|e-mail|send mail)\b/i.test(userText)) {
      console.log('text_skill_email_need_addr');
      return 'What address should I email? Example: Email hello@example.com subject Hello body Thanks';
    }
    return null;
  }

  await skillExecutor.runIntent('send_email', {
    extra_email: parts.to,
    extra_subject: parts.subject,
    extra_text: parts.body,
  });

  return `Drafted email to ${parts.to}.`;
};

const runQuickCall = async (userText: string): Promise<string | null> => {
  console.log('text_skill_call');
  const phoneNumber = extractPhoneNumber(userText);
  if (!phoneNumber) {
    if (/\b(call|dial|phone)\b/i.test(userText)) {
      console.log('text_skill_call_need_phone');
      return 'Which number should I call? Example: Call 555-0100';
    }
    return null;
  }

  await skillExecutor.runIntent('call_phone', { phoneNumber });
  return `Opened dialer for ${phoneNumber}.`;
};

const runQuickSms = async (userText: string): Promise<string | null> => {
  console.log('text_skill_sms');
  const phoneNumber = extractPhoneNumber(userText);
  if (!phoneNumber) {
    if (/\b(sms|text message|send an? sms|text someone)\b/i.test(userText)) {
      console.log('text_skill_sms_need_phone');
      return 'Which number should I text? Example: Text 555-0100 saying On my way';
    }
    return null;
  }

  const bodyMatch = userText.match(/(?:saying|message|text)[:\s]+(.+)/i);
  const body = bodyMatch?.[1]?.trim() || '';

  await skillExecutor.runIntent('send_sms', { phoneNumber, body });
  return `Drafted SMS to ${phoneNumber}${body ? ` with your message.` : '.'}`;
};

const runOpenMap = async (userText: string): Promise<string | null> => {
  console.log('text_skill_map');
  const location = extractMapQuery(userText);
  if (!location) {
    if (/\b(map|directions|navigate|route)\b/i.test(userText)) {
      console.log('text_skill_map_need_place');
      return 'Where should I open maps? Example: Directions to Central Park';
    }
    return null;
  }

  await skillExecutor.runIntent('open_map', { location });
  return `Opened maps for ${location}.`;
};

const runWebSearch = async (userText: string): Promise<string | null> => {
  console.log('text_skill_search');
  const query = extractSearchQuery(userText);
  if (!query) {
    if (/\b(search|google|look up)\b/i.test(userText)) {
      console.log('text_skill_search_need_query');
      return 'What should I search for? Example: Search the web for React Native';
    }
    return null;
  }

  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
  await skillExecutor.runIntent('open_url', { url });
  return `Opened web search for "${query}".`;
};

const runKitchenAdventure = async (userText: string): Promise<string | null> => {
  if (!isKitchenStartPhrase(userText)) {
    return null;
  }

  console.log('text_skill_kitchen');
  await kitchenSessionStore.start();
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
        return await runKitchenAdventure(userText);
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
