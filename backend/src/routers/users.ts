import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const usersRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(users);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.select().from(users).where(eq(users.id, input.id)).limit(1);
      return user[0] || null;
    }),

  getByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.select().from(users).where(eq(users.username, input.username)).limit(1);
      return user[0] || null;
    }),
});
