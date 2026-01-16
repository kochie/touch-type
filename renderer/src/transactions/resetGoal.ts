// Supabase function call for resetting a goal
import { newGoal } from "./getGoal";
import type { Goal } from "@/types/supabase";

export async function resetGoal(category: string): Promise<Goal> {
  return newGoal(category);
}
