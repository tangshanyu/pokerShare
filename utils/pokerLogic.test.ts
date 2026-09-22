import { describe, expect, it } from 'vitest';

import type { GameSettings, Player } from '../types';
import { calculateSettlement, generateTextSummary } from './pokerLogic';

const settings: GameSettings = {
  chipPerBuyIn: 1000,
  cashPerBuyIn: 500,
};

const player = (id: string, name: string, buyInCount: number, finalChips: number): Player => ({
  id,
  name,
  buyInCount,
  finalChips,
});

describe('calculateSettlement', () => {
  it('calculates a balanced transfer plan', () => {
    const result = calculateSettlement([
      player('1', 'Alice', 1, 1500),
      player('2', 'Bob', 1, 500),
    ], settings);

    expect(result.isBalanced).toBe(true);
    expect(result.totalBalance).toBe(0);
    expect(result.players.map(item => [item.name, item.netAmount])).toEqual([
      ['Alice', 250],
      ['Bob', -250],
    ]);
    expect(result.transfers).toEqual([
      { fromName: 'Bob', toName: 'Alice', amount: 250 },
    ]);
  });

  it('rejects a chip-count mismatch even when currency rounding would hide it', () => {
    const result = calculateSettlement([
      player('1', 'Alice', 1, 1001),
    ], settings);

    expect(result.isBalanced).toBe(false);
    expect(result.transfers).toEqual([]);
  });

  it('reconciles per-player rounding only when total chips are conserved', () => {
    const result = calculateSettlement([
      player('1', 'Alice', 1, 1001),
      player('2', 'Bob', 1, 999),
    ], settings);

    expect(result.isBalanced).toBe(true);
    expect(result.totalBalance).toBe(0);
    expect(result.players.reduce((sum, item) => sum + (item.netAmount ?? 0), 0)).toBe(0);
  });

  it('rejects invalid settings and negative player values', () => {
    expect(calculateSettlement([], { chipPerBuyIn: 0, cashPerBuyIn: 500 }).isBalanced).toBe(false);
    expect(calculateSettlement([player('1', 'Alice', -1, 0)], settings).isBalanced).toBe(false);
  });
});

describe('generateTextSummary', () => {
  it('includes the transfer instructions', () => {
    const result = calculateSettlement([
      player('1', 'Alice', 1, 1500),
      player('2', 'Bob', 1, 500),
    ], settings);

    expect(generateTextSummary(result, settings)).toContain('Bob 需支付給 Alice $250');
  });
});
