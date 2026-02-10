'use client';

import dynamic from 'next/dynamic';
import { memo } from 'react';

const NowPlayingBarClient = dynamic(() => import('./now-playing-bar-client').then(mod => mod.NowPlayingBarClient), { ssr: false });

interface NowPlayingBarProps {
  className?: string;
  mobile?: boolean;
}

function NowPlayingBarComponent({ className, mobile }: NowPlayingBarProps) {
  return <NowPlayingBarClient className={className} mobile={mobile} />;
}

export const NowPlayingBar = memo(NowPlayingBarComponent);
