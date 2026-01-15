import { Player, CalculationResult, GameLog } from '../types';

const STORAGE_KEYS = {
  GAME_RESULTS: 'poker_game_results_log',
  KNOWN_PLAYERS: 'poker_known_players'
};

// --- Local History (Room Visits) ---

export const getGameLogs = (): GameLog[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GAME_RESULTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveGameLog = (roomId: string, result: CalculationResult, hostName: string) => {
  try {
    const newEntry: GameLog = {
      roomId,
      timestamp: Date.now(),
      hostName,
      players: result.players.map(p => ({
        name: p.name,
        net: p.netAmount || 0
      }))
    };

    // Save to Local View History
    const logs = getGameLogs();
    const existingIndex = logs.findIndex(l => l.roomId === roomId);
    if (existingIndex !== -1) {
      logs[existingIndex] = newEntry;
    } else {
      logs.unshift(newEntry);
    }
    
    // Keep max 50 logs
    if (logs.length > 50) logs.pop();

    localStorage.setItem(STORAGE_KEYS.GAME_RESULTS, JSON.stringify(logs));
  } catch (e) {
    console.error("Failed to save game log", e);
  }
};

export const clearGameLogs = () => {
    localStorage.removeItem(STORAGE_KEYS.GAME_RESULTS);
};

// --- Known Players (Autocomplete) ---

export const getKnownPlayers = (): string[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.KNOWN_PLAYERS);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const addKnownPlayers = (names: string[]) => {
    try {
        const existing = new Set(getKnownPlayers());
        names.forEach(n => {
            if (n && typeof n === 'string') existing.add(n.trim());
        });
        localStorage.setItem(STORAGE_KEYS.KNOWN_PLAYERS, JSON.stringify(Array.from(existing)));
    } catch (e) {
        console.error("Failed to update known players", e);
    }
};