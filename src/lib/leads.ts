/**
 * Client for the public enquiry endpoint. Every form on the marketing site funnels
 * through here so the desk sees one consistent shape.
 */
export type LeadKind = 'contact' | 'property' | 'viewing' | 'newsletter';

export interface LeadPayload {
  kind: LeadKind;
  name?: string;
  phone?: string;
  email?: string;
  subject?: string;
  message?: string;
  propertyId?: string;
  /** ISO string; only meaningful for kind='viewing'. */
  preferredAt?: string;
}

export interface LeadResult {
  ok: boolean;
  error?: string;
}

export async function submitLead(payload: LeadPayload): Promise<LeadResult> {
  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        sourceUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        locale: typeof document !== 'undefined' ? document.documentElement.lang || undefined : undefined,
        // Honeypot: real people never see this field, bots fill everything.
        company: '',
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body.error || 'შეტყობინება ვერ გაიგზავნა' };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'კავშირი ვერ დამყარდა. სცადეთ ხელახლა.' };
  }
}
