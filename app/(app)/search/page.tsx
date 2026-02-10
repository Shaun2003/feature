"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, Clock, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  searchYouTube,
  getTrendingMusic,
  type YouTubeVideo,
  type PlaylistItem,
} from "@/lib/youtube";
import { TrackCard } from "@/components/music/track-card";
import { TrackRow } from "@/components/music/track-row";
import { usePlayer, type Song } from "@/hooks/use-player";
import { useToast } from "@/hooks/use-toast";
import { downloadTrack, getDownloadedTracks } from "@/lib/offline-download";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import {
  getSearchHistory,
  addSearchToHistory,
  removeSearchHistoryItem,
  clearSearchHistory,
} from "@/lib/search-history";
import { searchArtists, searchAlbums, type Artist, type Album } from "@/lib/supabase/search";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const genreSearches = [
  { name: "Pop", color: "from-pink-500 to-rose-500", query: "pop hits 2024" },
  { name: "Hip-Hop", color: "from-orange-500 to-amber-500", query: "hip hop hits" },
  { name: "Rock", color: "from-red-600 to-red-400", query: "rock music" },
  { name: "Electronic", color: "from-cyan-500 to-blue-500", query: "electronic dance music" },
  { name: "R&B", color: "from-purple-600 to-violet-400", query: "r&b soul music" },
  { name: "Latin", color: "from-green-500 to-emerald-400", query: "latin music reggaeton" },
  { name: "Jazz", color: "from-amber-600 to-yellow-400", query: "jazz music" },
  { name: "Classical", color: "from-slate-500 to-gray-400", query: "classical music" },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YouTubeVideo[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [trending, setTrending] = useState<YouTubeVideo[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const debouncedQuery = useDebounce(query, 500);
  const { playQueue } = usePlayer();
  const { toast } = useToast();
  const router = useRouter();

  // Load trending and search history on mount
  useEffect(() => {
    async function loadData() {
      setIsLoadingTrending(true);
      try {
        const data = await getTrendingMusic();
        setTrending(data);
      } catch (error) {
        console.error("[v0] Error loading trending:", error);
      } finally {
        setIsLoadingTrending(false);
      }

      const history = getSearchHistory();
      setSearchHistory(history.map((item) => item.query));

      try {
        const downloaded = await getDownloadedTracks();
        const downloadedIdSet = new Set(downloaded.map((d) => d.id));
        setDownloadedIds(downloadedIdSet);
      } catch (error) {
        console.error("[v0] Error loading downloaded tracks:", error);
      }
    }
    loadData();
  }, []);

  // Search when query changes
  useEffect(() => {
    async function performSearch() {
      if (!debouncedQuery.trim()) {
        setResults([]);
        setPlaylists([]);
        setArtists([]);
        setAlbums([]);
        return;
      }

      setIsSearching(true);
      try {
        const [youtubeResults, artistResults, albumResults] = await Promise.all([
          searchYouTube(debouncedQuery),
          searchArtists(debouncedQuery),
          searchAlbums(debouncedQuery),
        ]);

        setResults(youtubeResults.videos);
        setPlaylists(youtubeResults.playlists || []);
        setArtists(artistResults);
        setAlbums(albumResults);

        addSearchToHistory(debouncedQuery);
        setSearchHistory(getSearchHistory().map((item) => item.query));
      } catch (error) {
        console.error("[v0] Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }
    performSearch();
  }, [debouncedQuery]);

  const handleGenreClick = async (genre: { name: string; query: string }) => {
    setSelectedGenre(genre.name);
    setQuery(genre.name);
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
  };

  const handleRemoveHistory = (historyQuery: string) => {
    removeSearchHistoryItem(historyQuery);
    setSearchHistory(getSearchHistory().map((item) => item.query));
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setPlaylists([]);
    setArtists([]);
    setAlbums([]);
    setSelectedGenre(null);
  };

  const handleDownloadTrack = async (track: YouTubeVideo) => {
    const isAlreadyDownloaded = downloadedIds.has(track.id);

    if (isAlreadyDownloaded) {
      toast({
        title: "Already Downloaded",
        description: "This track is already in your library.",
      });
      return;
    }

    setDownloadingIds((prev) => new Set(prev).add(track.id));

    try {
      await downloadTrack(track, (progress) => {
        console.log(`[v0] Download progress for ${track.id}: ${progress}%`);
      });

      setDownloadedIds((prev) => new Set(prev).add(track.id));
      toast({
        title: "Success",
        description: `"${track.title}" downloaded successfully!`,
      });
    } catch (error) {
      console.error("[v0] Download error:", error);
      toast({
        title: "Download Failed",
        description: `Failed to download "${track.title}". Try again later.`,
        variant: "destructive",
      });
    } finally {
      setDownloadingIds((prev) => {
        const updated = new Set(prev);
        updated.delete(track.id);
        return updated;
      });
    }
  };

  const handlePlayAll = () => {
    const tracks = results.length > 0 ? results : trending;
    if (tracks.length > 0) {
      playQueue(tracks as Song[]);
    }
  };

  const showResults = query.trim() || selectedGenre;
  const hasResults = results.length > 0 || playlists.length > 0 || artists.length > 0 || albums.length > 0;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-foreground">Search</h1>
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="What do you want to play?"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedGenre(null);
            }}
            className="pl-12 pr-12 h-12 bg-card border-0 rounded-full text-base"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8"
              onClick={clearSearch}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {isSearching && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {!isSearching && showResults && hasResults && (
        <section className="space-y-8">
          {artists.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">Artists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {artists.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </div>
            </div>
          )}

          {albums.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">Albums</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {albums.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            </div>
          )}

          {playlists.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">Playlists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {playlists.map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">Songs</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={handlePlayAll}
                >
                  Play all
                </Button>
              </div>
              <div className="space-y-1">
                {results.map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={index + 1}
                    onDownloadClick={() => handleDownloadTrack(track)}
                    isDownloaded={downloadedIds.has(track.id)}
                    isDownloading={downloadingIds.has(track.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {!isSearching && showResults && !hasResults && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No results found for "{query}"</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try searching for something else
          </p>
        </div>
      )}

      {!showResults && !isSearching && (
        <>
          {searchHistory.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Searches
                </h2>
                {searchHistory.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={handleClearHistory}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {searchHistory.slice(0, 8).map((item) => (
                  <div
                    key={item}
                    className="group flex items-center gap-2 p-3 rounded-lg bg-card hover:bg-card/80 transition-colors cursor-pointer"
                    onClick={() => handleHistoryClick(item)}
                  >
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate text-foreground">
                      {item}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveHistory(item);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Browse all</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {genreSearches.map((genre) => (
                <button
                  key={genre.name}
                  onClick={() => handleGenreClick(genre)}
                  className={`relative h-24 md:h-28 rounded-lg bg-gradient-to-br ${genre.color} p-4 text-left overflow-hidden hover:scale-[1.02] transition-transform`}
                >
                  <h3 className="text-lg md:text-xl font-bold text-foreground">
                    {genre.name}
                  </h3>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                Trending Searches
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={handlePlayAll}
              >
                Play all
              </Button>
            </div>
            {isLoadingTrending ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {trending.slice(0, 12).map((track) => (
                  <TrackCard key={track.id} track={track} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function ArtistCard({ artist }: { artist: Artist }) {
  const router = useRouter();

  const handleNavigateToArtist = () => {
    // Navigate to artist page (assuming you have one)
    // router.push(`/artist/${artist.id}`);
  };

  return (
    <div
      className="group relative space-y-3 cursor-pointer"
      onClick={handleNavigateToArtist}
    >
      <Avatar className="w-full h-auto aspect-square">
        <AvatarImage src={artist.avatar_url ?? undefined} alt={artist.name} />
        <AvatarFallback>{artist.name[0]}</AvatarFallback>
      </Avatar>
      <div className="min-h-16">
        <h4 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {artist.name}
        </h4>
        <span className="inline-block mt-2 px-2 py-0.5 text-xs font-semibold bg-secondary rounded-full">
          Artist
        </span>
      </div>
    </div>
  );
}

function AlbumCard({ album }: { album: Album }) {
  const router = useRouter();

  const handleNavigateToAlbum = () => {
    router.push(`/album/${album.id}`);
  };

  return (
    <div
      className="group relative space-y-3 cursor-pointer"
      onClick={handleNavigateToAlbum}
    >
      <div className="relative h-40 rounded-lg overflow-hidden bg-secondary">
        <img
          src={album.cover_url ?? "/placeholder.svg"}
          alt={album.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="min-h-16">
        <h4 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {album.name}
        </h4>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {album.release_year}
        </p>
        <span className="inline-block mt-2 px-2 py-0.5 text-xs font-semibold bg-secondary rounded-full">
          Album
        </span>
      </div>
    </div>
  );
}

function PlaylistCard({ playlist }: { playlist: PlaylistItem }) {
  const router = useRouter();
  const { playQueue } = usePlayer();

  const handlePlayPlaylist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { getPlaylistItems } = await import("@/lib/youtube");
      const tracks = await getPlaylistItems(playlist.id);
      if (tracks.length > 0) {
        playQueue(tracks as Song[]);
      }
    } catch (error) {
      console.error("Error loading playlist:", error);
    }
  };

  const handleNavigateToAlbum = () => {
    router.push(`/album/${playlist.id}`);
  };

  return (
    <div
      className="group relative space-y-3 cursor-pointer"
      onClick={handleNavigateToAlbum}
    >
      <div className="relative h-40 rounded-lg overflow-hidden bg-secondary">
        <img
          src={playlist.thumbnail}
          alt={playlist.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            size="icon"
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl"
            onClick={handlePlayPlaylist}
          >
            <span className="w-5 h-5 border-l-12 border-y-8 border-y-transparent border-l-primary-foreground ml-1" />
          </Button>
        </div>
      </div>
      <div className="min-h-16">
        <h4 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {playlist.title}
        </h4>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {playlist.channelTitle}
        </p>
        <span className="inline-block mt-2 px-2 py-0.5 text-xs font-semibold bg-secondary rounded-full">
          Playlist
        </span>
      </div>
    </div>
  );
}
