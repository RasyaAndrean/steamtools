// Shared types between frontend and backend

export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: Date;
}

export type Platform = 'steam' | 'epic' | 'gog';

export interface Game {
  id: number;
  appId: number | null;
  name: string;
  description: string | null;
  price: number | null;
  genres: string | null;
  tags: string | null;
  developer: string | null;
  releaseDate: Date | null;
  coverImage: string | null;
  isMultiPlatform: boolean;
  platforms: Platform[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GamePlatform {
  id: number;
  gameId: number;
  platform: Platform;
  platformId: string;
  platformName: string | null;
  price: number | null;
  priceCurrency: string;
  discountPercent: number;
  url: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  metadata: Record<string, unknown> | null;
  lastCheckedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameWithPlatforms extends Game {
  platformsData: GamePlatform[];
}

export interface PlatformAvailability {
  platform: Platform;
  platformId: string;
  platformName: string | null;
  price: number | null;
  originalPrice: number | null;
  discountPercent: number;
  currency: string;
  url: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
}

export interface UserLibrary {
  id: number;
  userId: number;
  gameId: number;
  gamePlatformId: number | null;
  platform: Platform;
  addedAt: Date;
}

export interface TrackedGame {
  id: number;
  userId: number;
  gameId: number;
  gamePlatformId: number | null;
  platform: Platform;
  targetPrice: number;
  isActive: boolean;
  createdAt: Date;
}

export interface PriceHistory {
  id: number;
  gamePlatformId: number;
  gameId: number;
  platform: Platform;
  price: number;
  originalPrice: number | null;
  discountPercent: number;
  currency: string;
  recordedAt: Date;
}

export interface PlatformSyncLog {
  id: number;
  platform: Platform;
  syncType: 'full' | 'incremental' | 'manual';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt: Date | null;
  gamesProcessed: number;
  gamesAdded: number;
  gamesUpdated: number;
  errorMessage: string | null;
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
  gamePlatform: GamePlatform | null;
  currentPrice: number | null;
}

// Platform-specific API response types
export interface EpicGameResponse {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  price: {
    totalPrice: {
      discountPrice: number;
      originalPrice: number;
      currencyCode: string;
    };
  };
  keyImages: Array<{
    type: string;
    url: string;
  }>;
  categories: Array<{
    path: string;
    name: string;
  }>;
  releaseDate: string;
  publisher: string;
  developer: string;
  productSlug: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface GOGGameResponse {
  id: number;
  title: string;
  overview: string;
  description: string;
  images: {
    logo: string;
    logo2x: string;
    background: string;
    boxArtImage: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  price: {
    finalAmount: number;
    originalAmount: number;
    currency: string;
    discountPercent: number;
  };
  genre: string[];
  releaseDate: string;
  publisher: string;
  developer: string;
  isDRMFree: boolean;
  slug: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface SteamGameResponse {
  [appId: string]: {
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

// Search and filter types
export interface GameSearchParams {
  query?: string;
  platforms?: Platform[];
  genres?: string[];
  priceRange?: {
    min?: number;
    max?: number;
  };
  releaseDateRange?: {
    start?: Date;
    end?: Date;
  };
  excludePlatforms?: Platform[];
  limit?: number;
  offset?: number;
}

export interface GameSearchResult {
  games: GameWithPlatforms[];
  total: number;
  hasMore: boolean;
}

// Cache types
export interface PlatformCacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}
