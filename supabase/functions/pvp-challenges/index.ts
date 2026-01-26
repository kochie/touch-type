// Edge Function for PvP Challenges
// Handles creating, accepting, and managing PvP challenges
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, createSupabaseAdmin } from '../_shared/supabase.ts';

interface CreateChallengeBody {
  action: 'create';
  opponentId?: string;  // Optional - can be null for open challenges
  keyboard: string;
  level: string;
  language: string;
  capital?: boolean;
  punctuation?: boolean;
  numbers?: boolean;
  wordSet: string[];
  message?: string;
  createInviteLink?: boolean;
}

interface AcceptChallengeBody {
  action: 'accept';
  challengeId?: string;
  inviteCode?: string;
}

interface SubmitResultBody {
  action: 'submit_result';
  challengeId: string;
  resultId: string;
}

interface DeclineChallengeBody {
  action: 'decline';
  challengeId: string;
}

type RequestBody = CreateChallengeBody | AcceptChallengeBody | SubmitResultBody | DeclineChallengeBody;

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

    // GET - List challenges for current user
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const status = url.searchParams.get('status');
      const challengeCode = url.searchParams.get('code');
      const inviteCode = url.searchParams.get('invite');

      // Get challenge by code (for joining via link)
      if (challengeCode) {
        const { data: challenge, error } = await supabase
          .from('pvp_challenges_view')
          .select('*')
          .eq('challenge_code', challengeCode.toUpperCase())
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: 'Challenge not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(challenge), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get challenge by invite code
      if (inviteCode) {
        const { data: invite, error: inviteError } = await supabase
          .from('pvp_challenge_invites')
          .select('*, pvp_challenges(*)')
          .eq('invite_code', inviteCode.toUpperCase())
          .single();

        if (inviteError || !invite) {
          return new Response(JSON.stringify({ error: 'Invite not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (invite.used) {
          return new Response(JSON.stringify({ error: 'Invite already used' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (new Date(invite.expires_at) < new Date()) {
          return new Response(JSON.stringify({ error: 'Invite expired' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(invite), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // List user's challenges
      let query = supabase
        .from('pvp_challenges_view')
        .select('*')
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: challenges, error } = await query;

      if (error) {
        throw error;
      }

      // Separate into incoming and outgoing
      const incoming = challenges?.filter(c => c.opponent_id === user.id) || [];
      const outgoing = challenges?.filter(c => c.challenger_id === user.id) || [];

      return new Response(JSON.stringify({ incoming, outgoing, all: challenges }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create, accept, submit result, or decline challenge
    if (req.method === 'POST') {
      const body: RequestBody = await req.json();

      // Create a new challenge
      if (body.action === 'create') {
        const createBody = body as CreateChallengeBody;

        if (!createBody.wordSet || createBody.wordSet.length === 0) {
          return new Response(JSON.stringify({ error: 'Word set is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create the challenge
        const { data: challenge, error: createError } = await supabase
          .from('pvp_challenges')
          .insert({
            challenger_id: user.id,
            opponent_id: createBody.opponentId || null,
            keyboard: createBody.keyboard,
            level: createBody.level,
            language: createBody.language,
            capital: createBody.capital || false,
            punctuation: createBody.punctuation || false,
            numbers: createBody.numbers || false,
            word_set: createBody.wordSet,
            message: createBody.message || null,
            status: createBody.opponentId ? 'pending' : 'pending',  // Pending until opponent accepts
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        // Optionally create an invite link
        let inviteCode = null;
        if (createBody.createInviteLink) {
          const { data: invite, error: inviteError } = await supabase
            .from('pvp_challenge_invites')
            .insert({
              challenge_id: challenge.id,
              invite_code: crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase(),
            })
            .select()
            .single();

          if (!inviteError && invite) {
            inviteCode = invite.invite_code;
          }
        }

        return new Response(JSON.stringify({ ...challenge, invite_code: inviteCode }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Accept a challenge
      if (body.action === 'accept') {
        const acceptBody = body as AcceptChallengeBody;
        let challengeId = acceptBody.challengeId;

        // If using invite code, find the challenge
        if (acceptBody.inviteCode) {
          const { data: invite, error: inviteError } = await supabase
            .from('pvp_challenge_invites')
            .select('challenge_id, used, expires_at')
            .eq('invite_code', acceptBody.inviteCode.toUpperCase())
            .single();

          if (inviteError || !invite) {
            return new Response(JSON.stringify({ error: 'Invalid invite code' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (invite.used) {
            return new Response(JSON.stringify({ error: 'Invite already used' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (new Date(invite.expires_at) < new Date()) {
            return new Response(JSON.stringify({ error: 'Invite expired' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          challengeId = invite.challenge_id;

          // Mark invite as used
          await supabase
            .from('pvp_challenge_invites')
            .update({ used: true, used_by: user.id })
            .eq('invite_code', acceptBody.inviteCode.toUpperCase());
        }

        if (!challengeId) {
          return new Response(JSON.stringify({ error: 'Challenge ID or invite code required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get the challenge
        const { data: challenge, error: getError } = await supabase
          .from('pvp_challenges')
          .select('*')
          .eq('id', challengeId)
          .single();

        if (getError || !challenge) {
          return new Response(JSON.stringify({ error: 'Challenge not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Validate
        if (challenge.challenger_id === user.id) {
          return new Response(JSON.stringify({ error: 'Cannot accept your own challenge' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (challenge.status !== 'pending') {
          return new Response(JSON.stringify({ error: 'Challenge is no longer pending' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (challenge.opponent_id && challenge.opponent_id !== user.id) {
          return new Response(JSON.stringify({ error: 'This challenge is for a specific user' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (new Date(challenge.expires_at) < new Date()) {
          return new Response(JSON.stringify({ error: 'Challenge has expired' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Accept the challenge
        const { data: updatedChallenge, error: updateError } = await supabase
          .from('pvp_challenges')
          .update({
            opponent_id: user.id,
            status: 'accepted',
          })
          .eq('id', challengeId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        return new Response(JSON.stringify(updatedChallenge), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Submit result for a challenge
      if (body.action === 'submit_result') {
        const submitBody = body as SubmitResultBody;

        const { data: challenge, error: getError } = await supabase
          .from('pvp_challenges')
          .select('*')
          .eq('id', submitBody.challengeId)
          .single();

        if (getError || !challenge) {
          return new Response(JSON.stringify({ error: 'Challenge not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Determine if user is challenger or opponent
        const isChallenger = challenge.challenger_id === user.id;
        const isOpponent = challenge.opponent_id === user.id;

        if (!isChallenger && !isOpponent) {
          return new Response(JSON.stringify({ error: 'Not a participant in this challenge' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if already submitted
        if (isChallenger && challenge.challenger_result_id) {
          return new Response(JSON.stringify({ error: 'Result already submitted' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (isOpponent && challenge.opponent_result_id) {
          return new Response(JSON.stringify({ error: 'Result already submitted' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update with the result
        const updateData: Record<string, string> = {};
        if (isChallenger) {
          updateData.challenger_result_id = submitBody.resultId;
        } else {
          updateData.opponent_result_id = submitBody.resultId;
        }

        // If this is the first result and challenge is 'accepted', set to 'in_progress'
        if (challenge.status === 'accepted') {
          updateData.status = 'in_progress';
        }

        const { data: updatedChallenge, error: updateError } = await supabase
          .from('pvp_challenges')
          .update(updateData)
          .eq('id', submitBody.challengeId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        return new Response(JSON.stringify(updatedChallenge), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Decline a challenge
      if (body.action === 'decline') {
        const declineBody = body as DeclineChallengeBody;

        const { data: challenge, error: getError } = await supabase
          .from('pvp_challenges')
          .select('*')
          .eq('id', declineBody.challengeId)
          .single();

        if (getError || !challenge) {
          return new Response(JSON.stringify({ error: 'Challenge not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Only the opponent can decline
        if (challenge.opponent_id !== user.id) {
          return new Response(JSON.stringify({ error: 'Only the opponent can decline' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (challenge.status !== 'pending') {
          return new Response(JSON.stringify({ error: 'Challenge is no longer pending' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: updatedChallenge, error: updateError } = await supabase
          .from('pvp_challenges')
          .update({ status: 'declined' })
          .eq('id', declineBody.challengeId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        return new Response(JSON.stringify(updatedChallenge), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Cancel a challenge
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const challengeId = url.searchParams.get('id');

      if (!challengeId) {
        return new Response(JSON.stringify({ error: 'Challenge ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('pvp_challenges')
        .delete()
        .eq('id', challengeId)
        .eq('challenger_id', user.id);

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
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
