export interface Player {
  id: string;
  name: string;
  buyInCount: number; // Number of buy-ins (sets) purchased
  finalChips: number; // Final chip count on the table
  netAmount?: number; // Calculated profit/loss
}

export interface GameSettings {
  chipPerBuyIn: number; // E.g., 1000 chips per buy-in
  cashPerBuyIn: number; // E.g., 500 TWD per buy-in
  isLocked?: boolean; // New: If true, the game is finished and read-only
}

export interface Transfer {
  fromName: string;
  toName: string;
  amount: number;
}

export interface CalculationResult {
  players: Player[];
  transfers: Transfer[];
  totalBalance: number; // Should be 0 ideally
  isBalanced: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}