import { 
  fetchWithRetry, 
  getCache, 
  setCache, 
  normalizeEpicGame,
  type EpicGameResponse,
  PLATFORM_ENDPOINTS 
} from './platform.js';

const EPIC_CACHE_TTL = 8 * 60 * 60 * 1000; // 8 hours

// Epic Games Store GraphQL query for catalog
const EPIC_CATALOG_QUERY = `
  query EpicCatalog($allowCountries: String, $category: String, $count: Int, $countryCode: String!, $keywords: String, $locale: String!, $offset: Int, $sortBy: String, $sortDir: String, $start: Int, $withPrice: Boolean) {
    Catalog {
      searchStore(
        allowCountries: $allowCountries
        category: $category
        count: $count
        countryCode: $countryCode
        keywords: $keywords
        locale: $locale
        offset: $offset
        sortBy: $sortBy
        sortDir: $sortDir
        start: $start
        withPrice: $withPrice
      ) {
        elements {
          ... on Product {
            __typename
            id
            title
            description
            shortDescription
            productSlug
            keyImages {
              type
              url
            }
            price {
              totalPrice {
                discountPrice
                originalPrice
                currencyCode
              }
              ... on RetailPrice {
                totalPrice {
                  discountPrice
                  originalPrice
                  currencyCode
                }
              }
            }
            categories {
              path
              name
            }
            releaseDate
            publisher
            developer
          }
        }
        paging {
          total
          count
          offset
        }
      }
    }
  }
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface EpicSearchResponse {
  data?: {
    Catalog?: {
      searchStore?: {
        elements: EpicGameResponse[];
        paging: {
          total: number;
          count: number;
          offset: number;
        };
      };
    };
  };
}

export interface EpicSearchParams {
  query?: string;
  category?: string; // e.g., 'games/edition/base' for base games
  offset?: number;
  count?: number;
  sortBy?: 'relevancy' | 'popularity' | 'releaseDate' | 'title' | 'price';
  sortDir?: 'ASC' | 'DESC';
}

export async function searchEpicGames(params: EpicSearchParams = {}): Promise<{
  games: EpicGameResponse[];
  total: number;
  hasMore: boolean;
}> {
  const {
    query,
    category,
    offset = 0,
    count = 50,
    sortBy = 'relevancy',
    sortDir = 'DESC',
  } = params;

  const cacheKey = `epic:search:${JSON.stringify(params)}`;
  const cached = getCache<{ games: EpicGameResponse[]; total: number }>(cacheKey);
  if (cached) return { ...cached, hasMore: cached.games.length >= count };

  try {
    const response = await fetchWithRetry<EpicSearchResponse>(
      PLATFORM_ENDPOINTS.epic.catalog,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: EPIC_CATALOG_QUERY,
          variables: {
            allowCountries: 'US',
            category: category || 'games',
            count,
            countryCode: 'US',
            keywords: query,
            locale: 'en-US',
            offset,
            sortBy,
            sortDir,
            start: offset,
            withPrice: true,
          },
        }),
      },
      3,
      1000
    );

    const elements = response.data?.Catalog?.searchStore?.elements || [];
    const total = response.data?.Catalog?.searchStore?.paging?.total || elements.length;

    const result = {
      games: elements,
      total,
      hasMore: elements.length >= count,
    };

    setCache(cacheKey, { games: elements, total }, EPIC_CACHE_TTL);

    return result;
  } catch (error) {
    console.error('Epic Games API error:', error);
    return { games: [], total: 0, hasMore: false };
  }
}

export async function getEpicGameDetails(productSlug: string): Promise<EpicGameResponse | null> {
  const cacheKey = `epic:product:${productSlug}`;
  const cached = getCache<EpicGameResponse>(cacheKey);
  if (cached) return cached;

  try {
    // Epic uses GraphQL for product details too
    const response = await fetchWithRetry<EpicGameResponse>(
      PLATFORM_ENDPOINTS.epic.catalog,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: EPIC_CATALOG_QUERY,
          variables: {
            allowCountries: 'US',
            countryCode: 'US',
            keywords: productSlug,
            locale: 'en-US',
            withPrice: true,
          },
        }),
      },
      3,
      1000
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const game = (response as any).data?.Catalog?.searchStore?.elements?.[0];
    
    if (game) {
      setCache(cacheKey, game, EPIC_CACHE_TTL);
      return game;
    }
    
    return null;
  } catch (error) {
    console.error('Epic Games API error:', error);
    return null;
  }
}

export async function getFeaturedEpicGames(): Promise<EpicGameResponse[]> {
  const cacheKey = 'epic:featured';
  const cached = getCache<EpicGameResponse[]>(cacheKey);
  if (cached) return cached;

  try {
    // Fetch games on sale or featured
    const result = await searchEpicGames({
      category: 'games/edition/base',
      count: 20,
      sortBy: 'popularity',
    });

    setCache(cacheKey, result.games, EPIC_CACHE_TTL);
    return result.games;
  } catch (error) {
    console.error('Epic Games API error:', error);
    return [];
  }
}

export { normalizeEpicGame };
