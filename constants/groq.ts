import Constants from 'expo-constants'

const GROQ_URL =
  'https://api.groq.com/openai/v1/chat/completions'

const getKey = (): string => {
  const k1 = process.env.EXPO_PUBLIC_GROQ_API_KEY
  const k2 = (Constants.expoConfig?.extra?.groqKey as string | undefined) ?? ''
  return k1 ?? k2 ?? ''
}

export const groqChat = async (
  prompt: string,
  system?: string,
  maxTokens = 1000,
): Promise<string> => {
  const key = getKey()

  if (!key || key.length < 10) {
    console.warn('[GROQ] Key bulunamadı')
    throw new Error('API key eksik')
  }

  /** RN / iOS Simulator: fetch() sık “Network request failed” veriyor; native XHR kullan. */
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.timeout = 30000

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as {
            choices?: Array<{ message?: { content?: string } }>
          }
          const content = data?.choices?.[0]?.message?.content
          if (content) {
            resolve(content)
          } else {
            reject(new Error('Boş cevap'))
          }
        } catch {
          reject(new Error('Parse hatası'))
        }
        return
      }
      let detail = `API ${xhr.status}`
      try {
        const errBody = JSON.parse(xhr.responseText) as {
          error?: { message?: string }
        }
        if (errBody?.error?.message) detail = errBody.error.message
      } catch {
        /* ignore */
      }
      reject(new Error(detail))
    }

    xhr.onerror = () => {
      console.warn('[GROQ] Network erişimi yok (XHR onerror)')
      reject(new Error('Network request failed'))
    }

    xhr.ontimeout = () => {
      console.warn('[GROQ] Timeout')
      reject(new Error('Zaman aşımı'))
    }

    try {
      xhr.open('POST', GROQ_URL, true)
      xhr.setRequestHeader('Content-Type', 'application/json')
      xhr.setRequestHeader('Authorization', `Bearer ${key}`)
      xhr.send(
        JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: maxTokens,
          temperature: 0.7,
          messages: [
            ...(system
              ? [
                  {
                    role: 'system' as const,
                    content: system,
                  },
                ]
              : []),
            { role: 'user' as const, content: prompt },
          ],
        }),
      )
    } catch (e) {
      console.warn('[GROQ] XHR hatası:', e)
      reject(e instanceof Error ? e : new Error(String(e)))
    }
  })
}

export function getGroqApiKey(): string {
  return getKey()
}

const SYSTEM_PROMPT = `Sen Söz adlı Türkçe İncil uygulamasının AI asistanısın. Adın "Söz Asistanı".

Yanıt formatı:
- Her zaman Türkçe yaz
- Sıcak ve samimi ol
- Cevapları 2-3 paragrafla sınırla
- Mümkünse ilgili ayet referansı ver
- Emin olmadığında dürüst ol`

export async function askQuestion(
  question: string,
  conversationHistory: { role: string; content: string }[],
  userProfileHint?: string,
): Promise<string> {
  try {
    const history = conversationHistory
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

    const profileLine =
      userProfileHint != null && userProfileHint.trim().length > 0
        ? `\n\nBu kişinin profili: ${userProfileHint.trim()}`
        : ''
    const system = `${SYSTEM_PROMPT}${profileLine}`

    const content = await groqChat(
      JSON.stringify(
        {
          conversation: history,
          question,
        },
        null,
        2,
      ),
      system,
      1000,
    )

    return content || ''
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('Network error:', msg)
    return ''
  }
}

export const groq = groqChat
