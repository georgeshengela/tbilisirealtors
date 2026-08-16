/**
 * Georgian → English/Russian translation for listing descriptions.
 *
 * Provider is picked from whichever key is present in the environment, so the
 * admin UI can ship before a translation account exists. With no key the caller
 * gets a 501 and the button explains what is missing.
 */

export type TargetLang = 'en' | 'ru';

export const LANG_NAME: Record<TargetLang, string> = { en: 'English', ru: 'Russian' };

export function activeProvider(): 'openai' | 'deepl' | 'google' | null {
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.DEEPL_API_KEY) return 'deepl';
  if (process.env.GOOGLE_TRANSLATE_API_KEY) return 'google';
  return null;
}

async function viaOpenAI(text: string, target: TargetLang): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TRANSLATE_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            `You translate Georgian real-estate listing descriptions into ${LANG_NAME[target]}. ` +
            'Keep the tone of a professional agency listing, preserve line breaks and numbers, ' +
            'and reply with the translation only.',
        },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const json = await res.json() as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content?.trim() ?? '';
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
  });

  if (!res.ok) throw new Error(`DeepL ${res.status}: ${await res.text()}`);
  const json = await res.json() as { translations?: { text: string }[] };
  return json.translations?.[0]?.text ?? '';
}

async function viaGoogle(text: string, target: TargetLang): Promise<string> {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'ka', target, format: 'text' }),
  });

  if (!res.ok) throw new Error(`Google ${res.status}: ${await res.text()}`);
  const json = await res.json() as { data?: { translations?: { translatedText: string }[] } };
  return json.data?.translations?.[0]?.translatedText ?? '';
}

export async function translateFromGeorgian(text: string, target: TargetLang): Promise<string> {
  const provider = activeProvider();
  if (!provider) throw new Error('NO_PROVIDER');

  const trimmed = text.trim().slice(0, 6000);
  if (!trimmed) return '';

  if (provider === 'openai') return viaOpenAI(trimmed, target);
  if (provider === 'deepl') return viaDeepL(trimmed, target);
  return viaGoogle(trimmed, target);
}
