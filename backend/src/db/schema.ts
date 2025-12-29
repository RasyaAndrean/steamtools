import { mysqlTable, int, varchar, text, decimal, datetime, timestamp, index, boolean } from 'drizzle-orm/mysql-core';

// Platform type
export type Platform = 'steam' | 'epic' | 'gog';

export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const games = mysqlTable('games', {
  id: int('id').primaryKey().autoincrement(),
  appId: int('app_id'),
  name: varchar('name', { length: 500 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }),
  genres: text('genres'),
  tags: text('tags'),
  developer: varchar('developer', { length: 255 }),
  releaseDate: datetime('release_date'),
  coverImage: text('cover_image'),
  isMultiPlatform: boolean('is_multi_platform').default(false),
  platforms: text('platforms'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  appIdIdx: index('app_id_idx').on(table.appId),
  nameIdx: index('name_idx').on(table.name),
  platformsIdx: index('platforms_idx').on(table.platforms),
}));

export const gamePlatforms = mysqlTable('game_platforms', {
  id: int('id').primaryKey().autoincrement(),
  gameId: int('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  platform: varchar('platform', { length: 20 }).notNull(),
  platformId: varchar('platform_id', { length: 255 }).notNull(),
  platformName: varchar('platform_name', { length: 500 }),
  price: decimal('price', { precision: 10, scale: 2 }),
  priceCurrency: varchar('price_currency', { length: 3 }).default('USD'),
  discountPercent: int('discount_percent').default(0),
  url: text('url'),
  imageUrl: text('image_url'),
  isAvailable: boolean('is_available').default(true),
  metadata: text('metadata'),
  lastCheckedAt: timestamp('last_checked_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  gameIdIdx: index('game_id_idx').on(table.gameId),
  platformIdx: index('platform_idx').on(table.platform),
  platformIdIdx: index('platform_id_idx').on(table.platformId),
  gamePlatformUnique: index('game_platform_unique').on(table.gameId, table.platform),
}));

export const platformSyncLog = mysqlTable('platform_sync_log', {
  id: int('id').primaryKey().autoincrement(),
  platform: varchar('platform', { length: 20 }).notNull(),
  syncType: varchar('sync_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  gamesProcessed: int('games_processed').default(0),
  gamesAdded: int('games_added').default(0),
  gamesUpdated: int('games_updated').default(0),
  errorMessage: text('error_message'),
}, (table) => ({
  platformIdx: index('platform_sync_platform_idx').on(table.platform),
  startedAtIdx: index('platform_sync_started_at_idx').on(table.startedAt),
}));

export const trackedGames = mysqlTable('tracked_games', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gameId: int('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  gamePlatformId: int('game_platform_id').references(() => gamePlatforms.id, { onDelete: 'set null' }),
  platform: varchar('platform', { length: 20 }).notNull(),
  targetPrice: decimal('target_price', { precision: 10, scale: 2 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('tracked_games_user_id_idx').on(table.userId),
  gameIdIdx: index('tracked_games_game_id_idx').on(table.gameId),
  platformIdx: index('tracked_games_platform_idx').on(table.platform),
}));

export const userLibrary = mysqlTable('user_library', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gameId: int('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  gamePlatformId: int('game_platform_id').references(() => gamePlatforms.id, { onDelete: 'set null' }),
  platform: varchar('platform', { length: 20 }).notNull(),
  addedAt: timestamp('added_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('user_library_user_id_idx').on(table.userId),
  gameIdIdx: index('user_library_game_id_idx').on(table.gameId),
}));

export const priceHistory = mysqlTable('price_history', {
  id: int('id').primaryKey().autoincrement(),
  gamePlatformId: int('game_platform_id').notNull().references(() => gamePlatforms.id, { onDelete: 'cascade' }),
  gameId: int('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  platform: varchar('platform', { length: 20 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal('original_price', { precision: 10, scale: 2 }),
  discountPercent: int('discount_percent').notNull().default(0),
  currency: varchar('currency', { length: 3 }).default('USD'),
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
}, (table) => ({
  gamePlatformIdIdx: index('price_history_game_platform_id_idx').on(table.gamePlatformId),
  gameIdIdx: index('price_history_game_id_idx').on(table.gameId),
  recordedAtIdx: index('price_history_recorded_at_idx').on(table.recordedAt),
}));
