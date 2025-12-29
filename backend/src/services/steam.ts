import type { SteamGameResponse } from './platform.js';
import { 
  fetchWithRetry, 
  getCache, 
  setCache, 
  normalizeSteamGame,
  PLATFORM_ENDPOINTS 
} from './platform.js';

const STEAM_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours - Steam data changes slowly

export interface SteamSearchParams {
  query?: string;
}

export async function searchSteamGames(params: SteamSearchParams = {}): Promise<{
  games: Array<{ appId: string; name: string }>;
  total: number;
}> {
  const { query } = params;

  const cacheKey = `steam:search:${query || 'all'}`;
  const cached = getCache<{ games: Array<{ appId: string; name: string }>; total: number }>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetchWithRetry<{ applist: { apps: Array<{ appid: number; name: string }> } }>(
      PLATFORM_ENDPOINTS.steam.api,
      {},
      3,
      1000
    );

    let games = response.applist?.apps || [];
    
    if (query) {
      const queryLower = query.toLowerCase();
      games = games.filter(game => 
        game.name.toLowerCase().includes(queryLower)
      );
    }

    const result = {
      games: games.map(g => ({ appId: String(g.appid), name: g.name })),
      total: games.length,
    };

    setCache(cacheKey, result, STEAM_CACHE_TTL);

    return result;
  } catch (error) {
    console.error('Steam API error:', error);
    return { games: [], total: 0 };
  }
}

export async function getSteamGameDetails(appId: string): Promise<{
  success: boolean;
  data?: {
    type: string;
    name: string;
    steam_appid: number;
    short_description: string;
    header_image: string;
    genres: Array<{ description: string }>;
    developers: string[];
    publishers: string[];
    release_date: { date: string };
    price_data?: {
      final: number;
      initial: number;
      discount_percent: number;
      currency: string;
    };
  };
} | null> {
  const cacheKey = `steam:details:${appId}`;
  const cached = getCache<ReturnType<typeof getSteamGameDetails>>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetchWithRetry<{
      [appId: string]: {
        success: boolean;
        data?: {
          type: string;
          name: string;
          steam_appid: number;
          short_description: string;
          header_image: string;
          genres: Array<{ description: string }>;
          developers: string[];
          publishers: string[];
          release_date: { date: string };
          price_data?: {
            final: number;
            initial: number;
            discount_percent: number;
            currency: string;
          };
        };
      };
    }>(
      PLATFORM_ENDPOINTS.steam.store(appId),
      {},
      3,
      1000
    );

    const result = response[appId];
    
    if (result) {
      setCache(cacheKey, result, STEAM_CACHE_TTL);
      return result;
    }

    return null;
  } catch (error) {
    console.error('Steam API error:', error);
    return null;
  }
}

export async function getFeaturedSteamGames(): Promise<Array<{
  appId: string;
  name: string;
  price?: number;
  discount?: number;
}>> {
  const cacheKey = 'steam:featured';
  const cached = getCache<Array<{ appId: string; name: string; price?: number; discount?: number }>>(cacheKey);
  if (cached) return cached;

  try {
    // Get a sample of popular games
    const { games } = await searchSteamGames({});
    
    // Take top 20 for featured (simplified - in production you'd use a different endpoint)
    const featured = games.slice(0, 20).map(g => ({
      appId: g.appId,
      name: g.name,
    }));

    setCache(cacheKey, featured, STEAM_CACHE_TTL);
    return featured;
  } catch (error) {
    console.error('Steam API error:', error);
    return [];
  }
}

export async function getSteamPrice(appId: string): Promise<{
  price: number | null;
  originalPrice: number | null;
  discountPercent: number;
  currency: string;
} | null> {
  try {
    const details = await getSteamGameDetails(appId);
    
    if (details?.data?.price_data) {
      const { final, initial, discount_percent, currency } = details.data.price_data;
      return {
        price: final / 100, // Convert from cents
        originalPrice: initial / 100,
        discountPercent: discount_percent,
        currency,
      };
    }

    return null;
  } catch (error) {
    console.error('Steam price lookup error:', error);
    return null;
  }
}

export { normalizeSteamGame };
