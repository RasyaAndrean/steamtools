import { useState, useEffect, useRef } from 'react';
import { trpc } from '../utils/trpc';
import Button from './Button';

interface AdvancedSearchBarProps {
  onSearch: (query: string, filters: any) => void;
}

export default function AdvancedSearchBar({ onSearch }: AdvancedSearchBarProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [onSale, setOnSale] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: suggestionsData, isLoading: suggestionsLoading } = trpc.gamesAdvanced.getAutoCompleteSuggestions.useQuery(
    { query, limit: 10 },
    { enabled: query.length >= 2 }
  );

  useEffect(() => {
    if (suggestionsData) {
      setSuggestions(suggestionsData.suggestions);
    }
  }, [suggestionsData]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    const filters: any = {};
    
    if (selectedPlatforms.length > 0) {
      filters.platforms = selectedPlatforms;
    }
    
    if (priceRange.min || priceRange.max) {
      filters.priceRange = {
        min: priceRange.min ? Number(priceRange.min) : undefined,
        max: priceRange.max ? Number(priceRange.max) : undefined,
      };
    }
    
    if (selectedGenres.length > 0) {
      filters.genres = selectedGenres;
    }
    
    if (onSale) {
      filters.onSale = true;
    }

    onSearch(query, filters);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const selectSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    handleSearch();
  };

  const commonGenres = [
    'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation',
    'Sports', 'Racing', 'Puzzle', 'Horror', 'Indie'
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.length >= 2) {
                  setShowSuggestions(true);
                } else {
                  setShowSuggestions(false);
                }
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => query.length >= 2 && setShowSuggestions(true)}
              placeholder="Search games, genres, developers..."
              className="w-full px-6 py-4 border-3 border-black text-lg shadow-brutal focus:outline-none focus:shadow-brutal-sm"
            />
            
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white border-3 border-black shadow-brutal-lg z-50 max-h-96 overflow-y-auto"
              >
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => selectSuggestion(suggestion)}
                    className="px-6 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-300 last:border-b-0"
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <Button onClick={handleSearch} variant="accent">
            SEARCH
          </Button>
          
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? 'accent' : 'secondary'}
          >
            {showFilters ? 'HIDE FILTERS' : 'FILTERS'}
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="mt-6 bg-white border-5 border-black shadow-brutal p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Platform Filter */}
            <div>
              <h4 className="font-bold text-lg mb-3">PLATFORMS</h4>
              <div className="space-y-2">
                {(['steam', 'epic', 'gog'] as const).map(platform => (
                  <label key={platform} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.includes(platform)}
                      onChange={() => togglePlatform(platform)}
                      className="w-5 h-5 accent-accent"
                    />
                    <span className="capitalize">{platform}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div>
              <h4 className="font-bold text-lg mb-3">PRICE RANGE ($)</h4>
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                  className="w-full px-4 py-2 border-3 border-black"
                  min="0"
                  step="0.01"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                  className="w-full px-4 py-2 border-3 border-black"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Genre Filter */}
            <div>
              <h4 className="font-bold text-lg mb-3">GENRES</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {commonGenres.map(genre => (
                  <label key={genre} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedGenres.includes(genre)}
                      onChange={() => toggleGenre(genre)}
                      className="w-5 h-5 accent-accent"
                    />
                    <span>{genre}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional Filters */}
            <div>
              <h4 className="font-bold text-lg mb-3">MORE FILTERS</h4>
              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onSale}
                    onChange={(e) => setOnSale(e.target.checked)}
                    className="w-5 h-5 accent-accent"
                  />
                  <span>On Sale</span>
                </label>

                <div>
                  <label className="block mb-2 font-semibold">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-2 border-3 border-black"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price_low_to_high">Price: Low to High</option>
                    <option value="price_high_to_low">Price: High to Low</option>
                    <option value="release_date">Release Date</option>
                    <option value="discount">Best Discount</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <Button onClick={handleSearch} variant="accent" className="flex-1">
              APPLY FILTERS
            </Button>
            <Button
              onClick={() => {
                setSelectedPlatforms([]);
                setPriceRange({ min: '', max: '' });
                setSelectedGenres([]);
                setOnSale(false);
                setSortBy('relevance');
              }}
              variant="secondary"
            >
              CLEAR ALL
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
