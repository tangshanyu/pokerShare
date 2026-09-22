import type { IncomingMessage, ServerResponse } from "node:http";

import { handleApiError, HttpError, readJsonBody, sendJson } from "../server/http";
import {
  createHostToken,
  createRoomId,
  getHeader,
  getLiveblocksClient,
  hashHostToken,
  HOST_TOKEN_HEADER,
  HOST_TOKEN_HASH_METADATA_KEY,
  isHostTokenValid,
  publicRoom,
  requireHost,
} from "../server/liveblocks";

type ApiRequest = IncomingMessage & { body?: unknown };

function cleanText(value: unknown, fallback: string, maxLength = 100): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maxLength) : fallback;
}

export default async function handler(request: ApiRequest, response: ServerResponse) {
  try {
    const method = request.method?.toUpperCase() ?? "GET";
    const url = new URL(request.url ?? "/api/rooms", `http://${request.headers.host ?? "localhost"}`);

    if (method === "GET") {
      const roomId = url.searchParams.get("roomId")?.trim();
      if (!roomId) {
        throw new HttpError(400, "roomId is required. Global room listing is disabled.");
      }

      const room = await getLiveblocksClient().getRoom(roomId);
      const isHost = isHostTokenValid(
        getHeader(request, HOST_TOKEN_HEADER),
        room.metadata?.[HOST_TOKEN_HASH_METADATA_KEY],
      );
      sendJson(response, 200, { room: publicRoom(room), isHost });
      return;
    }

    if (method === "POST") {
      const body = await readJsonBody(request);
      const intent = body.intent;

      if (intent === "create") {
        const roomId = createRoomId();
        const hostToken = createHostToken();
        const title = cleanText(body.title, "New Poker Game");
        const creatorName = cleanText(body.creatorName, "Anonymous", 60);
        const createdAt = Date.now();

        await getLiveblocksClient().createRoom(roomId, {
          defaultAccesses: [],
          metadata: {
            title,
            creatorName,
            createdAt: String(createdAt),
            [HOST_TOKEN_HASH_METADATA_KEY]: hashHostToken(hostToken),
          },
        });

        sendJson(response, 201, { roomId, hostToken, createdAt });
        return;
      }

      const roomId = cleanText(body.roomId, "", 100);
      if (!roomId) throw new HttpError(400, "roomId is required.");

      const { liveblocks } = await requireHost(request, roomId);
      const title = cleanText(body.title, "", 100);
      if (!title) throw new HttpError(400, "title is required.");

      const room = await liveblocks.updateRoom(roomId, { metadata: { title } });
      sendJson(response, 200, { room: publicRoom(room) });
      return;
    }

    if (method === "DELETE") {
      const roomId = url.searchParams.get("roomId")?.trim();
      if (!roomId) throw new HttpError(400, "roomId is required.");

      const { liveblocks } = await requireHost(request, roomId);
      await liveblocks.deleteRoom(roomId);
      sendJson(response, 200, { success: true });
      return;
    }

    response.setHeader("Allow", "GET, POST, DELETE");
    throw new HttpError(405, "Method not allowed.");
  } catch (error) {
    handleApiError(response, error);
  }
}
