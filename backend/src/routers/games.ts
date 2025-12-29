import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { games, priceHistory } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const gamesRouter = router({
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
      const game = await ctx.db.select().from(games).where(eq(games.appId, input.appId)).limit(1);
      return game[0] || null;
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
});
