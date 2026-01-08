import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { LiveList, LiveObject } from "@liveblocks/client";
import { Player, GameSettings } from "./types";

// Helper to safely get the API key in different environments
const getApiKey = (): string | undefined => {
  try {
    // Vite / Modern Browsers
    if (typeof import.meta !== "undefined" && (import.meta as any).env) {
      const key = (import.meta as any).env.VITE_LIVEBLOCKS_PUBLIC_KEY;
      if (key && typeof key === 'string' && key.startsWith('pk_')) return key;
    }
  } catch (e) {}

  try {
    // Node / Webpack / CRA / Process env
    if (typeof process !== "undefined" && process.env) {
      const key = process.env.REACT_APP_LIVEBLOCKS_PUBLIC_KEY || process.env.VITE_LIVEBLOCKS_PUBLIC_KEY;
      if (key && typeof key === 'string' && key.startsWith('pk_')) return key;
    }
  } catch (e) {}
  
  // Fallback for dev/preview testing
  return "pk_dev_GemJz7HP1OR8gWE8Y1LKxWTJV5iqbxU4bIR4Mu33lFgto9ydbwRosvbwwaevAXGJ";
};

const rawKey = getApiKey();
// Export a flag to check if the key is valid in the UI
export const hasApiKey = !!rawKey;

// Use the key if valid, otherwise use a placeholder with valid prefix to prevent immediate crash inside createClient
const publicApiKey = rawKey || "pk_placeholder_for_missing_key";

const client = createClient({
  publicApiKey,
});

// Presence represents the properties of a user in the room (cursor, selection, etc.)
type Presence = {
  // We can add cursor positions here later if needed
};

// Storage represents the shared document that persists in the room
type Storage = {
  players: LiveList<Player>;
  settings: LiveObject<GameSettings>;
};

export const {
  RoomProvider,
  useOthers,
  useStorage,
  useMutation,
  useSelf,
} = createRoomContext<Presence, Storage>(client);