'use client';

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { YouTubeVideo } from '@/lib/youtube';
import { durationToSeconds } from '@/lib/youtube';
import { addToRecentlyPlayed } from '@/lib/offline-storage';
import { recordTrackPlay } from '@/lib/stats';
import { PlayerContext, type Song } from '@/hooks/use-player';
import { useToast } from '@/hooks/use-toast';
import { AchievementToast } from '@/components/music/achievement-toast';
import type { Achievement } from '@/lib/gamification';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  loadVideoById: (videoId: string) => void;
  destroy: () => void;
  getPlayerState: () => number;
}

const SILENT_AUDIO_DATA_URL = 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(80);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);

  const playerRef = useRef<YTPlayer | null>(null);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const backgroundCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingInBackground = useRef(false);
  const { toast } = useToast();

  const showAchievementToast = (achievements: Achievement[]) => {
    if (achievements.length > 0) {
      setUnlockedAchievements(prev => [...prev, ...achievements]);
    }
  };

  useEffect(() => {
    if (window.YT) {
      setIsApiReady(true);
    } else {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => setIsApiReady(true);
    }

    const audio = new Audio(SILENT_AUDIO_DATA_URL);
    audio.loop = true;
    silentAudioRef.current = audio;

    const playerContainer = document.createElement('div');
    playerContainer.id = 'youtube-player-container';
    playerContainer.style.cssText = 'position:fixed;top:-999px;left:-999px;width:1px;height:1px;';
    const playerDiv = document.createElement('div');
    playerDiv.id = 'youtube-player';
    playerContainer.appendChild(playerDiv);
    document.body.appendChild(playerContainer);

    return () => {
      playerRef.current?.destroy();
      playerContainer.remove();
      silentAudioRef.current?.pause();
    };
  }, []);

  const onPlayerStateChange = useCallback((event: { data: number }) => {
    const state = event.data;
    if (state === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
      setIsLoading(false);
      startTimeUpdate();
      if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';
    } else if (state === window.YT.PlayerState.PAUSED) {
      setIsPlaying(false);
      stopTimeUpdate();
      if (navigator.mediaSession) navigator.mediaSession.playbackState = 'paused';
    } else if (state === window.YT.PlayerState.ENDED) {
      nextTrack();
    } else if (state === window.YT.PlayerState.BUFFERING) {
      setIsLoading(true);
    }
  }, [startTimeUpdate, stopTimeUpdate, nextTrack]);

  useEffect(() => {
    if (isApiReady && !playerRef.current) {
      playerRef.current = new window.YT.Player('youtube-player', {
        height: '1',
        width: '1',
        playerVars: { autoplay: 0, controls: 0, enablejsapi: 1, origin: window.location.origin },
        events: {
          onReady: (e) => e.target.setVolume(volume),
          onStateChange: onPlayerStateChange,
          onError: (e) => {
            console.warn(`[Player] YouTube Error: ${e.data}`);
            nextTrack();
          },
        },
      });
    }
  }, [isApiReady, volume, onPlayerStateChange, nextTrack]);

  const stopBackgroundCheck = useCallback(() => {
    if (backgroundCheckInterval.current) {
      clearInterval(backgroundCheckInterval.current);
      backgroundCheckInterval.current = null;
    }
  }, []);

  const startBackgroundCheck = useCallback(() => {
    stopBackgroundCheck();
    backgroundCheckInterval.current = setInterval(() => {
      if (document.hidden && isPlayingInBackground.current && playerRef.current) {
        if (playerRef.current.getPlayerState() !== window.YT.PlayerState.PLAYING) {
          playerRef.current.playVideo();
        }
      }
    }, 1000);
  }, [stopBackgroundCheck]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isPlaying) {
          isPlayingInBackground.current = true;
          startBackgroundCheck();
        }
      } else {
        isPlayingInBackground.current = false;
        stopBackgroundCheck();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying, startBackgroundCheck, stopBackgroundCheck]);

  const playSong = useCallback(async (song: Song, songs?: Song[]) => {
    if (!song || !song.id) return;

    setCurrentSong(song);
    const newQueue = songs && songs.length > 0 ? songs : [song];
    setQueue(newQueue);
    setQueueIndex(newQueue.findIndex(s => s.id === song.id));
    setIsLoading(true);

    const loadAndPlay = async () => {
      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        playerRef.current.loadVideoById(song.id);
        playerRef.current.playVideo();
        silentAudioRef.current?.play().catch(e => console.warn('[Player] Silent audio failed to play:', e));
        addToRecentlyPlayed(song);
        recordTrackPlay(song);
        
        const response = await fetch('/api/gamification/play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'user-id', duration: durationToSeconds(song.duration) }),
        });
        const { newAchievements, leveledUp } = await response.json();

        showAchievementToast(newAchievements);
        if (leveledUp) {
          toast({ title: "Level Up!", description: "You've reached a new level!" });
        }
      } else {
        setTimeout(loadAndPlay, 100);
      }
    };
    loadAndPlay();
  }, [toast]);

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current || !currentSong) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
      silentAudioRef.current?.pause();
    } else {
      playerRef.current.playVideo();
      silentAudioRef.current?.play().catch(e => console.warn('[Player] Silent audio failed to play:', e));
    }
  }, [currentSong, isPlaying]);

  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;
    const nextIndex = (queueIndex + 1) % queue.length;
    playSong(queue[nextIndex], queue);
  }, [queue, queueIndex, playSong]);

  const previousTrack = useCallback(() => {
    if (queue.length === 0) return;
    if (currentTime > 3) {
      seek(0);
    } else {
      const prevIndex = (queueIndex - 1 + queue.length) % queue.length;
      playSong(queue[prevIndex], queue);
    }
  }, [queue, queueIndex, currentTime, playSong, seek]);

  const seek = useCallback((time: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(time, true);
      setCurrentTime(time);
    }
  }, []);

  const startTimeUpdate = useCallback(() => {
    stopTimeUpdate();
    timeUpdateInterval.current = setInterval(() => {
      const newTime = playerRef.current?.getCurrentTime() || 0;
      const newDuration = playerRef.current?.getDuration() || 0;
      setCurrentTime(newTime);
      setDuration(newDuration);
      if (navigator.mediaSession?.setPositionState) {
        navigator.mediaSession.setPositionState({ 
            duration: newDuration, playbackRate: 1, position: newTime 
        });
      }
    }, 250);
  }, [stopTimeUpdate]);

  const stopTimeUpdate = useCallback(() => {
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current);
      timeUpdateInterval.current = null;
    }
  }, []);

  useEffect(() => {
    if (!currentSong || !navigator.mediaSession) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.channelTitle,
      album: 'Sean-Streams',
      artwork: [{ src: currentSong.thumbnail || '' }],
    });

    navigator.mediaSession.setActionHandler('play', togglePlayPause);
    navigator.mediaSession.setActionHandler('pause', togglePlayPause);
    navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
    navigator.mediaSession.setActionHandler('previoustrack', previousTrack);
    navigator.mediaSession.setActionHandler('seekto', (d) => d.seekTime && seek(d.seekTime));

  }, [currentSong, nextTrack, previousTrack, seek, togglePlayPause]);

  const setVolume = useCallback((vol: number) => {
      setVolumeState(vol);
      playerRef.current?.setVolume(vol);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        volume,
        queue,
        queueIndex,
        isLoading,
        playSong,
        togglePlayPause,
        nextTrack,
        previousTrack,
        seek,
        setVolume,
      }}
    >
      {children}
      {unlockedAchievements.map((ach) => (
        <AchievementToast
          key={ach.id}
          title={ach.title}
          description={ach.description}
          onClose={() => setUnlockedAchievements(prev => prev.filter(a => a.id !== ach.id))}
        />
      ))}
    </PlayerContext.Provider>
  );
}
