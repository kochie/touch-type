// Edge Function for managing challenges
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';

// Challenge templates
const challengeTemplates = [
  {
    description: 'Type without looking at the keyboard',
    level: '1',
  },
  {
    description: 'Achieve 150 CPM for 3 tests in a row',
    level: '2',
  },
  {
    description: 'Complete a test with 100% accuracy',
    level: '3',
  },
  {
    description: 'Type for 10 minutes without breaks',
    level: '4',
  },
  {
    description: 'Master all home row keys',
    level: '1',
  },
  {
    description: 'Type with numbers enabled',
    level: '3',
  },
  {
    description: 'Type with punctuation enabled',
    level: '4',
  },
  {
    description: 'Achieve 200 CPM on any level',
    level: '5',
  },
];

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
    const category = url.searchParams.get('category') || 'daily';

    if (req.method === 'GET') {
      const { data: challenge, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', category)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If no challenge or challenge is old, create a new one
      if (!challenge || (challenge.created_at && 
          new Date(challenge.created_at).toDateString() !== new Date().toDateString())) {
        
        const { data: settings } = await supabase
          .from('settings')
          .select('keyboard_name')
          .eq('user_id', user.id)
          .single();

        // Pick a random challenge
        const template = challengeTemplates[Math.floor(Math.random() * challengeTemplates.length)];

        const { data: newChallenge, error: insertError } = await supabase
          .from('challenges')
          .upsert({
            user_id: user.id,
            category,
            description: template.description,
            keyboard: settings?.keyboard_name || 'MACOS_US_QWERTY',
            level: template.level,
            completed_at: null,
          }, { onConflict: 'user_id,category' })
          .select()
          .single();

        if (insertError) throw insertError;

        return new Response(JSON.stringify(newChallenge), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(challenge), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const action = body.action;

      if (action === 'complete') {
        const { data, error } = await supabase
          .from('challenges')
          .update({ completed_at: new Date().toISOString() })
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
        const { data: settings } = await supabase
          .from('settings')
          .select('keyboard_name')
          .eq('user_id', user.id)
          .single();

        const template = challengeTemplates[Math.floor(Math.random() * challengeTemplates.length)];

        const { data, error } = await supabase
          .from('challenges')
          .upsert({
            user_id: user.id,
            category,
            description: template.description,
            keyboard: settings?.keyboard_name || 'MACOS_US_QWERTY',
            level: template.level,
            completed_at: null,
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
