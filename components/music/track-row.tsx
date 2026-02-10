'use client';

import dynamic from 'next/dynamic';
import { memo } from 'react';
import type { YouTubeVideo } from "@/lib/youtube";

const TrackRowClient = dynamic(() => import('./track-row-client').then(mod => mod.TrackRowClient), { ssr: false });

interface TrackRowProps {
  track: YouTubeVideo;
  index?: number;
  showAlbum?: boolean;
  onDownloadClick?: () => void;
  downloadProgress?: number;
  isDownloading?: boolean;
  isDownloaded?: boolean;
  onAddToPlaylistSuccess?: () => void;
}

function TrackRowComponent(props: TrackRowProps) {
  return <TrackRowClient {...props} />;
}

export const TrackRow = memo(TrackRowComponent);
