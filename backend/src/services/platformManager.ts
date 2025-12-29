import { PlatformApi, PlatformSyncResult } from './platformApi.js';
import { EpicGamesService } from './epicGamesService.js';
import { GogService } from './gogService.js';
import type { Platform } from '../db/schema.js';

export class PlatformManager {
  private platforms: Map<Platform, PlatformApi> = new Map();

  constructor() {
    this.registerPlatform('epic', new EpicGamesService());
    this.registerPlatform('gog', new GogService());
  }

  private registerPlatform(platform: Platform, service: PlatformApi): void {
    this.platforms.set(platform, service);
  }

  getPlatformService(platform: Platform): PlatformApi | undefined {
    return this.platforms.get(platform);
  }

  getAllPlatformServices(): PlatformApi[] {
    return Array.from(this.platforms.values());
  }

  async searchAllPlatforms(query: string, filters?: any): Promise<any[]> {
    const results = await Promise.allSettled(
      this.getAllPlatformServices().map(async (service) => {
        try {
          const games = await service.searchGames(query, filters);
          return games.map(game => ({
            ...game,
            platform: service.platform,
          }));
        } catch (error) {
          console.error(`Error searching ${service.platform}:`, error);
          return []; // Return empty array for failed platform searches
        }
      })
    );

    // Flatten results and filter out failed promises
    return results
      .filter((result): result is PromiseFulfilledResult<any[]> => result.status === 'fulfilled')
      .flatMap(result => result.value);
  }

  async syncPlatform(platform: Platform | 'all', options?: { force?: boolean }): Promise<PlatformSyncResult[]> {
    const platformsToSync = platform === 'all' 
      ? Array.from(this.platforms.keys())
      : [platform];

    const results = await Promise.allSettled(
      platformsToSync.map(async (p) => {
        const service = this.getPlatformService(p);
        if (!service) {
          throw new Error(`Platform service not found: ${p}`);
        }
        return await service.syncGames(options);
      })
    );

    return results.map((result, index) => {
      const platformName = platformsToSync[index];
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          gamesSynced: 0,
          errors: [`Failed to sync ${platformName}: ${result.reason}`],
          durationMs: 0,
        };
      }
    });
  }

  async getGameDetails(platform: Platform, platformId: string): Promise<any> {
    const service = this.getPlatformService(platform);
    if (!service) {
      throw new Error(`Platform service not found: ${platform}`);
    }

    const game = await service.getGameDetails(platformId);
    if (!game) {
      throw new Error(`Game not found: ${platformId} on ${platform}`);
    }

    return {
      ...game,
      platform,
    };
  }

  async getPlatformAvailability(gameName: string): Promise<any[]> {
    const results = await Promise.allSettled(
      this.getAllPlatformServices().map(async (service) => {
        try {
          return await service.getPlatformAvailability(gameName);
        } catch (error) {
          console.error(`Error getting availability from ${service.platform}:`, error);
          return [];
        }
      })
    );

    return results
      .filter((result): result is PromiseFulfilledResult<any[]> => result.status === 'fulfilled')
      .flatMap(result => result.value);
  }
}