'use client';

import dynamic from 'next/dynamic';
import type { Song } from '@/hooks/use-player';

const AddToPlaylistDialogClient = dynamic(() => import('./add-to-playlist-dialog-client').then(mod => mod.AddToPlaylistDialogClient), { ssr: false });

interface AddToPlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  song?: Song;
  onAddSuccess?: () => void;
}

export function AddToPlaylistDialog(props: AddToPlaylistDialogProps) {
  return <AddToPlaylistDialogClient {...props} />;
}
