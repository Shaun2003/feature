
import { Providers } from '@/app/providers';
import { Sidebar } from '@/components/music/sidebar';
import { BottomNav } from '@/components/music/bottom-nav';
import { NowPlayingBar } from '@/components/music/now-playing-bar';
import Link from 'next/link';
import { User } from 'lucide-react';
import OnboardingFlow from '@/components/music/onboarding-flow';
import { ThemeToggle } from '@/components/music/theme-toggle';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <OnboardingFlow />
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - hidden on mobile */}
          <Sidebar className="hidden md:flex" />

          {/* Main content */}
          <main className="flex-1 overflow-y-auto pb-32 sm:pb-24 relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
              {/* Header for mobile and desktop */}
              <div className="flex justify-between items-center mb-4">
                <div></div> {/* Placeholder for other header items */}
                <div className="flex items-center gap-4">
                  <ThemeToggle />
                  <div className="md:hidden">
                    <Link href="/profile" className="p-2 hover:bg-secondary rounded-lg transition-colors">
                      <User className="w-5 h-5 text-foreground" />
                    </Link>
                  </div>
                </div>
              </div>
              {children}
            </div>
          </main>
        </div>

        {/* Desktop Now Playing Bar */}
        <NowPlayingBar className="hidden md:flex" />

        {/* Mobile Mini Player + Bottom Nav */}
        <div className="md:hidden">
          <NowPlayingBar mobile />
          <BottomNav />
        </div>
      </div>
    </Providers>
  );
}
