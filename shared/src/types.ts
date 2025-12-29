// Shared types between frontend and backend

export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: Date;
}

export interface Game {
  id: number;
  appId: number;
  name: string;
  description: string | null;
  price: number | null;
  genres: string | null;
  tags: string | null;
  developer: string | null;
  releaseDate: Date | null;
  createdAt: Date;
}

export interface UserLibrary {
  id: number;
  userId: number;
  gameId: number;
  addedAt: Date;
}

export interface TrackedGame {
  id: number;
  userId: number;
  gameId: number;
  targetPrice: number;
  createdAt: Date;
}

export interface PriceHistory {
  id: number;
  gameId: number;
  price: number;
  discountPercent: number;
  recordedAt: Date;
}

// API types
export interface GameWithPriceHistory extends Game {
  priceHistory: PriceHistory[];
}

export interface UserLibraryWithGame extends UserLibrary {
  game: Game;
}

export interface TrackedGameWithDetails extends TrackedGame {
  game: Game;
  currentPrice: number | null;
}
