import { Buffer } from 'buffer';

export type HTTPHeaders = { [key: string]: string };

export interface ParsedHTTPRequest {
  requestLine: string;
  headers: HTTPHeaders;
  body: string;
}

export function parseHTTPBuffer(buffer: Buffer): {
  request: ParsedHTTPRequest | null;
  remainingBuffer: Buffer;
  needsMoreData: boolean;
} {
  const separatorIndex = buffer.indexOf('\r\n\r\n');
  if (separatorIndex === -1) {
    return { request: null, remainingBuffer: buffer, needsMoreData: true };
  }

  const headerPart = buffer.slice(0, separatorIndex).toString('utf8');
  const requestLineEnd = headerPart.indexOf('\r\n');
  const requestLine = requestLineEnd === -1 ? headerPart : headerPart.slice(0, requestLineEnd);
  const headersPart = requestLineEnd === -1 ? '' : headerPart.slice(requestLineEnd + 2);
  const headerLines = headersPart.length > 0 ? headersPart.split('\r\n') : [];
  const headers: HTTPHeaders = {};

  for (const headerLine of headerLines) {
    const separatorPos = headerLine.indexOf(':');
    if (separatorPos !== -1) {
      const key = headerLine.slice(0, separatorPos).trim().toLowerCase();
      const value = headerLine.slice(separatorPos + 1).trim();
      headers[key] = value;
    }
  }

  const contentLength = parseInt(headers['content-length'] || '0', 10);
  const bodyStart = separatorIndex + 4;
  const totalLength = bodyStart + contentLength;

  if (buffer.length < totalLength) {
    return { request: null, remainingBuffer: buffer, needsMoreData: true };
  }

  const body = buffer.slice(bodyStart, totalLength).toString('utf8');
  const remainingBuffer = buffer.slice(totalLength);

  return {
    request: { requestLine, headers, body },
    remainingBuffer,
    needsMoreData: false
  };
}
