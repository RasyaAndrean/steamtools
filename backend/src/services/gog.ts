import { 
  fetchWithRetry, 
  getCache, 
  setCache, 
  normalizeGOGGame,
  type GOGGameResponse,
  PLATFORM_ENDPOINTS 
} from './platform.js';

const GOG_CACHE_TTL = 8 * 60 * 60 * 1000; // 8 hours

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface GOGSearchResponse {
  _embedded?: {
    items?: GOGGameResponse[];
  };
  _page?: {
    pageNumber: number;
    totalPages: number;
    totalElements: number;
  };
}

export interface GOGSearchParams {
  query?: string;
  page?: number;
  limit?: number;
}

export async function searchGOGGames(params: GOGSearchParams = {}): Promise<{
  games: GOGGameResponse[];
  total: number;
  hasMore: boolean;
}> {
  const { query, page = 1, limit = 50 } = params;

  const cacheKey = `gog:search:${JSON.stringify(params)}`;
  const cached = getCache<{ games: GOGGameResponse[]; total: number }>(cacheKey);
  if (cached) return { ...cached, hasMore: cached.games.length >= limit };

  try {
    const url = PLATFORM_ENDPOINTS.gog.products(page, query);
    const response = await fetchWithRetry<GOGSearchResponse>(
      url,
      {
        headers: {
          'Accept': 'application/json',
        },
      },
      3,
      1000
    );

    const games = response._embedded?.items || [];
    const total = response._page?.totalElements || games.length;

    const result = {
      games,
      total,
      hasMore: page < (response._page?.totalPages || 1),
    };

    setCache(cacheKey, { games, total }, GOG_CACHE_TTL);

    return result;
  } catch (error) {
    console.error('GOG API error:', error);
    return { games: [], total: 0, hasMore: false };
  }
}

export async function getGOGGameDetails(gameId: number): Promise<GOGGameResponse | null> {
  const cacheKey = `gog:product:${gameId}`;
  const cached = getCache<GOGGameResponse>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetchWithRetry<GOGGameResponse>(
      PLATFORM_ENDPOINTS.gog.product(gameId),
      {
        headers: {
          'Accept': 'application/json',
        },
      },
      3,
      1000
    );

    if (response) {
      setCache(cacheKey, response, GOG_CACHE_TTL);
      return response;
    }

    return null;
  } catch (error) {
    console.error('GOG API error:', error);
    return null;
  }
}

export async function getFeaturedGOGGames(): Promise<GOGGameResponse[]> {
  const cacheKey = 'gog:featured';
  const cached = getCache<GOGGameResponse[]>(cacheKey);
  if (cached) return cached;

  try {
    const result = await searchGOGGames({
      page: 1,
      limit: 20,
    });

    setCache(cacheKey, result.games, GOG_CACHE_TTL);
    return result.games;
  } catch (error) {
    console.error('GOG API error:', error);
    return [];
  }
}

export async function getGOGDeals(): Promise<GOGGameResponse[]> {
  const cacheKey = 'gog:deals';
  const cached = getCache<GOGGameResponse[]>(cacheKey);
  if (cached) return cached;

  try {
    // GOG API doesn't have a specific deals endpoint, so we fetch all and filter by discount
    const result = await searchGOGGames({
      page: 1,
      limit: 50,
    });

    // Filter games with discounts
    const deals = result.games.filter(game => 
      game.price?.discountPercent && game.price.discountPercent > 0
    );

    setCache(cacheKey, deals, 2 * 60 * 60 * 1000); // 2 hours for deals
    return deals;
  } catch (error) {
    console.error('GOG API error:', error);
    return [];
  }
}

export { normalizeGOGGame };
