'use client';

import dynamic from 'next/dynamic';

const BottomNavClient = dynamic(() => import('./bottom-nav-client').then(mod => mod.BottomNavClient), { ssr: false });

export function BottomNav() {
  return <BottomNavClient />;
}
