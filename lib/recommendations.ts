
'use client';

import { supabase } from './supabase/client';
import type { YouTubeVideo } from './youtube';
import { searchYouTube } from './youtube';

export interface Recommendation extends YouTubeVideo {
  reason: string;
}

const RECOMMENDATION_CACHE_KEY = 'pulse-recommendations';

async function getTopArtists() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('listening_stats')
    .select('artist')
    .eq('user_id', user.id)
    .order('play_count', { ascending: false })
    .limit(5);
  return data?.map(item => item.artist) || [];
}

async function getTopGenres() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  // This is a placeholder. In a real app, you'd have a genre for each track.
  return ['electronic', 'hip hop', 'indie'];
}

export async function generatePersonalRecommendations(limit = 20): Promise<Recommendation[]> {
  const recommendations: Map<string, Recommendation> = new Map();

  const [topArtists, topGenres] = await Promise.all([
    getTopArtists(),
    getTopGenres(),
  ]);

  const searchAndAdd = async (query: string, reason: string) => {
    try {
      const { videos } = await searchYouTube(query, 5);
      videos.forEach(video => {
        if (!recommendations.has(video.id)) {
          recommendations.set(video.id, { ...video, reason });
        }
      });
    } catch (error) {
      console.error(`Error searching for "${query}":`, error);
    }
  };

  const searches = [
    ...topArtists.map(artist => ({ query: `${artist} new music`, reason: `New music from ${artist}` })),
    ...topGenres.map(genre => ({ query: `new ${genre} music`, reason: `New in ${genre}` })),
    { query: 'Fresh new artists', reason: 'Discover new artists' },
    { query: 'Viral hits this week', reason: 'Trending this week' },
  ];

  await Promise.all(searches.map(({ query, reason }) => searchAndAdd(query, reason)));

  return Array.from(recommendations.values()).slice(0, limit);
}

export async function getRecommendations(): Promise<Recommendation[]> {
  const cached = localStorage.getItem(RECOMMENDATION_CACHE_KEY);
  if (cached) {
    return JSON.parse(cached);
  }

  const recommendations = await generatePersonalRecommendations();
  localStorage.setItem(RECOMMENDATION_CACHE_KEY, JSON.stringify(recommendations));
  return recommendations;
}
