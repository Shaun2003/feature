"use client";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "listening" | "social" | "collection" | "streak";
  requirement: number;
  unlockedAt?: number;
}

export interface UserGamification {
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  lastListenedDate: string;
  totalTracksPlayed: number;
  totalListeningMinutes: number;
  achievements: Achievement[];
  weeklyChallenge?: WeeklyChallenge;
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  type: "tracks" | "minutes" | "artists" | "playlists";
  expiresAt: number;
  reward: number;
}

const GAMIFICATION_KEY = "sean-streams-gamification";

const XP_PER_TRACK = 10;
const XP_PER_LIKE = 5;
const XP_PER_PLAYLIST_CREATE = 25;
const XP_PER_SHARE = 15;
const XP_STREAK_BONUS = 20;

const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000,
  5200, 6500, 8000, 10000, 12500, 15500, 19000, 23000, 28000, 35000,
];

const ALL_ACHIEVEMENTS: Achievement[] = [
  // Listening achievements
  { id: "first-play", title: "First Note", description: "Play your first track", icon: "play", category: "listening", requirement: 1 },
  { id: "tracks-10", title: "Getting Started", description: "Play 10 tracks", icon: "music", category: "listening", requirement: 10 },
  { id: "tracks-50", title: "Music Lover", description: "Play 50 tracks", icon: "headphones", category: "listening", requirement: 50 },
  { id: "tracks-100", title: "Audiophile", description: "Play 100 tracks", icon: "disc", category: "listening", requirement: 100 },
  { id: "tracks-500", title: "Vinyl Collector", description: "Play 500 tracks", icon: "library", category: "listening", requirement: 500 },
  { id: "minutes-60", title: "Hour Power", description: "Listen for 60 minutes", icon: "clock", category: "listening", requirement: 60 },
  { id: "minutes-600", title: "Marathon Listener", description: "Listen for 10 hours", icon: "timer", category: "listening", requirement: 600 },
  // Streak achievements
  { id: "streak-3", title: "Hat Trick", description: "3-day listening streak", icon: "flame", category: "streak", requirement: 3 },
  { id: "streak-7", title: "Weekly Warrior", description: "7-day listening streak", icon: "fire", category: "streak", requirement: 7 },
  { id: "streak-30", title: "Monthly Master", description: "30-day listening streak", icon: "trophy", category: "streak", requirement: 30 },
  { id: "streak-100", title: "Century Club", description: "100-day listening streak", icon: "crown", category: "streak", requirement: 100 },
  // Collection achievements
  { id: "likes-5", title: "Picky Listener", description: "Like 5 tracks", icon: "heart", category: "collection", requirement: 5 },
  { id: "likes-25", title: "Curator", description: "Like 25 tracks", icon: "heart-filled", category: "collection", requirement: 25 },
  { id: "likes-100", title: "Tastemaker", description: "Like 100 tracks", icon: "star", category: "collection", requirement: 100 },
  { id: "playlist-1", title: "DJ Beginner", description: "Create your first playlist", icon: "list-music", category: "collection", requirement: 1 },
  { id: "playlist-5", title: "Playlist Pro", description: "Create 5 playlists", icon: "list-plus", category: "collection", requirement: 5 },
];

const WEEKLY_CHALLENGES: Omit<WeeklyChallenge, "id" | "progress" | "expiresAt">[] = [
  { title: "Track Explorer", description: "Play 20 different tracks this week", target: 20, type: "tracks", reward: 100 },
  { title: "Deep Listener", description: "Listen for 120 minutes this week", target: 120, type: "minutes", reward: 150 },
  { title: "Artist Safari", description: "Listen to 10 different artists", target: 10, type: "artists", reward: 120 },
  { title: "Playlist Builder", description: "Create 2 playlists this week", target: 2, type: "playlists", reward: 80 },
];

function getDefaultGamification(): UserGamification {
  return {
    xp: 0,
    level: 1,
    streak: 0,
    longestStreak: 0,
    lastListenedDate: "",
    totalTracksPlayed: 0,
    totalListeningMinutes: 0,
    achievements: [],
    weeklyChallenge: undefined,
  };
}

export function getGamification(): UserGamification {
  if (typeof window === "undefined") return getDefaultGamification();
  try {
    const stored = localStorage.getItem(GAMIFICATION_KEY);
    if (!stored) return getDefaultGamification();
    const data = JSON.parse(stored);
    // Ensure weekly challenge is refreshed if expired
    if (data.weeklyChallenge && data.weeklyChallenge.expiresAt < Date.now()) {
      data.weeklyChallenge = generateWeeklyChallenge();
    }
    return data;
  } catch {
    return getDefaultGamification();
  }
}

function saveGamification(data: UserGamification): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(data));
}

