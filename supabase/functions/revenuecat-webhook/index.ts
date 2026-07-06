import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RevenueCatEvent = {
  type: string;
  app_user_id: string;
  expiration_at_ms?: number | null;
  entitlement_ids?: string[] | null;
};

type RevenueCatPayload = {
  event?: RevenueCatEvent;
};

const GRANT_WHILE_ACTIVE = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'PRODUCT_CHANGE',
  'SUBSCRIPTION_EXTENDED',
  'CANCELLATION',
  'BILLING_ISSUE',
]);

function computePremium(event: RevenueCatEvent): {
  isPremium: boolean;
  expiresAt: string | null;
} {
  const expiresMs = event.expiration_at_ms ?? null;
  const expiresAt = expiresMs ? new Date(expiresMs).toISOString() : null;

  if (event.type === 'EXPIRATION') {
    return { isPremium: false, expiresAt };
  }

  if (expiresMs != null && expiresMs > Date.now()) {
    return { isPremium: true, expiresAt };
  }

  if (GRANT_WHILE_ACTIVE.has(event.type) && expiresMs == null) {
    return { isPremium: true, expiresAt: null };
  }

  return { isPremium: false, expiresAt };
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

  const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('REVENUECAT_WEBHOOK_SECRET missing');
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader !== webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: RevenueCatPayload;
  try {
    payload = (await req.json()) as RevenueCatPayload;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const event = payload.event;
  if (!event?.app_user_id) {
    return new Response(JSON.stringify({ error: 'Missing event.app_user_id' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { isPremium, expiresAt } = computePremium(event);
  const userId = event.app_user_id;

  const { error } = await admin.from('profiles').upsert(
    {
      id: userId,
      is_premium: isPremium,
      premium_expires_at: expiresAt,
      revenuecat_app_user_id: userId,
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.error('profiles upsert failed:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({ ok: true, userId, isPremium, expiresAt, eventType: event.type }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
