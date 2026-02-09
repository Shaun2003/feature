"use client";

import { useEffect, useState, useCallback } from "react";
import { getTrendingMusic, searchYouTube, type YouTubeVideo } from "@/lib/youtube";
import { getRecentlyPlayed, getLikedTracks } from "@/lib/offline-storage";
import { usePlayer, type Song } from "@/contexts/player-context";
import { TrackCard } from "@/components/music/track-card";
import { TrackRow } from "@/components/music/track-row";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Flame, Sparkles, Clock, Heart, Music, Zap, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnboardingFlow, isOnboardingComplete, getPreferredGenres } from "@/components/music/onboarding-flow";
import { getGamification, formatLevel, getXPProgress, getXPForNextLevel } from "@/lib/gamification";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

const MOOD_SECTIONS = [
  { id: "chill", name: "Chill Vibes", query: "chill lofi beats relaxing", color: "from-blue-600/20 to-cyan-500/20", icon: "~" },
  { id: "workout", name: "Workout Energy", query: "workout motivation high energy", color: "from-red-600/20 to-orange-500/20", icon: "!" },
  { id: "focus", name: "Deep Focus", query: "focus music ambient study", color: "from-green-600/20 to-emerald-500/20", icon: "#" },
  { id: "party", name: "Party Hits", query: "party dance hits 2024", color: "from-yellow-600/20 to-amber-500/20", icon: "*" },
];

export default function HomePage() {
  const [trending, setTrending] = useState<YouTubeVideo[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<YouTubeVideo[]>([]);
  const [likedTracks, setLikedTracks] = useState<YouTubeVideo[]>([]);
  const [forYouTracks, setForYouTracks] = useState<YouTubeVideo[]>([]);
  const [moodTracks, setMoodTracks] = useState<Record<string, YouTubeVideo[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [gamification, setGamification] = useState(getGamification());
  const { playQueue, currentSong, isPlaying } = usePlayer();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShowOnboarding(!isOnboardingComplete());
      setGamification(getGamification());
    }
  }, []);

  const loadData = useCallback(async (preferredGenres?: string[]) => {
    setIsLoading(true);
    try {
      const [trendingData, recentData, likedData] = await Promise.all([
        getTrendingMusic(),
        getRecentlyPlayed(),
        getLikedTracks(),
      ]);
      setTrending(trendingData);
      setRecentlyPlayed(recentData);
      setLikedTracks(likedData);

      // Load "For You" based on genres
      const genres = preferredGenres || getPreferredGenres();
      if (genres.length > 0) {
        const genreQuery = genres.slice(0, 3).join(" ") + " music mix";
        try {
          const { videos } = await searchYouTube(genreQuery);
          setForYouTracks(videos.slice(0, 12));
        } catch { /* ignore */ }
      }

      // Load one mood section
      const randomMood = MOOD_SECTIONS[Math.floor(Math.random() * MOOD_SECTIONS.length)];
      try {
        const { videos } = await searchYouTube(randomMood.query);
        setMoodTracks({ [randomMood.id]: videos.slice(0, 8) });
      } catch { /* ignore */ }

    } catch (error) {
      console.error("Error loading home data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showOnboarding) {
      loadData();
    }
  }, [showOnboarding, loadData]);

  const handleOnboardingComplete = (genres: string[]) => {
    setShowOnboarding(false);
    loadData(genres);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const handlePlayAll = (tracks: YouTubeVideo[]) => {
    if (tracks.length > 0) {
      playQueue(tracks as Song[]);
    }
  };

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activeMood = Object.entries(moodTracks)[0];

  return (
    <div className="space-y-10">
      {/* Header with gamification */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{getGreeting()}</h1>
          {gamification.streak > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">
                {gamification.streak}-day streak
              </span>
            </div>
          )}
        </div>
        <Link href="/stats" className="shrink-0">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 hover:bg-card transition-colors border border-border/50">
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">Lvl {gamification.level}</span>
              </div>
              <span className="text-xs text-muted-foreground">{formatLevel(gamification.level)}</span>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">{gamification.level}</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Picks */}
      {(recentlyPlayed.length > 0 || likedTracks.length > 0) && (
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
            {[...recentlyPlayed.slice(0, 3), ...likedTracks.slice(0, 3)]
              .filter((track, index, self) => self.findIndex((t) => t.id === track.id) === index)
              .slice(0, 6)
              .map((track) => (
                <QuickPickCard
                  key={track.id}
                  track={track}
                  isPlaying={currentSong?.id === track.id && isPlaying}
                />
              ))}
          </div>
        </section>
      )}

      {/* Weekly Challenge Banner */}
      {gamification.weeklyChallenge && (
        <section>
          <Link href="/stats">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 sm:p-5 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate">
                      {gamification.weeklyChallenge.title}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {gamification.weeklyChallenge.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium text-primary">
                    {gamification.weeklyChallenge.progress}/{gamification.weeklyChallenge.target}
                  </span>
                </div>
              </div>
              <Progress
                value={(gamification.weeklyChallenge.progress / gamification.weeklyChallenge.target) * 100}
                className="mt-3 h-1.5"
              />
            </div>
          </Link>
        </section>
      )}

      {/* For You Section */}
      {forYouTracks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Made For You</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => handlePlayAll(forYouTracks)}
            >
              Play all
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {forYouTracks.slice(0, 6).map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </section>
      )}

      {/* Mood Mix Section */}
      {activeMood && activeMood[1].length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                {MOOD_SECTIONS.find((m) => m.id === activeMood[0])?.name || "Mood Mix"}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => handlePlayAll(activeMood[1])}
            >
              Play all
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {activeMood[1].slice(0, 8).map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-2xl font-bold text-foreground">Recently Played</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => handlePlayAll(recentlyPlayed)}
            >
              Play all
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recentlyPlayed.slice(0, 6).map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </section>
      )}

      {/* Trending Now */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-2xl font-bold text-foreground">Trending Now</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => handlePlayAll(trending)}
          >
            Play all
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {trending.slice(0, 12).map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      </section>

      {/* Liked Songs */}
      {likedTracks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Your Favorites</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => handlePlayAll(likedTracks)}
            >
              Play all
            </Button>
          </div>
          <div className="space-y-1">
            {likedTracks.slice(0, 5).map((track, index) => (
              <TrackRow key={track.id} track={track} index={index + 1} />
            ))}
          </div>
        </section>
      )}

      {/* Discover More */}
      {trending.length > 12 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Discover More</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {trending.slice(12).map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function QuickPickCard({
  track,
  isPlaying,
}: {
  track: YouTubeVideo;
  isPlaying: boolean;
}) {
  const { playSong } = usePlayer();

  return (
    <button
      onClick={() => playSong(track as Song)}
      className="flex items-center gap-3 p-2 rounded-md bg-card/60 hover:bg-card transition-all group"
    >
      <div className="w-12 h-12 rounded overflow-hidden bg-secondary shrink-0 relative">
        {track.thumbnail ? (
          <img
            src={track.thumbnail || "/placeholder.svg"}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
            <span className="text-lg font-bold text-primary">
              {track.title[0]}
            </span>
          </div>
        )}
        {isPlaying && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <div className="flex gap-0.5">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full animate-pulse"
                  style={{
                    height: `${8 + Math.random() * 8}px`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <h3 className="font-semibold text-sm text-foreground truncate">
          {track.title}
        </h3>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <Play className="w-4 h-4 fill-primary-foreground text-primary-foreground ml-0.5" />
        </div>
      </div>
    </button>
  );
}
