// Base cache implementation using in-memory storage
// In production, this should be replaced with Redis
const cache = new Map<string, { data: unknown; expiresAt: number }>();

const DEFAULT_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

export function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_CACHE_TTL): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidateCache(pattern: string): void {
  const regex = new RegExp(pattern);
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

export function clearCache(): void {
  cache.clear();
}

// API request with retry and exponential backoff
export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json() as Promise<T>;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError;
}

// Platform type
export type Platform = 'steam' | 'epic' | 'gog';

// Normalize game data to unified format
export interface NormalizedGame {
  name: string;
  description: string;
  coverImage: string | null;
  genres: string[];
  developer: string | null;
  releaseDate: Date | null;
  platformData: {
    platform: Platform;
    platformId: string;
    price: number | null;
    originalPrice: number | null;
    discountPercent: number;
    currency: string;
    url: string | null;
    imageUrl: string | null;
    isAvailable: boolean;
    metadata: Record<string, unknown>;
  };
}

// Epic Games response types
interface EpicPriceData {
  totalPrice: {
    discountPrice: number;
    originalPrice: number;
    currencyCode: string;
  };
}

interface EpicKeyImage {
  type: string;
  url: string;
}

interface EpicCategory {
  path: string;
  name: string;
}

export interface EpicGameResponse {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  productSlug: string;
  keyImages: EpicKeyImage[];
  price?: {
    totalPrice: EpicPriceData['totalPrice'];
  };
  categories: EpicCategory[];
  releaseDate: string;
  publisher: string;
  developer: string;
}

// GOG response types
interface GOGPriceData {
  finalAmount: number;
  originalAmount: number;
  currency: string;
  discountPercent: number;
}

interface GOGImages {
  logo: string;
  logo2x: string;
  background: string;
  boxArtImage: string;
}

export interface GOGGameResponse {
  id: number;
  title: string;
  overview: string;
  description: string;
  images: GOGImages;
  price?: {
    finalAmount: GOGPriceData['finalAmount'];
    originalAmount: GOGPriceData['originalAmount'];
    currency: GOGPriceData['currency'];
    discountPercent: GOGPriceData['discountPercent'];
  };
  genre: string[];
  releaseDate: string;
  publisher: string;
  developer: string;
  isDRMFree: boolean;
  slug: string;
}

// Steam response types
export interface SteamGameResponse {
  [appId: string]: {
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

export function normalizeEpicGame(game: EpicGameResponse): NormalizedGame {
  const coverImage = game.keyImages?.find((img: EpicKeyImage) => img.type === 'Thumbnail')?.url 
    || game.keyImages?.find((img: EpicKeyImage) => img.type === 'DieselGameBox')?.url 
    || game.keyImages?.[0]?.url 
    || null;
    
  return {
    name: game.title,
    description: game.shortDescription || game.description || '',
    coverImage,
    genres: game.categories?.map((c: EpicCategory) => c.name) || [],
    developer: game.developer || null,
    releaseDate: game.releaseDate ? new Date(game.releaseDate) : null,
    platformData: {
      platform: 'epic',
      platformId: game.id,
      price: game.price?.totalPrice?.discountPrice || null,
      originalPrice: game.price?.totalPrice?.originalPrice || null,
      discountPercent: game.price?.totalPrice?.originalPrice && game.price?.totalPrice?.discountPrice
        ? Math.round(((game.price.totalPrice.originalPrice - game.price.totalPrice.discountPrice) / game.price.totalPrice.originalPrice) * 100)
        : 0,
      currency: game.price?.totalPrice?.currencyCode || 'USD',
      url: game.productSlug ? `https://www.epicgames.com/store/en-US/p/${game.productSlug}` : null,
      imageUrl: coverImage,
      isAvailable: true,
      metadata: {
        publisher: game.publisher,
        productSlug: game.productSlug,
      },
    },
  };
}

export function normalizeGOGGame(game: GOGGameResponse): NormalizedGame {
  const coverImage = game.images?.logo || game.images?.boxArtImage || null;
  
  return {
    name: game.title,
    description: game.overview || game.description || '',
    coverImage,
    genres: game.genre || [],
    developer: game.developer || null,
    releaseDate: game.releaseDate ? new Date(game.releaseDate) : null,
    platformData: {
      platform: 'gog',
      platformId: String(game.id),
      price: game.price?.finalAmount || null,
      originalPrice: game.price?.originalAmount || null,
      discountPercent: game.price?.discountPercent || 0,
      currency: game.price?.currency || 'USD',
      url: game.slug ? `https://www.gog.com/game/${game.slug}` : null,
      imageUrl: coverImage,
      isAvailable: true,
      metadata: {
        publisher: game.publisher,
        isDRMFree: game.isDRMFree,
        slug: game.slug,
      },
    },
  };
}

export function normalizeSteamGame(appId: string, game: SteamGameResponse[string]): NormalizedGame {
  return {
    name: game.name,
    description: '',
    coverImage: null,
    genres: [],
    developer: null,
    releaseDate: null,
    platformData: {
      platform: 'steam',
      platformId: appId,
      price: null,
      originalPrice: null,
      discountPercent: 0,
      currency: 'USD',
      url: `https://store.steampowered.com/app/${appId}`,
      imageUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg`,
      isAvailable: true,
      metadata: {},
    },
  };
}

// Platform API endpoints
export const PLATFORM_ENDPOINTS = {
  epic: {
    catalog: 'https://store.epicgames.com/graphql',
    product: (productSlug: string) => `https://store.epicgames.com/api/patch/v1/product/${productSlug}/offers`,
  },
  gog: {
    products: (page: number, searchTerm?: string) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
        ...(searchTerm && { search: searchTerm }),
      });
      return `https://api.gog.com/v2/catalog?${params.toString()}`;
    },
    product: (gameId: number) => `https://api.gog.com/v2/games/${gameId}`,
  },
  steam: {
    api: 'https://api.steampowered.com/ISteamApps/GetAppList/v2/',
    store: (appId: string) => `https://store.steampowered.com/api/appdetails?appids=${appId}`,
  },
};
