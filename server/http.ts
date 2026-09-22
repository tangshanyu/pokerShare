import type { IncomingMessage, ServerResponse } from "node:http";

type RequestLike = IncomingMessage & {
  body?: unknown;
};

type ResponseLike = ServerResponse & {
  status?: (statusCode: number) => ResponseLike;
  json?: (body: unknown) => void;
};

export async function readJsonBody(request: RequestLike): Promise<Record<string, unknown>> {
  if (request.body && typeof request.body === "object") {
    return request.body as Record<string, unknown>;
  }

  if (typeof request.body === "string") {
    try {
      const parsed = JSON.parse(request.body);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      throw new HttpError(400, "Request body must be valid JSON.");
    }
  }

  const chunks: Buffer[] = [];
  let receivedBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    receivedBytes += buffer.length;
    if (receivedBytes > 16_384) {
      throw new HttpError(413, "Request body is too large.");
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) return {};

  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

export function sendJson(response: ResponseLike, statusCode: number, body: unknown): void {
  if (typeof response.status === "function" && typeof response.json === "function") {
    response.status(statusCode).json(body);
    return;
  }

  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function handleApiError(response: ResponseLike, error: unknown): void {
  if (error instanceof HttpError) {
    sendJson(response, error.statusCode, { error: error.message });
    return;
  }

  const statusCode =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : 500;

  const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
  const message = safeStatus === 404 ? "Room not found." : "Internal Server Error";
  console.error(error);
  sendJson(response, safeStatus, { error: message });
}
