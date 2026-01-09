import { Player, CalculationResult } from '../types';

const STORAGE_KEYS = {
  KNOWN_PLAYERS: 'poker_known_players',
  GAME_RESULTS: 'poker_game_results_log'
};

export interface GameLog {
  roomId: string;
  timestamp: number;
  players: { name: string; net: number }[];
}

// --- Player Registry (Name Suggestions) ---

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
    const current = new Set(getKnownPlayers());
    let hasChanges = false;
    
    names.forEach(n => {
      if (n && n.trim()) {
        const cleanName = n.trim();
        if (!current.has(cleanName)) {
          current.add(cleanName);
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      localStorage.setItem(STORAGE_KEYS.KNOWN_PLAYERS, JSON.stringify(Array.from(current).sort()));
    }
  } catch (e) {
    console.error("Failed to save players", e);
  }
};

// --- Game History (For Stats) ---

export const getGameLogs = (): GameLog[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GAME_RESULTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveGameLog = (roomId: string, result: CalculationResult) => {
  try {
    const logs = getGameLogs();
    
    // Check if this room already has a log (update it if re-calculated)
    const existingIndex = logs.findIndex(l => l.roomId === roomId);
    
    const newEntry: GameLog = {
      roomId,
      timestamp: Date.now(),
      players: result.players.map(p => ({
        name: p.name,
        net: p.netAmount || 0
      }))
    };

    if (existingIndex !== -1) {
      logs[existingIndex] = newEntry; // Update existing
    } else {
      logs.unshift(newEntry); // Add new to top
    }

    localStorage.setItem(STORAGE_KEYS.GAME_RESULTS, JSON.stringify(logs));
    
    // Also automatically update known players
    addKnownPlayers(result.players.map(p => p.name));
    
  } catch (e) {
    console.error("Failed to save game log", e);
  }
};

export const clearGameLogs = () => {
    localStorage.removeItem(STORAGE_KEYS.GAME_RESULTS);
};
