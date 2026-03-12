import { createReadStream, existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const HOST = process.env.INSTANCE_WRAPPER_HOST || "127.0.0.1";
const PORT = Number(process.env.INSTANCE_WRAPPER_PORT || 3000);
const DIST_DIR = resolve(process.cwd(), "dist");
const INDEX_HTML_PATH = join(DIST_DIR, "index.html");

const OC_GATEWAY_BASE_URL = (process.env.OC_GATEWAY_BASE_URL || "http://127.0.0.1:19001").replace(/\/$/, "");
const OC_GATEWAY_TOKEN = process.env.OC_GATEWAY_TOKEN || process.env.SAGE_OC_GATEWAY_TOKEN || "sage-dev-gateway-token";
const OC_AGENT_ID = process.env.OC_CHAT_AGENT_ID || process.env.OC_HOOK_AGENT_ID || "main";
const CHAT_MODEL = process.env.OC_CHAT_MODEL || `openclaw:${OC_AGENT_ID}`;

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

type ChatRequestBody = {
  message?: string;
  conversationId?: string;
  communicationType?: "chat" | "text" | "email";
};

const sendJson = (res: ServerResponse, statusCode: number, payload: unknown) => {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
};

const readJsonBody = async <T>(req: IncomingMessage): Promise<T> => {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(body) as T;
};

const streamOpenClawChat = async (res: ServerResponse, body: ChatRequestBody) => {
  const message = body.message?.trim();
  if (!message) {
    sendJson(res, 400, { error: "message is required" });
    return;
  }

  const upstreamResponse = await fetch(`${OC_GATEWAY_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${OC_GATEWAY_TOKEN}`,
      "content-type": "application/json",
      "x-openclaw-agent-id": OC_AGENT_ID,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      stream: true,
      user: body.conversationId,
      messages: [{ role: "user", content: message }],
    }),
  });

  if (!upstreamResponse.ok) {
    const contentType = upstreamResponse.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await upstreamResponse.json()
      : { error: await upstreamResponse.text() };

    sendJson(res, upstreamResponse.status, payload);
    return;
  }

  if (!upstreamResponse.body) {
    sendJson(res, 502, { error: "OpenClaw returned no response body." });
    return;
  }

  res.statusCode = 200;
  res.setHeader("content-type", "text/event-stream; charset=utf-8");
  res.setHeader("cache-control", "no-cache, no-transform");
  res.setHeader("connection", "keep-alive");

  const reader = upstreamResponse.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      res.write(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
    res.end();
  }
};

const serveStaticFile = async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || `${HOST}:${PORT}`}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(DIST_DIR, safePath);

  if (existsSync(filePath)) {
    const fileStats = await stat(filePath);
    if (fileStats.isFile()) {
      res.statusCode = 200;
      res.setHeader("content-type", MIME_TYPES[extname(filePath)] || "application/octet-stream");
      createReadStream(filePath).pipe(res);
      return;
    }
  }

  if (!existsSync(INDEX_HTML_PATH)) {
    sendJson(res, 500, { error: "dist/index.html not found. Run `pnpm --filter @sage/instance-wrapper build` first." });
    return;
  }

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(await readFile(INDEX_HTML_PATH, "utf8"));
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || `${HOST}:${PORT}`}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        openClawBaseUrl: OC_GATEWAY_BASE_URL,
        openClawAgentId: OC_AGENT_ID,
        chatModel: CHAT_MODEL,
        mode: "openclaw-chat-proxy",
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      const body = await readJsonBody<ChatRequestBody>(req);
      await streamOpenClawChat(res, body);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    await serveStaticFile(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    sendJson(res, 500, { error: message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`instance-wrapper listening on http://${HOST}:${PORT}`);
  console.log(`proxying chat to ${OC_GATEWAY_BASE_URL}/v1/chat/completions (${CHAT_MODEL})`);
});
