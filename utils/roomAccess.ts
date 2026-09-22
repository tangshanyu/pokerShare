const HOST_TOKEN_PREFIX = "poker_host_token_";

export function getRoomHostToken(roomId: string | null | undefined): string | null {
  if (!roomId) return null;
  return localStorage.getItem(`${HOST_TOKEN_PREFIX}${roomId}`);
}

export function saveRoomHostToken(roomId: string, token: string): void {
  localStorage.setItem(`${HOST_TOKEN_PREFIX}${roomId}`, token);
}

export function clearRoomHostToken(roomId: string): void {
  localStorage.removeItem(`${HOST_TOKEN_PREFIX}${roomId}`);
}

export function roomHostHeaders(roomId: string | null | undefined): Record<string, string> {
  const token = getRoomHostToken(roomId);
  return token ? { "x-room-host-token": token } : {};
}
