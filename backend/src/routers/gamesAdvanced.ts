import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { games, gamePlatforms, priceHistory, gameComparisonCache, popularSearches } from '../db/schema.js';
import { eq, desc, sql, and, or, gt, lt, gte, lte, inArray, isNotNull, isNull } from 'drizzle-orm';
import type { Platform } from '../db/schema.js';

// Cache TTL in milliseconds (6 hours)
const CACHE_TTL = 6 * 60 * 60 * 1000;

export const gamesAdvancedRouter = router({
  advancedSearch: publicProcedure
    .input(z.object({
      query: z.string().min(1).max(500),
      filters: z.object({
        platforms: z.array(z.enum(['steam', 'epic', 'gog'])).optional(),
        priceRange: z.object({
          min: z.number().optional(),
          max: z.number().optional(),
        }).optional(),
        genres: z.array(z.string()).optional(),
        releaseDate: z.object({
          from: z.date().optional(),
          to: z.date().optional(),
        }).optional(),
        onSale: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
      }).optional(),
      sort: z.enum(['relevance', 'price_low_to_high', 'price_high_to_low', 'release_date', 'discount']).optional().default('relevance'),
      pagination: z.object({
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(1).max(100).optional().default(20),
      }).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const startTime = Date.now();
      const offset = ((input.pagination?.page || 1) - 1) * (input.pagination?.limit || 20);
      const limit = input.pagination?.limit || 20;

      // Track popular search
      trackPopularSearch(ctx, input.query);

      // Build the base query
      let dbQuery = ctx.db
        .select({
          game: games,
          platform: gamePlatforms,
        })
        .from(games)
        .leftJoin(gamePlatforms, eq(games.id, gamePlatforms.gameId));

      // Apply full-text search or LIKE search
      const searchTerm = `%${input.query}%`;
      dbQuery = dbQuery.where(
        or(
          sql`MATCH(${games.name}, ${games.description}) AGAINST(${input.query} IN NATURAL LANGUAGE MODE)`,
          sql`${games.name} LIKE ${searchTerm}`,
          sql`${games.description} LIKE ${searchTerm}`,
          sql`${games.developer} LIKE ${searchTerm}`
        )
      );

      // Apply filters
      if (input.filters) {
        const conditions = [];

        // Platform filter
        if (input.filters.platforms && input.filters.platforms.length > 0) {
          conditions.push(
            inArray(gamePlatforms.platform, input.filters.platforms as Platform[])
          );
        }

        // Price range filter
        if (input.filters.priceRange) {
          if (input.filters.priceRange.min !== undefined) {
            conditions.push(
              gte(gamePlatforms.platformPrice, input.filters.priceRange.min)
            );
          }
          if (input.filters.priceRange.max !== undefined) {
            conditions.push(
              lte(gamePlatforms.platformPrice, input.filters.priceRange.max)
            );
          }
        }

        // Genre filter
        if (input.filters.genres && input.filters.genres.length > 0) {
          const genreConditions = input.filters.genres.map(genre =>
            sql`${games.genres} LIKE ${'%' + genre + '%'}`
          );
          conditions.push(or(...genreConditions));
        }

        // Release date filter
        if (input.filters.releaseDate) {
          if (input.filters.releaseDate.from) {
            conditions.push(
              gte(games.releaseDate, input.filters.releaseDate.from)
            );
          }
          if (input.filters.releaseDate.to) {
            conditions.push(
              lte(games.releaseDate, input.filters.releaseDate.to)
            );
          }
        }

        // On sale filter
        if (input.filters.onSale) {
          conditions.push(gt(gamePlatforms.discountPercent, 0));
        }

        // Tags filter
        if (input.filters.tags && input.filters.tags.length > 0) {
          const tagConditions = input.filters.tags.map(tag =>
            sql`${games.tags} LIKE ${'%' + tag + '%'}`
          );
          conditions.push(or(...tagConditions));
        }

        if (conditions.length > 0) {
          dbQuery = dbQuery.where(and(...conditions));
        }
      }

      // Apply sorting
      switch (input.sort) {
        case 'price_low_to_high':
          dbQuery = dbQuery.orderBy(gamePlatforms.platformPrice);
          break;
        case 'price_high_to_low':
          dbQuery = dbQuery.orderBy(desc(gamePlatforms.platformPrice));
          break;
        case 'release_date':
          dbQuery = dbQuery.orderBy(desc(games.releaseDate));
          break;
        case 'discount':
          dbQuery = dbQuery.orderBy(desc(gamePlatforms.discountPercent));
          break;
        case 'relevance':
        default:
          // For relevance, we prioritize exact name matches first
          dbQuery = dbQuery.orderBy(
            sql`CASE WHEN ${games.name} LIKE ${input.query} THEN 0 ELSE 1 END`
          );
          break;
      }

      // Apply pagination
      dbQuery = dbQuery.limit(limit).offset(offset);

      const results = await dbQuery;

      // Group by game and aggregate platform info
      const gameMap = new Map<number, any>();
      for (const result of results) {
        if (!gameMap.has(result.game.id)) {
          gameMap.set(result.game.id, {
            ...result.game,
            platforms: [],
            lowestPrice: null,
            highestPrice: null,
            platformCount: 0,
          });
        }
        
        if (result.platform) {
          const gameData = gameMap.get(result.game.id);
          const price = result.platform.platformPrice ? Number(result.platform.platformPrice) : null;
          
          gameData.platforms.push({
            platform: result.platform.platform,
            price: price,
            originalPrice: result.platform.originalPrice ? Number(result.platform.originalPrice) : null,
            discountPercent: result.platform.discountPercent,
            url: result.platform.platformUrl,
            available: result.platform.available,
            drmFree: result.platform.drmFree,
          });
          gameData.platformCount++;

          if (price !== null) {
            if (gameData.lowestPrice === null || price < gameData.lowestPrice) {
              gameData.lowestPrice = price;
            }
            if (gameData.highestPrice === null || price > gameData.highestPrice) {
              gameData.highestPrice = price;
            }
          }
        }
      }

      const responseTime = Date.now() - startTime;
      
      return {
        results: Array.from(gameMap.values()),
        pagination: {
          page: input.pagination?.page || 1,
          limit,
          total: gameMap.size,
        },
        performance: {
          responseTime,
        },
      };
    }),

  priceComparison: publicProcedure
    .input(z.object({
      gameId: z.number().optional(),
      gameName: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      let gameId = input.gameId;

      // If gameName is provided, find the gameId
      if (input.gameName && !gameId) {
        const game = await ctx.db
          .select({ id: games.id })
          .from(games)
          .where(eq(games.name, input.gameName))
          .limit(1);
        
        if (game[0]) {
          gameId = game[0].id;
        }
      }

      if (!gameId) {
        throw new Error('Game not found');
      }

      // Check cache
      const cached = await ctx.db
        .select()
        .from(gameComparisonCache)
        .where(eq(gameComparisonCache.gameId, gameId))
        .limit(1);

      const now = new Date();
      if (cached[0]) {
        const cacheAge = now.getTime() - cached[0].lastUpdated.getTime();
        if (cacheAge < CACHE_TTL) {
          return cached[0].comparisonData as any;
        }
      }

      // Get all platforms for this game
      const platforms = await ctx.db
        .select()
        .from(gamePlatforms)
        .where(eq(gamePlatforms.gameId, gameId));

      // Build comparison data
      const comparison: any = {
        gameId,
        steam: null,
        epic: null,
        gog: null,
        cheapestOption: null,
        bestDeal: null,
      };

      let lowestPrice = Infinity;
      let cheapestPlatform: Platform | null = null;

      for (const platform of platforms) {
        const price = platform.platformPrice ? Number(platform.platformPrice) : null;
        const platformData: any = {
          price,
          discountPercent: platform.discountPercent,
          url: platform.platformUrl,
          available: platform.available,
          currency: platform.currency,
        };

        if (platform.platform === 'gog') {
          platformData.drmFree = platform.drmFree;
        }

        comparison[platform.platform as Platform] = platformData;

        if (price !== null && price < lowestPrice) {
          lowestPrice = price;
          cheapestPlatform = platform.platform as Platform;
        }
      }

      // Determine cheapest option
      if (cheapestPlatform) {
        comparison.cheapestOption = {
          platform: cheapestPlatform,
          price: lowestPrice,
        };

        // Calculate savings vs other platforms
        const savings: any = {};
        for (const [platformName, platformData] of Object.entries(comparison)) {
          if (['steam', 'epic', 'gog'].includes(platformName) && platformName !== cheapestPlatform) {
            const data = platformData as any;
            if (data.price !== null && data.price > lowestPrice) {
              savings[platformName] = data.price - lowestPrice;
            }
          }
        }
        comparison.cheapestOption.savings = savings;
      }

      // Determine best deal (considering discount percentage)
      let bestDiscount = 0;
      let bestDealPlatform: Platform | null = null;
      for (const [platformName, platformData] of Object.entries(comparison)) {
        if (['steam', 'epic', 'gog'].includes(platformName)) {
          const data = platformData as any;
          if (data.discountPercent > bestDiscount && data.available === 'true') {
            bestDiscount = data.discountPercent;
            bestDealPlatform = platformName as Platform;
          }
        }
      }

      if (bestDealPlatform) {
        comparison.bestDeal = {
          platform: bestDealPlatform,
          discountPercent: bestDiscount,
          price: comparison[bestDealPlatform].price,
          originalPrice: comparison[bestDealPlatform].originalPrice,
        };
      }

      // Update cache
      if (cached[0]) {
        await ctx.db
          .update(gameComparisonCache)
          .set({ comparisonData: comparison as any, lastUpdated: now })
          .where(eq(gameComparisonCache.id, cached[0].id));
      } else {
        await ctx.db.insert(gameComparisonCache).values({
          gameId,
          comparisonData: comparison as any,
          lastUpdated: now,
        });
      }

      return comparison;
    }),

  whereToBuy: publicProcedure
    .input(z.object({
      gameId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const comparison = await ctx.db
        .select()
        .from(gameComparisonCache)
        .where(eq(gameComparisonCache.gameId, input.gameId))
        .limit(1);

      const comparisonData = comparison[0]?.comparisonData as any;
      
      if (!comparisonData) {
        throw new Error('Comparison data not found. Please run price comparison first.');
      }

      const recommendations: any[] = [];

      // Cheapest option recommendation
      if (comparisonData.cheapestOption) {
        recommendations.push({
          type: 'cheapest',
          platform: comparisonData.cheapestOption.platform,
          price: comparisonData.cheapestOption.price,
          reason: `Best price available at $${comparisonData.cheapestOption.price.toFixed(2)}`,
          priority: 1,
        });
      }

      // Best deal recommendation
      if (comparisonData.bestDeal && comparisonData.bestDeal.discountPercent > 0) {
        recommendations.push({
          type: 'best_deal',
          platform: comparisonData.bestDeal.platform,
          price: comparisonData.bestDeal.price,
          discountPercent: comparisonData.bestDeal.discountPercent,
          reason: `${comparisonData.bestDeal.discountPercent}% off - Save $${(comparisonData.bestDeal.originalPrice - comparisonData.bestDeal.price).toFixed(2)}`,
          priority: comparisonData.bestDeal.discountPercent >= 50 ? 2 : 3,
        });
      }

      // DRM-free recommendation (GOG)
      if (comparisonData.gog && comparisonData.gog.drmFree === 'true') {
        recommendations.push({
          type: 'drm_free',
          platform: 'gog',
          price: comparisonData.gog.price,
          reason: 'DRM-free copy - Play without online restrictions',
          priority: 4,
        });
      }

      // Sort by priority and return top recommendation
      recommendations.sort((a, b) => a.priority - b.priority);

      return {
        recommendation: recommendations[0] || null,
        alternatives: recommendations.slice(1),
        allOptions: {
          steam: comparisonData.steam,
          epic: comparisonData.epic,
          gog: comparisonData.gog,
        },
      };
    }),

  searchByGenre: publicProcedure
    .input(z.object({
      genre: z.string().min(1),
      filters: z.object({
        platforms: z.array(z.enum(['steam', 'epic', 'gog'])).optional(),
        priceRange: z.object({
          min: z.number().optional(),
          max: z.number().optional(),
        }).optional(),
        sort: z.enum(['relevance', 'price_low_to_high', 'price_high_to_low', 'release_date']).optional().default('relevance'),
      }).optional(),
      pagination: z.object({
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(1).max(100).optional().default(20),
      }).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const offset = ((input.pagination?.page || 1) - 1) * (input.pagination?.limit || 20);
      const limit = input.pagination?.limit || 20;

      let dbQuery = ctx.db
        .select({
          game: games,
          platform: gamePlatforms,
        })
        .from(games)
        .leftJoin(gamePlatforms, eq(games.id, gamePlatforms.gameId))
        .where(
          sql`${games.genres} LIKE ${'%' + input.genre + '%'}`
        );

      // Apply filters
      if (input.filters) {
        const conditions = [];

        if (input.filters.platforms && input.filters.platforms.length > 0) {
          conditions.push(
            inArray(gamePlatforms.platform, input.filters.platforms as Platform[])
          );
        }

        if (input.filters.priceRange) {
          if (input.filters.priceRange.min !== undefined) {
            conditions.push(
              gte(gamePlatforms.platformPrice, input.filters.priceRange.min)
            );
          }
          if (input.filters.priceRange.max !== undefined) {
            conditions.push(
              lte(gamePlatforms.platformPrice, input.filters.priceRange.max)
            );
          }
        }

        if (conditions.length > 0) {
          dbQuery = dbQuery.where(and(...conditions));
        }
      }

      // Apply sorting
      switch (input.filters?.sort) {
        case 'price_low_to_high':
          dbQuery = dbQuery.orderBy(gamePlatforms.platformPrice);
          break;
        case 'price_high_to_low':
          dbQuery = dbQuery.orderBy(desc(gamePlatforms.platformPrice));
          break;
        case 'release_date':
          dbQuery = dbQuery.orderBy(desc(games.releaseDate));
          break;
        default:
          dbQuery = dbQuery.orderBy(games.name);
      }

      dbQuery = dbQuery.limit(limit).offset(offset);

      const results = await dbQuery;

      // Group by game
      const gameMap = new Map<number, any>();
      for (const result of results) {
        if (!gameMap.has(result.game.id)) {
          gameMap.set(result.game.id, {
            ...result.game,
            platforms: [],
          });
        }
        
        if (result.platform) {
          const gameData = gameMap.get(result.game.id);
          gameData.platforms.push({
            platform: result.platform.platform,
            price: result.platform.platformPrice ? Number(result.platform.platformPrice) : null,
            discountPercent: result.platform.discountPercent,
            url: result.platform.platformUrl,
            available: result.platform.available,
          });
        }
      }

      return {
        genre: input.genre,
        results: Array.from(gameMap.values()),
        pagination: {
          page: input.pagination?.page || 1,
          limit,
          total: gameMap.size,
        },
      };
    }),

  getTrending: publicProcedure
    .input(z.object({
      timeframe: z.enum(['week', 'month']).optional().default('week'),
      platforms: z.array(z.enum(['steam', 'epic', 'gog'])).optional(),
      limit: z.number().min(1).max(50).optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      // Calculate date threshold
      const now = new Date();
      const days = input.timeframe === 'week' ? 7 : 30;
      const threshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // Get trending searches
      let searchQuery = ctx.db
        .select()
        .from(popularSearches)
        .where(gte(popularSearches.lastSearched, threshold))
        .orderBy(desc(popularSearches.searchCount))
        .limit(input.limit);

      const trendingSearches = await searchQuery;

      // Get games matching trending searches
      const trendingGames: any[] = [];
      const seenGameIds = new Set<number>();

      for (const search of trendingSearches) {
        if (trendingGames.length >= input.limit) break;

        const matchingGames = await ctx.db
          .select({
            game: games,
            platform: gamePlatforms,
          })
          .from(games)
          .leftJoin(gamePlatforms, eq(games.id, gamePlatforms.gameId))
          .where(sql`${games.name} LIKE ${'%' + search.query + '%'}`)
          .limit(3);

        for (const match of matchingGames) {
          if (seenGameIds.has(match.game.id)) continue;
          if (trendingGames.length >= input.limit) break;

          seenGameIds.add(match.game.id);
          trendingGames.push({
            ...match.game,
            searchCount: search.searchCount,
            platforms: match.platform ? [{
              platform: match.platform.platform,
              price: match.platform.platformPrice ? Number(match.platform.platformPrice) : null,
              discountPercent: match.platform.discountPercent,
            }] : [],
          });
        }
      }

      // If we don't have enough games, get most recent updated games
      if (trendingGames.length < input.limit) {
        const recentQuery = ctx.db
          .select({
            game: games,
            platform: gamePlatforms,
          })
          .from(games)
          .leftJoin(gamePlatforms, eq(games.id, gamePlatforms.gameId))
          .where(gte(gamePlatforms.updatedAt, threshold))
          .orderBy(desc(gamePlatforms.updatedAt))
          .limit(input.limit - trendingGames.length);

        const recentGames = await recentQuery;

        for (const match of recentGames) {
          if (seenGameIds.has(match.game.id)) continue;

          seenGameIds.add(match.game.id);
          trendingGames.push({
            ...match.game,
            platforms: match.platform ? [{
              platform: match.platform.platform,
              price: match.platform.platformPrice ? Number(match.platform.platformPrice) : null,
              discountPercent: match.platform.discountPercent,
            }] : [],
          });
        }
      }

      return {
        timeframe: input.timeframe,
        games: trendingGames,
        count: trendingGames.length,
      };
    }),

  getAutoCompleteSuggestions: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(20).optional().default(10),
    }))
    .query(async ({ ctx, input }) => {
      const suggestions: string[] = [];

      // Get matching game names
      const matchingGames = await ctx.db
        .select({ name: games.name })
        .from(games)
        .where(
          or(
            sql`MATCH(${games.name}) AGAINST(${input.query} IN NATURAL LANGUAGE MODE)`,
            sql`${games.name} LIKE ${'%' + input.query + '%'}`
          )
        )
        .limit(5);

      for (const game of matchingGames) {
        if (suggestions.length >= input.limit) break;
        if (!suggestions.includes(game.name)) {
          suggestions.push(game.name);
        }
      }

      // Get popular searches matching the query
      const matchingSearches = await ctx.db
        .select({ query: popularSearches.query })
        .from(popularSearches)
        .where(sql`${popularSearches.query} LIKE ${'%' + input.query + '%'}`)
        .orderBy(desc(popularSearches.searchCount))
        .limit(5);

      for (const search of matchingSearches) {
        if (suggestions.length >= input.limit) break;
        if (!suggestions.includes(search.query)) {
          suggestions.push(search.query);
        }
      }

      // Get matching genres
      // This would require a separate genres table or parsing the genres field
      // For now, we'll skip this

      return {
        query: input.query,
        suggestions,
      };
    }),
});

// Helper function to track popular searches
async function trackPopularSearch(ctx: any, query: string) {
  try {
    const existing = await ctx.db
      .select()
      .from(popularSearches)
      .where(eq(popularSearches.query, query))
      .limit(1);

    if (existing[0]) {
      await ctx.db
        .update(popularSearches)
        .set({
          searchCount: existing[0].searchCount + 1,
          lastSearched: new Date(),
        })
        .where(eq(popularSearches.id, existing[0].id));
    } else {
      await ctx.db.insert(popularSearches).values({
        query,
        searchCount: 1,
      });
    }
  } catch (error) {
    console.error('Failed to track popular search:', error);
  }
}
