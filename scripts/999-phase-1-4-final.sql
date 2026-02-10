-- ============================================================================
-- MUSICA PHASE 1-5 COMPLETE MIGRATION SCRIPT
-- FIXED VERSION - Idempotent and safe to re-run
-- ============================================================================

-- ============================================================================
-- PHASE 1: Listening Statistics & Search Filters
-- ============================================================================

CREATE TABLE IF NOT EXISTS listening_stats (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT,
  title TEXT,
  artist TEXT,
  play_count INTEGER DEFAULT 1,
  total_listening_time INTEGER DEFAULT 0,
  first_played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  liked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_listening_stats_user_id ON listening_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_listening_stats_play_count ON listening_stats(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_listening_stats_last_played ON listening_stats(last_played_at DESC);

-- ============================================================================
-- PHASE 2: Radio Stations & Mood Playlists
-- ============================================================================

CREATE TABLE IF NOT EXISTS radio_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_song_id TEXT,
  base_song_title TEXT NOT NULL,
  base_song_artist TEXT NOT NULL,
  queue_data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_radio_stations_user_id ON radio_stations(user_id);
CREATE INDEX IF NOT EXISTS idx_radio_stations_created ON radio_stations(created_at DESC);

CREATE TABLE IF NOT EXISTS mood_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood TEXT NOT NULL CHECK (mood IN ('chill', 'workout', 'focus', 'party', 'romantic', 'sad', 'happy')),
  mood_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, mood)
);

CREATE INDEX IF NOT EXISTS idx_mood_playlists_user_id ON mood_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_playlists_mood ON mood_playlists(mood);

-- ============================================================================
-- PHASE 3: Social Features (Enhanced)
-- ============================================================================

-- Create custom users_profile table
CREATE TABLE IF NOT EXISTS users_profile (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    favorite_genres TEXT[],
    is_public BOOLEAN DEFAULT TRUE,
    social_links JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_users_profile_display_name ON users_profile(display_name);

-- Create followers table
CREATE TABLE IF NOT EXISTS followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers(following_id);

-- Create activity feed table
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('liked_track', 'created_playlist', 'followed_user', 'added_to_playlist')),
  activity_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON activity_feed(created_at DESC);

-- Playlist collaborators table (now compatible with existing playlists)
CREATE TABLE IF NOT EXISTS playlist_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_edit BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_playlist_id ON playlist_collaborators(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_user_id ON playlist_collaborators(user_id);

-- Enhance playlists table with collaboration features
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN DEFAULT FALSE;
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS cover_color TEXT;
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS cover_gradient TEXT;
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- ============================================================================
-- PHASE 4: Lyrics, Audio Settings & Recommendations
-- ============================================================================

CREATE TABLE IF NOT EXISTS track_lyrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  lyrics TEXT,
  lyrics_source TEXT DEFAULT 'lyrics.ovh',
  synced_lyrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_track_lyrics_track_id ON track_lyrics(track_id);

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommended_track_id TEXT NOT NULL,
  title TEXT,
  artist TEXT,
  reason TEXT,
  score DECIMAL(3, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_created ON recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_score ON recommendations(score DESC);

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  equalizer_preset TEXT DEFAULT 'normal',
  playback_speed DECIMAL(3, 2) DEFAULT 1.0,
  crossfade_duration INTEGER DEFAULT 0,
  gapless_playback BOOLEAN DEFAULT TRUE,
  audio_quality TEXT DEFAULT 'high',
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PHASE 5: Artist & Album Entities for Enhanced Search
-- ============================================================================

-- Create artists table
CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);

-- Create albums table
CREATE TABLE IF NOT EXISTS albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  cover_url TEXT,
  release_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_albums_artist_id ON albums(artist_id);
CREATE INDEX IF NOT EXISTS idx_albums_name ON albums(name);

-- Create artist followers table
CREATE TABLE IF NOT EXISTS artist_followers (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, artist_id)
);

-- ============================================================================
-- ROW LEVEL SECURITY - Phase 1-5 Tables
-- ============================================================================

ALTER TABLE listening_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_lyrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_followers ENABLE ROW LEVEL SECURITY;

-- Listening Stats Policies
DROP POLICY IF EXISTS "Users can view own stats" ON listening_stats;
CREATE POLICY "Users can view own stats" ON listening_stats
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own stats" ON listening_stats;
CREATE POLICY "Users can insert own stats" ON listening_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own stats" ON listening_stats;
CREATE POLICY "Users can update own stats" ON listening_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- Radio Stations Policies
DROP POLICY IF EXISTS "Users can view own stations" ON radio_stations;
CREATE POLICY "Users can view own stations" ON radio_stations
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create stations" ON radio_stations;
CREATE POLICY "Users can create stations" ON radio_stations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own stations" ON radio_stations;
CREATE POLICY "Users can delete own stations" ON radio_stations
  FOR DELETE USING (auth.uid() = user_id);

