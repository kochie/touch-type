// Supabase function call for resetting a goal
import { Tables } from "@/types/supabase";
import { newGoal } from "./getGoal";

export async function resetGoal(category: string): Promise<Tables<"goals">> {
  return newGoal(category);
}
