"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Music, Headphones, Heart, Sparkles, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "sean-streams-onboarding-complete";

const GENRES = [
  { id: "pop", name: "Pop", color: "from-pink-500/20 to-rose-500/20 border-pink-500/40" },
  { id: "hiphop", name: "Hip-Hop", color: "from-orange-500/20 to-amber-500/20 border-orange-500/40" },
  { id: "rock", name: "Rock", color: "from-red-500/20 to-red-400/20 border-red-500/40" },
  { id: "electronic", name: "Electronic", color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/40" },
  { id: "rnb", name: "R&B", color: "from-purple-500/20 to-violet-400/20 border-purple-500/40" },
  { id: "latin", name: "Latin", color: "from-green-500/20 to-emerald-400/20 border-green-500/40" },
  { id: "jazz", name: "Jazz", color: "from-amber-500/20 to-yellow-400/20 border-amber-500/40" },
  { id: "classical", name: "Classical", color: "from-slate-400/20 to-gray-400/20 border-slate-400/40" },
  { id: "indie", name: "Indie", color: "from-teal-500/20 to-teal-300/20 border-teal-500/40" },
  { id: "country", name: "Country", color: "from-yellow-600/20 to-amber-400/20 border-yellow-600/40" },
];

const STEPS = [
  {
    icon: Music,
    title: "Welcome to Sean Streams",
    description: "Your personal music streaming experience. Discover, play, and share music you love.",
  },
  {
    icon: Headphones,
    title: "Pick Your Favorites",
    description: "Select genres you enjoy so we can personalize your experience.",
  },
  {
    icon: Sparkles,
    title: "You're All Set!",
    description: "Start exploring music tailored just for you. Your home page is now personalized.",
  },
];

interface OnboardingFlowProps {
  onComplete: (genres: string[]) => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const toggleGenre = (id: string) => {
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    localStorage.setItem("sean-streams-preferred-genres", JSON.stringify(selectedGenres));
    onComplete(selectedGenres);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    onComplete([]);
  };

  const currentStep = STEPS[step];
  const Icon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg flex flex-col items-center text-center">
        {/* Progress dots */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/60" : "w-4 bg-muted"
              )}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Icon className="w-10 h-10 text-primary" />
        </div>

        {/* Title & Description */}
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 text-balance">
          {currentStep.title}
        </h1>
        <p className="text-muted-foreground text-base mb-8 max-w-sm text-pretty">
          {currentStep.description}
        </p>

        {/* Genre Selection (Step 2) */}
        {step === 1 && (
          <div className="w-full mb-8">
            <div className="grid grid-cols-2 gap-3">
              {GENRES.map((genre) => {
                const isSelected = selectedGenres.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.id)}
                    className={cn(
                      "relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                      `bg-gradient-to-br ${genre.color}`,
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 scale-[1.02]"
                        : "border-transparent hover:border-muted-foreground/20"
                    )}
                  >
                    <span className="font-semibold text-sm text-foreground">{genre.name}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Select at least 3 genres for the best experience
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={handleNext}
            disabled={step === 1 && selectedGenres.length < 1}
          >
            {step === STEPS.length - 1 ? "Start Listening" : "Continue"}
            <ChevronRight className="w-4 h-4" />
          </Button>
          {step < STEPS.length - 1 && (
            <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
              Skip for now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function getPreferredGenres(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("sean-streams-preferred-genres");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}
