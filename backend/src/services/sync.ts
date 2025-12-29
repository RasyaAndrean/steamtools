import { db } from '../db/index.js';
import { 
  games, 
  gamePlatforms, 
  platformSyncLog,
  type Platform 
} from '../db/schema.js';
import { 
  searchEpicGames, 
  getEpicGameDetails, 
  normalizeEpicGame 
} from './epic.js';
import { 
  searchGOGGames, 
  getGOGGameDetails, 
  normalizeGOGGame 
} from './gog.js';
import { 
  searchSteamGames, 
  getSteamGameDetails,
  getSteamPrice,
  normalizeSteamGame 
} from './steam.js';
import { and, eq, or, like, desc } from 'drizzle-orm';

const SYNC_BATCH_SIZE = 50;

interface SyncResult {
  platform: Platform;
  success: boolean;
  gamesProcessed: number;
  gamesAdded: number;
  gamesUpdated: number;
  error?: string;
}

async function createSyncLog(
  platform: Platform, 
  syncType: 'full' | 'incremental' | 'manual'
): Promise<number> {
  const [log] = await db.insert(platformSyncLog).values({
    platform,
    syncType,
    status: 'running',
  });
  
  return log.id;
}

async function updateSyncLog(
  logId: number,
  updates: Partial<typeof platformSyncLog.$inferInsert>
): Promise<void> {
  await db.update(platformSyncLog)
    .set(updates)
    .where(eq(platformSyncLog.id, logId));
}

async function findOrCreateGame(
  normalizedName: string,
  normalizedDescription: string,
  normalizedCoverImage: string | null
): Promise<number> {
  // Try to find existing game by name similarity
  const existingGames = await db.select()
    .from(games)
    .where(eq(games.name, normalizedName))
    .limit(1);
  
  if (existingGames.length > 0) {
    return existingGames[0].id;
  }
  
  // Create new game entry
  const [game] = await db.insert(games).values({
    name: normalizedName,
    description: normalizedDescription,
    coverImage: normalizedCoverImage,
    isMultiPlatform: false,
    platforms: null,
  });
  
  return game.id;
}

