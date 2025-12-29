-- Migration: Add Multi-Platform Support to SteamTools v2
-- Description: This migration adds Epic Games Store and GOG integration support

-- Step 1: Create temporary table to preserve existing game data
CREATE TABLE IF NOT EXISTS games_backup (
  id INT PRIMARY KEY,
  app_id INT,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  genres TEXT,
  tags TEXT,
  developer VARCHAR(255),
  release_date DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Backup existing games data
INSERT INTO games_backup SELECT * FROM games;

-- Step 3: Drop existing tables that need restructuring
DROP TABLE IF EXISTS price_history;
DROP TABLE IF EXISTS tracked_games;
DROP TABLE IF EXISTS user_library;

-- Step 4: Recreate games table with new schema
DROP TABLE IF EXISTS games;

CREATE TABLE games (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  short_description TEXT,
  image_url VARCHAR(500),
  genres TEXT,
  tags TEXT,
  developer VARCHAR(255),
  publisher VARCHAR(255),
  release_date DATETIME,
  metacritic_score INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX name_idx (name),
  INDEX release_date_idx (release_date),
  INDEX metacritic_idx (metacritic_score)
);

-- Step 5: Restore games data (without app_id as it's no longer in the schema)
INSERT INTO games (id, name, description, genres, tags, developer, release_date, created_at) 
SELECT id, name, description, genres, tags, developer, release_date, created_at 
FROM games_backup;

-- Step 6: Create new game_platforms table
CREATE TABLE game_platforms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  game_id INT NOT NULL,
  platform ENUM('steam', 'epic', 'gog') NOT NULL,
  platform_id VARCHAR(255) NOT NULL,
  platform_url VARCHAR(500),
  platform_price DECIMAL(10,2),
  original_price DECIMAL(10,2),
  discount_percent INT DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  last_sync_date TIMESTAMP NULL,
  available ENUM('true', 'false', 'unknown') DEFAULT 'unknown',
  drm_free ENUM('true', 'false', 'unknown') DEFAULT 'unknown',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  INDEX gp_game_id_idx (game_id),
  INDEX gp_platform_idx (platform),
  INDEX gp_platform_id_idx (platform_id),
  INDEX gp_platform_price_idx (platform_price),
  INDEX gp_available_idx (available),
  UNIQUE KEY game_platform_unique (game_id, platform)
);

-- Step 7: Create platform_sync_log table
CREATE TABLE platform_sync_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  platform ENUM('steam', 'epic', 'gog') NOT NULL,
  sync_type ENUM('full', 'delta', 'manual') NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NULL,
  status ENUM('success', 'failed', 'partial') NOT NULL,
  games_synced INT DEFAULT 0,
  errors TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX psl_platform_idx (platform),
  INDEX psl_status_idx (status),
  INDEX psl_started_at_idx (started_at)
);

-- Step 8: Recreate price_history table with new schema
CREATE TABLE price_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  game_platform_id INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  discount_percent INT DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (game_platform_id) REFERENCES game_platforms(id) ON DELETE CASCADE,
  INDEX price_gp_id_idx (game_platform_id),
  INDEX price_recorded_at_idx (recorded_at)
);

-- Step 9: Recreate user_library table
CREATE TABLE user_library (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  game_id INT NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  INDEX user_id_idx (user_id),
  INDEX game_id_idx (game_id)
);

-- Step 10: Recreate tracked_games table with new schema
CREATE TABLE tracked_games (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  game_platform_id INT NOT NULL,
  target_price DECIMAL(10,2) NOT NULL,
  active ENUM('true', 'false') DEFAULT 'true',
  notify_on_sale ENUM('true', 'false') DEFAULT 'true',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (game_platform_id) REFERENCES game_platforms(id) ON DELETE CASCADE,
  INDEX tg_user_id_idx (user_id),
  INDEX tg_game_platform_id_idx (game_platform_id),
  INDEX tg_active_idx (active)
);

-- Step 11: Clean up backup table
DROP TABLE IF EXISTS games_backup;

-- Step 12: Insert initial platform sync log entries
INSERT INTO platform_sync_log (platform, sync_type, started_at, status, games_synced) VALUES
('steam', 'full', NOW(), 'success', 0),
('epic', 'full', NOW(), 'success', 0),
('gog', 'full', NOW(), 'success', 0);

-- Step 13: Add comments for documentation
ALTER TABLE games COMMENT = 'Core game information (platform-agnostic)';
ALTER TABLE game_platforms COMMENT = 'Platform-specific game data and pricing';
ALTER TABLE platform_sync_log COMMENT = 'Platform API synchronization logs';
ALTER TABLE price_history COMMENT = 'Historical pricing data by platform';

-- Migration completed successfully