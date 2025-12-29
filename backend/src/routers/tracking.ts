import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { trackedGames, games } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const trackingRouter = router({
  getUserTrackedGames: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db
        .select()
        .from(trackedGames)
        .leftJoin(games, eq(trackedGames.gameId, games.id))
        .where(eq(trackedGames.userId, input.userId));
    }),

  trackGame: publicProcedure
    .input(z.object({ 
      userId: z.number(), 
      gameId: z.number(),
      targetPrice: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.insert(trackedGames).values({
        userId: input.userId,
        gameId: input.gameId,
        targetPrice: input.targetPrice,
      });
    }),

  untrackGame: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.delete(trackedGames).where(eq(trackedGames.id, input.id));
    }),

  updateTargetPrice: publicProcedure
    .input(z.object({ id: z.number(), targetPrice: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db
        .update(trackedGames)
        .set({ targetPrice: input.targetPrice })
        .where(eq(trackedGames.id, input.id));
    }),
});
