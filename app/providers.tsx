
'use client';

import { PlayerProvider } from '@/contexts/player-context';
import { ToastProvider } from '@/hooks/use-toast-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      <ToastProvider>{children}</ToastProvider>
    </PlayerProvider>
  );
}
