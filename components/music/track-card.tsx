'use client';

import dynamic from 'next/dynamic';
import type { YouTubeVideo } from "@/lib/youtube";

const TrackCardClient = dynamic(() => import('./track-card-client').then(mod => mod.TrackCardClient), { ssr: false });

interface TrackCardProps {
  track: YouTubeVideo;
  showArtist?: boolean;
}

export function TrackCard({ track, showArtist = true }: TrackCardProps) {
  return <TrackCardClient track={track} showArtist={showArtist} />;
}
