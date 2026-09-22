import type { IncomingMessage, ServerResponse } from "node:http";

import { handleApiError, HttpError, readJsonBody } from "../server/http";
import { getLiveblocksClient } from "../server/liveblocks";

type ApiRequest = IncomingMessage & { body?: unknown };

function requiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `${field} is required.`);
  }
  return value.trim().slice(0, maxLength);
}

export default async function handler(request: ApiRequest, response: ServerResponse) {
  try {
    if (request.method?.toUpperCase() !== "POST") {
      response.setHeader("Allow", "POST");
      throw new HttpError(405, "Method not allowed.");
    }

    const body = await readJsonBody(request);
    const roomId = requiredText(body.room, "room", 100);
    const userId = requiredText(body.userId, "userId", 100);
    const userName = requiredText(body.userName, "userName", 60);
    const liveblocks = getLiveblocksClient();

    // Do not mint tokens for arbitrary/nonexistent rooms.
    await liveblocks.getRoom(roomId);

    const session = liveblocks.prepareSession(userId, {
      userInfo: { name: userName },
    });
    session.allow(roomId, ["room:write"]);
    const auth = await session.authorize();

    response.statusCode = auth.status;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.end(auth.body);
  } catch (error) {
    handleApiError(response, error);
  }
}
