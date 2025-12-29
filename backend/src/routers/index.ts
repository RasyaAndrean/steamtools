import { router } from '../trpc.js';
import { gamesRouter } from './games.js';
import { usersRouter } from './users.js';
import { libraryRouter } from './library.js';
import { trackingRouter } from './tracking.js';

export const appRouter = router({
  games: gamesRouter,
  users: usersRouter,
  library: libraryRouter,
  tracking: trackingRouter,
});

export type AppRouter = typeof appRouter;
