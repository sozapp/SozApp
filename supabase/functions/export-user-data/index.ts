import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const uid = user.id;

  try {
    const [
      profileRes,
      notesRes,
      highlightsRes,
      favoritesRes,
      planProgressRes,
      friendshipsRes,
      friendActivityRes,
      gameScoresRes,
      messagesRes,
      churchMembersRes,
      churchPrayersRes,
      churchCompletionsRes,
      aiUsageRes,
    ] = await Promise.all([
      admin.from('profiles').select('*').eq('id', uid).maybeSingle(),
      admin.from('notes').select('*').eq('user_id', uid),
      admin.from('highlights').select('*').eq('user_id', uid),
      admin.from('favorites').select('*').eq('user_id', uid),
      admin.from('plan_progress').select('*').eq('user_id', uid),
      admin
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${uid},friend_id.eq.${uid}`),
      admin.from('friend_activity').select('*').eq('user_id', uid),
      admin.from('game_scores').select('*').eq('user_id', uid),
      admin
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
        .order('created_at', { ascending: true }),
      admin.from('church_group_members').select('*').eq('user_id', uid),
      admin.from('church_prayers').select('*').eq('user_id', uid),
      admin.from('church_plan_completions').select('*').eq('user_id', uid),
      admin.from('ai_usage').select('*').eq('user_id', uid),
    ]);

    const firstError =
      profileRes.error ||
      notesRes.error ||
      highlightsRes.error ||
      favoritesRes.error ||
      planProgressRes.error ||
      friendshipsRes.error ||
      friendActivityRes.error ||
      gameScoresRes.error ||
      messagesRes.error ||
      churchMembersRes.error ||
      churchPrayersRes.error ||
      churchCompletionsRes.error ||
      aiUsageRes.error;

    if (firstError) {
      return new Response(JSON.stringify({ error: firstError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // reading_history / badges Cloud'da yok — cihazda AsyncStorage'da tutuluyor.
    // Yerel yedek için uygulamadaki "Yedeği Dışa Aktar" kullanılır.
    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      app: 'Söz — Türkçe İncil',
      userId: uid,
      email: user.email ?? null,
      notes_local_only: {
        reading_history:
          'Okuma geçmişi cihazda saklanır; yerel yedek dışa aktarımını kullanın.',
        badges: 'Rozet ilerlemesi cihazda saklanır; yerel yedek dışa aktarımını kullanın.',
      },
      data: {
        profile: profileRes.data,
        notes: notesRes.data ?? [],
        highlights: highlightsRes.data ?? [],
        favorites: favoritesRes.data ?? [],
        plan_progress: planProgressRes.data ?? [],
        friendships: friendshipsRes.data ?? [],
        friend_activity: friendActivityRes.data ?? [],
        game_scores: gameScoresRes.data ?? [],
        messages: messagesRes.data ?? [],
        church_group_members: churchMembersRes.data ?? [],
        church_prayers: churchPrayersRes.data ?? [],
        church_plan_completions: churchCompletionsRes.data ?? [],
        ai_usage: aiUsageRes.data ?? [],
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
