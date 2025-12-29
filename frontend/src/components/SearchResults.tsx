import { useState } from 'react';
import { trpc } from '../utils/trpc';
import Card from './Card';
import Button from './Button';
import PriceComparisonCard from './PriceComparisonCard';

interface SearchResultsProps {
  query: string;
  filters: any;
  sortBy?: string;
}

interface SearchResult {
  id: number;
  name: string;
  description: string | null;
  imageUrl?: string;
  genres: string | null;
  platforms: Array<{
    platform: string;
    price: number | null;
    originalPrice: number | null;
    discountPercent: number;
    url: string;
    available: string;
    drmFree?: string;
  }>;
  lowestPrice: number | null;
  highestPrice: number | null;
  platformCount: number;
}

export default function SearchResults({ query, filters, sortBy = 'relevance' }: SearchResultsProps) {
  const [page, setPage] = useState(1);
  const [selectedGame, setSelectedGame] = useState<SearchResult | null>(null);

  const { data, isLoading, error } = trpc.gamesAdvanced.advancedSearch.useQuery({
    query,
    filters,
    sort: sortBy as any,
    pagination: { page, limit: 20 },
  }, {
    keepPreviousData: true,
  });

  const handleGameClick = (game: SearchResult) => {
    setSelectedGame(game);
  };

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

  if (isLoading && page === 1) {
    return (
      <div className="text-center py-12">
        <div className="text-2xl font-bold mb-4">Searching...</div>
        <div className="text-gray-600">Finding the best prices across all platforms</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500">
        <div className="text-center py-8">
          <div className="text-2xl font-bold mb-2 text-red-600">Search Error</div>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </Card>
    );
  }

  if (!data || data.results.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <div className="text-2xl font-bold mb-2">No Results Found</div>
          <p className="text-gray-600 mb-4">
            No games match your search criteria
          </p>
          <p className="text-sm text-gray-500">
            Try adjusting your filters or search terms
          </p>
        </div>
      </Card>
    );
  }

  // Show price comparison modal
  if (selectedGame) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white border-5 border-black shadow-brutal-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">{selectedGame.name}</h2>
            <Button
              onClick={() => setSelectedGame(null)}
              variant="secondary"
            >
              ✕ CLOSE
            </Button>
          </div>
          
          {selectedGame.description && (
            <p className="text-gray-700 mb-6">{selectedGame.description}</p>
          )}
          
          <PriceComparisonCard gameId={selectedGame.id} />
          
          {selectedGame.genres && (
            <div className="mt-6">
              <h4 className="font-bold text-lg mb-2">Genres</h4>
              <div className="flex flex-wrap gap-2">
                {selectedGame.genres.split(',').map((genre, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-200 border-2 border-black text-sm font-semibold"
                  >
                    {genre.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Results Summary */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="text-2xl font-bold">{data.pagination.total}</span>
          <span className="text-gray-600 ml-2">games found</span>
        </div>
        {data.performance && (
          <div className="text-sm text-gray-500">
            Response time: {data.performance.responseTime}ms
          </div>
        )}
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.results.map((game: SearchResult) => (
          <Card
            key={game.id}
            className="cursor-pointer hover:shadow-brutal-lg transition-shadow"
            onClick={() => handleGameClick(game)}
          >
            {/* Game Image */}
            {game.imageUrl && (
              <img
                src={game.imageUrl}
                alt={game.name}
                className="w-full h-48 object-cover mb-4 border-b-3 border-black"
              />
            )}

            {/* Game Title */}
            <h3 className="text-xl font-bold mb-2 line-clamp-2">{game.name}</h3>

            {/* Platform Badges */}
            <div className="flex gap-2 mb-3">
              {game.platforms.map((platform) => (
                <span
                  key={platform.platform}
                  className={`px-2 py-1 text-xs font-bold border-2 border-black ${platformColors[platform.platform]}`}
                >
                  {platformIcons[platform.platform]} {platform.platform}
                </span>
              ))}
            </div>

            {/* Price Info */}
            <div className="mb-3">
              {game.lowestPrice !== null && game.highestPrice !== null ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">${game.lowestPrice.toFixed(2)}</span>
                  {game.lowestPrice < game.highestPrice && (
                    <span className="text-gray-500 text-sm">
                      - ${game.highestPrice.toFixed(2)}
                    </span>
                  )}
                  {game.platforms.some(p => p.discountPercent > 0) && (
                    <span className="bg-green-600 text-white px-2 py-1 text-xs font-bold">
                      SALE
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-gray-500">Price not available</span>
              )}
            </div>

            {/* Genres */}
            {game.genres && (
              <div className="flex flex-wrap gap-1 mb-3">
                {game.genres.split(',').slice(0, 3).map((genre, index) => (
                  <span
                    key={index}
                    className="text-xs px-2 py-1 bg-gray-100 border border-gray-300"
                  >
                    {genre.trim()}
                  </span>
                ))}
              </div>
              )}

            {/* Quick View Button */}
            <Button variant="secondary" className="w-full text-sm py-2">
              Compare Prices
            </Button>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {data.pagination.total > 20 && (
        <div className="mt-8 flex justify-center gap-4">
          <Button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            variant="secondary"
          >
            PREVIOUS
          </Button>
          
          <span className="flex items-center font-bold">
            Page {page} of {Math.ceil(data.pagination.total / 20)}
          </span>
          
          <Button
            onClick={() => setPage(p => p + 1)}
            disabled={page * 20 >= data.pagination.total}
            variant="secondary"
          >
            NEXT
          </Button>
        </div>
      )}
    </div>
  );
}
