// Supabase query for getting all goals
import { getGoal } from "./getGoal";
import type { Goal } from "@/types/supabase";

const GOAL_CATEGORIES = ['speed', 'accuracy', 'ergonomics', 'practice', 'rhythm'];

export interface AllGoals {
  speedGoal: Goal | null;
  accuracyGoal: Goal | null;
  ergonomicsGoal: Goal | null;
  practiceGoal: Goal | null;
  rhythmGoal: Goal | null;
}

export async function getAllGoals(): Promise<AllGoals> {
  const [speedGoal, accuracyGoal, ergonomicsGoal, practiceGoal, rhythmGoal] = await Promise.all([
    getGoal('speed').catch(() => null),
    getGoal('accuracy').catch(() => null),
    getGoal('ergonomics').catch(() => null),
    getGoal('practice').catch(() => null),
    getGoal('rhythm').catch(() => null),
  ]);

  return {
    speedGoal,
    accuracyGoal,
    ergonomicsGoal,
    practiceGoal,
    rhythmGoal,
  };
}
