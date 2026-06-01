import { llamaManager } from '../../../utils/LlamaManager';
import { engineService } from '../../runtime-service';
import { logger } from '../../../utils/logger';
import providerKeyStorage from '../../../utils/ProviderKeyStorage';
import { sendChunkedResponseStart, writeChunk, endChunkedResponse } from './responseUtils';
import type { StoredModel } from '../../ModelDownloaderTypes';
import type { ModelSettings } from '../../ModelSettingsService';
import { parseJsonBody } from './jsonParser';
import { parseMessagesFromPayload, parseMessagesOrPromptFromPayload } from './messageParser';
import { buildCustomSettings } from './settingsBuilder';
import { appleFoundationService } from '../../AppleFoundationService';
import type { AppleFoundationMessage } from '../../AppleFoundationService';
import { onlineModelService } from '../../OnlineModelService';
import type { ChatMessage as RemoteChatMessage, OnlineModelRequestOptions } from '../../OnlineModelService';

type RemoteProvider = 'gemini' | 'chatgpt' | 'claude';

const REMOTE_PROVIDERS: RemoteProvider[] = ['gemini', 'chatgpt', 'claude'];
const REMOTE_MODELS_PREF_KEY = 'remote_models_enabled';

async function remoteModelsEnabled(): Promise<boolean> {
  try {
    await providerKeyStorage.initialize();
    const value = await providerKeyStorage.getPreference(REMOTE_MODELS_PREF_KEY);
    return value === 'true';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`remote_models_pref_read_failed:${message}`, 'settings');
    return false;
  }
}

function isRemoteProvider(value?: string): value is RemoteProvider {
  if (!value) {
    return false;
  }
  return REMOTE_PROVIDERS.includes(value as RemoteProvider);
}

function mapAppleMessages(messages: { role: string; content: string }[]): AppleFoundationMessage[] {
  return messages.map(item => {
    const role: AppleFoundationMessage['role'] = item.role === 'system' ? 'system' : item.role === 'assistant' ? 'assistant' : 'user';
    return { role, content: item.content };
  });
}

function mapRemoteMessages(messages: { role: string; content: string }[]): RemoteChatMessage[] {
  return messages.map((item, index) => {
    const role: RemoteChatMessage['role'] = item.role === 'system' ? 'system' : item.role === 'assistant' ? 'assistant' : 'user';
    return { id: `msg-${index}`, role, content: item.content };
  });
}

function buildAppleOptions(settings?: ModelSettings) {
  return {
    temperature: settings?.temperature,
    maxTokens: settings?.maxTokens,
    topP: settings?.topP,
    topK: settings?.topK,
  };
}

function extractParams(settings?: ModelSettings): Record<string, any> | undefined {
  if (!settings) return undefined;
  const p: Record<string, any> = {};
  if (settings.temperature != null) p.temperature = settings.temperature;
  if (settings.maxTokens != null) p.max_tokens = settings.maxTokens;
  if (settings.topP != null) p.top_p = settings.topP;
  if (settings.topK != null) p.top_k = settings.topK;
  if (settings.minP != null) p.min_p = settings.minP;
  if (settings.penaltyRepeat != null) p.repeat_penalty = settings.penaltyRepeat;
  if (settings.penaltyFreq != null) p.frequency_penalty = settings.penaltyFreq;
  if (settings.penaltyPresent != null) p.presence_penalty = settings.penaltyPresent;
  if (settings.seed != null) p.seed = settings.seed;
  if (settings.mirostat != null) p.mirostat = settings.mirostat;
  if (settings.stopWords?.length) p.stop = settings.stopWords;
  return Object.keys(p).length > 0 ? p : undefined;
}

function buildRemoteOptions(stream: boolean, settings?: ModelSettings): OnlineModelRequestOptions {
  return {
    temperature: settings?.temperature,
    maxTokens: settings?.maxTokens,
    topP: settings?.topP,
    stream,
    streamTokens: stream,
  };
}

async function ensureRemoteProvider(provider: RemoteProvider): Promise<{ ok: boolean; status?: number; error?: string }> {
  const enabled = await remoteModelsEnabled();
  if (!enabled) {
    return { ok: false, status: 409, error: 'remote_models_disabled' };
  }
  const hasKey = await onlineModelService.hasApiKey(provider);
  if (!hasKey) {
    return { ok: false, status: 422, error: 'api_key_missing' };
  }
  return { ok: true };
}

