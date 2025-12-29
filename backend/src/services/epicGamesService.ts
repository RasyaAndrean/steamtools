import { PlatformApi, PlatformGame, PlatformSyncResult } from './platformApi.js';
import { db } from '../db/index.js';
import { games, gamePlatforms } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import type { Available, DrmFree } from '../db/schema.js';

interface EpicCatalogResponse {
  data: {
    Catalog: {
      searchStore: {
        elements: EpicGame[];
        paging: {
          total: number;
        };
      };
    };
  };
}

interface EpicGame {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  keyImages: Array<{
    type: string;
    url: string;
  }>;
  categories: Array<{
    path: string;
  }>;
  tags: Array<{
    name: string;
  }>;
  seller: {
    name: string;
  };
  price: {
    totalPrice: {
      fmtPrice: {
        originalPrice: string;
        discountPrice: string;
        discountTag: string;
      };
      originalPrice: number;
      discountPrice: number;
      discount: number;
    };
  };
  urlSlug: string;
  productSlug?: string;
  releaseDate?: string;
}

export class EpicGamesService extends PlatformApi {
  private baseUrl = 'https://store.epicgames.com/graphql';
  private apiUrl = 'https://store.epicgames.com/graphql';

  constructor() {
    super('epic', 12, 1000); // 12 hour cache, 1s rate limit
  }

