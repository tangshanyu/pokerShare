
export type Player = {
  id: string;
  name: string;
  buyInCount: number; // Number of buy-ins (sets) purchased
  finalChips: number; // Final chip count on the table
  netAmount?: number; // Calculated profit/loss
};

export type GameSettings = {
  gameTitle?: string; // e.g. "Friday Night Poker"
  chipPerBuyIn: number; // E.g., 1000 chips per buy-in
  cashPerBuyIn: number; // E.g., 500 TWD per buy-in
  isLocked?: boolean; // If true, the game is finished and read-only
  creatorName?: string; // Name of the person who created the room
  createdAt?: number; // Timestamp of creation
};

export type Transfer = {
  fromName: string;
  toName: string;
  amount: number;
};

export type CalculationResult = {
  players: Player[];
  transfers: Transfer[];
  totalBalance: number; // Should be 0 ideally
  isBalanced: boolean;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
};