async function streamAppleResponse(
  socket: any,
  method: string,
  path: string,
  messages: { role: string; content: string }[],
  settings?: ModelSettings
) {
  const mapped = mapAppleMessages(messages);
  const options = buildAppleOptions(settings);
  let started = false;
  try {
    sendChunkedResponseStart(socket, 200, { 'Content-Type': 'application/x-ndjson; charset=utf-8' });
    started = true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'write_failed';
    const safe = msg.replace(/\s+/g, '_');
    logger.error(`apple_stream_header:${safe}`, 'http');
    try {
      socket.destroy();
    } catch {}
    logger.logWebRequest(method, path, 500);
    return;
  }

  let full = '';
  const begun = Date.now();
  const appleStreamId = `stream-${begun}-${Math.random().toString(36).slice(2, 6)}`;
  logger.startStream(appleStreamId, 'apple-foundation', path, messages);

  try {
    for await (const chunk of appleFoundationService.streamResponse(mapped, options)) {
      full += chunk;
      logger.appendStreamToken(appleStreamId, chunk);
      try {
        writeChunk(socket, {
          model: 'apple-foundation',
          created_at: new Date().toISOString(),
          response: chunk,
          done: false,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'write_failed';
        const safe = msg.replace(/\s+/g, '_');
        logger.error(`apple_stream_chunk:${safe}`, 'http');
        appleFoundationService.cancel();
        throw error;
      }
    }

    writeChunk(socket, {
      model: 'apple-foundation',
      created_at: new Date().toISOString(),
      response: '',
      done: true,
      total_duration_ms: Date.now() - begun,
      output: full,
    });
    endChunkedResponse(socket);
    logger.endStream(appleStreamId, Date.now() - begun, 200);
    logger.logWebRequest(method, path, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'generation_failed';
    try {
      writeChunk(socket, {
        model: 'apple-foundation',
        created_at: new Date().toISOString(),
        error: msg,
        done: true,
      });
      endChunkedResponse(socket);
    } catch (writeError) {
      const wmsg = writeError instanceof Error ? writeError.message : 'write_failed';
      const safe = wmsg.replace(/\s+/g, '_');
      logger.error(`apple_stream_error:${safe}`, 'http');
      if (started) {
        try {
          socket.destroy();
        } catch {}
      }
    }
    logger.logWebRequest(method, path, 500);
  }
}

async function streamRemoteResponse(
  provider: RemoteProvider,
  socket: any,
  method: string,
  path: string,
  messages: { role: string; content: string }[],
  settings?: ModelSettings
) {
  let started = false;
  try {
    sendChunkedResponseStart(socket, 200, { 'Content-Type': 'application/x-ndjson; charset=utf-8' });
    started = true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'write_failed';
    const safe = msg.replace(/\s+/g, '_');
    logger.error(`remote_stream_header:${safe}`, 'http');
    try {
      socket.destroy();
    } catch {}
    logger.logWebRequest(method, path, 500);
    return;
  }

  const mapped = mapRemoteMessages(messages);
  const options = buildRemoteOptions(true, settings);
  let full = '';
  const begun = Date.now();
  const remoteStreamId = `stream-${begun}-${Math.random().toString(36).slice(2, 6)}`;
  logger.startStream(remoteStreamId, provider, path, messages);

  try {
    await sendRemoteMessage(provider, mapped, options, token => {
      full += token;
      logger.appendStreamToken(remoteStreamId, token);
      try {
        writeChunk(socket, {
          model: provider,
          created_at: new Date().toISOString(),
          response: token,
          done: false,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'write_failed';
        const safe = msg.replace(/\s+/g, '_');
        logger.error(`remote_stream_chunk:${safe}`, 'http');
        return false;
      }
      return true;
    });

    writeChunk(socket, {
      model: provider,
      created_at: new Date().toISOString(),
      response: '',
      done: true,
      total_duration_ms: Date.now() - begun,
      output: full,
    });
    endChunkedResponse(socket);
    logger.endStream(remoteStreamId, Date.now() - begun, 200);
    logger.logWebRequest(method, path, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'generation_failed';
    try {
      writeChunk(socket, {
        model: provider,
        created_at: new Date().toISOString(),
        error: msg,
        done: true,
      });
      endChunkedResponse(socket);
    } catch (writeError) {
      const wmsg = writeError instanceof Error ? writeError.message : 'write_failed';
      const safe = wmsg.replace(/\s+/g, '_');
      logger.error(`remote_stream_error:${safe}`, 'http');
      if (started) {
        try {
          socket.destroy();
        } catch {}
      }
    }
    logger.logWebRequest(method, path, 500);
  }
}

async function sendRemoteMessage(
  provider: RemoteProvider,
  messages: RemoteChatMessage[],
  options: OnlineModelRequestOptions,
  onToken?: (token: string) => boolean | void
) {
  switch (provider) {
    case 'gemini':
      return onlineModelService.sendMessageToGemini(messages, options, onToken);
    case 'chatgpt':
      return onlineModelService.sendMessageToOpenAI(messages, options, onToken);
    case 'claude':
      return onlineModelService.sendMessageToClaude(messages, options, onToken);
    default:
      throw new Error('unsupported_provider');
  }
}

async function handleAppleModelRequest(
  socket: any,
  method: string,
  path: string,
  messages: { role: string; content: string }[],
  stream: boolean,
  settings: ModelSettings | undefined,
  sendJSONResponse: (socket: any, status: number, payload: any) => void
) {
  const available = appleFoundationService.isAvailable();
  const enabled = available ? await appleFoundationService.isEnabled() : false;

  if (!available || !enabled) {
    sendJSONResponse(socket, 503, { error: 'apple_foundation_not_available' });
    logger.logWebRequest(method, path, 503);
    return;
  }

  if (stream) {
    await streamAppleResponse(socket, method, path, messages, settings);
    return;
  }

  try {
    const mapped = mapAppleMessages(messages);
    const options = buildAppleOptions(settings);
    const responseText = await appleFoundationService.generateResponse(mapped, options);
    sendJSONResponse(socket, 200, {
      model: 'apple-foundation',
      created_at: new Date().toISOString(),
      response: responseText,
      done: true,
    });
    logger.logWebRequest(method, path, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'generation_failed';
    logger.error(`apple_foundation_error:${message}`, 'http');
    sendJSONResponse(socket, 500, { error: 'generation_failed' });
    logger.logWebRequest(method, path, 500);
  }
}

async function handleRemoteModelRequest(
  provider: RemoteProvider,
  socket: any,
  method: string,
  path: string,
  messages: { role: string; content: string }[],
  stream: boolean,
  settings: ModelSettings | undefined,
  sendJSONResponse: (socket: any, status: number, payload: any) => void
) {
  const status = await ensureRemoteProvider(provider);
  if (!status.ok) {
    sendJSONResponse(socket, status.status ?? 500, { error: status.error ?? 'remote_provider_error' });
    logger.logWebRequest(method, path, status.status ?? 500);
    return;
  }

  if (stream) {
    await streamRemoteResponse(provider, socket, method, path, messages, settings);
    return;
  }

  try {
    const mapped = mapRemoteMessages(messages);
    const options = buildRemoteOptions(false, settings);
    const responseText = await sendRemoteMessage(provider, mapped, options);
    sendJSONResponse(socket, 200, {
      model: provider,
      created_at: new Date().toISOString(),
      response: responseText,
      done: true,
    });
    logger.logWebRequest(method, path, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'generation_failed';
    logger.error(`remote_model_error:${message}`, 'http');
    sendJSONResponse(socket, 500, { error: 'generation_failed' });
    logger.logWebRequest(method, path, 500);
  }
}

export async function handleChatRequest(
  body: string,
  socket: any,
  method: string,
  path: string,
  ensureModelLoaded: (identifier?: string) => Promise<{ model: StoredModel; projectorPath?: string }>,
  parseHttpError: (error: unknown) => { status: number; code: string; message: string },
  streamChatResponse: (socket: any, method: string, path: string, model: StoredModel, messages: { role: string; content: string }[], settings?: ModelSettings) => Promise<void>,
  sendJSONResponse: (socket: any, status: number, payload: any) => void
): Promise<void> {
  const { payload, error: parseError } = parseJsonBody(body);
  if (parseError) {
    sendJSONResponse(socket, 400, { error: parseError });
    logger.logWebRequest(method, path, 400);
    return;
  }

  const parsed = parseMessagesFromPayload(payload);
  if (parsed.error) {
    sendJSONResponse(socket, 400, { error: parsed.error });
    logger.logWebRequest(method, path, 400);
    return;
  }

  const modelIdentifier = typeof payload.model === 'string' ? payload.model : undefined;
  const stream = payload.stream === true;
  const settings = buildCustomSettings(payload.options);

  const logModel = modelIdentifier || 'default';

  logger.logInference({
    model: logModel,
    endpoint: path,
    messages: parsed.messages,
    params: extractParams(settings),
    stream,
  });

  if (modelIdentifier === 'apple-foundation') {
    await handleAppleModelRequest(socket, method, path, parsed.messages, stream, settings, sendJSONResponse);
    return;
  }

  if (isRemoteProvider(modelIdentifier)) {
    await handleRemoteModelRequest(modelIdentifier, socket, method, path, parsed.messages, stream, settings, sendJSONResponse);
    return;
  }

  let target: { model: StoredModel; projectorPath?: string };

  try {
    target = await ensureModelLoaded(modelIdentifier);
  } catch (error) {
    const parsed = parseHttpError(error);
    const safeMessage = parsed.message.replace(/\s+/g, '_');
    logger.error(`api_chat_model:${safeMessage}`, 'http');
    sendJSONResponse(socket, parsed.status, { error: parsed.code });
    logger.logWebRequest(method, path, parsed.status);
    return;
  }

  if (stream) {
    await streamChatResponse(socket, method, path, target.model, parsed.messages, settings);
    return;
  }

  const started = Date.now();

  try {
    const responseText = await engineService.mgr().gen(parsed.messages as any, { settings });
    const duration = Date.now() - started;
    logger.logInference({
      model: target.model.name,
      endpoint: path,
      messages: parsed.messages,
      params: extractParams(settings),
      stream: false,
      response: typeof responseText === 'string' ? responseText : String(responseText),
      duration,
      status: 200,
    });
    sendJSONResponse(socket, 200, {
      model: target.model.name,
      created_at: new Date().toISOString(),
      response: responseText,
      done: true
    });
    logger.logWebRequest(method, path, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'generation_failed';
    const safeMessage = message.replace(/\s+/g, '_');
    logger.error(`api_chat_failed:${safeMessage}`, 'http');
    sendJSONResponse(socket, 500, { error: 'generation_failed' });
    logger.logWebRequest(method, path, 500);
  }
}

export async function handleGenerateRequest(
  body: string,
  socket: any,
  method: string,
  path: string,
  ensureModelLoaded: (identifier?: string) => Promise<{ model: StoredModel; projectorPath?: string }>,
  parseHttpError: (error: unknown) => { status: number; code: string; message: string },
  streamChatResponse: (socket: any, method: string, path: string, model: StoredModel, messages: { role: string; content: string }[], settings?: ModelSettings) => Promise<void>,
  sendJSONResponse: (socket: any, status: number, payload: any) => void
): Promise<void> {
  const { payload, error: parseError } = parseJsonBody(body);
  if (parseError) {
    sendJSONResponse(socket, 400, { error: parseError });
    logger.logWebRequest(method, path, 400);
    return;
  }

  const parsed = parseMessagesOrPromptFromPayload(payload);
  if (parsed.error) {
    sendJSONResponse(socket, 400, { error: parsed.error });
    logger.logWebRequest(method, path, 400);
    return;
  }

  const modelIdentifier = typeof payload.model === 'string' ? payload.model : undefined;
  const stream = payload.stream === true;
  const settings = buildCustomSettings(payload.options);
  const genLogModel = modelIdentifier || 'default';

  logger.logInference({
    model: genLogModel,
    endpoint: path,
    messages: parsed.messages,
    params: extractParams(settings),
    stream,
  });

  if (modelIdentifier === 'apple-foundation') {
    await handleAppleModelRequest(socket, method, path, parsed.messages, stream, settings, sendJSONResponse);
    return;
  }

  if (isRemoteProvider(modelIdentifier)) {
    await handleRemoteModelRequest(modelIdentifier, socket, method, path, parsed.messages, stream, settings, sendJSONResponse);
    return;
  }

  let target: { model: StoredModel; projectorPath?: string };

  try {
    target = await ensureModelLoaded(modelIdentifier);
  } catch (error) {
    const parsed = parseHttpError(error);
    const safeMessage = parsed.message.replace(/\s+/g, '_');
    logger.error(`api_generate_model:${safeMessage}`, 'http');
    sendJSONResponse(socket, parsed.status, { error: parsed.code });
    logger.logWebRequest(method, path, parsed.status);
    return;
  }

  if (stream) {
    await streamChatResponse(socket, method, path, target.model, parsed.messages, settings);
    return;
  }

  const genStarted = Date.now();

  try {
    const responseText = await engineService.mgr().gen(parsed.messages as any, { settings });
    const genDuration = Date.now() - genStarted;
    logger.logInference({
      model: target.model.name,
      endpoint: path,
      messages: parsed.messages,
      params: extractParams(settings),
      stream: false,
      response: typeof responseText === 'string' ? responseText : String(responseText),
      duration: genDuration,
      status: 200,
    });
    sendJSONResponse(socket, 200, {
      model: target.model.name,
      created_at: new Date().toISOString(),
      response: responseText,
      done: true
    });
    logger.logWebRequest(method, path, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'generation_failed';
    const safeMessage = message.replace(/\s+/g, '_');
    logger.error(`api_generate_failed:${safeMessage}`, 'http');
    sendJSONResponse(socket, 500, { error: 'generation_failed' });
    logger.logWebRequest(method, path, 500);
  }
}
