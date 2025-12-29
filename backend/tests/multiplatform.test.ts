import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { trpc } from './setup';
import type { Platform } from '../src/db/schema';

describe('Multi-Platform Integration', () => {
  describe('Platform API Integration', () => {
    it('should sync Epic Games platform', async () => {
      const result = await trpc.platforms.sync.mutate({ platform: 'epic', force: true });
      
      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      
      const epicResult = result.results.find(r => r.platform === 'epic' || r.platform === 'multiple');
      expect(epicResult).toBeDefined();
      expect(typeof epicResult?.gamesSynced).toBe('number');
    });

    it('should sync GOG platform', async () => {
      const result = await trpc.platforms.sync.mutate({ platform: 'gog', force: true });
      
      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      
      const gogResult = result.results.find(r => r.platform === 'gog' || r.platform === 'multiple');
      expect(gogResult).toBeDefined();
      expect(typeof gogResult?.gamesSynced).toBe('number');
    });

    it('should sync all platforms', async () => {
      const result = await trpc.platforms.sync.mutate({ platform: 'all', force: false });
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should get sync status', async () => {
      const result = await trpc.platforms.getSyncStatus.query({ limit: 5 });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(5);
      
      if (result.length > 0) {
        const syncLog = result[0];
        expect(syncLog.platform).toMatch(/^(steam|epic|gog)$/);
        expect(syncLog.syncType).toMatch(/^(full|delta|manual)$/);
        expect(syncLog.status).toMatch(/^(success|failed|partial)$/);
        expect(typeof syncLog.gamesSynced).toBe('number');
      }
    });

    it('should get available platforms', async () => {
      const result = await trpc.platforms.getAvailablePlatforms.query();
      
      expect(result.platforms).toBeDefined();
      expect(Array.isArray(result.platforms)).toBe(true);
      expect(result.platforms.length).toBe(3);
      
      const platformKeys = result.platforms.map(p => p.key);
      expect(platformKeys).toContain('steam');
      expect(platformKeys).toContain('epic');
      expect(platformKeys).toContain('gog');
    });
  });

  describe('Game Search and Discovery', () => {
    it('should search across all platforms', async () => {
      const result = await trpc.games.searchAll.query({
        query: 'portal',
        filters: {
          platforms: ['steam', 'epic', 'gog'],
          priceRange: { min: 0, max: 60 },
        },
      });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Check that results have expected structure
      const firstResult = result[0];
      expect(firstResult).toHaveProperty('name');
      expect(firstResult).toHaveProperty('id');
    });

    it('should search with platform filter', async () => {
      const result = await trpc.games.searchAll.query({
        query: 'game',
        filters: {
          platforms: ['epic'],
        },
      });
      
      expect(Array.isArray(result)).toBe(true);
      // Results may be empty if no games match, but shouldn't error
    });

    it('should get game details with platform-specific info', async () => {
      // First get a game
      const games = await trpc.games.getAll.query();
      expect(games.length).toBeGreaterThan(0);
      
      const gameId = games[0].id;
      
      const result = await trpc.games.getDetails.query({
        gameId,
        platform: 'epic', // optional
      });
      
      expect(result.game).toBeDefined();
      expect(result.game.id).toBe(gameId);
    });

    it('should get platform availability for a game', async () => {
      const result = await trpc.games.getPlatformAvailability.query({
        gameName: 'Hades',
      });
      
      expect(Array.isArray(result)).toBe(true);
      
      // Check if we have availability info from any platform
      if (result.length > 0) {
        const availability = result[0];
        expect(availability).toHaveProperty('platform');
        expect(availability).toHaveProperty('name');
        expect(availability).toHaveProperty('price');
        expect(availability).toHaveProperty('available');
      }
    });

    it('should get platform-specific games', async () => {
      const result = await trpc.games.getPlatformGames.query({
        platform: 'epic',
        limit: 10,
        availableOnly: true,
      });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);
      
      if (result.length > 0) {
        const game = result[0];
        expect(game).toHaveProperty('name');
        expect(game).toHaveProperty('platformInfo');
        expect(game.platformInfo.platform).toBe('epic');
      }
    });
  });

  describe('Database Schema', () => {
    it('should have games table with new schema', async () => {
      const games = await trpc.games.getAll.query();
      
      expect(Array.isArray(games)).toBe(true);
      
      if (games.length > 0) {
        const game = games[0];
        expect(game).toHaveProperty('name');
        expect(game).toHaveProperty('description');
        expect(game).toHaveProperty('imageUrl'); // New field
        expect(game).toHaveProperty('publisher'); // New field
        expect(game).toHaveProperty('metacriticScore'); // New field
      }
    });

    it('should maintain backwards compatibility', async () => {
      // Test that old procedures still work
      const games = await trpc.games.getAll.query();
      expect(Array.isArray(games)).toBe(true);
      
      if (games.length > 0) {
        const gameId = games[0].id;
        
        const gameById = await trpc.games.getById.query({ id: gameId });
        expect(gameById).toBeDefined();
        expect(gameById?.id).toBe(gameId);
      }
    });
  });

  describe('Platform Service Integration', () => {
    it('should handle Epic Games API responses', async () => {
      const epicService = platformManager.getPlatformService('epic');
      expect(epicService).toBeDefined();
      
      // Test search functionality
      const searchResults = await epicService.searchGames('fortnite');
      expect(Array.isArray(searchResults)).toBe(true);
    });

    it('should handle GOG API responses', async () => {
      const gogService = platformManager.getPlatformService('gog');
      expect(gogService).toBeDefined();
      
      // Test search functionality
      const searchResults = await gogService.searchGames('witcher');
      expect(Array.isArray(searchResults)).toBe(true);
    });

    it('should handle rate limiting gracefully', async () => {
      const epicService = platformManager.getPlatformService('epic');
      
      // Make multiple rapid requests to test rate limiting
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(epicService.searchGames('game'));
      }
      
      const results = await Promise.allSettled(promises);
      expect(results.length).toBe(3);
      
      // At least some should succeed (rate limiting should prevent complete failure)
      const successfulResults = results.filter(r => r.status === 'fulfilled');
      expect(successfulResults.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid game IDs gracefully', async () => {
      await expect(
        trpc.games.getDetails.query({ gameId: 999999 })
      ).rejects.toThrow('Game not found');
    });

    it('should handle invalid platform names', async () => {
      // This should not throw, but return empty results
      const result = await trpc.games.getPlatformAvailability.query({
        gameName: 'ThisGameDefinitelyDoesNotExist12345',
      });
      
      expect(Array.isArray(result)).toBe(true);
      // May be empty, but shouldn't error
    });

    it('should provide graceful degradation when APIs are down', async () => {
      const result = await trpc.platforms.sync.mutate({ 
        platform: 'all', 
        force: false 
      });
      
      // Should return results even if some platforms fail
      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should search across platforms in under 2 seconds', async () => {
      const startTime = Date.now();
      
      await trpc.games.searchAll.query({
        query: 'test',
        filters: { platforms: ['epic', 'gog'] },
      });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // 2 seconds in ms
    });

    it('should handle concurrent platform searches efficiently', async () => {
      const startTime = Date.now();
      
      const searches = [
        trpc.games.searchAll.query({ query: 'game1', filters: { platforms: ['epic'] } }),
        trpc.games.searchAll.query({ query: 'game2', filters: { platforms: ['gog'] } }),
        trpc.games.searchAll.query({ query: 'game3', filters: { platforms: ['epic', 'gog'] } }),
      ];
      
      await Promise.all(searches);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds combined
    });
  });
});