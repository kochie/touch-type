"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSupabase } from "./supabase-provider";
import { usePlan } from "./plan_hook";
import { useResults } from "./result-provider";
import { DateTime } from "luxon";

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  isAtRisk: boolean; // True if no activity today
  freezesAvailable: number;
  freezeUsedAt: string | null;
  isPremium: boolean;
  isLoading: boolean;
}

interface StreakContextType extends StreakData {
  refreshStreak: () => Promise<void>;
  refreshFreezes: () => Promise<void>;
}

const defaultStreakData: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null,
  isAtRisk: false,
  freezesAvailable: 0,
  freezeUsedAt: null,
  isPremium: false,
  isLoading: true,
};

const StreakContext = createContext<StreakContextType>({
  ...defaultStreakData,
  refreshStreak: async () => {},
  refreshFreezes: async () => {},
});

// Milestone days for celebrations
export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 150, 200, 365, 500, 1000];

// Check if a streak count is a milestone
export function isStreakMilestone(streak: number): boolean {
  return STREAK_MILESTONES.includes(streak);
}

// Get the next milestone
export function getNextMilestone(streak: number): number | null {
  const next = STREAK_MILESTONES.find((m) => m > streak);
  return next ?? null;
}

// Calculate days until streak is lost (0 = today, 1 = tomorrow deadline)
export function getDaysUntilStreakLost(lastActivityDate: string | null): number {
  if (!lastActivityDate) return 0;
  
  const lastDate = DateTime.fromISO(lastActivityDate);
  const today = DateTime.now().startOf("day");
  const daysSince = Math.floor(today.diff(lastDate, "days").days);
  
  // If practiced today, have until end of tomorrow (returns 1)
  // If practiced yesterday, have until end of today (returns 0)
  // If more than 1 day ago, streak is already at risk (returns -1 or less)
  return 1 - daysSince;
}

