// Edge Function for leaderboard operations
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSupabaseClient(req);
    
    const url = new URL(req.url);
    const keyboard = url.searchParams.get('keyboard');
    const level = url.searchParams.get('level');
    const language = url.searchParams.get('language');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    if (req.method === 'GET') {
      let query = supabase
        .from('leaderboard_scores')
        .select('*')
        .order('cpm', { ascending: false })
        .limit(limit);

      if (keyboard) {
        query = query.eq('keyboard', keyboard);
      }
      if (level) {
        query = query.eq('level', level);
      }

      const { data: scores, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify(scores), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      // Authenticated user submitting a score
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if user has enabled leaderboard publishing
      const { data: settings } = await supabase
        .from('settings')
        .select('publish_to_leaderboard')
        .eq('user_id', user.id)
        .single();

      if (!settings?.publish_to_leaderboard) {
        return new Response(JSON.stringify({ error: 'Leaderboard publishing disabled' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get user's profile for username
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_username, name')
        .eq('id', user.id)
        .single();

      const body = await req.json();

      // Insert the score
      const { data: score, error } = await supabase
        .from('leaderboard_scores')
        .insert({
          user_id: user.id,
          username: profile?.preferred_username || profile?.name || 'Anonymous',
          correct: body.correct,
          incorrect: body.incorrect,
          cpm: body.cpm,
          keyboard: body.keyboard,
          level: body.level,
          capital: body.capital || false,
          punctuation: body.punctuation || false,
          numbers: body.numbers || false,
          time: body.time,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(score), {
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
