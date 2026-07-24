import { supabase } from './supabase';

export const FREE_AI_QUESTIONS_PER_DAY = 10;

/** Söz'e Sor konuşma geçmişi — son N mesaj (maliyet / gecikme). Edge function da aynı sınırı uygular. */
export const ASK_AI_MAX_HISTORY_MESSAGES = 12;

export function isSupabaseConfigured(): boolean {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  return url.length > 0 && key.length > 0;
}

function getAskAiUrl(): string {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  return `${base.replace(/\/$/, '')}/functions/v1/ask-ai`;
}

function getTranscribeUrl(): string {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  return `${base.replace(/\/$/, '')}/functions/v1/transcribe-audio`;
}

/** Kaydedilmiş sesi (yerel dosya URI'si) Groq Whisper üzerinden metne çevirir. */
export async function transcribeAudio(fileUri: string): Promise<string> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionError || !token) {
    throw new Error('AUTH_REQUIRED');
  }

  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

  const form = new FormData();
  form.append('file', {
    uri: fileUri,
    name: 'recording.m4a',
    type: 'audio/m4a',
  } as unknown as Blob);

  const res = await fetch(getTranscribeUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
    },
    body: form,
  });

  const parsed = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
  if (!res.ok) {
    throw new Error(parsed.error ?? `API ${res.status}`);
  }
  return parsed.text?.trim() ?? '';
}

type AskAiSuccess = {
  answer: string;
  isPremium: boolean;
  questionsUsed: number;
  questionsRemaining: number | null;
  dailyLimit: number;
};

type GroqProxyOptions = {
  enforceLimit?: boolean;
  maxTokens?: number;
};

async function callAskAiEdge(
  body: Record<string, unknown>,
  options?: GroqProxyOptions
): Promise<AskAiSuccess> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionError || !token) {
    throw new Error('AUTH_REQUIRED');
  }

  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 45000;

    xhr.onload = () => {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(xhr.responseText) as Record<string, unknown>;
      } catch {
        reject(new Error('Parse hatası'));
        return;
      }

      if (xhr.status === 429) {
        const err = new Error('DAILY_LIMIT_REACHED') as Error & {
          questionsUsed?: number;
          questionsRemaining?: number;
        };
        err.questionsUsed = typeof parsed.questionsUsed === 'number' ? parsed.questionsUsed : undefined;
        err.questionsRemaining =
          typeof parsed.questionsRemaining === 'number' ? parsed.questionsRemaining : 0;
        reject(err);
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        const detail =
          typeof parsed.error === 'string' ? parsed.error : `API ${xhr.status}`;
        reject(new Error(detail));
        return;
      }

      const answer = typeof parsed.answer === 'string' ? parsed.answer : '';
      if (!answer) {
        reject(new Error('Boş cevap'));
        return;
      }

      resolve({
        answer,
        isPremium: Boolean(parsed.isPremium),
        questionsUsed: typeof parsed.questionsUsed === 'number' ? parsed.questionsUsed : 0,
        questionsRemaining:
          parsed.questionsRemaining === null
            ? null
            : typeof parsed.questionsRemaining === 'number'
              ? parsed.questionsRemaining
              : 0,
        dailyLimit:
          typeof parsed.dailyLimit === 'number' ? parsed.dailyLimit : FREE_AI_QUESTIONS_PER_DAY,
      });
    };

    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.ontimeout = () => reject(new Error('Zaman aşımı'));

    try {
      xhr.open('POST', getAskAiUrl(), true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('apikey', anonKey);
      xhr.send(
        JSON.stringify({
          ...body,
          enforceLimit: options?.enforceLimit ?? true,
          maxTokens: options?.maxTokens,
        })
      );
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

export const groqChat = async (
  prompt: string,
  system?: string,
  maxTokens = 1000
): Promise<string> => {
  const result = await callAskAiEdge(
    {
      prompt,
      system,
    },
    { enforceLimit: false, maxTokens }
  );
  return result.answer;
};

export async function askQuestion(
  question: string,
  conversationHistory: { role: string; content: string }[],
  userProfileHint?: string
): Promise<{ answer: string; questionsUsed: number; questionsRemaining: number | null }> {
  const history = conversationHistory
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }))
    .slice(-ASK_AI_MAX_HISTORY_MESSAGES);

  const result = await callAskAiEdge({
    question,
    history,
    userProfileHint,
  });

  return {
    answer: result.answer,
    questionsUsed: result.questionsUsed,
    questionsRemaining: result.questionsRemaining,
  };
}

export const groq = groqChat;
