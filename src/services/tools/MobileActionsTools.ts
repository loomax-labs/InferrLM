import * as Calendar from 'expo-calendar';
import * as Contacts from 'expo-contacts';
import { Linking, Platform } from 'react-native';

import { toolRegistry, type ToolSchema } from './ToolRegistry';

const TOOL_NAMES = [
  'open_url',
  'send_email',
  'open_map',
  'open_settings',
  'call_phone',
  'send_sms',
  'create_contact',
  'create_calendar_event',
] as const;

export type MobileActionLog = {
  tool: string;
  summary: string;
  createdAt: number;
};

type MobileActionsOptions = {
  onAction?: (entry: MobileActionLog) => void;
};

const OPEN_URL_TOOL: ToolSchema = {
  type: 'function',
  function: {
    name: 'open_url',
    description: 'Open a safe web URL in the device browser.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'An http or https URL to open.',
        },
      },
      required: ['url'],
    },
  },
};

const SEND_EMAIL_TOOL: ToolSchema = {
  type: 'function',
  function: {
    name: 'send_email',
    description: 'Open the device mail app with a drafted message.',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'The destination email address.',
        },
        subject: {
          type: 'string',
          description: 'The email subject.',
        },
        body: {
          type: 'string',
          description: 'The email body text.',
        },
      },
      required: ['to'],
    },
  },
};

const OPEN_MAP_TOOL: ToolSchema = {
  type: 'function',
  function: {
    name: 'open_map',
    description: 'Open the device maps app for a given location query.',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'A location, address, or place query.',
        },
      },
      required: ['location'],
    },
  },
};

const OPEN_SETTINGS_TOOL: ToolSchema = {
  type: 'function',
  function: {
    name: 'open_settings',
    description: 'Open the device settings app.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
};

const CALL_PHONE_TOOL: ToolSchema = {
  type: 'function',
  function: {
    name: 'call_phone',
    description: 'Open the phone dialer with a phone number ready to call.',
    parameters: {
      type: 'object',
      properties: {
        phoneNumber: {
          type: 'string',
          description: 'The phone number to call.',
        },
      },
      required: ['phoneNumber'],
    },
  },
};

const SEND_SMS_TOOL: ToolSchema = {
  type: 'function',
  function: {
    name: 'send_sms',
    description: 'Open the SMS app with a drafted text message.',
    parameters: {
      type: 'object',
      properties: {
        phoneNumber: {
          type: 'string',
          description: 'The phone number to text.',
        },
        body: {
          type: 'string',
          description: 'The SMS body text.',
        },
      },
      required: ['phoneNumber'],
    },
  },
};

const CREATE_CONTACT_TOOL: ToolSchema = {
  type: 'function',
  function: {
    name: 'create_contact',
    description: 'Open the native contact form with prefilled contact details.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Full display name for the contact.',
        },
        firstName: {
          type: 'string',
          description: 'First name for the contact.',
        },
        lastName: {
          type: 'string',
          description: 'Last name for the contact.',
        },
        company: {
          type: 'string',
          description: 'Company name for the contact.',
        },
        phoneNumber: {
          type: 'string',
          description: 'Phone number for the contact.',
        },
        email: {
          type: 'string',
          description: 'Email address for the contact.',
        },
      },
    },
  },
};

const CREATE_CALENDAR_EVENT_TOOL: ToolSchema = {
  type: 'function',
  function: {
    name: 'create_calendar_event',
    description: 'Open the native calendar event composer with prefilled event details.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the event.',
        },
        start: {
          type: 'string',
          description: 'Event start time in ISO 8601 format.',
        },
        end: {
          type: 'string',
          description: 'Event end time in ISO 8601 format.',
        },
        location: {
          type: 'string',
          description: 'Location of the event.',
        },
        notes: {
          type: 'string',
          description: 'Optional notes or agenda for the event.',
        },
        url: {
          type: 'string',
          description: 'Optional URL associated with the event.',
        },
        allDay: {
          type: 'boolean',
          description: 'Whether the event should be marked as all day.',
        },
      },
      required: ['title', 'start'],
    },
  },
};

const isSafeUrl = (value: string): boolean => /^https?:\/\//i.test(value.trim());

const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const normalizePhoneNumber = (value: string): string => value.trim().replace(/[^\d+]/g, '');

const buildSmsUrl = (phoneNumber: string, body: string): string => {
  const separator = Platform.OS === 'ios' ? '&' : '?';
  const query = body ? `${separator}body=${encodeURIComponent(body)}` : '';
  return `sms:${encodeURIComponent(phoneNumber)}${query}`;
};

const openExternalUrl = async (url: string) => {
  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    throw new Error('unavailable_url');
  }
  await Linking.openURL(url);
};

const parseDateValue = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const buildContactPayload = (params: Record<string, any>): Contacts.Contact => {
  const firstName = String(params.firstName || '').trim();
  const lastName = String(params.lastName || '').trim();
  const name = String(params.name || '').trim();
  const company = String(params.company || '').trim();
  const phoneNumber = String(params.phoneNumber || '').trim();
  const email = String(params.email || '').trim();
  const displayName = name || [firstName, lastName].filter(Boolean).join(' ') || company || phoneNumber || email;

  if (!displayName) {
    throw new Error('invalid_contact');
  }

  return {
    contactType: company && !firstName && !lastName ? Contacts.ContactTypes.Company : Contacts.ContactTypes.Person,
    name: displayName,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    company: company || undefined,
    phoneNumbers: phoneNumber
      ? [
          {
            label: 'mobile',
            number: phoneNumber,
          },
        ]
      : undefined,
    emails: email
      ? [
          {
            label: 'work',
            email,
          },
        ]
      : undefined,
  };
};

