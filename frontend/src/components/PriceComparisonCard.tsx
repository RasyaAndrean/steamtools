import { useState } from 'react';
import { trpc } from '../utils/trpc';
import Card from './Card';
import Button from './Button';

interface PriceComparisonCardProps {
  gameId?: number;
  gameName?: string;
}

interface PlatformPrice {
  platform: string;
  price: number | null;
  originalPrice: number | null;
  discountPercent: number;
  url?: string;
  available?: string;
  drmFree?: string;
}

export default function PriceComparisonCard({ gameId, gameName }: PriceComparisonCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const { data: comparison, isLoading, error } = trpc.gamesAdvanced.priceComparison.useQuery(
    { gameId: gameId!, gameName },
    { enabled: !!gameId || !!gameName }
  );

  const { data: recommendation } = trpc.gamesAdvanced.whereToBuy.useQuery(
    { gameId: gameId! },
    { enabled: !!gameId && !!comparison }
  );

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="text-xl font-bold mb-2">Loading prices...</div>
        </div>
      </Card>
    );
  }

  if (error || !comparison) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="text-xl font-bold mb-2">Price comparison unavailable</div>
          <p className="text-gray-600">Try searching for a different game</p>
        </div>
      </Card>
    );
  }

  const platforms = [
    { key: 'steam', name: 'Steam', icon: '🎮' },
    { key: 'epic', name: 'Epic Games', icon: '🎮' },
    { key: 'gog', name: 'GOG', icon: '🎮' },
  ] as const;

  const cheapestPlatform = comparison.cheapestOption?.platform;
  const bestDealPlatform = comparison.bestDeal?.platform;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <div className="border-b-3 border-black pb-4 mb-4">
        <h3 className="text-2xl font-bold mb-2">Price Comparison</h3>
        <p className="text-gray-600">Find the best deal across all platforms</p>
      </div>

      {/* Platform Prices */}
      <div className="space-y-3 mb-6">
        {platforms.map(({ key, name, icon }) => {
          const platformData = comparison[key as keyof typeof comparison] as PlatformPrice | null;
          
          if (!platformData || !platformData.price) {
            return (
              <div
                key={key}
                className="flex items-center justify-between p-4 border-2 border-gray-300 bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <span className="font-bold text-lg">{name}</span>
                </div>
                <span className="text-gray-500 font-semibold">Not available</span>
              </div>
            );
          }

          const isCheapest = cheapestPlatform === key;
          const isBestDeal = bestDealPlatform === key;
          
          return (
            <div
              key={key}
              className={`flex items-center justify-between p-4 border-3 ${
                isCheapest ? 'border-accent bg-accent-10' : 'border-black'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{name}</span>
                    {isCheapest && (
                      <span className="bg-accent text-white px-2 py-1 text-sm font-bold">LOWEST</span>
                    )}
                    {isBestDeal && platformData.discountPercent > 0 && (
                      <span className="bg-green-600 text-white px-2 py-1 text-sm font-bold">
                        -{platformData.discountPercent}%
                      </span>
                    )}
                  </div>
                  {key === 'gog' && platformData.drmFree === 'true' && (
                    <span className="text-sm text-gray-600">DRM-free</span>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                {platformData.discountPercent > 0 && (
                  <div className="text-sm text-gray-600 line-through">
                    ${platformData.originalPrice?.toFixed(2)}
                  </div>
                )}
                <div className="text-2xl font-bold">${platformData.price.toFixed(2)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Where to Buy Recommendation */}
      {recommendation?.recommendation && (
        <div className="bg-primary-50 border-3 border-primary p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">💡</span>
            <div className="flex-1">
              <h4 className="font-bold text-lg mb-1">Where to Buy</h4>
              <p className="font-semibold mb-2">{recommendation.recommendation.reason}</p>
              {platforms.find(p => p.key === recommendation.recommendation.platform)?.url && (
                <Button
                  variant="accent"
                  onClick={() => {
                    const platformData = comparison[recommendation.recommendation.platform as keyof typeof comparison] as PlatformPrice;
                    if (platformData?.url) {
                      window.open(platformData.url, '_blank');
                    }
                  }}
                  className="text-sm py-2"
                >
                  Buy on {platforms.find(p => p.key === recommendation.recommendation.platform)?.name}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Savings Summary */}
      {comparison.cheapestOption?.savings && Object.keys(comparison.cheapestOption.savings).length > 0 && (
        <div className="bg-green-50 border-2 border-green-300 p-4 mb-4">
          <h4 className="font-bold text-lg mb-2">💰 You Save:</h4>
          <div className="space-y-1">
            {Object.entries(comparison.cheapestOption.savings).map(([platform, savings]) => {
              const platformName = platforms.find(p => p.key === platform)?.name || platform;
              return (
                <div key={platform} className="flex justify-between">
                  <span>vs {platformName}:</span>
                  <span className="font-bold text-green-600">${(savings as number).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toggle Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full text-center py-2 font-bold hover:underline"
      >
        {showDetails ? '▼ Hide Details' : '▶ Show Details'}
      </button>

      {showDetails && (
        <div className="mt-4 pt-4 border-t-3 border-black space-y-2 text-sm">
          {platforms.map(({ key, name }) => {
            const platformData = comparison[key as keyof typeof comparison] as PlatformPrice | null;
            if (!platformData) return null;
            
            return (
              <div key={key} className="flex justify-between py-2 border-b border-gray-200">
                <span className="font-semibold">{name}</span>
                <div className="text-right">
                  {platformData.available === 'true' ? (
                    <>
                      {platformData.price && <span>${platformData.price.toFixed(2)}</span>}
                      {platformData.discountPercent > 0 && (
                        <span className="ml-2 text-green-600">
                          ({platformData.discountPercent}% off)
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-500">Not available</span>
                  )}
                </div>
              </div>
            );
          })}
          <p className="text-gray-500 text-xs mt-4">
            * Prices are updated every 6 hours. Always verify on the platform before purchasing.
          </p>
        </div>
      )}
    </Card>
  );
}
