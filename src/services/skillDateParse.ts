const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const pad = (value: number): string => String(value).padStart(2, '0');

export const toYmd = (date: Date): string => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const formatClock = (hour: number, minute: number): string => {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${pad(minute)} ${suffix}`;
};

export const parseTimeFromText = (text: string): { hour: number; minute: number } | null => {
  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\b/i);
  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = (match[3] || '').toLowerCase();

  if (meridiem.startsWith('p') && hour < 12) {
    hour += 12;
  }
  if (meridiem.startsWith('a') && hour === 12) {
    hour = 0;
  }
  if (!meridiem && hour <= 7) {
    hour += 12;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
};

const addDays = (date: Date, days: number): Date => {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
};

export const parseTargetDate = (text: string, base: Date): Date => {
  const lower = text.toLowerCase();

  if (/\btoday\b/.test(lower)) {
    return new Date(base);
  }

  if (/\btomorrow\b/.test(lower)) {
    return addDays(base, 1);
  }

  const isoMatch = lower.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const parsed = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  for (let index = 0; index < dayNames.length; index += 1) {
    const day = dayNames[index];
    const pattern = new RegExp(`\\b(next|this)?\\s*${day}\\b`, 'i');
    if (!pattern.test(lower)) {
      continue;
    }

    const prefix = /\bnext\b/i.test(lower) ? 'next' : /\bthis\b/i.test(lower) ? 'this' : '';
    const current = base.getDay();
    let delta = index - current;

    if (prefix === 'next') {
      if (delta <= 0) {
        delta += 7;
      }
    } else if (prefix === 'this') {
      if (delta < 0) {
        delta += 7;
      }
    } else if (delta <= 0) {
      delta += 7;
    }

    return addDays(base, delta);
  }

  return new Date(base);
};

export const extractReminderContent = (text: string): { title: string; message: string } => {
  const remindMatch = text.match(
    /remind(?:er)?(?:\s+me)?\s+to\s+(.+?)(?:\s+(?:on|at|next|tomorrow|today|this|every)\b|$)/i,
  );
  const action = remindMatch?.[1]?.trim() || text.trim();
  const cleaned = action
    .replace(/\s+(?:next|this)\s+\w+day\b.*$/i, '')
    .replace(/\s+at\s+\d.*$/i, '')
    .trim();
  const label = cleaned || 'Reminder';
  const title = label.length > 56 ? `${label.slice(0, 53)}...` : label;
  return { title, message: label };
};

export const extractMapQuery = (text: string): string => {
  const patterns = [
    /(?:directions?|route|navigate|map|location)\s+(?:to|for)\s+(.+)/i,
    /(?:show|open)\s+(?:the\s+)?map\s+(?:for|of)\s+(.+)/i,
    /where\s+is\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/\?+$/, '').trim();
    }
  }

  return text
    .replace(/^(plan route|route planner|interactive map|open map)\s*/i, '')
    .trim();
};

export const extractSearchQuery = (text: string): string => {
  return text
    .replace(/^(search the web for|web search for|search for|google)\s*/i, '')
    .replace(/\?+$/, '')
    .trim();
};

export const extractPhoneNumber = (text: string): string | null => {
  const match = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/);
  if (!match) {
    return null;
  }
  return match[0].replace(/[^\d+]/g, '');
};

export const extractEmailParts = (text: string): { to: string; subject: string; body: string } | null => {
  const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.\w+/);
  if (!emailMatch) {
    return null;
  }

  const subjectMatch = text.match(/subject[:\s]+([^,\n]+)/i);
  const bodyMatch = text.match(/(?:body|message|saying)[:\s]+(.+)/i);

  return {
    to: emailMatch[0],
    subject: subjectMatch?.[1]?.trim() || 'Hello',
    body: bodyMatch?.[1]?.trim() || text.trim(),
  };
};

export const extractEventDetails = (text: string, base: Date): {
  title: string;
  start: Date;
  end: Date;
} | null => {
  const titleMatch = text.match(/(?:event|meeting|appointment)\s+(?:called|named|titled)?\s*["']?([^"']+?)["']?(?:\s+on|\s+at|\s+next|\s+tomorrow|$)/i)
    || text.match(/(?:schedule|create|add)\s+(?:a\s+)?(?:calendar\s+)?event\s+(?:for\s+)?(.+?)(?:\s+on|\s+at|\s+next|\s+tomorrow|$)/i);

  const title = titleMatch?.[1]?.trim() || 'Calendar event';
  const date = parseTargetDate(text, base);
  const time = parseTimeFromText(text) || { hour: 9, minute: 0 };
  const start = new Date(date);
  start.setHours(time.hour, time.minute, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { title, start, end };
};

export const formatEventList = (dateLabel: string, events: Array<Record<string, unknown>>): string => {
  if (!events.length) {
    return `No calendar events on ${dateLabel}.`;
  }

  const lines = events.map(event => {
    const title = String(event.title || 'Untitled');
    const start = event.start ? new Date(String(event.start)) : null;
    const clock = start && !Number.isNaN(start.getTime())
      ? start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : '';
    const location = String(event.location || '').trim();
    return `- ${title}${clock ? ` at ${clock}` : ''}${location ? ` (${location})` : ''}`;
  });

  return `Events on ${dateLabel}:\n${lines.join('\n')}`;
};
