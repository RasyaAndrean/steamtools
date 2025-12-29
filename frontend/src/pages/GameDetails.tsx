import { useParams } from 'react-router-dom';
import { trpc } from '../utils/trpc';
import Card from '../components/Card';
import Button from '../components/Button';
import PlatformBadge, { PlatformBadges } from '../components/PlatformBadge';

export default function GameDetails() {
  const { id } = useParams<{ id: string }>();
  const gameId = id ? parseInt(id) : 0;
  
  const { data: gameData, isLoading } = trpc.games.getById.useQuery({ id: gameId });
  const { data: priceHistory } = trpc.games.getPriceHistory.useQuery({ gameId });
  const { data: availability } = trpc.games.getPlatformAvailability.useQuery(
    { gameName: gameData?.name },
    { enabled: !!gameData?.name }
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <p className="text-xl text-center">Loading game details...</p>
        </Card>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <p className="text-xl text-center">Game not found.</p>
        </Card>
      </div>
    );
  }

  // Parse platforms from JSON or use platformsData
  const game = gameData as {
    id: number;
    appId: number | null;
    name: string;
    description: string | null;
    price: number | null;
    genres: string | null;
    tags: string | null;
    developer: string | null;
    releaseDate: Date | null;
    coverImage: string | null;
    isMultiPlatform: boolean;
    platforms: string | null;
    platformsData?: Array<{
      id: number;
      platform: string;
      platformId: string;
      price: number | null;
      discountPercent: number;
      url: string | null;
      imageUrl: string | null;
      isAvailable: boolean;
    }>;
  };

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
    <div className="container mx-auto px-4 py-12">
      <Card className="mb-8">
        {game.coverImage && (
          <img 
            src={game.coverImage} 
            alt={game.name}
            className="w-full h-64 object-cover border-b-3 border-black mb-6"
          />
        )}
        
        <h1 className="text-4xl font-bold mb-4">{game.name}</h1>
        
        {/* Platform Badges */}
        {gamePlatforms.length > 0 && (
          <div className="mb-4">
            <PlatformBadges platforms={gamePlatforms} size="md" />
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-lg mb-2"><strong>Developer:</strong> {game.developer || 'Unknown'}</p>
            <p className="text-lg mb-2">
              <strong>Price:</strong> {game.price ? `$${game.price}` : 'Varies by platform'}
            </p>
            <p className="text-lg mb-2"><strong>Release Date:</strong> {game.releaseDate ? new Date(game.releaseDate).toLocaleDateString() : 'Unknown'}</p>
          </div>
          <div>
            <p className="text-lg mb-2"><strong>Genres:</strong> {game.genres || 'N/A'}</p>
            <p className="text-lg mb-2"><strong>Tags:</strong> {game.tags || 'N/A'}</p>
          </div>
        </div>

        {/* Platform Availability */}
        {availability && availability.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">AVAILABLE ON</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availability.map((platform) => (
                <a 
                  key={platform.platform}
                  href={platform.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border-3 border-black p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <PlatformBadge platform={platform.platform} size="sm" />
                    {platform.discountPercent > 0 && (
                      <span className="bg-red-600 text-white px-2 py-1 text-sm font-bold">
                        -{platform.discountPercent}%
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-lg">
                    {platform.price ? `$${platform.price}` : 'Check store'}
                  </p>
                  {platform.originalPrice && platform.originalPrice > platform.price && (
                    <p className="text-sm text-gray-500 line-through">
                      ${platform.originalPrice}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {game.description && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">DESCRIPTION</h2>
            <p className="text-lg">{game.description}</p>
          </div>
        )}

        {/* Platform-specific game data */}
        {game.platformsData && game.platformsData.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">PLATFORM DETAILS</h2>
            {game.platformsData.map((platform) => (
              <div key={platform.id} className="border-b-2 border-black pb-4 mb-4">
                <div className="flex items-center justify-between">
                  <PlatformBadge platform={platform.platform as 'steam' | 'epic' | 'gog'} />
                  <span className="text-lg font-bold">
                    {platform.price ? `$${platform.price}` : 'N/A'}
                    {platform.discountPercent > 0 && (
                      <span className="text-green-600 ml-2">
                        (-{platform.discountPercent}%)
                      </span>
                    )}
                  </span>
                </div>
                {platform.url && (
                  <a 
                    href={platform.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline mt-2 inline-block"
                  >
                    View on {platform.platform.charAt(0).toUpperCase() + platform.platform.slice(1)}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-4">
          <Button variant="accent">ADD TO LIBRARY</Button>
          <Button variant="secondary">TRACK PRICE</Button>
        </div>
      </Card>

      {priceHistory && priceHistory.length > 0 && (
        <Card>
          <h2 className="text-3xl font-bold mb-4">PRICE HISTORY</h2>
          <div className="space-y-2">
            {priceHistory.map((record) => (
              <div key={record.id} className="flex justify-between items-center border-b-2 border-black pb-2">
                <div className="flex items-center gap-2">
                  <PlatformBadge platform={record.platform} size="sm" showLabel={false} />
                  <span className="text-lg">{new Date(record.recordedAt).toLocaleDateString()}</span>
                </div>
                <span className="text-lg font-bold">
                  ${record.price} {record.discountPercent > 0 && `(-${record.discountPercent}%)`}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
