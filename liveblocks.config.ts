import { createClient, LiveList, LiveObject } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

import type { ChatMessage, GameSettings, Player } from "./types";

type Presence = {
  name?: string;
};

type Storage = {
  players: LiveList<Player>;
  settings: LiveObject<GameSettings>;
  messages: LiveList<ChatMessage>;
};

const client = createClient({
  authEndpoint: async (room) => {
    const userId = localStorage.getItem("poker_user_id");
    const userName = localStorage.getItem("poker_user_name");
    if (!userId || !userName) {
      throw new Error("Player identity is missing. Please return to the lobby and join again.");
    }

    const response = await fetch("/api/liveblocks-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, userId, userName }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Unable to authorize this room.");
    }

    return response.json();
  },
});

export const {
  RoomProvider,
  useStorage,
  useMutation,
  useStatus,
} = createRoomContext<Presence, Storage>(client);
