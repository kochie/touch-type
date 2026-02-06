// Supabase query for getting all goals
import { Tables } from "@/types/supabase";
import { getGoal } from "./getGoal";

const GOAL_CATEGORIES = ['speed', 'accuracy', 'ergonomics', 'practice', 'rhythm'];

export interface AllGoals {
  speedGoal: Tables<"goals"> | null;
  accuracyGoal: Tables<"goals"> | null;
  ergonomicsGoal: Tables<"goals"> | null;
  practiceGoal: Tables<"goals"> | null;
  rhythmGoal: Tables<"goals"> | null;
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
