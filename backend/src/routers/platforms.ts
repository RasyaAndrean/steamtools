import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { platformSyncLog } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { PlatformManager } from '../services/platformManager.js';

// Initialize platform manager
const platformManager = new PlatformManager();

export const platformsRouter = router({
  sync: publicProcedure
    .input(z.object({
      platform: z.enum(['steam', 'epic', 'gog', 'all']).default('all'),
      force: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const results = await platformManager.syncPlatform(input.platform, { force: input.force });
        
        return {
          success: results.every(r => r.success),
          results: results.map(r => ({
            success: r.success,
            platform: input.platform === 'all' ? 'multiple' : input.platform,
            gamesSynced: r.gamesSynced,
            errors: r.errors,
            durationMs: r.durationMs,
          })),
        };
      } catch (error) {
        console.error('Platform sync error:', error);
        throw new Error(`Platform sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  getSyncStatus: publicProcedure
    .input(z.object({
      platform: z.enum(['steam', 'epic', 'gog']).optional(),
      limit: z.number().optional().default(10),
    }))
    .query(async ({ ctx, input }) => {
      try {
        let query = ctx.db
          .select()
          .from(platformSyncLog)
          .orderBy(desc(platformSyncLog.startedAt))
          .limit(input.limit);

        if (input.platform) {
          query = query.where(eq(platformSyncLog.platform, input.platform));
        }

        return await query;
      } catch (error) {
        console.error('Get sync status error:', error);
        throw new Error(`Failed to get sync status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  getAvailablePlatforms: publicProcedure
    .query(async () => {
      return {
        platforms: [
          { key: 'steam', name: 'Steam', enabled: true, description: 'Valve\'s digital distribution platform' },
          { key: 'epic', name: 'Epic Games Store', enabled: true, description: 'Epic Games digital store' },
          { key: 'gog', name: 'GOG', enabled: true, description: 'DRM-free games from GOG.com' },
        ],
      };
    }),

  getPlatformStats: publicProcedure
    .input(z.object({
      platform: z.enum(['steam', 'epic', 'gog']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const platform = input.platform;
        
        const [totalGames] = await ctx.db
          .select({ count: sql`COUNT(*)` })
          .from(platformSyncLog)
          .where(eq(platformSyncLog.platform, platform));

        const [syncedGames] = await ctx.db
          .select({ count: sql`SUM(${platformSyncLog.gamesSynced})` })
          .from(platformSyncLog)
          .where(eq(platformSyncLog.status, 'success'));

        const [lastSync] = await ctx.db
          .select()
          .from(platformSyncLog)
          .where(eq(platformSyncLog.platform, platform))
          .orderBy(desc(platformSyncLog.completedAt))
          .limit(1);

        return {
          totalGames: Number(totalGames?.count || 0),
          syncedGames: Number(syncedGames?.count || 0),
          lastSync: lastSync || null,
          platform,
        };
      } catch (error) {
        console.error('Get platform stats error:', error);
        throw new Error(`Failed to get platform stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
});