  async searchGames(query: string, filters?: any): Promise<PlatformGame[]> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SteamTools/2.0'
        },
        body: JSON.stringify({
          query: `
            query searchStoreQuery($allowCountries: String!, $category: String!, $count: Int!, $country: String!, $keywords: String!, $locale: String!, $namespace: String!, $sortBy: String!, $sortDir: String!, $start: Int!, $tag: String!) {
              Catalog {
                searchStore(allowCountries: $allowCountries, category: $category, count: $count, country: $country, keywords: $keywords, locale: $locale, namespace: $namespace, sortBy: $sortBy, sortDir: $sortDir, start: $start, tag: $tag) {
                  elements {
                    id
                    title
                    description
                    longDescription
                    keyImages {
                      type
                      url
                    }
                    categories {
                      path
                    }
                    tags {
                      name
                    }
                    seller {
                      name
                    }
                    price {
                      totalPrice {
                        fmtPrice {
                          originalPrice
                          discountPrice
                          discountTag
                        }
                        originalPrice
                        discountPrice
                        discount
                      }
                    }
                    urlSlug
                    productSlug
                    releaseDate
                  }
                  paging {
                    total
                  }
                }
              }
            }
          `,
          variables: {
            allowCountries: 'US',
            category: 'games',
            count: 50,
            country: 'US',
            keywords: query,
            locale: 'en-US',
            namespace: '',
            sortBy: 'relevance',
            sortDir: 'DESC',
            start: 0,
            tag: ''
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Epic API error: ${response.status}`);
      }

      const data: EpicCatalogResponse = await response.json();
      const games = data.data?.Catalog?.searchStore?.elements || [];

      return games.map(game => this.transformEpicGame(game));
    } catch (error) {
      console.error('Epic Games search error:', error);
      throw new Error(`Failed to search Epic Games: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getGameDetails(platformId: string): Promise<PlatformGame | null> {
    try {
      const response = await fetch('https://store.epicgames.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SteamTools/2.0'
        },
        body: JSON.stringify({
          query: `
            query productQuery($locale: String!, $slug: String!) {
              Product {
                product(locale: $locale, slug: $slug) {
                  id
                  title
                  description
                  longDescription
                  keyImages {
                    type
                    url
                  }
                  categories {
                    path
                  }
                  tags {
                    name
                  }
                  seller {
                    name
                  }
                  price {
                    totalPrice {
                      fmtPrice {
                        originalPrice
                        discountPrice
                        discountTag
                      }
                      originalPrice
                      discountPrice
                      discount
                    }
                  }
                  urlSlug
                  releaseDate
                }
              }
            }
          `,
          variables: {
            locale: 'en-US',
            slug: platformId
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Epic API error: ${response.status}`);
      }

      const data = await response.json();
      const game = data.data?.Product?.product;

      if (!game) {
        return null;
      }

      return this.transformEpicGame(game);
    } catch (error) {
      console.error('Epic Games details error:', error);
      throw new Error(`Failed to get Epic game details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async syncGames(options: { force?: boolean } = {}): Promise<PlatformSyncResult> {
    if (!options.force && !(await this.shouldSync())) {
      return {
        success: true,
        gamesSynced: 0,
        errors: ['Sync skipped - not due yet'],
        durationMs: 0,
      };
    }

    const startTime = Date.now();
    const errors: string[] = [];
    let gamesSynced = 0;

    try {
      // Batch sync popular games or games from user's tracked list
      // For now, we'll sync games that are on sale
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SteamTools/2.0'
        },
        body: JSON.stringify({
          query: `
            query searchStoreQuery($allowCountries: String!, $category: String!, $count: Int!, $country: String!, $locale: String!, $namespace: String!, $sortBy: String!, $sortDir: String!, $start: Int!, $tag: String!) {
              Catalog {
                searchStore(allowCountries: $allowCountries, category: $category, count: $count, country: $country, keywords: "", locale: $locale, namespace: $namespace, sortBy: $sortBy, sortDir: $sortDir, start: $start, tag: $tag) {
                  elements {
                    id
                    title
                    description
                    longDescription
                    keyImages {
                      type
                      url
                    }
                    categories {
                      path
                    }
                    tags {
                      name
                    }
                    seller {
                      name
                    }
                    price {
                      totalPrice {
                        fmtPrice {
                          originalPrice
                          discountPrice
                          discountTag
                        }
                        originalPrice
                        discountPrice
                        discount
                      }
                    }
                    urlSlug
                    productSlug
                    releaseDate
                  }
                  paging {
                    total
                  }
                }
              }
            }
          `,
          variables: {
            allowCountries: 'US',
            category: 'games',
            count: 100,
            country: 'US',
            locale: 'en-US',
            namespace: '',
            sortBy: 'effectiveDate',
            sortDir: 'DESC',
            start: 0,
            tag: ''
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Epic sync error: ${response.status}`);
      }

      const data: EpicCatalogResponse = await response.json();
      const epicGames = data.data?.Catalog?.searchStore?.elements || [];

      for (const epicGame of epicGames) {
        try {
          await this.syncEpicGame(epicGame);
          gamesSynced++;
          await this.delay(this.rateLimitDelay);
        } catch (error) {
          const errorMsg = `Failed to sync Epic game ${epicGame.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      await this.logSync(
        'full',
        errors.length > 0 ? (errors.length > 5 ? 'failed' : 'partial') : 'success',
        gamesSynced,
        errors
      );

      return {
        success: errors.length === 0 || errors.length <= 5,
        gamesSynced,
        errors,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMsg = `Epic sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);

      await this.logSync('full', 'failed', 0, errors);

      return {
        success: false,
        gamesSynced: 0,
        errors,
        durationMs: Date.now() - startTime,
      };
    }
  }

  private async syncEpicGame(epicGame: EpicGame): Promise<void> {
    const platformGame = this.transformEpicGame(epicGame);

    // Check if game already exists
    const [existingGame] = await db
      .select()
      .from(games)
      .where(eq(games.name, platformGame.name))
      .limit(1);

    let gameId: number;
    if (existingGame) {
      gameId = existingGame.id;
      // Update game info if needed
      await db
        .update(games)
        .set({
          description: platformGame.description || existingGame.description,
          shortDescription: platformGame.shortDescription || existingGame.shortDescription,
          imageUrl: platformGame.imageUrl || existingGame.imageUrl,
          genres: platformGame.genres || existingGame.genres,
          tags: platformGame.tags || existingGame.tags,
          developer: platformGame.developer || existingGame.developer,
          publisher: platformGame.publisher || existingGame.publisher,
          releaseDate: platformGame.releaseDate || existingGame.releaseDate,
          metacriticScore: platformGame.metacriticScore || existingGame.metacriticScore,
          updatedAt: new Date(),
        })
        .where(eq(games.id, gameId));
    } else {
      // Create new game and get inserted ID
      const result = await db.insert(games).values({
        name: platformGame.name,
        description: platformGame.description,
        shortDescription: platformGame.shortDescription,
        imageUrl: platformGame.imageUrl,
        genres: platformGame.genres,
        tags: platformGame.tags,
        developer: platformGame.developer,
        publisher: platformGame.publisher,
        releaseDate: platformGame.releaseDate,
        metacriticScore: platformGame.metacriticScore,
      });
      
      // Get the last inserted ID (this works for MySQL)
      const [rows] = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
      gameId = rows[0].id;
    }

    // Check if platform entry exists
    const [existingPlatform] = await db
      .select()
      .from(gamePlatforms)
      .where(
        eq(gamePlatforms.platformId, platformGame.platformId)
      )
      .limit(1);

    if (existingPlatform) {
      // Update platform info
      await db
        .update(gamePlatforms)
        .set({
          platformPrice: platformGame.platformPrice,
          originalPrice: platformGame.originalPrice,
          discountPercent: platformGame.discountPercent,
          currency: platformGame.currency,
          lastSyncDate: new Date(),
          available: platformGame.available,
          updatedAt: new Date(),
        })
        .where(eq(gamePlatforms.id, existingPlatform.id));
    } else {
      // Create new platform entry
      await db.insert(gamePlatforms).values({
        gameId: gameId,
        platform: 'epic',
        platformId: platformGame.platformId,
        platformUrl: platformGame.platformUrl,
        platformPrice: platformGame.platformPrice,
        originalPrice: platformGame.originalPrice,
        discountPercent: platformGame.discountPercent,
        currency: platformGame.currency,
        lastSyncDate: new Date(),
        available: platformGame.available,
        drmFree: 'false', // Epic doesn't typically offer DRM-free
      });
    }
  }

  private transformEpicGame(epicGame: EpicGame): PlatformGame {
    const image = epicGame.keyImages?.find(img => 
      img.type === 'DieselStoreFrontWide' || img.type === 'DieselStoreFrontTall'
    );

    const price = epicGame.price?.totalPrice?.originalPrice || 0;
    const discountPrice = epicGame.price?.totalPrice?.discountPrice || price;
    const discount = epicGame.price?.totalPrice?.discount || 0;

    const categories = epicGame.categories?.map(cat => cat.path) || [];
    const tags = epicGame.tags?.map(tag => tag.name) || [];

    return {
      platformId: epicGame.id,
      name: epicGame.title,
      description: epicGame.longDescription || epicGame.description,
      shortDescription: epicGame.description,
      imageUrl: image?.url,
      genres: categories.join(','),
      tags: tags.join(','),
      developer: epicGame.seller?.name,
      publisher: epicGame.seller?.name,
      releaseDate: epicGame.releaseDate ? new Date(epicGame.releaseDate) : null,
      metacriticScore: null, // Epic doesn't provide Metacritic scores
      platformPrice: discountPrice / 100, // Convert cents to dollars
      originalPrice: price / 100,
      discountPercent: Math.round(discount),
      currency: 'USD',
      platformUrl: `https://store.epicgames.com/p/${epicGame.productSlug || epicGame.urlSlug}`,
      available: 'true',
      drmFree: 'false',
    };
  }
}