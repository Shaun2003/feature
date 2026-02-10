'use client';

import dynamic from 'next/dynamic';

const PlayerClient = dynamic(() => import('./components/player-client'), { ssr: false });

export default function PlayerPage() {
  return <PlayerClient />;
}
