import { initTRPC } from '@trpc/server';
import { db } from './db/index.js';

export const createContext = () => {
  return {
    db,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
