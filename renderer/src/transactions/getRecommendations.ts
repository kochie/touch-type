// Supabase function call for getting all recommendations
import { getRecommendation } from "./getRecommendation";

const RECOMMENDATION_CATEGORIES = ['speed', 'accuracy', 'ergonomics', 'practice', 'rhythm'];

export interface AllRecommendations {
  speedRecommendation: string[];
  accuracyRecommendation: string[];
  ergonomicsRecommendation: string[];
  practiceRecommendation: string[];
  rhythmRecommendation: string[];
}

export async function getAllRecommendations(): Promise<AllRecommendations> {
  const [
    speedRecommendation,
    accuracyRecommendation,
    ergonomicsRecommendation,
    practiceRecommendation,
    rhythmRecommendation,
  ] = await Promise.all([
    getRecommendation('speed').catch(() => []),
    getRecommendation('accuracy').catch(() => []),
    getRecommendation('ergonomics').catch(() => []),
    getRecommendation('practice').catch(() => []),
    getRecommendation('rhythm').catch(() => []),
  ]);

  return {
    speedRecommendation,
    accuracyRecommendation,
    ergonomicsRecommendation,
    practiceRecommendation,
    rhythmRecommendation,
  };
}
