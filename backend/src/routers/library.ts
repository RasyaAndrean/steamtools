import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { userLibrary, games } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const libraryRouter = router({
  getUserLibrary: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db
        .select()
        .from(userLibrary)
        .leftJoin(games, eq(userLibrary.gameId, games.id))
        .where(eq(userLibrary.userId, input.userId));
    }),

  addToLibrary: publicProcedure
    .input(z.object({ userId: z.number(), gameId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.insert(userLibrary).values({
        userId: input.userId,
        gameId: input.gameId,
      });
    }),

  removeFromLibrary: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.delete(userLibrary).where(eq(userLibrary.id, input.id));
    }),
});
