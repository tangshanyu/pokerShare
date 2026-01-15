
import { Player, CalculationResult, GameLog } from '../types';

const STORAGE_KEYS = {
  KNOWN_PLAYERS: 'poker_known_players',
  GAME_RESULTS: 'poker_game_results_log'
};

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

export const removeKnownPlayer = (nameToRemove: string) => {
  try {
    let current = getKnownPlayers();
    const initialLen = current.length;
    current = current.filter(n => n !== nameToRemove);
    
    if (current.length !== initialLen) {
      localStorage.setItem(STORAGE_KEYS.KNOWN_PLAYERS, JSON.stringify(current));
    }
  } catch (e) {
    console.error("Failed to remove player", e);
  }
};

// --- Local History ---

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
    localStorage.setItem(STORAGE_KEYS.GAME_RESULTS, JSON.stringify(logs));
    
    // Update known players locally
    addKnownPlayers(result.players.map(p => p.name));
    
  } catch (e) {
    console.error("Failed to save game log", e);
  }
};

export const clearGameLogs = () => {
    localStorage.removeItem(STORAGE_KEYS.GAME_RESULTS);
};
