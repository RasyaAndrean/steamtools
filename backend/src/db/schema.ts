import { mysqlTable, int, varchar, text, decimal, datetime, timestamp, index, mysqlEnum } from 'drizzle-orm/mysql-core';

export type Platform = 'steam' | 'epic' | 'gog';
export type SyncType = 'full' | 'delta' | 'manual';
export type SyncStatus = 'success' | 'failed' | 'partial';
export type Available = 'true' | 'false' | 'unknown';
export type DrmFree = 'true' | 'false' | 'unknown';
export type Active = 'true' | 'false';
export type NotifyOnSale = 'true' | 'false';

export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const games = mysqlTable('games', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 500 }).notNull(),
  description: text('description'),
  shortDescription: text('short_description'),
  imageUrl: varchar('image_url', { length: 500 }),
  genres: text('genres'),
  tags: text('tags'),
  developer: varchar('developer', { length: 255 }),
  publisher: varchar('publisher', { length: 255 }),
  releaseDate: datetime('release_date'),
  metacriticScore: int('metacritic_score'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  nameIdx: index('name_idx').on(table.name),
  releaseDateIdx: index('release_date_idx').on(table.releaseDate),
  metacriticIdx: index('metacritic_idx').on(table.metacriticScore),
}));

export const userLibrary = mysqlTable('user_library', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gameId: int('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  gameIdIdx: index('game_id_idx').on(table.gameId),
}));

export const trackedGames = mysqlTable('tracked_games', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gamePlatformId: int('game_platform_id').notNull().references(() => gamePlatforms.id, { onDelete: 'cascade' }),
  targetPrice: decimal('target_price', { precision: 10, scale: 2 }).notNull(),
  active: mysqlEnum('active', ['true', 'false']).default('true'),
  notifyOnSale: mysqlEnum('notify_on_sale', ['true', 'false']).default('true'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('tg_user_id_idx').on(table.userId),
  gamePlatformIdIdx: index('tg_game_platform_id_idx').on(table.gamePlatformId),
  activeIdx: index('tg_active_idx').on(table.active),
}));

export const priceHistory = mysqlTable('price_history', {
  id: int('id').primaryKey().autoincrement(),
  gamePlatformId: int('game_platform_id').notNull().references(() => gamePlatforms.id, { onDelete: 'cascade' }),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal('original_price', { precision: 10, scale: 2 }),
  discountPercent: int('discount_percent').notNull().default(0),
  currency: varchar('currency', { length: 10 }).default('USD'),
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
}, (table) => ({
  gamePlatformIdIdx: index('price_gp_id_idx').on(table.gamePlatformId),
  recordedAtIdx: index('price_recorded_at_idx').on(table.recordedAt),
}));

export const gamePlatforms = mysqlTable('game_platforms', {
  id: int('id').primaryKey().autoincrement(),
  gameId: int('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  platform: mysqlEnum('platform', ['steam', 'epic', 'gog']).notNull(),
  platformId: varchar('platform_id', { length: 255 }).notNull(),
  platformUrl: varchar('platform_url', { length: 500 }),
  platformPrice: decimal('platform_price', { precision: 10, scale: 2 }),
  originalPrice: decimal('original_price', { precision: 10, scale: 2 }),
  discountPercent: int('discount_percent').default(0),
  currency: varchar('currency', { length: 10 }).default('USD'),
  lastSyncDate: timestamp('last_sync_date'),
  available: mysqlEnum('available', ['true', 'false', 'unknown']).default('unknown'),
  drmFree: mysqlEnum('drm_free', ['true', 'false', 'unknown']).default('unknown'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  gameIdIdx: index('gp_game_id_idx').on(table.gameId),
  platformIdx: index('gp_platform_idx').on(table.platform),
  platformIdIdx: index('gp_platform_id_idx').on(table.platformId),
  platformPriceIdx: index('gp_platform_price_idx').on(table.platformPrice),
  availableIdx: index('gp_available_idx').on(table.available),
}));

export const platformSyncLog = mysqlTable('platform_sync_log', {
  id: int('id').primaryKey().autoincrement(),
  platform: mysqlEnum('platform', ['steam', 'epic', 'gog']).notNull(),
  syncType: mysqlEnum('sync_type', ['full', 'delta', 'manual']).notNull(),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  status: mysqlEnum('status', ['success', 'failed', 'partial']).notNull(),
  gamesSynced: int('games_synced').default(0),
  errors: text('errors'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  platformIdx: index('psl_platform_idx').on(table.platform),
  statusIdx: index('psl_status_idx').on(table.status),
  startedAtIdx: index('psl_started_at_idx').on(table.startedAt),
}));