export function getLevelFromXP(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getXPForNextLevel(level: number): number {
  if (level >= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] * 2;
  return LEVEL_THRESHOLDS[level];
}

export function getXPProgress(xp: number, level: number): number {
  const currentLevelXP = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextLevelXP = getXPForNextLevel(level);
  const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

function updateStreak(data: UserGamification): UserGamification {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (data.lastListenedDate === today) {
    return data; // Already counted today
  }

  if (data.lastListenedDate === yesterday) {
    data.streak += 1;
  } else if (data.lastListenedDate !== today) {
    data.streak = 1; // Reset streak
  }

  data.lastListenedDate = today;
  data.longestStreak = Math.max(data.longestStreak, data.streak);
  return data;
}

function checkAchievements(data: UserGamification): { data: UserGamification; newAchievements: Achievement[] } {
  const newAchievements: Achievement[] = [];
  const unlockedIds = new Set(data.achievements.map((a) => a.id));

  for (const achievement of ALL_ACHIEVEMENTS) {
    if (unlockedIds.has(achievement.id)) continue;

    let progress = 0;
    switch (achievement.category) {
      case "listening":
        if (achievement.id.startsWith("tracks-") || achievement.id === "first-play") {
          progress = data.totalTracksPlayed;
        } else if (achievement.id.startsWith("minutes-")) {
          progress = data.totalListeningMinutes;
        }
        break;
      case "streak":
        progress = data.streak;
        break;
      // Collection achievements are checked externally
    }

    if (progress >= achievement.requirement) {
      const unlocked = { ...achievement, unlockedAt: Date.now() };
      data.achievements.push(unlocked);
      newAchievements.push(unlocked);
    }
  }

  return { data, newAchievements };
}

export function recordPlay(durationSeconds: number = 0): { newAchievements: Achievement[]; leveledUp: boolean; xpGained: number } {
  let data = getGamification();
  const oldLevel = data.level;

  data.totalTracksPlayed += 1;
  data.totalListeningMinutes += Math.round(durationSeconds / 60);
  data.xp += XP_PER_TRACK;

  // Streak bonus
  data = updateStreak(data);
  if (data.streak > 1) {
    data.xp += XP_STREAK_BONUS;
  }

  data.level = getLevelFromXP(data.xp);

  // Update weekly challenge
  if (data.weeklyChallenge) {
    if (data.weeklyChallenge.type === "tracks") {
      data.weeklyChallenge.progress += 1;
    } else if (data.weeklyChallenge.type === "minutes") {
      data.weeklyChallenge.progress += Math.round(durationSeconds / 60);
    }
  } else {
    data.weeklyChallenge = generateWeeklyChallenge();
  }

  const { data: updatedData, newAchievements } = checkAchievements(data);
  saveGamification(updatedData);

  return {
    newAchievements,
    leveledUp: updatedData.level > oldLevel,
    xpGained: XP_PER_TRACK + (data.streak > 1 ? XP_STREAK_BONUS : 0),
  };
}

export function recordLike(): void {
  const data = getGamification();
  data.xp += XP_PER_LIKE;
  data.level = getLevelFromXP(data.xp);
  saveGamification(data);
}

export function recordPlaylistCreate(): void {
  const data = getGamification();
  data.xp += XP_PER_PLAYLIST_CREATE;
  data.level = getLevelFromXP(data.xp);
  if (data.weeklyChallenge?.type === "playlists") {
    data.weeklyChallenge.progress += 1;
  }
  saveGamification(data);
}

export function recordShare(): void {
  const data = getGamification();
  data.xp += XP_PER_SHARE;
  data.level = getLevelFromXP(data.xp);
  saveGamification(data);
}

function generateWeeklyChallenge(): WeeklyChallenge {
  const template = WEEKLY_CHALLENGES[Math.floor(Math.random() * WEEKLY_CHALLENGES.length)];
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    ...template,
    id: `challenge-${Date.now()}`,
    progress: 0,
    expiresAt: endOfWeek.getTime(),
  };
}

export function getAchievementIcon(iconName: string): string {
  const icons: Record<string, string> = {
    play: "Play", music: "Music", headphones: "Headphones", disc: "Disc3",
    library: "Library", clock: "Clock", timer: "Timer", flame: "Flame",
    fire: "Flame", trophy: "Trophy", crown: "Crown", heart: "Heart",
    "heart-filled": "Heart", star: "Star", "list-music": "ListMusic",
    "list-plus": "ListPlus",
  };
  return icons[iconName] || "Award";
}

export function formatLevel(level: number): string {
  const titles = [
    "Newbie", "Listener", "Fan", "Enthusiast", "Devotee",
    "Connoisseur", "Expert", "Master", "Legend", "Virtuoso",
    "Maestro", "Prodigy", "Savant", "Luminary", "Icon",
    "Phenom", "Oracle", "Titan", "Deity", "Transcendent",
  ];
  return titles[Math.min(level - 1, titles.length - 1)] || "Transcendent";
}
