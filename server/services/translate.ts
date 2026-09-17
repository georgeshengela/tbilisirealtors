/**
 * Georgian → English / Russian for listing descriptions.
 *
 * Provider is picked from env keys. OpenRouter is preferred so one key covers
 * a strong chat model without a separate OpenAI / DeepL account.
 */

export type TargetLang = 'en' | 'ru';

export const LANG_NAME: Record<TargetLang, string> = { en: 'English', ru: 'Russian' };

export type TranslateProvider = 'openrouter' | 'openai' | 'deepl' | 'google';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export class TranslateError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = 'TranslateError';
  }
}

function openRouterKey(): string {
  const dedicated = process.env.OPENROUTER_API_KEY?.trim();
  if (dedicated) return dedicated;
  const openai = process.env.OPENAI_API_KEY?.trim() ?? '';
  return openai.startsWith('sk-or-') ? openai : '';
}

export function activeProvider(): TranslateProvider | null {
  if (openRouterKey()) return 'openrouter';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.DEEPL_API_KEY) return 'deepl';
  if (process.env.GOOGLE_TRANSLATE_API_KEY) return 'google';
  return null;
}

const SYSTEM_PROMPT =
  'You are a professional real-estate copywriter-translator for Tbilisi, Georgia. ' +
  'Translate the Georgian listing description into natural English and Russian. ' +
  'Write the way a local agency would: fluent, specific, not word-for-word. ' +
  'Keep every number, area (m² / м²), floor, room count and price exactly as written. ' +
  'Keep street and district names in their usual Latin / Cyrillic forms ' +
  '(Saburtalo / Сабуртало, Vake / Ваке, Tbilisi / Тбилиси). ' +
  'Do not add amenities, promises or adjectives that are not in the source. ' +
  'Preserve paragraph breaks. Reply with JSON only: {"en":"...","ru":"..."}';

function chatBody(text: string, model: string) {
  return {
    model,
    temperature: 0.15,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
  };
}

function parsePair(raw: string): { en: string; ru: string } {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned) as { en?: unknown; ru?: unknown };
  const en = typeof parsed.en === 'string' ? parsed.en.trim() : '';
  const ru = typeof parsed.ru === 'string' ? parsed.ru.trim() : '';
  if (!en || !ru) throw new Error('EMPTY_TRANSLATION');
  return { en, ru };
}

function providerMessage(status: number, body: string): string {
  if (status === 401 || status === 403) return 'თარგმნის გასაღები არასწორია — შეამოწმეთ OpenRouter API key';
  if (status === 402) return 'OpenRouter-ზე კრედიტი არ არის საკმარისი';
  if (status === 429) return 'თარგმნის ლიმიტი ამოიწურა, სცადეთ ცოტა ხანში';
  const snippet = body.replace(/\s+/g, ' ').slice(0, 180);
  return snippet ? `თარგმნა ვერ მოხერხდა (${status}): ${snippet}` : `თარგმნა ვერ მოხერხდა (${status})`;
}

async function chatComplete(
  url: string,
  key: string,
  text: string,
  model: string,
  extraHeaders: Record<string, string> = {},
): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      ...extraHeaders,
    },
    body: JSON.stringify(chatBody(text, model)),
    signal: AbortSignal.timeout(30000),
  });

  const raw = await res.text();
  if (!res.ok) throw new TranslateError(providerMessage(res.status, raw), res.status >= 400 && res.status < 500 ? res.status : 502);

  const json = JSON.parse(raw) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content?.trim() ?? '';
}

async function viaOpenRouter(text: string): Promise<{ en: string; ru: string }> {
  const key = openRouterKey();
  const model = process.env.OPENROUTER_TRANSLATE_MODEL || 'openai/gpt-4o-mini';
  const site = process.env.FRONTEND_URL || 'https://tbilisirealtor.ge';
  const content = await chatComplete(OPENROUTER_URL, key, text, model, {
    'HTTP-Referer': site,
    'X-Title': 'TBILISIREALTOR.GE',
  });
  try {
    return parsePair(content);
  } catch {
    throw new TranslateError('თარგმანის პასუხი ვერ წაიკითხა, სცადეთ ხელახლა');
  }
}

async function viaOpenAI(text: string): Promise<{ en: string; ru: string }> {
  const key = process.env.OPENAI_API_KEY!;
  const model = process.env.OPENAI_TRANSLATE_MODEL || 'gpt-4o-mini';
  const content = await chatComplete(OPENAI_URL, key, text, model);
  try {
    return parsePair(content);
  } catch {
    throw new TranslateError('თარგმანის პასუხი ვერ წაიკითხა, სცადეთ ხელახლა');
  }
}

async function viaDeepL(text: string, target: TargetLang): Promise<string> {
  const key = process.env.DEEPL_API_KEY!;
  const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';

  const res = await fetch(`https://${host}/v2/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `DeepL-Auth-Key ${key}`,
    },
    body: JSON.stringify({ text: [text], target_lang: target.toUpperCase() }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) throw new TranslateError(providerMessage(res.status, await res.text()));
  const json = await res.json() as { translations?: { text: string }[] };
  return json.translations?.[0]?.text?.trim() ?? '';
}

async function viaGoogle(text: string, target: TargetLang): Promise<string> {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'ka', target, format: 'text' }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) throw new TranslateError(providerMessage(res.status, await res.text()));
  const json = await res.json() as { data?: { translations?: { translatedText: string }[] } };
  return json.data?.translations?.[0]?.translatedText?.trim() ?? '';
}

export async function translateListingFromGeorgian(text: string): Promise<{ en: string; ru: string }> {
  const provider = activeProvider();
  if (!provider) throw new TranslateError('NO_PROVIDER', 501);

  const trimmed = text.trim().slice(0, 6000);
  if (!trimmed) return { en: '', ru: '' };

  if (provider === 'openrouter') return viaOpenRouter(trimmed);
  if (provider === 'openai') return viaOpenAI(trimmed);
  if (provider === 'deepl') {
    const [en, ru] = await Promise.all([viaDeepL(trimmed, 'en'), viaDeepL(trimmed, 'ru')]);
    return { en, ru };
  }
  const [en, ru] = await Promise.all([viaGoogle(trimmed, 'en'), viaGoogle(trimmed, 'ru')]);
  return { en, ru };
}

export async function translateFromGeorgian(text: string, target: TargetLang): Promise<string> {
  const pair = await translateListingFromGeorgian(text);
  return pair[target];
}
