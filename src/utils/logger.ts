export interface LogMetadata {
  model?: string;
  messages?: Array<{ role: string; content: string }>;
  response?: string;
  params?: Record<string, any>;
  duration?: number;
  stream?: boolean;
  endpoint?: string;
  status?: number;
  streamId?: string;
  streaming?: boolean;
}

export interface LogEntry {
  timestamp: number;
  level: string;
  msg: string;
  category?: string;
  metadata?: LogMetadata;
}

class ServerLogger {
  private logEntries: LogEntry[] = [];
  private maxLogs = 1000;
  private activeStreams: Map<string, number> = new Map();

  constructor() {
  }

  private addLogEntry(level: string, message: string, category: string = 'server', metadata?: LogMetadata) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      msg: message,
      category,
      ...(metadata ? { metadata } : {}),
    };

    this.logEntries.unshift(entry);

    if (this.logEntries.length > this.maxLogs) {
      this.logEntries = this.logEntries.slice(0, this.maxLogs);
    }

    if (__DEV__) {
      const timestamp = new Date().toLocaleTimeString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [${category}]`;
      console.log(`${prefix} ${message}`);
    }
  }

  debug(message: string, category?: string, metadata?: LogMetadata) {
    this.addLogEntry('debug', message, category, metadata);
  }

  info(message: string, category?: string, metadata?: LogMetadata) {
    this.addLogEntry('info', message, category, metadata);
  }

  warn(message: string, category?: string, metadata?: LogMetadata) {
    this.addLogEntry('warn', message, category, metadata);
  }

  error(message: string, category?: string, metadata?: LogMetadata) {
    this.addLogEntry('error', message, category, metadata);
  }

  async getLogs(): Promise<LogEntry[]> {
    return [...this.logEntries];
  }

  async clearLogs(): Promise<void> {
    this.logEntries = [];
    this.info('logs_cleared', 'system');
  }

  logInference(data: {
    model: string;
    endpoint: string;
    messages: Array<{ role: string; content: string }>;
    params?: Record<string, any>;
    stream?: boolean;
    response?: string;
    duration?: number;
    status?: number;
  }) {
    const label = data.response ? 'inference_complete' : 'inference_request';
    const meta: LogMetadata = {
      model: data.model,
      endpoint: data.endpoint,
      messages: data.messages,
      params: data.params,
      stream: data.stream,
      response: data.response,
      duration: data.duration,
      status: data.status,
    };
    this.addLogEntry('info', `${label} model:${data.model} endpoint:${data.endpoint}`, 'inference', meta);
  }

  startStream(streamId: string, model: string, endpoint: string, messages: Array<{ role: string; content: string }>, params?: Record<string, any>) {
    const meta: LogMetadata = {
      model,
      endpoint,
      messages,
      params,
      stream: true,
      streamId,
      streaming: true,
      response: '',
    };
    this.addLogEntry('info', `stream_active model:${model}`, 'inference', meta);
    this.activeStreams.set(streamId, 0);
  }

  appendStreamToken(streamId: string, token: string) {
    const idx = this.logEntries.findIndex(e => e.metadata?.streamId === streamId && e.metadata?.streaming);
    if (idx === -1) return;
    const entry = this.logEntries[idx];
    if (entry.metadata) {
      entry.metadata.response = (entry.metadata.response || '') + token;
    }
  }

  endStream(streamId: string, duration: number, status: number) {
    const idx = this.logEntries.findIndex(e => e.metadata?.streamId === streamId && e.metadata?.streaming);
    if (idx === -1) return;
    const entry = this.logEntries[idx];
    if (entry.metadata) {
      entry.metadata.streaming = false;
      entry.metadata.duration = duration;
      entry.metadata.status = status;
      entry.msg = `inference_complete model:${entry.metadata.model}`;
      entry.timestamp = Date.now();
    }
    this.activeStreams.delete(streamId);
  }

  logServerStart(port: number, url: string) {
    this.info(`server_started port:${port} url:${url}`, 'server');
  }

  logServerStop() {
    this.info('server_stopped', 'server');
  }

  logServerError(error: string) {
    this.error(`server_error: ${error}`, 'server');
  }

  logModelInitialization(modelPath: string, success: boolean) {
    const status = success ? 'success' : 'failed';
    this.info(`model_initialization_${status}: ${modelPath}`, 'model');
  }

  logWebRequest(method: string, path: string, status: number) {
    this.info(`${method} ${path} ${status}`, 'http');
  }

  logClientConnection(connected: boolean, clientInfo?: string) {
    const action = connected ? 'connected' : 'disconnected';
    const info = clientInfo ? ` ${clientInfo}` : '';
    this.info(`client_${action}${info}`, 'client');
  }
}

export const logger = new ServerLogger();