// Calculate streak from results array (client-side fallback)
function calculateStreakFromResults(results: { datetime: string }[]): {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
} {
  if (results.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
  }

  // Get unique dates sorted in descending order (most recent first)
  const uniqueDates = Array.from(
    new Set(
      results.map((r) => DateTime.fromISO(r.datetime).toISODate())
    )
  )
    .filter((d): d is string => d !== null)
    .sort((a, b) => b.localeCompare(a));

  if (uniqueDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
  }

  const lastActivityDate = uniqueDates[0];
  const today = DateTime.now().startOf("day");
  const lastDate = DateTime.fromISO(lastActivityDate);

  // Check if the most recent activity is today or yesterday
  const daysSinceLastActivity = Math.floor(today.diff(lastDate, "days").days);
  
  // If more than 1 day since last activity, streak is broken
  if (daysSinceLastActivity > 1) {
    // Calculate longest streak from history
    let longestStreak = 1;
    let tempStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const curr = DateTime.fromISO(uniqueDates[i - 1]);
      const prev = DateTime.fromISO(uniqueDates[i]);
      const diff = Math.floor(curr.diff(prev, "days").days);
      if (diff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
    return { currentStreak: 0, longestStreak, lastActivityDate };
  }

  // Calculate current streak
  let currentStreak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const curr = DateTime.fromISO(uniqueDates[i - 1]);
    const prev = DateTime.fromISO(uniqueDates[i]);
    const diff = Math.floor(curr.diff(prev, "days").days);
    if (diff === 1) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = currentStreak;
  let tempStreak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const curr = DateTime.fromISO(uniqueDates[i - 1]);
    const prev = DateTime.fromISO(uniqueDates[i]);
    const diff = Math.floor(curr.diff(prev, "days").days);
    if (diff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  return { currentStreak, longestStreak, lastActivityDate };
}

export const StreakProvider = ({ children }: { children: React.ReactNode }) => {
  const [streak, setStreak] = useState<StreakData>(defaultStreakData);
  const { supabase, user } = useSupabase();
  const plan = usePlan();
  const { results } = useResults();

  const isPremium = plan?.billing_plan !== "free" && plan?.status === "active";

  // Calculate streak from local results as fallback
  const calculateFromResults = useCallback(() => {
    const calculated = calculateStreakFromResults(results);
    const today = DateTime.now().startOf("day");
    const lastDate = calculated.lastActivityDate
      ? DateTime.fromISO(calculated.lastActivityDate)
      : null;
    const isAtRisk = lastDate ? !lastDate.hasSame(today, "day") : true;

    setStreak({
      currentStreak: calculated.currentStreak,
      longestStreak: calculated.longestStreak,
      lastActivityDate: calculated.lastActivityDate,
      isAtRisk,
      freezesAvailable: 0,
      freezeUsedAt: null,
      isPremium,
      isLoading: false,
    });
  }, [results, isPremium]);

  const fetchStreak = useCallback(async () => {
    if (!user) {
      // Not logged in - calculate from local results
      calculateFromResults();
      return;
    }

    try {
      const { data, error } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Handle table not existing or other errors - fall back to results
      if (error) {
        // PGRST116 = no rows found, 42P01 = table doesn't exist
        if (error.code === "PGRST116" || error.code === "42P01" || error.message?.includes("does not exist")) {
          console.log("Streaks table not available, calculating from results");
          calculateFromResults();
          return;
        }
        console.error("Error fetching streak:", error);
        calculateFromResults();
        return;
      }

      if (data) {
        const lastActivityDate = data.last_activity_date;
        const today = DateTime.now().startOf("day");
        const lastDate = lastActivityDate
          ? DateTime.fromISO(lastActivityDate)
          : null;

        // Check if at risk (no activity today)
        const isAtRisk = lastDate
          ? !lastDate.hasSame(today, "day")
          : true;

        setStreak({
          currentStreak: data.current_streak ?? 0,
          longestStreak: data.longest_streak ?? 0,
          lastActivityDate: data.last_activity_date,
          isAtRisk,
          freezesAvailable: data.streak_freeze_count ?? 0,
          freezeUsedAt: data.streak_freeze_used_at,
          isPremium,
          isLoading: false,
        });
      } else {
        // No streak record yet - calculate from results
        calculateFromResults();
      }
    } catch (error) {
      console.error("Error fetching streak:", error);
      calculateFromResults();
    }
  }, [user, supabase, isPremium, calculateFromResults]);

  // Refresh freeze count for premium users (weekly)
  const refreshFreezes = useCallback(async () => {
    if (!user || !isPremium) return;

    try {
      const { data, error } = await supabase
        .from("streaks")
        .select("last_freeze_refresh, streak_freeze_count")
        .eq("user_id", user.id)
        .single();

      if (error || !data) return;

      const lastRefresh = data.last_freeze_refresh
        ? DateTime.fromISO(data.last_freeze_refresh)
        : null;
      const now = DateTime.now();

      // Check if it's been a week since last refresh
      const shouldRefresh =
        !lastRefresh || now.diff(lastRefresh, "days").days >= 7;

      if (shouldRefresh && data.streak_freeze_count < 1) {
        // Grant 1 freeze per week for premium users
        const { error: updateError } = await supabase
          .from("streaks")
          .update({
            streak_freeze_count: 1,
            last_freeze_refresh: now.toISODate(),
          })
          .eq("user_id", user.id);

        if (!updateError) {
          setStreak((prev) => ({
            ...prev,
            freezesAvailable: 1,
          }));
        }
      }
    } catch (error) {
      console.error("Error refreshing freezes:", error);
    }
  }, [user, supabase, isPremium]);

  // Fetch streak on mount and when user changes
  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  // Recalculate when results change (new session completed)
  useEffect(() => {
    if (results.length > 0) {
      fetchStreak();
    }
  }, [results.length]);

  // Check for freeze refresh on mount (for premium users)
  useEffect(() => {
    if (isPremium) {
      refreshFreezes();
    }
  }, [isPremium, refreshFreezes]);

  // Set up real-time subscription for streak updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`streak-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "streaks",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Streak updated:", payload);
          // Refetch to get the latest data
          fetchStreak();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, fetchStreak]);

  // Update isPremium when plan changes
  useEffect(() => {
    setStreak((prev) => ({
      ...prev,
      isPremium,
    }));
  }, [isPremium]);

  // Send streak data to Electron main process for tray display
  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI?.updateStreakData) {
      window.electronAPI.updateStreakData({
        currentStreak: streak.currentStreak,
        isAtRisk: streak.isAtRisk,
      });
    }
  }, [streak.currentStreak, streak.isAtRisk]);

  const contextValue: StreakContextType = {
    ...streak,
    refreshStreak: fetchStreak,
    refreshFreezes,
  };

  return (
    <StreakContext.Provider value={contextValue}>
      {children}
    </StreakContext.Provider>
  );
};

export function useStreak(): StreakContextType {
  const context = useContext(StreakContext);
  if (context === undefined) {
    throw new Error("useStreak must be used within a StreakProvider");
  }
  return context;
}

// Helper hook to get streak warning message for notifications
export function useStreakWarningMessage(): string | null {
  const { currentStreak, isAtRisk } = useStreak();

  if (!isAtRisk || currentStreak === 0) {
    return null;
  }

  return `Don't break your ${currentStreak}-day streak!`;
}
