import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { games, gamePlatforms, priceHistory } from '../db/schema.js';
import { eq, desc, sql, and, or } from 'drizzle-orm';
import { PlatformManager } from '../services/platformManager.js';

// Initialize platform manager
const platformManager = new PlatformManager();

export const gamesRouter = router({
  // Existing procedures (backwards compatible)
  getAll: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(games);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const game = await ctx.db.select().from(games).where(eq(games.id, input.id)).limit(1);
      return game[0] || null;
    }),

  getByAppId: publicProcedure
    .input(z.object({ appId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Fallback to platform search for Steam compatibility
      const platformGame = await ctx.db
        .select()
        .from(gamePlatforms)
        .where(eq(gamePlatforms.platformId, input.appId.toString()))
        .limit(1);
      
      if (platformGame[0]) {
        const game = await ctx.db
          .select()
          .from(games)
          .where(eq(games.id, platformGame[0].gameId))
          .limit(1);
        return game[0] || null;
      }
      return null;
    }),

  getPriceHistory: publicProcedure
    .input(z.object({ gameId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db
        .select()
        .from(priceHistory)
        .where(eq(priceHistory.gameId, input.gameId))
        .orderBy(desc(priceHistory.recordedAt));
    }),

  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      // Basic search implementation - can be enhanced with full-text search
      const results = await ctx.db.select().from(games);
      return results.filter(game => 
        game.name.toLowerCase().includes(input.query.toLowerCase())
      );
    }),

  // New multi-platform procedures
  searchAll: publicProcedure
    .input(z.object({
      query: z.string(),
      filters: z.object({
        platforms: z.array(z.enum(['steam', 'epic', 'gog'])).optional(),
        genres: z.array(z.string()).optional(),
        priceRange: z.object({
          min: z.number().optional(),
          max: z.number().optional(),
        }).optional(),
        releaseDate: z.object({
          start: z.date().optional(),
          end: z.date().optional(),
        }).optional(),
      }).optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        // First, search our database for existing games
        let dbQuery = ctx.db
          .select({
            game: games,
            platform: gamePlatforms,
          })
          .from(games)
          .leftJoin(gamePlatforms, eq(games.id, gamePlatforms.gameId))
          .where(
            sql`${games.name} LIKE ${'%' + input.query + '%'}`
          );

        // Apply platform filter if specified
        if (input.filters?.platforms && input.filters.platforms.length > 0) {
          dbQuery = dbQuery.where(
            sql`${gamePlatforms.platform} IN (${input.filters.platforms.join(',')})`
          );
        }

        // Apply price range filter if specified
        if (input.filters?.priceRange) {
          const { min, max } = input.filters.priceRange;
          if (min !== undefined) {
            dbQuery = dbQuery.where(
              sql`${gamePlatforms.platformPrice} >= ${min}`
            );
          }
          if (max !== undefined) {
            dbQuery = dbQuery.where(
              sql`${gamePlatforms.platformPrice} <= ${max}`
            );
          }
        }

        const dbResults = await dbQuery;

        // If we have good database results, return them
        if (dbResults.length > 0) {
          return dbResults.map(result => ({
            ...result.game,
            platform: result.platform,
          }));
        }

        // Otherwise, search external APIs
        const externalResults = await platformManager.searchAllPlatforms(input.query, input.filters);
        return externalResults;
      } catch (error) {
        console.error('Search error:', error);
        throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  getDetails: publicProcedure
    .input(z.object({
      gameId: z.number(),
      platform: z.enum(['steam', 'epic', 'gog']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const game = await ctx.db
          .select()
          .from(games)
          .where(eq(games.id, input.gameId))
          .limit(1);

        if (!game[0]) {
          throw new Error('Game not found');
        }

        // If platform is specified, get platform-specific details
        if (input.platform) {
          const platformInfo = await ctx.db
            .select()
            .from(gamePlatforms)
            .where(
              and(
                eq(gamePlatforms.gameId, input.gameId),
                eq(gamePlatforms.platform, input.platform)
              )
            )
            .limit(1);

          return {
            game: game[0],
            platform: platformInfo[0] || null,
          };
        }

        // Get all platforms for this game
        const platforms = await ctx.db
          .select()
          .from(gamePlatforms)
          .where(eq(gamePlatforms.gameId, input.gameId));

        return {
          game: game[0],
          platforms,
        };
      } catch (error) {
        console.error('Get details error:', error);
        throw new Error(`Failed to get game details: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  getPlatformAvailability: publicProcedure
    .input(z.object({
      gameName: z.string().optional(),
      gameId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        if (!input.gameName && !input.gameId) {
          throw new Error('Either gameName or gameId must be provided');
        }

        let gameName = input.gameName;
        if (input.gameId) {
          const game = await ctx.db
            .select({ name: games.name })
            .from(games)
            .where(eq(games.id, input.gameId))
            .limit(1);
          
          if (!game[0]) {
            throw new Error('Game not found');
          }
          gameName = game[0].name;
        }

        if (!gameName) {
          throw new Error('Game name could not be determined');
        }

        return await platformManager.getPlatformAvailability(gameName);
      } catch (error) {
        console.error('Get platform availability error:', error);
        throw new Error(`Failed to get platform availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  getPlatformGames: publicProcedure
    .input(z.object({
      platform: z.enum(['steam', 'epic', 'gog']),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
      availableOnly: z.boolean().optional().default(true),
    }))
    .query(async ({ ctx, input }) => {
      try {
        let query = ctx.db
          .select({
            game: games,
            platform: gamePlatforms,
          })
          .from(gamePlatforms)
          .leftJoin(games, eq(gamePlatforms.gameId, games.id))
          .where(eq(gamePlatforms.platform, input.platform))
          .orderBy(desc(gamePlatforms.updatedAt))
          .limit(input.limit);

        if (input.availableOnly) {
          query = query.where(eq(gamePlatforms.available, 'true'));
        }

        const results = await query;

        return results.map(result => ({
          ...result.game,
          platformInfo: result.platform,
        }));
      } catch (error) {
        console.error('Get platform games error:', error);
        throw new Error(`Failed to get platform games: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
});
