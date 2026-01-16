// Supabase query for getting AI assistant data (goals + recommendations)
import { getAllGoals, AllGoals } from "./getGoals";
import { getAllRecommendations, AllRecommendations } from "./getRecommendations";

export interface AIData extends AllGoals, AllRecommendations {}

export async function getAIData(): Promise<AIData> {
  const [goals, recommendations] = await Promise.all([
    getAllGoals(),
    getAllRecommendations(),
  ]);

  return {
    ...goals,
    ...recommendations,
  };
}
