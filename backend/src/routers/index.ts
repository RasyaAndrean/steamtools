import { router } from '../trpc.js';
import { gamesRouter } from './games.js';
import { usersRouter } from './users.js';
import { libraryRouter } from './library.js';
import { trackingRouter } from './tracking.js';
import { platformsRouter } from './platforms.js';

export const appRouter = router({
  games: gamesRouter,
  users: usersRouter,
  library: libraryRouter,
  tracking: trackingRouter,
  platforms: platformsRouter,
});

export type AppRouter = typeof appRouter;