const ensureContactsPermission = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  const permission = await Contacts.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('contacts_permission_denied');
  }
};

const normalizeRecord = (value: unknown): Record<string, any> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, any>;
};

export const executeMobileActionIntent = async (
  intent: string,
  parameters: Record<string, any> = {},
  onAction?: (entry: MobileActionLog) => void,
): Promise<string> => {
  const name = String(intent || '').trim().toLowerCase();
  const params = normalizeRecord(parameters);

  if (name === 'open_url') {
    const value = String(params.url || '').trim();
    if (!isSafeUrl(value)) {
      throw new Error('unsafe_url');
    }
    await openExternalUrl(value);
    onAction?.({ tool: 'open_url', summary: value, createdAt: Date.now() });
    return `Opened ${value}`;
  }

  if (name === 'send_email') {
    const recipient = String(params.to || '').trim();
    if (!isValidEmail(recipient)) {
      throw new Error('invalid_email');
    }
    const emailUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(String(params.subject || ''))}&body=${encodeURIComponent(String(params.body || ''))}`;
    await openExternalUrl(emailUrl);
    onAction?.({ tool: 'send_email', summary: recipient, createdAt: Date.now() });
    return `Drafted email to ${recipient}`;
  }

  if (name === 'open_map') {
    const query = String(params.location || '').trim();
    if (!query) {
      throw new Error('invalid_location');
    }
    const mapUrl = Platform.OS === 'ios'
      ? `https://maps.apple.com/?q=${encodeURIComponent(query)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    await openExternalUrl(mapUrl);
    onAction?.({ tool: 'open_map', summary: query, createdAt: Date.now() });
    return `Opened maps for ${query}`;
  }

  if (name === 'open_settings') {
    await Linking.openSettings();
    onAction?.({ tool: 'open_settings', summary: 'Device settings', createdAt: Date.now() });
    return 'Opened device settings';
  }

  if (name === 'call_phone') {
    const phoneNumber = normalizePhoneNumber(String(params.phoneNumber || ''));
    if (!phoneNumber) {
      throw new Error('invalid_phone');
    }

    await openExternalUrl(`tel:${encodeURIComponent(phoneNumber)}`);
    onAction?.({ tool: 'call_phone', summary: phoneNumber, createdAt: Date.now() });
    return `Opened dialer for ${phoneNumber}`;
  }

  if (name === 'send_sms') {
    const phoneNumber = normalizePhoneNumber(String(params.phoneNumber || ''));
    if (!phoneNumber) {
      throw new Error('invalid_phone');
    }

    const body = String(params.body || '');
    await openExternalUrl(buildSmsUrl(phoneNumber, body));
    onAction?.({ tool: 'send_sms', summary: phoneNumber, createdAt: Date.now() });
    return `Drafted SMS to ${phoneNumber}`;
  }

  if (name === 'create_contact') {
    const contact = buildContactPayload(params);
    await ensureContactsPermission();
    await Contacts.presentFormAsync(null, contact);
    onAction?.({ tool: 'create_contact', summary: contact.name, createdAt: Date.now() });
    return `Opened contact form for ${contact.name}`;
  }

  if (name === 'create_calendar_event') {
    const title = String(params.title || '').trim();
    const startDate = parseDateValue(params.start);
    if (!title || !startDate) {
      throw new Error('invalid_event');
    }

    const allDay = Boolean(params.allDay);
    const requestedEndDate = parseDateValue(params.end);
    const endDate = requestedEndDate || new Date(startDate.getTime() + (allDay ? 24 : 1) * 60 * 60 * 1000);

    await Calendar.createEventInCalendarAsync({
      title,
      startDate,
      endDate,
      location: String(params.location || '').trim() || undefined,
      notes: String(params.notes || '').trim() || undefined,
      url: String(params.url || '').trim() || undefined,
      allDay,
    });
    onAction?.({ tool: 'create_calendar_event', summary: title, createdAt: Date.now() });
    return `Opened calendar event form for ${title}`;
  }

  throw new Error('unsupported_intent');
};

export const unregisterMobileActionTools = () => {
  for (const name of TOOL_NAMES) {
    toolRegistry.unregister(name);
  }
};

export const registerMobileActionTools = ({ onAction }: MobileActionsOptions = {}) => {
  unregisterMobileActionTools();

  toolRegistry.register('open_url', OPEN_URL_TOOL, async ({ url }) => {
    return executeMobileActionIntent('open_url', { url }, onAction);
  });

  toolRegistry.register('send_email', SEND_EMAIL_TOOL, async ({ to, subject, body }) => {
    return executeMobileActionIntent('send_email', { to, subject, body }, onAction);
  });

  toolRegistry.register('open_map', OPEN_MAP_TOOL, async ({ location }) => {
    return executeMobileActionIntent('open_map', { location }, onAction);
  });

  toolRegistry.register('open_settings', OPEN_SETTINGS_TOOL, async () => {
    return executeMobileActionIntent('open_settings', {}, onAction);
  });

  toolRegistry.register('call_phone', CALL_PHONE_TOOL, async ({ phoneNumber }) => {
    return executeMobileActionIntent('call_phone', { phoneNumber }, onAction);
  });

  toolRegistry.register('send_sms', SEND_SMS_TOOL, async ({ phoneNumber, body }) => {
    return executeMobileActionIntent('send_sms', { phoneNumber, body }, onAction);
  });

  toolRegistry.register('create_contact', CREATE_CONTACT_TOOL, async (parameters) => {
    return executeMobileActionIntent('create_contact', parameters, onAction);
  });

  toolRegistry.register('create_calendar_event', CREATE_CALENDAR_EVENT_TOOL, async (parameters) => {
    return executeMobileActionIntent('create_calendar_event', parameters, onAction);
  });
};
