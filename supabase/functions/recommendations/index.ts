// Edge Function for generating recommendations based on user performance
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';

// Recommendation templates by category
const recommendationsByCategory: Record<string, string[]> = {
  speed: [
    'Practice the home row keys to build muscle memory',
    'Focus on smooth, continuous typing rather than bursts',
    'Try typing common words repeatedly to increase speed',
    'Use all fingers and maintain proper hand position',
    'Practice with shorter, more frequent sessions',
  ],
  accuracy: [
    'Slow down and focus on hitting the correct keys',
    'Practice problem keys individually',
    'Look at the screen, not the keyboard',
    'Take breaks to avoid fatigue-related errors',
    'Review your common mistakes and practice those combinations',
  ],
  ergonomics: [
    'Ensure your keyboard is at elbow height',
    'Keep your wrists straight, not bent',
    'Take regular breaks every 30 minutes',
    'Position your monitor at eye level',
    'Use a wrist rest for additional support',
  ],
  practice: [
    'Set a daily practice goal of 15-30 minutes',
    'Practice at the same time each day to build habit',
    'Track your progress to stay motivated',
    'Mix up difficulty levels to stay challenged',
    'Celebrate small improvements',
  ],
  rhythm: [
    'Listen to music with a steady beat while typing',
    'Practice typing to a metronome',
    'Focus on maintaining consistent key press intervals',
    'Avoid rushing through easy words',
    'Build up speed gradually rather than all at once',
  ],
};

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSupabaseClient(req);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const category = url.searchParams.get('category');

    if (!category) {
      return new Response(JSON.stringify({ error: 'Category required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's recent results to personalize recommendations
    const { data: results } = await supabase
      .from('results')
      .select('correct, incorrect, cpm, key_presses')
      .eq('user_id', user.id)
      .order('datetime', { ascending: false })
      .limit(10);

    // Analyze results to provide personalized recommendations
    let recommendations = recommendationsByCategory[category] || [];
    
    if (results && results.length > 0) {
      const avgCpm = results.reduce((sum, r) => sum + r.cpm, 0) / results.length;
      const avgAccuracy = results.reduce((sum, r) => sum + (r.correct / (r.correct + r.incorrect)), 0) / results.length;

      // Add personalized recommendations based on performance
      if (category === 'speed' && avgCpm < 100) {
        recommendations = [
          'Focus on accuracy first - speed will follow',
          ...recommendations,
        ];
      }

      if (category === 'accuracy' && avgAccuracy < 0.9) {
        recommendations = [
          'You\'re making some errors - try slowing down a bit',
          ...recommendations,
        ];
      }

      // Analyze problem keys
      if (results[0]?.key_presses) {
        const keyPresses = results[0].key_presses as any[];
        const problemKeys = keyPresses
          .filter(kp => !kp.correct)
          .map(kp => kp.key)
          .slice(0, 3);

        if (problemKeys.length > 0) {
          recommendations = [
            `Focus on practicing these keys: ${problemKeys.join(', ')}`,
            ...recommendations,
          ];
        }
      }
    }

    // Return top 3 recommendations
    return new Response(JSON.stringify(recommendations.slice(0, 3)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
