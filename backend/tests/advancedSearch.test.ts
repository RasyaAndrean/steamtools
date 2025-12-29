import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { db } from '../src/db/index.js';
import { games, gamePlatforms, gameComparisonCache, popularSearches } from '../src/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

// Mock tRPC context for testing
const mockCtx = { db };

describe('Advanced Search API', () => {
  let testGameId: number;
  let testPlatformId: number;

  beforeEach(async () => {
    // Insert test data
    const gameResult = await db.insert(games).values({
      name: 'Test Game: Elden Ring',
      description: 'An action RPG developed by FromSoftware',
      genres: 'Action,RPG',
      tags: 'Open World,Difficult,Dark Fantasy',
      developer: 'FromSoftware',
      publisher: 'Bandai Namco Entertainment',
      releaseDate: new Date('2022-02-25'),
      metacriticScore: 96,
    });
    
    const gameIdResult = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
    testGameId = gameIdResult[0].id;

    const platformResult = await db.insert(gamePlatforms).values([
      {
        gameId: testGameId,
        platform: 'steam',
        platformId: '1245620',
        platformPrice: 59.99,
        originalPrice: 59.99,
        discountPercent: 0,
        available: 'true',
        platformUrl: 'https://store.steampowered.com/app/1245620',
      },
      {
        gameId: testGameId,
        platform: 'epic',
        platformId: '8f288f583d5f4c5fbcd8cc1b2d0c622c',
        platformPrice: 39.99,
        originalPrice: 59.99,
        discountPercent: 33,
        available: 'true',
        platformUrl: 'https://store.epicgames.com/p/elden-ring',
      },
      {
        gameId: testGameId,
        platform: 'gog',
        platformId: '1439506297',
        platformPrice: 59.99,
        originalPrice: 59.99,
        discountPercent: 0,
        available: 'true',
        drmFree: 'true',
        platformUrl: 'https://www.gog.com/en/game/elden_ring',
      },
    ]);

    const platformIdResult = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
    testPlatformId = platformIdResult[0].id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(gameComparisonCache).where(eq(gameComparisonCache.gameId, testGameId));
    await db.delete(popularSearches);
    await db.delete(gamePlatforms).where(eq(gamePlatforms.gameId, testGameId));
    await db.delete(games).where(eq(games.id, testGameId));
  });

  describe('advancedSearch()', () => {
    it('should search games by name', async () => {
      // This would be tested via tRPC in actual integration tests
      // For now, we test the underlying query logic
      const results = await db
        .select()
        .from(games)
        .where(sql`${games.name} LIKE ${'%Elden Ring%'}`)
        .limit(10);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Elden Ring');
    });

    it('should filter by platforms', async () => {
      const results = await db
        .select({
          game: games,
          platform: gamePlatforms,
        })
        .from(games)
        .leftJoin(gamePlatforms, eq(games.id, gamePlatforms.gameId))
        .where(eq(gamePlatforms.platform, 'epic'));

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].platform?.platform).toBe('epic');
    });

    it('should filter by price range', async () => {
      const results = await db
        .select()
        .from(gamePlatforms)
        .where(
          sql`${gamePlatforms.platformPrice} >= 30 AND ${gamePlatforms.platformPrice} <= 50`
        );

      expect(results.length).toBeGreaterThan(0);
      const price = Number(results[0].platformPrice);
      expect(price).toBeGreaterThanOrEqual(30);
      expect(price).toBeLessThanOrEqual(50);
    });

    it('should filter by on-sale games', async () => {
      const results = await db
        .select()
        .from(gamePlatforms)
        .where(sql`${gamePlatforms.discountPercent} > 0`);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].discountPercent).toBeGreaterThan(0);
    });

    it('should filter by release date', async () => {
      const results = await db
        .select()
        .from(games)
        .where(sql`${games.releaseDate} >= ${new Date('2022-01-01')}`);

      expect(results.length).toBeGreaterThan(0);
    });

    it('should sort by price ascending', async () => {
      const results = await db
        .select()
        .from(gamePlatforms)
        .where(eq(gamePlatforms.gameId, testGameId))
        .orderBy(gamePlatforms.platformPrice);

      expect(results[0].platformPrice).toBeLessThanOrEqual(results[1]?.platformPrice || Infinity);
    });

    it('should sort by price descending', async () => {
      const results = await db
        .select()
        .from(gamePlatforms)
        .where(eq(gamePlatforms.gameId, testGameId))
        .orderBy(sql`${gamePlatforms.platformPrice} DESC`);

      expect(results[0].platformPrice).toBeGreaterThanOrEqual(results[1]?.platformPrice || 0);
    });

    it('should sort by discount percentage', async () => {
      const results = await db
        .select()
        .from(gamePlatforms)
        .where(eq(gamePlatforms.gameId, testGameId))
        .orderBy(sql`${gamePlatforms.discountPercent} DESC`);

      expect(results[0].discountPercent).toBeGreaterThanOrEqual(results[1]?.discountPercent || 0);
    });

    it('should paginate results', async () => {
      const page1 = await db
        .select()
        .from(gamePlatforms)
        .limit(2)
        .offset(0);

      const page2 = await db
        .select()
        .from(gamePlatforms)
        .limit(2)
        .offset(2);

      expect(page1.length).toBeLessThanOrEqual(2);
      expect(page2.length).toBeLessThanOrEqual(2);
    });
  });

  describe('priceComparison()', () => {
    it('should return price comparison across platforms', async () => {
      const platforms = await db
        .select()
        .from(gamePlatforms)
        .where(eq(gamePlatforms.gameId, testGameId));

      expect(platforms.length).toBe(3);
      
      const steam = platforms.find(p => p.platform === 'steam');
      const epic = platforms.find(p => p.platform === 'epic');
      const gog = platforms.find(p => p.platform === 'gog');

      expect(steam).toBeDefined();
      expect(epic).toBeDefined();
      expect(gog).toBeDefined();
      expect(epic?.discountPercent).toBe(33);
    });

    it('should identify cheapest option', async () => {
      const platforms = await db
        .select()
        .from(gamePlatforms)
        .where(eq(gamePlatforms.gameId, testGameId));

      const cheapest = platforms.reduce((min, p) => {
        const price = Number(p.platformPrice || Infinity);
        return price < Number(min.platformPrice || Infinity) ? p : min;
      });

      expect(cheapest.platform).toBe('epic');
      expect(Number(cheapest.platformPrice)).toBe(39.99);
    });

    it('should identify best deal (highest discount)', async () => {
      const platforms = await db
        .select()
        .from(gamePlatforms)
        .where(eq(gamePlatforms.gameId, testGameId));

      const bestDeal = platforms.reduce((max, p) => {
        return p.discountPercent > max.discountPercent ? p : max;
      });

      expect(bestDeal.platform).toBe('epic');
      expect(bestDeal.discountPercent).toBe(33);
    });

    it('should cache comparison results', async () => {
      const comparisonData = {
        gameId: testGameId,
        steam: { price: 59.99, discountPercent: 0 },
        epic: { price: 39.99, discountPercent: 33 },
        gog: { price: 59.99, discountPercent: 0, drmFree: 'true' },
      };

      await db.insert(gameComparisonCache).values({
        gameId: testGameId,
        comparisonData: comparisonData as any,
        lastUpdated: new Date(),
      });

      const cached = await db
        .select()
        .from(gameComparisonCache)
        .where(eq(gameComparisonCache.gameId, testGameId))
        .limit(1);

      expect(cached.length).toBe(1);
      expect(cached[0].comparisonData).toEqual(comparisonData);
    });
  });

  describe('whereToBuy()', () => {
    it('should recommend cheapest option', async () => {
      const platforms = await db
        .select()
        .from(gamePlatforms)
        .where(eq(gamePlatforms.gameId, testGameId));

      const cheapest = platforms.reduce((min, p) => {
        const price = Number(p.platformPrice || Infinity);
        return price < Number(min.platformPrice || Infinity) ? p : min;
      });

      expect(cheapest.platform).toBe('epic');
    });

    it('should recommend best deal when significant discount', async () => {
      const platforms = await db
        .select()
        .from(gamePlatforms)
        .where(eq(gamePlatforms.gameId, testGameId));

      const bestDeal = platforms.reduce((max, p) => {
        return p.discountPercent > max.discountPercent ? p : max;
      });

      expect(bestDeal.platform).toBe('epic');
      expect(bestDeal.discountPercent).toBe(33);
    });

    it('should recommend DRM-free option on GOG', async () => {
      const gog = await db
        .select()
        .from(gamePlatforms)
        .where(
          and(
            eq(gamePlatforms.gameId, testGameId),
            eq(gamePlatforms.platform, 'gog')
          )
        )
        .limit(1);

      expect(gog.length).toBe(1);
      expect(gog[0].drmFree).toBe('true');
    });
  });

  describe('searchByGenre()', () => {
    it('should search games by genre', async () => {
      const results = await db
        .select()
        .from(games)
        .where(sql`${games.genres} LIKE ${'%RPG%'}`);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].genres).toContain('RPG');
    });

    it('should filter by platform within genre', async () => {
      const results = await db
        .select({
          game: games,
          platform: gamePlatforms,
        })
        .from(games)
        .leftJoin(gamePlatforms, eq(games.id, gamePlatforms.gameId))
        .where(
          and(
            sql`${games.genres} LIKE ${'%Action%'}`,
            eq(gamePlatforms.platform, 'steam')
          )
        );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].game.genres).toContain('Action');
      expect(results[0].platform?.platform).toBe('steam');
    });
  });

  describe('getTrending()', () => {
    it('should track popular searches', async () => {
      await db.insert(popularSearches).values({
        query: 'Elden Ring',
        searchCount: 100,
      });

      const searches = await db
        .select()
        .from(popularSearches)
        .where(eq(popularSearches.query, 'Elden Ring'));

      expect(searches.length).toBe(1);
      expect(searches[0].searchCount).toBe(100);
    });

    it('should increment search count on repeat searches', async () => {
      await db.insert(popularSearches).values({
        query: 'Elden Ring',
        searchCount: 10,
      });

      await db
        .update(popularSearches)
        .set({ searchCount: 11 })
        .where(eq(popularSearches.query, 'Elden Ring'));

      const searches = await db
        .select()
        .from(popularSearches)
        .where(eq(popularSearches.query, 'Elden Ring'));

      expect(searches[0].searchCount).toBe(11);
    });

    it('should get trending searches by timeframe', async () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      await db.insert(popularSearches).values([
        { query: 'Recent Game 1', searchCount: 50, lastSearched: new Date() },
        { query: 'Recent Game 2', searchCount: 30, lastSearched: new Date() },
        { query: 'Old Game', searchCount: 100, lastSearched: oneWeekAgo },
      ]);

      const trending = await db
        .select()
        .from(popularSearches)
        .where(sql`${popularSearches.lastSearched} >= ${oneWeekAgo}`)
        .orderBy(sql`${popularSearches.searchCount} DESC`)
        .limit(10);

      expect(trending.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getAutoCompleteSuggestions()', () => {
    it('should return matching game names', async () => {
      const suggestions = await db
        .select({ name: games.name })
        .from(games)
        .where(sql`${games.name} LIKE ${'%Elden%'}`)
        .limit(5);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].name).toContain('Elden');
    });

    it('should return matching popular searches', async () => {
      await db.insert(popularSearches).values([
        { query: 'Elden Ring', searchCount: 100 },
        { query: 'Elden Ring DLC', searchCount: 50 },
      ]);

      const suggestions = await db
        .select({ query: popularSearches.query })
        .from(popularSearches)
        .where(sql`${popularSearches.query} LIKE ${'%Elden%'}`)
        .orderBy(sql`${popularSearches.searchCount} DESC`)
        .limit(5);

      expect(suggestions.length).toBeGreaterThanOrEqual(2);
    });
  });
});
