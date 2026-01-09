import { Player, CalculationResult, GameLog } from '../types';

const STORAGE_KEYS = {
  KNOWN_PLAYERS: 'poker_known_players',
  GAME_RESULTS: 'poker_game_results_log',
  PENDING_UPLOADS: 'poker_pending_uploads'
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

// --- Local History & Pending Uploads ---

export const getGameLogs = (): GameLog[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GAME_RESULTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const getPendingUploads = (): GameLog[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PENDING_UPLOADS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const clearPendingUploads = () => {
    localStorage.removeItem(STORAGE_KEYS.PENDING_UPLOADS);
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

    // 1. Save to Local View History
    const logs = getGameLogs();
    const existingIndex = logs.findIndex(l => l.roomId === roomId);
    if (existingIndex !== -1) {
      logs[existingIndex] = newEntry;
    } else {
      logs.unshift(newEntry);
    }
    localStorage.setItem(STORAGE_KEYS.GAME_RESULTS, JSON.stringify(logs));

    // 2. Save to Pending Queue (for Cloud Sync)
    // We only queue if it's a new finalization or update.
    // To prevent duplicates in DB, we'll handle uniqueness in the sync logic,
    // but here we just push to queue.
    const pending = getPendingUploads();
    // Remove old pending for same room if exists to update it
    const filteredPending = pending.filter(p => p.roomId !== roomId);
    filteredPending.push(newEntry);
    localStorage.setItem(STORAGE_KEYS.PENDING_UPLOADS, JSON.stringify(filteredPending));
    
    // Update known players
    addKnownPlayers(result.players.map(p => p.name));
    
  } catch (e) {
    console.error("Failed to save game log", e);
  }
};

export const clearGameLogs = () => {
    localStorage.removeItem(STORAGE_KEYS.GAME_RESULTS);
};