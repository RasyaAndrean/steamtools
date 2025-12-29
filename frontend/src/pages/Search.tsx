import { useState } from 'react';
import AdvancedSearchBar from '../components/AdvancedSearchBar';
import SearchResults from '../components/SearchResults';
import TrendingGames from '../components/TrendingGames';
import Button from '../components/Button';
import Card from '../components/Card';

export default function Search() {
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<any>({});
  const [sortBy, setSortBy] = useState('relevance');

  const handleSearch = (query: string, filters: any) => {
    setSearchQuery(query);
    setSearchFilters(filters);
    setHasSearched(true);
    
    // Scroll to results
    setTimeout(() => {
      document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">Advanced Search</h1>
        <p className="text-xl text-gray-600 mb-2">
          Find the best prices across Steam, Epic Games, and GOG
        </p>
        <p className="text-sm text-gray-500">
          Compare prices, track deals, and discover where to buy your favorite games
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <AdvancedSearchBar onSearch={handleSearch} />
      </div>

      {/* Main Content */}
      {!hasSearched ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Search Tips */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h3 className="text-2xl font-bold mb-4 border-b-3 border-black pb-2">
                🔍 Search Tips
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-lg mb-1">Game Name</h4>
                  <p className="text-gray-600">
                    Search by exact game name or partial name (e.g., "Elden Ring" or "Elden")
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1">Developer</h4>
                  <p className="text-gray-600">
                    Find all games by a specific developer (e.g., "FromSoftware")
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1">Genre</h4>
                  <p className="text-gray-600">
                    Browse games by genre using the genre filter (e.g., "RPG", "Action")
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1">Platform</h4>
                  <p className="text-gray-600">
                    Filter by specific platforms to see where games are available
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-2xl font-bold mb-4 border-b-3 border-black pb-2">
                💡 Price Comparison Features
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💰</span>
                  <div>
                    <h4 className="font-bold">Cheapest Option</h4>
                    <p className="text-gray-600">Instantly see which platform has the lowest price</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🏷️</span>
                  <div>
                    <h4 className="font-bold">Best Deals</h4>
                    <p className="text-gray-600">Find the highest discounts and biggest savings</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔓</span>
                  <div>
                    <h4 className="font-bold">DRM-Free Options</h4>
                    <p className="text-gray-600">See if GOG offers a DRM-free version</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📈</span>
                  <div>
                    <h4 className="font-bold">Price History</h4>
                    <p className="text-gray-600">Track price changes over time</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Trending */}
          <div>
            <TrendingGames timeframe="week" limit={10} />
          </div>
        </div>
      ) : (
        /* Search Results */
        <div id="search-results">
          {/* Search Summary */}
          <div className="mb-6 bg-white border-3 border-black p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-sm text-gray-600">Search results for:</span>
              <span className="text-xl font-bold ml-2">"{searchQuery}"</span>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border-3 border-black font-semibold"
              >
                <option value="relevance">Relevance</option>
                <option value="price_low_to_high">Price: Low to High</option>
                <option value="price_high_to_low">Price: High to Low</option>
                <option value="release_date">Release Date</option>
                <option value="discount">Best Discount</option>
              </select>
              <Button
                variant="secondary"
                onClick={() => setHasSearched(false)}
              >
                NEW SEARCH
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          {Object.keys(searchFilters).length > 0 && (
            <div className="mb-6 bg-blue-50 border-2 border-blue-300 p-4">
              <div className="font-bold mb-2">Active Filters:</div>
              <div className="flex flex-wrap gap-2">
                {searchFilters.platforms && searchFilters.platforms.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-semibold">Platforms:</span>
                    {searchFilters.platforms.map((platform: string) => (
                      <span
                        key={platform}
                        className="px-2 py-1 bg-white border-2 border-blue-500 text-sm"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                )}
                {searchFilters.priceRange && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-semibold">Price:</span>
                    <span className="px-2 py-1 bg-white border-2 border-blue-500 text-sm">
                      {searchFilters.priceRange.min && `$${searchFilters.priceRange.min}`}
                      {searchFilters.priceRange.min && searchFilters.priceRange.max && ' - '}
                      {searchFilters.priceRange.max && `$${searchFilters.priceRange.max}`}
                    </span>
                  </div>
                )}
                {searchFilters.genres && searchFilters.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-semibold">Genres:</span>
                    {searchFilters.genres.map((genre: string) => (
                      <span
                        key={genre}
                        className="px-2 py-1 bg-white border-2 border-blue-500 text-sm"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
                {searchFilters.onSale && (
                  <span className="px-2 py-1 bg-green-100 border-2 border-green-500 text-sm font-semibold">
                    On Sale Only
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          <SearchResults query={searchQuery} filters={searchFilters} sortBy={sortBy} />
        </div>
      )}
    </div>
  );
}
