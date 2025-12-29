import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { 
  games, 
  gamePlatforms, 
  priceHistory,
  trackedGames 
} from '../db/schema.js';
import { 
  searchEpicGames, 
  getEpicGameDetails,
  normalizeEpicGame 
} from '../services/epic.js';
import { 
  searchGOGGames, 
  getGOGGameDetails,
  normalizeGOGGame 
} from '../services/gog.js';
import { 
  searchSteamGames, 
  getSteamGameDetails 
} from '../services/steam.js';
import { 
  syncAllPlatforms, 
  syncEpicGames, 
  syncGOGGames, 
  syncSteamGames,
  getSyncStatus 
} from '../services/sync.js';
import type { Platform } from '../db/schema.js';
import { eq, and, or, like, desc, sql } from 'drizzle-orm';

export const gamesRouter = router({
  getAll: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      platform: z.enum(['steam', 'epic', 'gog']).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit || 50;
      const offset = input?.offset || 0;
      const platform = input?.platform;

      if (platform) {
        return ctx.db.select()
          .from(games)
          .innerJoin(gamePlatforms, eq(games.id, gamePlatforms.gameId))
          .where(eq(gamePlatforms.platform, platform))
          .limit(limit)
          .offset(offset);
      }

      return ctx.db.select()
        .from(games)
        .limit(limit)
        .offset(offset);
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const game = await ctx.db.select()
        .from(games)
        .where(eq(games.id, input.id))
        .limit(1);
      
      if (!game[0]) return null;

      const platformsData = await ctx.db.select()
        .from(gamePlatforms)
        .where(eq(gamePlatforms.gameId, input.id));

      return { ...game[0], platformsData };
    }),

  getByAppId: publicProcedure
    .input(z.object({ appId: z.number() }))
    .query(async ({ ctx, input }) => {
      const game = await ctx.db.select()
        .from(games)
        .where(eq(games.appId, input.appId))
        .limit(1);
      return game[0] || null;
    }),

  getPriceHistory: publicProcedure
    .input(z.object({ 
      gameId: z.number(),
      platform: z.enum(['steam', 'epic', 'gog']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(priceHistory.gameId, input.gameId)];
      if (input.platform) {
        conditions.push(eq(priceHistory.platform, input.platform));
      }
      
      return ctx.db.select()
        .from(priceHistory)
        .where(and(...conditions))
        .orderBy(desc(priceHistory.recordedAt));
    }),

  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      const queryLower = input.query.toLowerCase();
      const results = await ctx.db.select()
        .from(games)
        .where(
          or(
            like(games.name, `%${queryLower}%`),
            like(games.description, `%${queryLower}%`)
          )
        );
      return results;
    }),

  // Multi-platform search
  searchAll: publicProcedure
    .input(z.object({
      query: z.string().optional(),
      platforms: z.array(z.enum(['steam', 'epic', 'gog'])).optional(),
      genres: z.array(z.string()).optional(),
      priceRange: z.object({
        min: z.number().optional(),
        max: z.number().optional(),
      }).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { query, platforms, genres, priceRange, limit = 50, offset = 0 } = input || {};

      // Build database query
      const conditions = [];
      
      if (query) {
        const queryLower = query.toLowerCase();
        conditions.push(
          or(
            like(games.name, `%${queryLower}%`),
            like(games.description, `%${queryLower}%`)
          )
        );
      }

      if (genres && genres.length > 0) {
        conditions.push(
          sql`${games.genres} LIKE ANY(${genres.map(g => `%${g}%`)})`
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      let dbGames = await ctx.db.select({
        id: games.id,
        appId: games.appId,
        name: games.name,
        description: games.description,
        price: games.price,
        genres: games.genres,
        tags: games.tags,
        developer: games.developer,
        releaseDate: games.releaseDate,
        coverImage: games.coverImage,
        isMultiPlatform: games.isMultiPlatform,
        platforms: games.platforms,
        createdAt: games.createdAt,
        updatedAt: games.updatedAt,
      })
        .from(games)
        .where(whereClause)
        .limit(limit)
        .offset(offset);

      // Fetch platform data for each game
      const gamesWithPlatforms = await Promise.all(
        dbGames.map(async (game) => {
          const platformsData = await ctx.db.select()
            .from(gamePlatforms)
            .where(eq(gamePlatforms.gameId, game.id));
          return { ...game, platformsData };
        })
      );

      // Filter by platforms if specified
      let filtered = gamesWithPlatforms;
      if (platforms && platforms.length > 0) {
        filtered = gamesWithPlatforms.filter(game => 
          game.platformsData.some(p => platforms.includes(p.platform as Platform))
        );
      }

      // Filter by price range
      if (priceRange) {
        filtered = filtered.filter(game => {
          const price = game.price ? parseFloat(String(game.price)) : null;
          if (priceRange.min !== undefined && price !== null && price < priceRange.min) return false;
          if (priceRange.max !== undefined && price !== null && price > priceRange.max) return false;
          return true;
        });
      }

      // Fetch platform-specific data for games not in database
      if (!whereClause || (query && dbGames.length < 10)) {
        const platformResults = await searchExternalPlatforms(query || '', platforms);
        return {
          games: [...filtered, ...platformResults],
          total: filtered.length + platformResults.length,
          hasMore: filtered.length >= limit,
        };
      }

      return {
        games: filtered,
        total: filtered.length,
        hasMore: filtered.length >= limit,
      };
    }),

  // Get platform-specific details
  getDetails: publicProcedure
    .input(z.object({
      gameId: z.number().optional(),
      platform: z.enum(['steam', 'epic', 'gog']),
      platformId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { platform, platformId, gameId } = input;

      // If we have a gameId, get from database
      if (gameId) {
        const game = await ctx.db.select()
          .from(games)
          .where(eq(games.id, gameId))
          .limit(1);
        
        if (game[0]) {
          const platformsData = await ctx.db.select()
            .from(gamePlatforms)
            .where(eq(gamePlatforms.gameId, gameId));
          
          const platformData = platformsData.find(p => p.platform === platform);
          
          return {
            game: game[0],
            platformData,
            allPlatforms: platformsData,
          };
        }
      }

      // Otherwise, fetch from platform API
      let externalData = null;
      
      switch (platform) {
        case 'epic':
          if (platformId) {
            const epicData = await getEpicGameDetails(platformId);
            if (epicData) {
              externalData = normalizeEpicGame(epicData);
            }
          }
          break;
        case 'gog':
          const gogId = platformId ? parseInt(platformId) : 0;
          if (gogId) {
            const gogData = await getGOGGameDetails(gogId);
            if (gogData) {
              externalData = normalizeGOGGame(gogData);
            }
          }
          break;
        case 'steam':
          if (platformId) {
            const steamData = await getSteamGameDetails(platformId);
            if (steamData?.data) {
              externalData = {
                name: steamData.data.name,
                description: steamData.data.short_description,
                coverImage: steamData.data.header_image,
                genres: steamData.data.genres?.map(g => g.description) || [],
                developer: steamData.data.developers?.[0] || null,
                releaseDate: steamData.data.release_date?.date ? 
                  new Date(steamData.data.release_date.date) : null,
                platformData: {
                  platform: 'steam' as const,
                  platformId,
                  price: null,
                  originalPrice: null,
                  discountPercent: 0,
                  currency: 'USD',
                  url: `https://store.steampowered.com/app/${platformId}`,
                  imageUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${platformId}/header.jpg`,
                  isAvailable: true,
                  metadata: {},
                },
              };
            }
          }
          break;
      }

      return {
        game: null,
        platformData: externalData,
        allPlatforms: [],
      };
    }),

  // Check availability across platforms
  getPlatformAvailability: publicProcedure
    .input(z.object({
      gameName: z.string().optional(),
      steamAppId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { gameName, steamAppId } = input;
      const availability: Array<{
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
      }> = [];

      // Search database for matching games
      if (gameName) {
        const matchingGames = await ctx.db.select()
          .from(games)
          .where(like(games.name, `%${gameName}%`))
          .limit(5);

        for (const game of matchingGames) {
          const platformsData = await ctx.db.select()
            .from(gamePlatforms)
            .where(eq(gamePlatforms.gameId, game.id));

          for (const p of platformsData) {
            availability.push({
              platform: p.platform as Platform,
              platformId: p.platformId,
              platformName: p.platformName,
              price: p.price ? parseFloat(String(p.price)) : null,
              originalPrice: null,
              discountPercent: p.discountPercent,
              currency: p.priceCurrency,
              url: p.url,
              imageUrl: p.imageUrl,
              isAvailable: p.isAvailable,
            });
          }
        }
      }

      // Check Steam specifically
      if (steamAppId) {
        const steamData = await getSteamGameDetails(steamAppId);
        if (steamData?.data) {
          const existing = availability.find(a => a.platform === 'steam');
          if (!existing) {
            availability.push({
              platform: 'steam',
              platformId: steamAppId,
              platformName: steamData.data.name,
              price: steamData.data.price_data?.final 
                ? steamData.data.price_data.final / 100 
                : null,
              originalPrice: steamData.data.price_data?.initial 
                ? steamData.data.price_data.initial / 100 
                : null,
              discountPercent: steamData.data.price_data?.discount_percent || 0,
              currency: steamData.data.price_data?.currency || 'USD',
              url: `https://store.steampowered.com/app/${steamAppId}`,
              imageUrl: steamData.data.header_image,
              isAvailable: true,
            });
          }
        }
      }

      return availability;
    }),
});

// Helper function to search external platforms
async function searchExternalPlatforms(
  query: string,
  platforms?: Platform[]
): Promise<Array<{
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
  platforms: string | null;
  createdAt: Date;
  updatedAt: Date;
  platformsData: Array<{
    id: number;
    gameId: number;
    platform: string;
    platformId: string;
    platformName: string | null;
    price: number | null;
    priceCurrency: string;
    discountPercent: number;
    url: string | null;
    imageUrl: string | null;
    isAvailable: boolean;
    metadata: string | null;
    lastCheckedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}>> {
  const results: Array<{
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
    platforms: string | null;
    createdAt: Date;
    updatedAt: Date;
    platformsData: Array<{
      id: number;
      gameId: number;
      platform: string;
      platformId: string;
      platformName: string | null;
      price: number | null;
      priceCurrency: string;
      discountPercent: number;
      url: string | null;
      imageUrl: string | null;
      isAvailable: boolean;
      metadata: string | null;
      lastCheckedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }> = [];

  const platformList = platforms || ['steam', 'epic', 'gog'];

  const searchPromises: Promise<void>[] = [];

  if (platformList.includes('steam') && query) {
    searchPromises.push(
      searchSteamGames({ query }).then(({ games }) => {
        for (const game of games.slice(0, 5)) {
          results.push({
            id: 0,
            appId: parseInt(game.appId) || null,
            name: game.name,
            description: null,
            price: null,
            genres: null,
            tags: null,
            developer: null,
            releaseDate: null,
            coverImage: null,
            isMultiPlatform: false,
            platforms: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            platformsData: [{
              id: 0,
              gameId: 0,
              platform: 'steam',
              platformId: game.appId,
              platformName: game.name,
              price: null,
              priceCurrency: 'USD',
              discountPercent: 0,
              url: `https://store.steampowered.com/app/${game.appId}`,
              imageUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${game.appId}/header.jpg`,
              isAvailable: true,
              metadata: null,
              lastCheckedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }],
          });
        }
      }).catch(() => {})
    );
  }

  if (platformList.includes('epic')) {
    searchPromises.push(
      searchEpicGames({ query, count: 5 }).then(({ games }) => {
        for (const game of games) {
          results.push({
            id: 0,
            appId: null,
            name: game.title,
            description: game.shortDescription || null,
            price: game.price?.totalPrice?.discountPrice || null,
            genres: game.categories?.map(c => c.name).join(', ') || null,
            tags: null,
            developer: game.developer || null,
            releaseDate: game.releaseDate ? new Date(game.releaseDate) : null,
            coverImage: game.keyImages?.[0]?.url || null,
            isMultiPlatform: false,
            platforms: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            platformsData: [{
              id: 0,
              gameId: 0,
              platform: 'epic',
              platformId: game.id,
              platformName: game.title,
              price: game.price?.totalPrice?.discountPrice || null,
              priceCurrency: game.price?.totalPrice?.currencyCode || 'USD',
              discountPercent: 0,
              url: game.productSlug ? `https://www.epicgames.com/store/en-US/p/${game.productSlug}` : null,
              imageUrl: game.keyImages?.[0]?.url || null,
              isAvailable: true,
              metadata: JSON.stringify({ publisher: game.publisher }),
              lastCheckedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }],
          });
        }
      }).catch(() => {})
    );
  }

  if (platformList.includes('gog')) {
    searchPromises.push(
      searchGOGGames({ query, limit: 5 }).then(({ games }) => {
        for (const game of games) {
          results.push({
            id: 0,
            appId: null,
            name: game.title,
            description: game.overview || null,
            price: game.price?.finalAmount || null,
            genres: game.genre?.join(', ') || null,
            tags: null,
            developer: game.developer || null,
            releaseDate: game.releaseDate ? new Date(game.releaseDate) : null,
            coverImage: game.images?.logo || null,
            isMultiPlatform: false,
            platforms: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            platformsData: [{
              id: 0,
              gameId: 0,
              platform: 'gog',
              platformId: String(game.id),
              platformName: game.title,
              price: game.price?.finalAmount || null,
              priceCurrency: game.price?.currency || 'USD',
              discountPercent: game.price?.discountPercent || 0,
              url: game.slug ? `https://www.gog.com/game/${game.slug}` : null,
              imageUrl: game.images?.logo || null,
              isAvailable: true,
              metadata: JSON.stringify({ 
                publisher: game.publisher, 
                isDRMFree: game.isDRMFree 
              }),
              lastCheckedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }],
          });
        }
      }).catch(() => {})
    );
  }

  await Promise.allSettled(searchPromises);
  return results;
}
