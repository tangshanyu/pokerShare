import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { LiveList, LiveObject } from "@liveblocks/client";
import { Player, GameSettings } from "./types";

const client = createClient({
  publicApiKey: process.env.REACT_APP_LIVEBLOCKS_PUBLIC_KEY || process.env.VITE_LIVEBLOCKS_PUBLIC_KEY || "",
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
