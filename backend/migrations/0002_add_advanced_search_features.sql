-- Migration: Add Advanced Search and Price Comparison Features
-- Description: This migration adds support for advanced search, price comparison caching, and search analytics

-- Step 1: Create game_comparison_cache table
CREATE TABLE IF NOT EXISTS game_comparison_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  game_id INT NOT NULL,
  comparison_data JSON NOT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  INDEX gcc_game_id_idx (game_id),
  INDEX gcc_last_updated_idx (last_updated)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Create popular_searches table
CREATE TABLE IF NOT EXISTS popular_searches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  query VARCHAR(500) NOT NULL,
  search_count INT DEFAULT 1,
  last_searched TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX ps_query_idx (query),
  INDEX ps_search_count_idx (search_count),
  INDEX ps_last_searched_idx (last_searched)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 3: Add composite indexes for optimized search queries
-- Price + platform filter combination
CREATE INDEX IF NOT EXISTS idx_game_platforms_price_platform ON game_platforms(platform_price, platform);

-- Available + platform filter combination  
CREATE INDEX IF NOT EXISTS idx_game_platforms_available_platform ON game_platforms(available, platform);

-- Discount + price combination for sorting by best deals
CREATE INDEX IF NOT EXISTS idx_game_platforms_discount_price ON game_platforms(discount_percent, platform_price);

-- Step 4: Add full-text search index on games table
-- Note: MySQL doesn't support CREATE FULLTEXT INDEX IF NOT EXISTS directly
-- If this fails on re-run, it means the index already exists (which is fine)
ALTER TABLE games ADD FULLTEXT INDEX ft_games_search (name, description);

-- Step 5: Add indexes for price_history queries
-- Get latest price per game platform
CREATE INDEX IF NOT EXISTS idx_price_history_gp_recorded ON price_history(game_platform_id, recorded_at DESC);

-- Step 6: Add comments for documentation
ALTER TABLE game_comparison_cache COMMENT = 'Cached price comparison data (24hr TTL)';
ALTER TABLE popular_searches COMMENT = 'Trending searches for autocomplete suggestions';
