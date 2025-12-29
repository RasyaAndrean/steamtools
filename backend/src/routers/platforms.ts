import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { 
  syncAllPlatforms, 
  syncEpicGames, 
  syncGOGGames, 
  syncSteamGames,
  getSyncStatus 
} from '../services/sync.js';
import { platformSyncLog } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const platformsRouter = router({
  // Get sync status for all platforms
  getStatus: publicProcedure.query(async () => {
    return await getSyncStatus();
  }),

  // Trigger manual sync for a specific platform or all platforms
  sync: publicProcedure
    .input(z.object({
      platform: z.enum(['all', 'steam', 'epic', 'gog']).default('all'),
      query: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { platform, query } = input;

      if (platform === 'all') {
        const results = await syncAllPlatforms({ query, manual: true });
        return {
          success: results.every(r => r.success),
          results,
          message: `Synced ${results.filter(r => r.success).length}/${results.length} platforms`,
        };
      }

      let result;
      switch (platform) {
        case 'epic':
          result = await syncEpicGames({ query, manual: true });
          break;
        case 'gog':
          result = await syncGOGGames({ query, manual: true });
          break;
        case 'steam':
          result = await syncSteamGames({ query, manual: true });
          break;
        default:
          throw new Error('Invalid platform');
      }

      return {
        success: result.success,
        results: [result],
        message: result.success 
          ? `Synced ${result.gamesProcessed} games (${result.gamesAdded} added, ${result.gamesUpdated} updated)`
          : `Sync failed: ${result.error}`,
      };
    }),

  // Get sync history for a specific platform
  getSyncHistory: publicProcedure
    .input(z.object({
      platform: z.enum(['steam', 'epic', 'gog']),
      limit: z.number().min(1).max(100).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const { platform, limit } = input;
      
      return ctx.db.select()
        .from(platformSyncLog)
        .where(eq(platformSyncLog.platform, platform))
        .orderBy(desc(platformSyncLog.startedAt))
        .limit(limit);
    }),
});
