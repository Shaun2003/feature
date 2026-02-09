"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import {
  Moon, Sun, LogOut, Settings, Flame, Award, Music, Clock,
  Heart, Trophy, BarChart3, Share2, Users,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  getGamification, formatLevel, getXPProgress, getXPForNextLevel,
  type UserGamification,
} from "@/lib/gamification";
import { getListeningStats, formatListeningTime, type ListeningStats } from "@/lib/stats";
import { ActivityFeed } from "@/components/music/activity-feed";
import Link from "next/link";

interface ProfileContentProps {
  profile: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  };
  stats: {
    likedSongs: number;
    playlists: number;
  };
}

export function ProfileContent({ profile, stats: initialStats }: ProfileContentProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string | undefined>(resolvedTheme);
  const [stats, setStats] = useState(initialStats);
  const [loadingStats, setLoadingStats] = useState(false);
  const [gamification, setGamification] = useState<UserGamification | null>(null);
  const [listeningStats, setListeningStats] = useState<ListeningStats | null>(null);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    setCurrentTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (!profile.id || !mounted) return;

    const loadStats = async () => {
      try {
        setLoadingStats(true);
        const [likedRes, playlistRes] = await Promise.all([
          supabase
            .from("liked_songs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id),
          supabase
            .from("playlists")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id),
        ]);
        setStats({
          likedSongs: likedRes.count || 0,
          playlists: playlistRes.count || 0,
        });
      } catch (error) {
        console.error("[Profile] Error loading stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
    setGamification(getGamification());
    getListeningStats().then(setListeningStats);
  }, [profile.id, mounted]);

  const handleToggleTheme = () => {
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    setCurrentTheme(newTheme);
    setTheme(newTheme);
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await supabase.auth.signOut();
      toast({ title: "Logged out", description: "You have been logged out successfully" });
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({ title: "Error", description: "Failed to logout", variant: "destructive" });
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-32 bg-muted rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-muted rounded-lg" />
          <div className="h-24 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  const xpProgress = gamification ? getXPProgress(gamification.xp, gamification.level) : 0;

  return (
    <div className="pb-8 space-y-8">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 p-6 sm:p-8 bg-gradient-to-br from-primary/10 via-transparent to-transparent rounded-xl border border-border/50">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 flex-1 text-center sm:text-left">
          <div className="relative">
            <Avatar className="h-24 sm:h-28 w-24 sm:w-28 border-2 border-primary/20">
              <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {profile.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Level badge */}
            {gamification && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground border-2 border-background">
                {gamification.level}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl font-bold mb-1 text-balance">{profile.displayName}</h1>
            {gamification && (
              <p className="text-sm text-primary font-medium mb-2">
                {formatLevel(gamification.level)} -- Level {gamification.level}
              </p>
            )}
            <p className="text-muted-foreground text-sm break-all">{profile.email}</p>
            {/* XP Progress */}
            {gamification && (
              <div className="mt-3 max-w-xs">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{gamification.xp} XP</span>
                  <span>{getXPForNextLevel(gamification.level)} XP</span>
                </div>
                <Progress value={xpProgress} className="h-1.5" />
              </div>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="lg"
          onClick={handleToggleTheme}
          className="rounded-full shrink-0 h-14 w-14"
          title={`Switch to ${currentTheme === "dark" ? "light" : "dark"} mode`}
        >
          {currentTheme === "dark" ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickStat
          icon={Heart}
          label="Liked Songs"
          value={loadingStats ? "..." : stats.likedSongs.toString()}
          color="text-red-500"
          bgColor="bg-red-500/10"
        />
        <QuickStat
          icon={Music}
          label="Playlists"
          value={loadingStats ? "..." : stats.playlists.toString()}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <QuickStat
          icon={Flame}
          label="Day Streak"
          value={gamification?.streak.toString() || "0"}
          color="text-orange-500"
          bgColor="bg-orange-500/10"
        />
        <QuickStat
          icon={Clock}
          label="Listening"
          value={listeningStats ? formatListeningTime(listeningStats.totalListeningTime) : "0m"}
          color="text-primary"
          bgColor="bg-primary/10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-secondary/50 p-1 w-full sm:w-auto">
          <TabsTrigger value="overview" className="data-[state=active]:bg-card gap-2 flex-1 sm:flex-none">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="achievements" className="data-[state=active]:bg-card gap-2 flex-1 sm:flex-none">
            <Trophy className="w-4 h-4" />
            Achievements
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-card gap-2 flex-1 sm:flex-none">
            <Users className="w-4 h-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Listening Stats Summary */}
          {listeningStats && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Listening Summary
                </h3>
                <Link href="/stats">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    View Details
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-foreground">{listeningStats.totalTracks}</p>
                  <p className="text-xs text-muted-foreground">Tracks Played</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{listeningStats.totalArtists}</p>
                  <p className="text-xs text-muted-foreground">Artists</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{formatListeningTime(listeningStats.thisWeekListeningTime)}</p>
                  <p className="text-xs text-muted-foreground">This Week</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{formatListeningTime(listeningStats.thisMonthListeningTime)}</p>
                  <p className="text-xs text-muted-foreground">This Month</p>
                </div>
              </div>
            </Card>
          )}

          {/* Settings */}
          <Card className="p-6 border-border/50">
            <div className="flex items-center gap-3 pb-4 border-b border-border/50 mb-4">
              <Settings className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Settings</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 hover:bg-secondary/50 rounded-lg transition-colors">
                <span className="text-sm text-muted-foreground">Theme</span>
                <span className="text-sm font-medium capitalize">{currentTheme || "system"}</span>
              </div>
              <div className="flex items-center justify-between p-3 hover:bg-secondary/50 rounded-lg transition-colors">
                <span className="text-sm text-muted-foreground">Account</span>
                <span className="text-xs font-mono text-primary">{profile.id.slice(0, 8)}...</span>
              </div>
            </div>
            <Button
              variant="destructive"
              className="w-full mt-6"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="mt-6 space-y-6">
          {gamification && gamification.achievements.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gamification.achievements.map((achievement) => (
                <Card key={achievement.id} className="p-4 flex items-center gap-3 border-primary/20">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{achievement.title}</p>
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No achievements yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Keep listening to unlock achievements
              </p>
              <Link href="/stats">
                <Button variant="outline" className="mt-4">
                  View All Achievements
                </Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card className="p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Recent Activity
            </h3>
            <ActivityFeed userId={profile.id} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuickStat({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <Card className="p-4 text-center">
      <div className={`w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center mx-auto mb-2`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}
