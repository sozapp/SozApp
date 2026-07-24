import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FREE_AI_QUESTIONS_PER_DAY = 10;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
/** Konuşma geçmişi üst sınırı (son N mesaj) — maliyet ve gecikme için. */
const MAX_HISTORY_MESSAGES = 12;

const SYSTEM_PROMPT = `Sen Söz adlı Türkçe İncil uygulamasının AI asistanısın. Adın "Söz Asistanı".

Yanıt formatı:
- Her zaman Türkçe yaz
- Sıcak ve samimi ol
- Cevapları 2-3 paragrafla sınırla
- Mümkünse ilgili ayet referansı ver
- Emin olmadığında dürüst ol`;

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type AskAiRequest = {
  question?: string;
  history?: Array<{ role: string; content: string }>;
  userProfileHint?: string;
  enforceLimit?: boolean;
  prompt?: string;
  system?: string;
  maxTokens?: number;
  messages?: ChatMessage[];
};

function isPremiumActive(
  isPremium: boolean | null | undefined,
  expiresAt: string | null | undefined
): boolean {
  if (!isPremium) return false;
  if (!expiresAt) return true;
  return new Date(expiresAt) > new Date();
}

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
  const groqKey = Deno.env.get('GROQ_API_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !groqKey) {
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

  let body: AskAiRequest;
  try {
    body = (await req.json()) as AskAiRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const enforceLimit = body.enforceLimit !== false;

  const { data: profile } = await admin
    .from('profiles')
    .select('is_premium, premium_expires_at')
    .eq('id', user.id)
    .maybeSingle();

  const premium = isPremiumActive(profile?.is_premium, profile?.premium_expires_at);

  let questionsUsed = 0;
  let questionsRemaining = FREE_AI_QUESTIONS_PER_DAY;

  if (!premium && enforceLimit) {
    const { data: count, error: usageError } = await admin.rpc('increment_daily_ai_usage', {
      p_user_id: user.id,
    });

    if (usageError) {
      console.error('ai_usage increment failed:', usageError.message);
      return new Response(JSON.stringify({ error: 'Usage tracking failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    questionsUsed = typeof count === 'number' ? count : Number(count);
    questionsRemaining = Math.max(0, FREE_AI_QUESTIONS_PER_DAY - questionsUsed);

    if (questionsUsed > FREE_AI_QUESTIONS_PER_DAY) {
      return new Response(
        JSON.stringify({
          error: 'daily_limit_reached',
          questionsUsed,
          questionsRemaining: 0,
          dailyLimit: FREE_AI_QUESTIONS_PER_DAY,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } else if (!premium && !enforceLimit) {
    const { data: usageRow } = await admin
      .from('ai_usage')
      .select('question_count')
      .eq('user_id', user.id)
      .eq('usage_date', new Date().toISOString().slice(0, 10))
      .maybeSingle();
    questionsUsed = usageRow?.question_count ?? 0;
    questionsRemaining = Math.max(0, FREE_AI_QUESTIONS_PER_DAY - questionsUsed);
  }

  const maxTokens = body.maxTokens ?? 1000;
  let messages: ChatMessage[];

  if (body.messages && body.messages.length > 0) {
    messages = body.messages;
  } else if (body.prompt) {
    messages = [
      ...(body.system ? [{ role: 'system' as const, content: body.system }] : []),
      { role: 'user' as const, content: body.prompt },
    ];
  } else if (body.question) {
    const history = (body.history ?? [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
      .slice(-MAX_HISTORY_MESSAGES);

    const profileLine =
      body.userProfileHint?.trim()
        ? `\n\nBu kişinin profili: ${body.userProfileHint.trim()}`
        : '';
    const system = `${SYSTEM_PROMPT}${profileLine}`;

    messages = [
      { role: 'system', content: system },
      ...history,
      { role: 'user', content: body.question },
    ];
  } else {
    return new Response(JSON.stringify({ error: 'Missing question or prompt' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const groqRes = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      temperature: 0.7,
      messages,
    }),
  });

  if (!groqRes.ok) {
    let detail = `Groq API ${groqRes.status}`;
    try {
      const errBody = (await groqRes.json()) as { error?: { message?: string } };
      if (errBody?.error?.message) detail = errBody.error.message;
    } catch {
      /* ignore */
    }
    return new Response(JSON.stringify({ error: detail }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const groqData = (await groqRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const answer = groqData?.choices?.[0]?.message?.content?.trim() ?? '';

  if (!answer) {
    return new Response(JSON.stringify({ error: 'Empty response from AI' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      answer,
      isPremium: premium,
      questionsUsed: premium ? 0 : questionsUsed,
      questionsRemaining: premium ? null : questionsRemaining,
      dailyLimit: FREE_AI_QUESTIONS_PER_DAY,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
