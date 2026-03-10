import type { IncomingMessage, ServerResponse } from 'node:http';

// These small helpers keep the route layer readable and avoid repeating low-level
// HTTP boilerplate throughout the server implementation.

export async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const bodyText = Buffer.concat(chunks).toString('utf8');

  return JSON.parse(bodyText);
}

export function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  const body = JSON.stringify(payload, null, 2);

  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('content-length', Buffer.byteLength(body));
  response.end(body);
}

export function sendText(response: ServerResponse, statusCode: number, body: string): void {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'text/plain; charset=utf-8');
  response.setHeader('content-length', Buffer.byteLength(body));
  response.end(body);
}
