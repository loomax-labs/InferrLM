import { Linking } from 'react-native';

import { toolRegistry, type ToolSchema } from './ToolRegistry';

const TOOL_NAMES = ['open_url', 'send_email', 'open_map', 'open_settings'] as const;

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

const isSafeUrl = (value: string): boolean => /^https?:\/\//i.test(value.trim());

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
    await Linking.openURL(value);
    onAction?.({ tool: 'open_url', summary: value, createdAt: Date.now() });
    return `Opened ${value}`;
  }

  if (name === 'send_email') {
    const recipient = String(params.to || '').trim();
    if (!recipient || !recipient.includes('@')) {
      throw new Error('invalid_email');
    }
    const emailUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(String(params.subject || ''))}&body=${encodeURIComponent(String(params.body || ''))}`;
    await Linking.openURL(emailUrl);
    onAction?.({ tool: 'send_email', summary: recipient, createdAt: Date.now() });
    return `Drafted email to ${recipient}`;
  }

  if (name === 'open_map') {
    const query = String(params.location || '').trim();
    if (!query) {
      throw new Error('invalid_location');
    }
    const mapUrl = `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
    await Linking.openURL(mapUrl);
    onAction?.({ tool: 'open_map', summary: query, createdAt: Date.now() });
    return `Opened maps for ${query}`;
  }

  if (name === 'open_settings') {
    await Linking.openSettings();
    onAction?.({ tool: 'open_settings', summary: 'Device settings', createdAt: Date.now() });
    return 'Opened device settings';
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
};
