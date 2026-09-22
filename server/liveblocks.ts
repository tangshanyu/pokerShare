import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { Liveblocks } from "@liveblocks/node";

import { HttpError } from "./http";

export const HOST_TOKEN_HEADER = "x-room-host-token";
export const HOST_TOKEN_HASH_METADATA_KEY = "hostTokenHash";

export function getLiveblocksClient(): Liveblocks {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    throw new HttpError(500, "LIVEBLOCKS_SECRET_KEY is not configured.");
  }
  return new Liveblocks({ secret });
}

export function createRoomId(now = new Date()): string {
  const date = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");
  return `${date}-${randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

export function createHostToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashHostToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isHostTokenValid(token: string | undefined, expectedHash: unknown): boolean {
  if (!token || typeof expectedHash !== "string" || expectedHash.length !== 64) return false;

  const actual = Buffer.from(hashHostToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function getHeader(request: { headers?: Record<string, string | string[] | undefined> }, name: string): string | undefined {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export async function requireHost(
  request: { headers?: Record<string, string | string[] | undefined> },
  roomId: string,
) {
  const liveblocks = getLiveblocksClient();
  const room = await liveblocks.getRoom(roomId);
  const token = getHeader(request, HOST_TOKEN_HEADER);

  if (!isHostTokenValid(token, room.metadata?.[HOST_TOKEN_HASH_METADATA_KEY])) {
    throw new HttpError(403, "A valid room host token is required.");
  }

  return { liveblocks, room };
}

export function publicRoom(room: {
  id: string;
  type?: string;
  createdAt: Date | string;
  lastConnectionAt?: Date | string;
  metadata?: Record<string, string | string[]>;
}) {
  const { [HOST_TOKEN_HASH_METADATA_KEY]: _privateHash, ...metadata } = room.metadata ?? {};
  return {
    type: room.type ?? "room",
    id: room.id,
    createdAt: room.createdAt,
    lastConnectionAt: room.lastConnectionAt,
    metadata,
  };
}
