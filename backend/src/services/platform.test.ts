import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry, getCache, setCache, invalidateCache, normalizeEpicGame, normalizeGOGGame, normalizeSteamGame, PLATFORM_ENDPOINTS, type Platform } from '../src/services/platform.js';

// Mock fetch
global.fetch = vi.fn() as unknown as typeof fetch;

describe('Platform Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCache('.*');
  });

  describe('fetchWithRetry', () => {
    it('should return data on successful request', async () => {
      const mockData = { success: true, data: 'test' };
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await fetchWithRetry('https://test.com/api');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockData = { success: true };
      (global.fetch as unknown as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, json: async () => mockData });

      const result = await fetchWithRetry('https://test.com/api', {}, 3, 10);

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(fetchWithRetry('https://test.com/api', {}, 2, 10)).rejects.toThrow('HTTP 500: Internal Server Error');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache', () => {
    it('should store and retrieve cached data', () => {
      const testData = { name: 'test game', price: 29.99 };
      
      setCache('test:key', testData, 60000);
      const result = getCache<typeof testData>('test:key');
      
      expect(result).toEqual(testData);
    });

    it('should return null for expired cache', async () => {
      const testData = { name: 'test game' };
      
      setCache('test:expired', testData, 0);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = getCache<typeof testData>('test:expired');
      expect(result).toBeNull();
    });

    it('should invalidate cache by pattern', () => {
      setCache('test:1', { data: 'test1' });
      setCache('test:2', { data: 'test2' });
      setCache('other:1', { data: 'other' });

      invalidateCache('test:.*');

      expect(getCache('test:1')).toBeNull();
      expect(getCache('test:2')).toBeNull();
      expect(getCache('other:1')).not.toBeNull();
    });
  });

  describe('normalizeEpicGame', () => {
    it('should correctly normalize Epic game data', () => {
      const epicGame = {
        id: 'test-id-123',
        title: 'Test Game',
        shortDescription: 'A great game',
        description: 'Full description',
        productSlug: 'test-game',
        keyImages: [
          { type: 'DieselGameBox', url: 'https://example.com/box.jpg' },
          { type: 'Thumbnail', url: 'https://example.com/thumb.jpg' },
        ],
        price: {
          totalPrice: {
            discountPrice: 1999,
            originalPrice: 3999,
            currencyCode: 'USD',
          },
        },
        categories: [
          { path: 'games', name: 'Games' },
          { path: 'games/action', name: 'Action' },
        ],
        releaseDate: '2024-01-15',
        publisher: 'Test Publisher',
        developer: 'Test Developer',
      };

      const result = normalizeEpicGame(epicGame);

      expect(result.name).toBe('Test Game');
      expect(result.description).toBe('A great game');
      expect(result.coverImage).toBe('https://example.com/box.jpg');
      expect(result.genres).toEqual(['Games', 'Action']);
      expect(result.developer).toBe('Test Developer');
      expect(result.releaseDate).toEqual(new Date('2024-01-15'));
      expect(result.platformData.platform).toBe('epic');
      expect(result.platformData.platformId).toBe('test-id-123');
      expect(result.platformData.price).toBe(1999);
      expect(result.platformData.originalPrice).toBe(3999);
      expect(result.platformData.currency).toBe('USD');
      expect(result.platformData.discountPercent).toBe(50);
    });

    it('should handle missing data gracefully', () => {
      const minimalGame = {
        id: 'minimal-id',
        title: 'Minimal Game',
        shortDescription: undefined,
        description: undefined,
        productSlug: undefined,
        keyImages: [],
        price: undefined,
        categories: [],
        releaseDate: '',
        publisher: undefined,
        developer: undefined,
      };

      const result = normalizeEpicGame(minimalGame);

      expect(result.name).toBe('Minimal Game');
      expect(result.description).toBe('');
      expect(result.coverImage).toBeNull();
      expect(result.genres).toEqual([]);
      expect(result.developer).toBeNull();
      expect(result.releaseDate).toBeNull();
    });
  });

  describe('normalizeGOGGame', () => {
    it('should correctly normalize GOG game data', () => {
      const gogGame = {
        id: 12345,
        title: 'GOG Game',
        overview: 'An amazing game',
        description: 'Full description',
        images: {
          logo: 'https://example.com/logo.jpg',
          boxArtImage: 'https://example.com/box.jpg',
        },
        price: {
          finalAmount: 1499,
          originalAmount: 2999,
          currency: 'USD',
          discountPercent: 50,
        },
        genre: ['Action', 'RPG'],
        releaseDate: '2024-02-20',
        publisher: 'GOG Publisher',
        developer: 'GOG Developer',
        isDRMFree: true,
        slug: 'gog-game',
      };

      const result = normalizeGOGGame(gogGame);

      expect(result.name).toBe('GOG Game');
      expect(result.description).toBe('An amazing game');
      expect(result.coverImage).toBe('https://example.com/logo.jpg');
      expect(result.genres).toEqual(['Action', 'RPG']);
      expect(result.developer).toBe('GOG Developer');
      expect(result.releaseDate).toEqual(new Date('2024-02-20'));
      expect(result.platformData.platform).toBe('gog');
      expect(result.platformData.platformId).toBe('12345');
      expect(result.platformData.price).toBe(1499);
      expect(result.platformData.originalPrice).toBe(2999);
      expect(result.platformData.discountPercent).toBe(50);
      expect(result.platformData.metadata.isDRMFree).toBe(true);
    });
  });

  describe('normalizeSteamGame', () => {
    it('should correctly normalize Steam game data', () => {
      const steamGame = {
        name: 'Steam Game',
        type: 'game',
      };

      const result = normalizeSteamGame('12345', steamGame);

      expect(result.name).toBe('Steam Game');
      expect(result.platformData.platform).toBe('steam');
      expect(result.platformData.platformId).toBe('12345');
      expect(result.platformData.url).toBe('https://store.steampowered.com/app/12345');
      expect(result.platformData.imageUrl).toBe('https://steamcdn-a.akamaihd.net/steam/apps/12345/header.jpg');
    });
  });

  describe('PLATFORM_ENDPOINTS', () => {
    it('should have correct Epic endpoint', () => {
      expect(PLATFORM_ENDPOINTS.epic.catalog).toBe('https://store.epicgames.com/graphql');
    });

    it('should have correct GOG products endpoint with params', () => {
      const url = PLATFORM_ENDPOINTS.gog.products(1, 'test');
      expect(url).toContain('page=1');
      expect(url).toContain('search=test');
    });

    it('should have correct Steam API endpoint', () => {
      expect(PLATFORM_ENDPOINTS.steam.api).toBe('https://api.steampowered.com/ISteamApps/GetAppList/v2/');
    });
  });
});
