// Edge Function for managing goals
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';

interface Goal {
  category: string;
  description: string;
  keyboard: string;
  language: string;
  level: string;
  complete: boolean;
  requirement: {
    time?: number;
    score?: number;
    cpm?: number;
    correct?: number;
    incorrect?: number;
    capital?: boolean;
    punctuation?: boolean;
    numbers?: boolean;
  };
}

// Goal templates for different categories
const goalTemplates: Record<string, (settings: any) => Goal> = {
  speed: (settings) => ({
    category: 'speed',
    description: `Achieve ${settings.targetCpm || 200} CPM on level ${settings.level || '1'}`,
    keyboard: settings.keyboard || 'MACOS_US_QWERTY',
    language: settings.language || 'en',
    level: settings.level || '1',
    complete: false,
    requirement: {
      cpm: settings.targetCpm || 200,
      capital: settings.capital || false,
      punctuation: settings.punctuation || false,
      numbers: settings.numbers || false,
    },
  }),
  accuracy: (settings) => ({
    category: 'accuracy',
    description: `Complete a test with at least 95% accuracy`,
    keyboard: settings.keyboard || 'MACOS_US_QWERTY',
    language: settings.language || 'en',
    level: settings.level || '1',
    complete: false,
    requirement: {
      correct: 95,
      incorrect: 5,
    },
  }),
  ergonomics: (settings) => ({
    category: 'ergonomics',
    description: `Complete 5 tests without major errors`,
    keyboard: settings.keyboard || 'MACOS_US_QWERTY',
    language: settings.language || 'en',
    level: settings.level || '1',
    complete: false,
    requirement: {
      score: 5,
    },
  }),
  practice: (settings) => ({
    category: 'practice',
    description: `Practice for 30 minutes total`,
    keyboard: settings.keyboard || 'MACOS_US_QWERTY',
    language: settings.language || 'en',
    level: settings.level || '1',
    complete: false,
    requirement: {
      time: 1800, // 30 minutes in seconds
    },
  }),
  rhythm: (settings) => ({
    category: 'rhythm',
    description: `Maintain consistent typing speed throughout a test`,
    keyboard: settings.keyboard || 'MACOS_US_QWERTY',
    language: settings.language || 'en',
    level: settings.level || '1',
    complete: false,
    requirement: {
      score: 1,
    },
  }),
};

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSupabaseClient(req);
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const category = url.searchParams.get('category');

    if (req.method === 'GET') {
      // Get goal by category
      if (!category) {
        return new Response(JSON.stringify({ error: 'Category required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: goal, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', category)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If no goal exists, create a new one
      if (!goal) {
        const { data: settings } = await supabase
          .from('settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        const template = goalTemplates[category];
        if (!template) {
          return new Response(JSON.stringify({ error: 'Invalid category' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const newGoal = template({
          keyboard: settings?.keyboard_name,
          language: settings?.language,
          level: settings?.level_name,
          capital: settings?.capital,
          punctuation: settings?.punctuation,
          numbers: settings?.numbers,
        });

        const { data: createdGoal, error: insertError } = await supabase
          .from('goals')
          .insert({
            user_id: user.id,
            ...newGoal,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        return new Response(JSON.stringify(createdGoal), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(goal), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const action = body.action;

      if (action === 'complete') {
        // Mark goal as complete
        const { data, error } = await supabase
          .from('goals')
          .update({ complete: true })
          .eq('user_id', user.id)
          .eq('category', category)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'new') {
        // Create new goal (reset)
        const { data: settings } = await supabase
          .from('settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        const template = goalTemplates[category!];
        if (!template) {
          return new Response(JSON.stringify({ error: 'Invalid category' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const newGoal = template({
          keyboard: settings?.keyboard_name,
          language: settings?.language,
          level: settings?.level_name,
          capital: settings?.capital,
          punctuation: settings?.punctuation,
          numbers: settings?.numbers,
          targetCpm: (body.targetCpm || 200) + 50, // Increase difficulty
        });

        const { data, error } = await supabase
          .from('goals')
          .upsert({
            user_id: user.id,
            ...newGoal,
          }, { onConflict: 'user_id,category' })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
