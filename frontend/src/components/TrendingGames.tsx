import { trpc } from '../utils/trpc';
import Card from './Card';
import Button from './Button';
import { useState } from 'react';

interface TrendingGamesProps {
  timeframe?: 'week' | 'month';
  limit?: number;
}

export default function TrendingGames({ timeframe = 'week', limit = 10 }: TrendingGamesProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month'>(timeframe);

  const { data: trendingData, isLoading } = trpc.gamesAdvanced.getTrending.useQuery({
    timeframe: selectedTimeframe,
    limit,
  });

  const platformIcons: Record<string, string> = {
    steam: '🎮',
    epic: '🎮',
    gog: '🎮',
  };

  const platformColors: Record<string, string> = {
    steam: 'bg-gray-800 text-white',
    epic: 'bg-gray-900 text-white',
    gog: 'bg-purple-900 text-white',
  };

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="text-xl font-bold mb-2">Loading trending games...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="border-b-3 border-black pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-1">🔥 Trending Games</h3>
            <p className="text-gray-600">Most searched and compared games</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setSelectedTimeframe('week')}
              variant={selectedTimeframe === 'week' ? 'accent' : 'secondary'}
              className="text-sm py-2"
            >
              This Week
            </Button>
            <Button
              onClick={() => setSelectedTimeframe('month')}
              variant={selectedTimeframe === 'month' ? 'accent' : 'secondary'}
              className="text-sm py-2"
            >
              This Month
            </Button>
          </div>
        </div>
      </div>

      {!trendingData || trendingData.games.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-xl font-bold mb-2">No trending games yet</div>
          <p className="text-gray-600">Start searching to see trending games here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trendingData.games.map((game, index) => (
            <div
              key={game.id}
              className="flex items-center gap-4 p-4 border-2 border-gray-300 hover:border-black hover:shadow-brutal-sm transition-all cursor-pointer"
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-primary text-white font-bold text-2xl border-3 border-black">
                {index + 1}
              </div>

              {/* Game Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-lg mb-1 truncate">{game.name}</h4>
                
                {game.platforms && game.platforms.length > 0 && (
                  <div className="flex items-center gap-2 mb-1">
                    {game.platforms.slice(0, 3).map((platform: any) => (
                      <span
                        key={platform.platform}
                        className={`px-2 py-0.5 text-xs font-bold border-2 border-black ${platformColors[platform.platform]}`}
                      >
                        {platformIcons[platform.platform]} {platform.platform}
                      </span>
                    ))}
                  </div>
                )}

                {game.genres && (
                  <div className="text-sm text-gray-600 truncate">
                    {game.genres.split(',').slice(0, 2).join(', ')}
                  </div>
                )}
              </div>

              {/* Price Info */}
              <div className="flex-shrink-0 text-right">
                {game.platforms && game.platforms.length > 0 && game.platforms[0].price !== null ? (
                  <div>
                    <div className="text-xl font-bold">
                      ${game.platforms[0].price.toFixed(2)}
                    </div>
                    {game.platforms[0].discountPercent > 0 && (
                      <div className="text-sm text-green-600 font-bold">
                        -{game.platforms[0].discountPercent}%
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-500">N/A</span>
                )}
              </div>

              {/* Search Count */}
              <div className="flex-shrink-0 text-center">
                <div className="text-xs text-gray-500">Searches</div>
                <div className="font-bold text-lg">{game.searchCount || '-'}</div>
              </div>

              {/* View Button */}
              <Button
                variant="secondary"
                className="flex-shrink-0"
                onClick={() => window.location.href = `/search?q=${encodeURIComponent(game.name)}`}
              >
                VIEW
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
