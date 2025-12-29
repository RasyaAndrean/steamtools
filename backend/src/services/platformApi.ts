import { gamePlatforms, platformSyncLog } from '../db/schema.js';
import { db } from '../db/index.js';
import { eq, and, sql } from 'drizzle-orm';

export interface PlatformGame {
  platformId: string;
  name: string;
  description?: string | null;
  shortDescription?: string | null;
  imageUrl?: string | null;
  genres?: string | null;
  tags?: string | null;
  developer?: string | null;
  publisher?: string | null;
  releaseDate?: Date | null;
  metacriticScore?: number | null;
  platformPrice?: number | null;
  originalPrice?: number | null;
  discountPercent?: number | null;
  currency?: string;
  platformUrl?: string | null;
  available?: Available;
  drmFree?: DrmFree;
}

export interface PlatformSyncResult {
  success: boolean;
  gamesSynced: number;
  errors: string[];
  durationMs: number;
}

export abstract class PlatformApi {
  public platform: Platform;
  protected cacheTtlHours: number;
  protected rateLimitDelay: number;

  constructor(platform: Platform, cacheTtlHours = 12, rateLimitDelay = 1000) {
    this.platform = platform;
    this.cacheTtlHours = cacheTtlHours;
    this.rateLimitDelay = rateLimitDelay;
  }

  abstract searchGames(query: string, filters?: any): Promise<PlatformGame[]>;
  abstract getGameDetails(platformId: string): Promise<PlatformGame | null>;
  abstract syncGames(options?: { force?: boolean }): Promise<PlatformSyncResult>;

  protected async shouldSync(): Promise<boolean> {
    const [lastSync] = await db
      .select()
      .from(platformSyncLog)
      .where(
        and(
          eq(platformSyncLog.platform, this.platform),
          eq(platformSyncLog.status, 'success')
        )
      )
      .orderBy(platformSyncLog.completedAt);

    if (!lastSync?.completedAt) return true;

    const hoursSinceLastSync = (Date.now() - lastSync.completedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastSync >= this.cacheTtlHours;
  }

  protected async logSync(
    type: SyncType,
    status: SyncStatus,
    gamesSynced: number,
    errors: string[] = []
  ): Promise<void> {
    await db.insert(platformSyncLog).values({
      platform: this.platform,
      syncType: type,
      status: status,
      gamesSynced: gamesSynced,
      errors: errors.join('\n'),
      startedAt: new Date(Date.now() - (gamesSynced * this.rateLimitDelay)),
      completedAt: new Date(),
    });
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getPlatformAvailability(gameName: string): Promise<any[]> {
    const results = await db
      .select()
      .from(gamePlatforms)
      .where(eq(gamePlatforms.platform, this.platform));

    return results.map(result => ({
      platform: this.platform,
      platformId: result.platformId,
      name: gameName,
      price: result.platformPrice,
      available: result.available === 'true',
      url: result.platformUrl,
    }));
  }
}

export { Platform };