async function upsertGamePlatform(
  gameId: number,
  platform: Platform,
  platformId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  platformData: any
): Promise<number> {
  // Normalize price data
  const price = platformData.platformData?.price ? 
    String(platformData.platformData.price) : null;
  
  // Check if game platform exists
  const existing = await db.select()
    .from(gamePlatforms)
    .where(
      and(
        eq(gamePlatforms.gameId, gameId),
        eq(gamePlatforms.platform, platform)
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    // Update existing
    await db.update(gamePlatforms)
      .set({
        platformId,
        platformName: platformData.platformData?.platformName || null,
        price,
        priceCurrency: platformData.platformData?.currency || 'USD',
        discountPercent: platformData.platformData?.discountPercent || 0,
        url: platformData.platformData?.url,
        imageUrl: platformData.platformData?.imageUrl,
        isAvailable: platformData.platformData?.isAvailable ?? true,
        metadata: JSON.stringify(platformData.platformData?.metadata || {}),
        lastCheckedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(gamePlatforms.id, existing[0].id));
    
    return existing[0].id;
  }
  
  // Insert new
  const [gamePlatform] = await db.insert(gamePlatforms).values({
    gameId,
    platform,
    platformId,
    platformName: platformData.platformData?.platformName || null,
    price,
    priceCurrency: platformData.platformData?.currency || 'USD',
    discountPercent: platformData.platformData?.discountPercent || 0,
    url: platformData.platformData?.url,
    imageUrl: platformData.platformData?.imageUrl,
    isAvailable: platformData.platformData?.isAvailable ?? true,
    metadata: JSON.stringify(platformData.platformData?.metadata || {}),
    lastCheckedAt: new Date(),
  });
  
  return gamePlatform.id;
}

async function updateGamePlatformsArray(gameId: number): Promise<void> {
  const gamePlatformEntries = await db.select()
    .from(gamePlatforms)
    .where(eq(gamePlatforms.gameId, gameId));
  
  const platforms = [...new Set(gamePlatformEntries.map(p => p.platform))] as Platform[];
  
  await db.update(games)
    .set({
      platforms: JSON.stringify(platforms),
      isMultiPlatform: platforms.length > 1,
      updatedAt: new Date(),
    })
    .where(eq(games.id, gameId));
}

export async function syncEpicGames(options: {
  query?: string;
  fullSync?: boolean;
  manual?: boolean;
}): Promise<SyncResult> {
  const { query, fullSync = false, manual = true } = options;
  
  const syncLogId = await createSyncLog('epic', manual ? 'manual' : fullSync ? 'full' : 'incremental');
  
  try {
    let gamesProcessed = 0;
    let gamesAdded = 0;
    let gamesUpdated = 0;
    
    // Fetch games from Epic API
    const result = await searchEpicGames({
      query,
      count: SYNC_BATCH_SIZE,
    });
    
    for (const epicGame of result.games) {
      try {
        const normalizedGame = normalizeEpicGame(epicGame);
        
        // Find or create base game
        const gameId = await findOrCreateGame(
          normalizedGame.name,
          normalizedGame.description,
          normalizedGame.coverImage
        );
        
        // Check if this is an add or update
        const existing = await db.select()
          .from(gamePlatforms)
          .where(
            and(
              eq(gamePlatforms.gameId, gameId),
              eq(gamePlatforms.platform, 'epic')
            )
          )
          .limit(1);
        
        if (existing.length === 0) {
          gamesAdded++;
        } else {
          gamesUpdated++;
        }
        
        // Upsert game platform
        await upsertGamePlatform(gameId, 'epic', epicGame.id, normalizedGame);
        
        // Update game's platforms array
        await updateGamePlatformsArray(gameId);
        
        gamesProcessed++;
      } catch (error) {
        console.error(`Error syncing Epic game ${epicGame.id}:`, error);
      }
    }
    
    await updateSyncLog(syncLogId, {
      status: 'completed',
      completedAt: new Date(),
      gamesProcessed,
      gamesAdded,
      gamesUpdated,
    });
    
    return {
      platform: 'epic',
      success: true,
      gamesProcessed,
      gamesAdded,
      gamesUpdated,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await updateSyncLog(syncLogId, {
      status: 'failed',
      completedAt: new Date(),
      errorMessage,
    });
    
    return {
      platform: 'epic',
      success: false,
      gamesProcessed: 0,
      gamesAdded: 0,
      gamesUpdated: 0,
      error: errorMessage,
    };
  }
}

export async function syncGOGGames(options: {
  query?: string;
  fullSync?: boolean;
  manual?: boolean;
}): Promise<SyncResult> {
  const { query, fullSync = false, manual = true } = options;
  
  const syncLogId = await createSyncLog('gog', manual ? 'manual' : fullSync ? 'full' : 'incremental');
  
  try {
    let gamesProcessed = 0;
    let gamesAdded = 0;
    let gamesUpdated = 0;
    
    // Fetch games from GOG API
    const result = await searchGOGGames({
      query,
      limit: SYNC_BATCH_SIZE,
    });
    
    for (const gogGame of result.games) {
      try {
        const normalizedGame = normalizeGOGGame(gogGame);
        
        // Find or create base game
        const gameId = await findOrCreateGame(
          normalizedGame.name,
          normalizedGame.description,
          normalizedGame.coverImage
        );
        
        // Check if this is an add or update
        const existing = await db.select()
          .from(gamePlatforms)
          .where(
            and(
              eq(gamePlatforms.gameId, gameId),
              eq(gamePlatforms.platform, 'gog')
            )
          )
          .limit(1);
        
        if (existing.length === 0) {
          gamesAdded++;
        } else {
          gamesUpdated++;
        }
        
        // Upsert game platform
        await upsertGamePlatform(gameId, 'gog', String(gogGame.id), normalizedGame);
        
        // Update game's platforms array
        await updateGamePlatformsArray(gameId);
        
        gamesProcessed++;
      } catch (error) {
        console.error(`Error syncing GOG game ${gogGame.id}:`, error);
      }
    }
    
    await updateSyncLog(syncLogId, {
      status: 'completed',
      completedAt: new Date(),
      gamesProcessed,
      gamesAdded,
      gamesUpdated,
    });
    
    return {
      platform: 'gog',
      success: true,
      gamesProcessed,
      gamesAdded,
      gamesUpdated,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await updateSyncLog(syncLogId, {
      status: 'failed',
      completedAt: new Date(),
      errorMessage,
    });
    
    return {
      platform: 'gog',
      success: false,
      gamesProcessed: 0,
      gamesAdded: 0,
      gamesUpdated: 0,
      error: errorMessage,
    };
  }
}

export async function syncSteamGames(options: {
  query?: string;
  fullSync?: boolean;
  manual?: boolean;
}): Promise<SyncResult> {
  const { query, fullSync = false, manual = true } = options;
  
  const syncLogId = await createSyncLog('steam', manual ? 'manual' : fullSync ? 'full' : 'incremental');
  
  try {
    let gamesProcessed = 0;
    let gamesAdded = 0;
    let gamesUpdated = 0;
    
    // Fetch games from Steam API
    const result = await searchSteamGames({ query });
    
    // Process in batches
    const gamesToProcess = result.games.slice(0, SYNC_BATCH_SIZE);
    
    for (const steamGame of gamesToProcess) {
      try {
        const normalizedGame = normalizeSteamGame(steamGame.appId, { name: steamGame.name });
        
        // Find or create base game
        const gameId = await findOrCreateGame(
          normalizedGame.name,
          normalizedGame.description,
          normalizedGame.coverImage
        );
        
        // Fetch detailed data including price
        const details = await getSteamGameDetails(steamGame.appId);
        if (details?.data) {
          normalizedGame.description = details.data.short_description || '';
          normalizedGame.developer = details.data.developers?.[0] || null;
          normalizedGame.releaseDate = details.data.release_date?.date ? 
            new Date(details.data.release_date.date) : null;
          normalizedGame.genres = details.data.genres?.map(g => g.description) || [];
          normalizedGame.coverImage = details.data.header_image;
          
          // Get price if available
          const priceData = await getSteamPrice(steamGame.appId);
          if (priceData) {
            normalizedGame.platformData.price = priceData.price;
            normalizedGame.platformData.originalPrice = priceData.originalPrice;
            normalizedGame.platformData.discountPercent = priceData.discountPercent;
            normalizedGame.platformData.currency = priceData.currency;
          }
        }
        
        // Check if this is an add or update
        const existing = await db.select()
          .from(gamePlatforms)
          .where(
            and(
              eq(gamePlatforms.gameId, gameId),
              eq(gamePlatforms.platform, 'steam')
            )
          )
          .limit(1);
        
        if (existing.length === 0) {
          gamesAdded++;
        } else {
          gamesUpdated++;
        }
        
        // Upsert game platform
        await upsertGamePlatform(gameId, 'steam', steamGame.appId, normalizedGame);
        
        // Update game's platforms array
        await updateGamePlatformsArray(gameId);
        
        gamesProcessed++;
      } catch (error) {
        console.error(`Error syncing Steam game ${steamGame.appId}:`, error);
      }
    }
    
    await updateSyncLog(syncLogId, {
      status: 'completed',
      completedAt: new Date(),
      gamesProcessed,
      gamesAdded,
      gamesUpdated,
    });
    
    return {
      platform: 'steam',
      success: true,
      gamesProcessed,
      gamesAdded,
      gamesUpdated,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await updateSyncLog(syncLogId, {
      status: 'failed',
      completedAt: new Date(),
      errorMessage,
    });
    
    return {
      platform: 'steam',
      success: false,
      gamesProcessed: 0,
      gamesAdded: 0,
      gamesUpdated: 0,
      error: errorMessage,
    };
  }
}

export async function syncAllPlatforms(options: {
  query?: string;
  fullSync?: boolean;
  manual?: boolean;
} = {}): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  
  // Sync all platforms in parallel
  const [epicResult, gogResult, steamResult] = await Promise.allSettled([
    syncEpicGames(options),
    syncGOGGames(options),
    syncSteamGames(options),
  ]);
  
  if (epicResult.status === 'fulfilled') {
    results.push(epicResult.value);
  }
  
  if (gogResult.status === 'fulfilled') {
    results.push(gogResult.value);
  }
  
  if (steamResult.status === 'fulfilled') {
    results.push(steamResult.value);
  }
  
  return results;
}

export async function getSyncStatus(): Promise<Array<{
  platform: Platform;
  lastSync: Date | null;
  status: string | null;
}>> {
  const latestSyncs = await db.select()
    .from(platformSyncLog)
    .orderBy(desc(platformSyncLog.startedAt));
  
  const platforms: Platform[] = ['steam', 'epic', 'gog'];
  
  return platforms.map(platform => {
    const latest = latestSyncs
      .filter(s => s.platform === platform)
      .sort((a, b) => 
        (b.startedAt?.getTime() || 0) - (a.startedAt?.getTime() || 0)
      )[0];
    
    return {
      platform,
      lastSync: latest?.completedAt || null,
      status: latest?.status || null,
    };
  });
}
