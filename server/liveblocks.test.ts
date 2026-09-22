import { describe, expect, it } from 'vitest';

import {
  createHostToken,
  createRoomId,
  hashHostToken,
  isHostTokenValid,
  publicRoom,
} from './liveblocks';

describe('room security helpers', () => {
  it('creates unpredictable room IDs with a date prefix', () => {
    const now = new Date('2026-09-21T00:00:00Z');
    const first = createRoomId(now);
    const second = createRoomId(now);

    expect(first).toMatch(/^20260921-[a-f0-9]{20}$/);
    expect(second).not.toBe(first);
  });

  it('validates only the matching host token', () => {
    const token = createHostToken();
    const hash = hashHostToken(token);

    expect(token.length).toBeGreaterThan(30);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(isHostTokenValid(token, hash)).toBe(true);
    expect(isHostTokenValid(`${token}x`, hash)).toBe(false);
    expect(isHostTokenValid(undefined, hash)).toBe(false);
  });

  it('never exposes the host-token hash in public room metadata', () => {
    const room = publicRoom({
      id: 'room-1',
      createdAt: '2026-09-21T00:00:00Z',
      metadata: { title: 'Poker', hostTokenHash: 'a'.repeat(64) },
    });

    expect(room.metadata).toEqual({ title: 'Poker' });
  });
});
