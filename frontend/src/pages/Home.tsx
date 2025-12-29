import { useState } from 'react';
import { trpc } from '../utils/trpc';
import Card from '../components/Card';
import Button from '../components/Button';
import PlatformBadge, { PlatformBadges } from '../components/PlatformBadge';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Array<'steam' | 'epic' | 'gog'>>([]);

  const { data: gamesData, isLoading } = trpc.games.searchAll.useQuery({
    query: searchQuery || undefined,
    platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
    limit: 20,
  });

  const { data: syncStatus } = trpc.platforms.getStatus.useQuery();

  const togglePlatform = (platform: 'steam' | 'epic' | 'gog') => {
    setSelectedPlatforms(prev => 
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const platforms: Array<'steam' | 'epic' | 'gog'> = ['steam', 'epic', 'gog'];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold mb-4">STEAMTOOLS</h1>
        <p className="text-2xl font-semibold mb-8">
          Track Prices. Manage Your Library. Never Miss a Deal.
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="accent">GET STARTED</Button>
          <Button variant="secondary">LEARN MORE</Button>
        </div>
      </div>

      {/* Search Section */}
      <Card className="mb-12">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search games across all platforms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border-3 border-black p-4 text-xl font-bold focus:outline-none focus:shadow-brutal-lg"
          />
          <Button variant="primary" className="text-xl px-8">
            SEARCH
          </Button>
        </div>
        
        {/* Platform Filter */}
        <div className="mt-4">
          <span className="font-bold text-lg mr-4">Filter by platform:</span>
          <div className="inline-flex gap-2">
            {platforms.map((platform) => (
              <button
                key={platform}
                onClick={() => togglePlatform(platform)}
                className={`
                  px-4 py-2 border-3 font-bold transition-all
                  ${selectedPlatforms.includes(platform)
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black hover:bg-gray-100'
                  }
                `}
              >
                {platform === 'steam' && '🎮 Steam'}
                {platform === 'epic' && '⚡ Epic'}
                {platform === 'gog' && '🐉 GOG'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Sync Status */}
      {syncStatus && (
        <Card className="mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <h3 className="text-xl font-bold">Platform Status</h3>
            <div className="flex gap-4">
              {syncStatus.map((status) => (
                <div key={status.platform} className="flex items-center gap-2">
                  <PlatformBadge platform={status.platform} size="sm" />
                  <span className={`font-bold ${
                    status.status === 'completed' ? 'text-green-600' :
                    status.status === 'running' ? 'text-yellow-600' :
                    status.status === 'failed' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>
                    {status.status || 'Never synced'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Search Results */}
      <section className="mb-16">
        <h2 className="text-4xl font-bold mb-8 text-center">
          {searchQuery ? `Search Results for "${searchQuery}"` : 'POPULAR GAMES'}
        </h2>
        
        {isLoading ? (
          <div className="text-center text-xl">Searching across platforms...</div>
        ) : gamesData && gamesData.games.length > 0 ? (
          <>
            <p className="text-lg text-center mb-6">
              Found {gamesData.total} games
              {selectedPlatforms.length > 0 && ` on ${selectedPlatforms.join(', ')}`}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gamesData.games.map((game) => {
                // Parse platforms from JSON string or use platformsData
                let gamePlatforms: Array<'steam' | 'epic' | 'gog'> = [];
                
                if (game.platformsData && game.platformsData.length > 0) {
                  gamePlatforms = game.platformsData.map(p => p.platform as 'steam' | 'epic' | 'gog');
                } else if (game.platforms) {
                  try {
                    gamePlatforms = JSON.parse(game.platforms);
                  } catch {
                    // Fallback to empty array
                  }
                }
                
                return (
                  <Card key={game.id}>
                    {game.coverImage && (
                      <img 
                        src={game.coverImage} 
                        alt={game.name}
                        className="w-full h-40 object-cover border-b-3 border-black mb-4"
                      />
                    )}
                    <h3 className="text-xl font-bold mb-2">{game.name}</h3>
                    
                    {gamePlatforms.length > 0 ? (
                      <div className="mb-3">
                        <PlatformBadges platforms={gamePlatforms} size="sm" />
                      </div>
                    ) : (
                      <PlatformBadges 
                        platforms={game.platformsData?.map(p => p.platform as 'steam' | 'epic' | 'gog') || []} 
                        size="sm" 
                      />
                    )}
                    
                    <p className="text-lg font-semibold mb-4">
                      {game.price ? `$${game.price}` : 'Price varies by platform'}
                    </p>
                    
                    <div className="flex gap-2">
                      <Button variant="accent" className="flex-1">
                        VIEW DETAILS
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
            
            {gamesData.hasMore && (
              <div className="text-center mt-8">
                <Button variant="secondary">LOAD MORE</Button>
              </div>
            )}
          </>
        ) : (
          <Card>
            <p className="text-center text-xl">
              {searchQuery 
                ? `No games found for "${searchQuery}". Try a different search term.`
                : 'No games available yet. Sync your platforms to get started!'
              }
            </p>
          </Card>
        )}
      </section>

      <section className="mb-16">
        <h2 className="text-4xl font-bold mb-8 text-center">FEATURES</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <h3 className="text-2xl font-bold mb-4">📊 PRICE TRACKING</h3>
            <p className="text-lg">
              Set target prices for games and get notified when they go on sale.
            </p>
          </Card>
          <Card>
            <h3 className="text-2xl font-bold mb-4">📚 CROSS-PLATFORM LIBRARY</h3>
            <p className="text-lg">
              Manage your games from Steam, Epic, and GOG in one unified library.
            </p>
          </Card>
          <Card>
            <h3 className="text-2xl font-bold mb-4">📈 PRICE HISTORY</h3>
            <p className="text-lg">
              View historical price data to make informed purchase decisions.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