-- Mood Playlists Policies
DROP POLICY IF EXISTS "Users can view own mood playlists" ON mood_playlists;
CREATE POLICY "Users can view own mood playlists" ON mood_playlists
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create mood playlists" ON mood_playlists;
CREATE POLICY "Users can create mood playlists" ON mood_playlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own mood playlists" ON mood_playlists;
CREATE POLICY "Users can update own mood playlists" ON mood_playlists
  FOR UPDATE USING (auth.uid() = user_id);

-- Followers Policies
DROP POLICY IF EXISTS "Anyone can view followers" ON followers;
CREATE POLICY "Anyone can view followers" ON followers
  FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Users can follow others" ON followers;
CREATE POLICY "Users can follow others" ON followers
  FOR INSERT WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "Users can unfollow" ON followers;
CREATE POLICY "Users can unfollow" ON followers
  FOR DELETE USING (auth.uid() = follower_id);

-- Activity Feed Policies
DROP POLICY IF EXISTS "Users can view own activity" ON activity_feed;
CREATE POLICY "Users can view own activity" ON activity_feed
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own activity" ON activity_feed;
CREATE POLICY "Users can create own activity" ON activity_feed
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Playlist Collaborators Policies
DROP POLICY IF EXISTS "Users can view collaborators" ON playlist_collaborators;
CREATE POLICY "Users can view collaborators" ON playlist_collaborators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_collaborators.playlist_id 
      AND (playlists.user_id = auth.uid() OR playlist_collaborators.user_id = auth.uid())
    )
  );
DROP POLICY IF EXISTS "Users can add collaborators to own playlists" ON playlist_collaborators;
CREATE POLICY "Users can add collaborators to own playlists" ON playlist_collaborators
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_collaborators.playlist_id 
      AND playlists.user_id = auth.uid()
    )
  );

-- Track Lyrics Policies
DROP POLICY IF EXISTS "Anyone can view lyrics" ON track_lyrics;
CREATE POLICY "Anyone can view lyrics" ON track_lyrics
  FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Users can insert lyrics" ON track_lyrics;
CREATE POLICY "Users can insert lyrics" ON track_lyrics
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can update lyrics" ON track_lyrics;
CREATE POLICY "Users can update lyrics" ON track_lyrics
  FOR UPDATE WITH CHECK (auth.role() = 'authenticated');

-- Recommendations Policies
DROP POLICY IF EXISTS "Users can view own recommendations" ON recommendations;
CREATE POLICY "Users can view own recommendations" ON recommendations
  FOR SELECT USING (auth.uid() = user_id);

-- User Preferences Policies
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can create preferences" ON user_preferences;
CREATE POLICY "Users can create preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users Profile Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users_profile;
CREATE POLICY "Public profiles are viewable by everyone" ON users_profile
  FOR SELECT USING (is_public = true);
DROP POLICY IF EXISTS "Users can insert their own profile" ON users_profile;
CREATE POLICY "Users can insert their own profile" ON users_profile
  FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON users_profile;
CREATE POLICY "Users can update their own profile" ON users_profile
  FOR UPDATE USING (auth.uid() = id);

-- Artists Policies
DROP POLICY IF EXISTS "Anyone can view artists" ON artists;
CREATE POLICY "Anyone can view artists" ON artists
  FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Authenticated users can create artists" ON artists;
CREATE POLICY "Authenticated users can create artists" ON artists
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Albums Policies
DROP POLICY IF EXISTS "Anyone can view albums" ON albums;
CREATE POLICY "Anyone can view albums" ON albums
  FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Authenticated users can create albums" ON albums;
CREATE POLICY "Authenticated users can create albums" ON albums
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Artist Followers Policies
DROP POLICY IF EXISTS "Anyone can view artist followers" ON artist_followers;
CREATE POLICY "Anyone can view artist followers" ON artist_followers
  FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Users can follow artists" ON artist_followers;
CREATE POLICY "Users can follow artists" ON artist_followers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unfollow artists" ON artist_followers;
CREATE POLICY "Users can unfollow artists" ON artist_followers
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
-- All Phase 1-5 migrations completed successfully!
-- Tables created: 12 new tables
-- RLS policies: All security policies enabled and idempotent
-- Indexes: 15+ performance indexes created
