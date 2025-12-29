import { useState, useEffect } from 'react';
import { trpc } from '../utils/trpc';
import Card from './Card';
import Button from './Button';
import PriceComparisonCard from './PriceComparisonCard';

interface ComparisonDashboardProps {
  gameId: number;
}

export default function ComparisonDashboard({ gameId }: ComparisonDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'prices' | 'history'>('overview');

  const { data: comparison, isLoading: comparisonLoading } = trpc.gamesAdvanced.priceComparison.useQuery(
    { gameId }
  );

  const { data: recommendation } = trpc.gamesAdvanced.whereToBuy.useQuery(
    { gameId },
    { enabled: !!comparison }
  );

  const { data: gameDetails } = trpc.games.getDetails.useQuery(
    { gameId },
    { enabled: !!gameId }
  );

  const { data: priceHistory } = trpc.games.getPriceHistory.useQuery(
    { gameId },
    { enabled: activeTab === 'history' }
  );

  if (comparisonLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card>
          <div className="text-center py-12">
            <div className="text-2xl font-bold mb-4">Loading comparison...</div>
          </div>
        </Card>
      </div>
    );
  }

  if (!comparison || !gameDetails) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card>
          <div className="text-center py-12">
            <div className="text-2xl font-bold mb-2">Unable to load comparison</div>
            <p className="text-gray-600">Please try again later</p>
          </div>
        </Card>
      </div>
    );
  }

  const game = 'game' in gameDetails ? gameDetails.game : gameDetails;
  const platforms = 'platforms' in gameDetails ? gameDetails.platforms : [gameDetails.platform];

  const platformInfo = [
    { key: 'steam', name: 'Steam', icon: '🎮', color: 'bg-gray-800' },
    { key: 'epic', name: 'Epic Games', icon: '🎮', color: 'bg-gray-900' },
    { key: 'gog', name: 'GOG', icon: '🎮', color: 'bg-purple-900' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-start gap-6">
          {game.imageUrl && (
            <img
              src={game.imageUrl}
              alt={game.name}
              className="w-48 h-48 object-cover border-3 border-black flex-shrink-0"
            />
          )}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{game.name}</h1>
            {game.developer && (
              <p className="text-lg text-gray-600 mb-2">
                by {game.developer}
                {game.publisher && game.publisher !== game.developer && `, ${game.publisher}`}
              </p>
            )}
            {game.description && (
              <p className="text-gray-700 mb-4 line-clamp-3">{game.description}</p>
            )}
            <div className="flex gap-2 flex-wrap">
              {game.genres && game.genres.split(',').map((genre, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-200 border-2 border-black text-sm font-semibold"
                >
                  {genre.trim()}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Where to Buy Recommendation */}
      {recommendation?.recommendation && (
        <Card className="bg-gradient-to-r from-accent-50 to-accent-100 border-accent">
          <div className="flex items-start gap-4">
            <span className="text-5xl">💡</span>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">Where to Buy</h2>
              <p className="text-lg mb-4">{recommendation.recommendation.reason}</p>
              <div className="flex gap-4">
                {platformInfo.find(p => p.key === recommendation.recommendation.platform)?.url && (
                  <Button variant="accent" onClick={() => {
                    const platformData = comparison[recommendation.recommendation.platform as keyof typeof comparison];
                    if (platformData?.url) {
                      window.open(platformData.url, '_blank');
                    }
                  }}>
                    Buy on {platformInfo.find(p => p.key === recommendation.recommendation.platform)?.name}
                  </Button>
                )}
              </div>
              
              {recommendation.alternatives && recommendation.alternatives.length > 0 && (
                <div className="mt-4 pt-4 border-t-2 border-accent-300">
                  <h4 className="font-bold mb-2">Alternative Options:</h4>
                  <ul className="space-y-1">
                    {recommendation.alternatives.map((alt: any, index: number) => (
                      <li key={index} className="text-sm">
                        <span className="font-semibold">{alt.type.replace('_', ' ').toUpperCase()}:</span> {alt.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'overview' ? 'accent' : 'secondary'}
          onClick={() => setActiveTab('overview')}
          className="flex-1"
        >
          Overview
        </Button>
        <Button
          variant={activeTab === 'prices' ? 'accent' : 'secondary'}
          onClick={() => setActiveTab('prices')}
          className="flex-1"
        >
          Price Comparison
        </Button>
        <Button
          variant={activeTab === 'history' ? 'accent' : 'secondary'}
          onClick={() => setActiveTab('history')}
          className="flex-1"
        >
          Price History
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Platform Availability */}
          <Card>
            <h3 className="text-xl font-bold mb-4 border-b-3 border-black pb-2">
              Platform Availability
            </h3>
            <div className="space-y-3">
              {platformInfo.map(({ key, name, icon, color }) => {
                const platformData = comparison[key as keyof typeof comparison];
                const isAvailable = platformData?.available === 'true';
                
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-4 border-3 ${
                      isAvailable ? 'border-black' : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{icon}</span>
                      <div>
                        <div className="font-bold">{name}</div>
                        {!isAvailable && (
                          <div className="text-sm text-gray-500">Not available</div>
                        )}
                        {key === 'gog' && platformData?.drmFree === 'true' && (
                          <div className="text-xs text-purple-600 font-semibold">DRM-free</div>
                        )}
                      </div>
                    </div>
                    
                    {isAvailable && platformData?.price !== null ? (
                      <div className="text-right">
                        {platformData.discountPercent > 0 && (
                          <div className="text-sm text-gray-600 line-through">
                            ${platformData.originalPrice?.toFixed(2)}
                          </div>
                        )}
                        <div className="text-xl font-bold">${platformData.price.toFixed(2)}</div>
                        {platformData.discountPercent > 0 && (
                          <div className="text-green-600 font-bold text-sm">
                            -{platformData.discountPercent}%
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Best Deals */}
          <Card>
            <h3 className="text-xl font-bold mb-4 border-b-3 border-black pb-2">
              Best Deals
            </h3>
            <div className="space-y-4">
              {comparison.bestDeal && comparison.bestDeal.discountPercent > 0 && (
                <div className="bg-green-50 border-2 border-green-500 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🏷️</span>
                    <span className="font-bold text-lg">Best Discount</span>
                  </div>
                  <p className="text-sm mb-2">
                    <span className="font-bold capitalize">{comparison.bestDeal.platform}</span> has the highest discount
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-green-600">
                      -{comparison.bestDeal.discountPercent}%
                    </span>
                    <span className="text-gray-600">
                      Save ${(comparison.bestDeal.originalPrice - comparison.bestDeal.price).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {comparison.cheapestOption && (
                <div className="bg-blue-50 border-2 border-blue-500 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">💰</span>
                    <span className="font-bold text-lg">Lowest Price</span>
                  </div>
                  <p className="text-sm mb-2">
                    <span className="font-bold capitalize">{comparison.cheapestOption.platform}</span> has the best price
                  </p>
                  <div className="text-2xl font-bold text-blue-600">
                    ${comparison.cheapestOption.price.toFixed(2)}
                  </div>
                </div>
              )}

              {comparison.gog?.drmFree === 'true' && (
                <div className="bg-purple-50 border-2 border-purple-500 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🔓</span>
                    <span className="font-bold text-lg">DRM-Free</span>
                  </div>
                  <p className="text-sm">
                    GOG offers a DRM-free version with no online restrictions
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'prices' && (
        <PriceComparisonCard gameId={gameId} />
      )}

      {activeTab === 'history' && (
        <Card>
          <h3 className="text-xl font-bold mb-4 border-b-3 border-black pb-2">
            Price History
          </h3>
          {!priceHistory || priceHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              No price history available for this game
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {priceHistory.slice().reverse().map((record, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 border-2 border-gray-300 hover:border-black"
                >
                  <div className="flex-1">
                    <div className="font-semibold">${record.price.toFixed(2)}</div>
                    {record.discountPercent > 0 && (
                      <div className="text-sm text-green-600">
                        -{record.discountPercent}% off
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(record.recordedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Game Info */}
      <Card>
        <h3 className="text-xl font-bold mb-4 border-b-3 border-black pb-2">
          Game Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {game.developer && (
            <div>
              <div className="text-sm text-gray-600">Developer</div>
              <div className="font-semibold">{game.developer}</div>
            </div>
          )}
          {game.publisher && (
            <div>
              <div className="text-sm text-gray-600">Publisher</div>
              <div className="font-semibold">{game.publisher}</div>
            </div>
          )}
          {game.releaseDate && (
            <div>
              <div className="text-sm text-gray-600">Release Date</div>
              <div className="font-semibold">
                {new Date(game.releaseDate).toLocaleDateString()}
              </div>
            </div>
          )}
          {game.metacriticScore && (
            <div>
              <div className="text-sm text-gray-600">Metacritic Score</div>
              <div className={`font-bold text-lg ${
                game.metacriticScore >= 75 ? 'text-green-600' :
                game.metacriticScore >= 50 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {game.metacriticScore}/100
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
