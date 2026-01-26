// Edge Function for searching users
// Used for finding opponents to challenge in PvP
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';

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

    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const query = url.searchParams.get('q');
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ error: 'Query must be at least 2 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Search for users by username or email (case-insensitive)
    // Exclude the current user from results
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, preferred_username, email, name')
      .or(`preferred_username.ilike.%${query}%,email.ilike.%${query}%,name.ilike.%${query}%`)
      .neq('id', user.id)
      .limit(Math.min(limit, 20))  // Cap at 20 results
      .order('preferred_username', { ascending: true });

    if (error) {
      throw error;
    }

    // Map to a cleaner format, hiding email if user doesn't have one set
    const results = users?.map(u => ({
      id: u.id,
      username: u.preferred_username || u.name || u.email?.split('@')[0] || 'Unknown',
      displayName: u.name || u.preferred_username || null,
      // Only show partial email for privacy
      emailHint: u.email ? `${u.email.substring(0, 3)}...@${u.email.split('@')[1]}` : null,
    })) || [];

    return new Response(JSON.stringify({ users: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
