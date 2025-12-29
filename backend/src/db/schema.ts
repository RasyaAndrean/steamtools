import { mysqlTable, int, varchar, text, decimal, datetime, timestamp, index } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const games = mysqlTable('games', {
  id: int('id').primaryKey().autoincrement(),
  appId: int('app_id').notNull().unique(),
  name: varchar('name', { length: 500 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }),
  genres: text('genres'),
  tags: text('tags'),
  developer: varchar('developer', { length: 255 }),
  releaseDate: datetime('release_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  appIdIdx: index('app_id_idx').on(table.appId),
  nameIdx: index('name_idx').on(table.name),
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
  gameId: int('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  targetPrice: decimal('target_price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  gameIdIdx: index('game_id_idx').on(table.gameId),
}));

export const priceHistory = mysqlTable('price_history', {
  id: int('id').primaryKey().autoincrement(),
  gameId: int('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  discountPercent: int('discount_percent').notNull().default(0),
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
}, (table) => ({
  gameIdIdx: index('game_id_idx').on(table.gameId),
  recordedAtIdx: index('recorded_at_idx').on(table.recordedAt),
}));
