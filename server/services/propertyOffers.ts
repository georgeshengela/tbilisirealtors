import { client } from '../db.js';

export interface PropertyOfferCounts {
  offersLast30Days: number;
  offersLast60Days: number;
}

/** Batch offer counts for admin listing tables. */
export async function offerCountsForProperties(propertyIds: string[]): Promise<Map<string, PropertyOfferCounts>> {
  const map = new Map<string, PropertyOfferCounts>();
  if (!propertyIds.length) return map;

  try {
    const rows = await client`
      SELECT property_id,
        COUNT(*) FILTER (WHERE offered_at >= NOW() - INTERVAL '30 days')::int AS offers_30,
        COUNT(*) FILTER (WHERE offered_at >= NOW() - INTERVAL '60 days')::int AS offers_60
      FROM property_offers
      WHERE property_id = ANY(${propertyIds})
      GROUP BY property_id
    ` as Array<{ property_id: string; offers_30: number; offers_60: number }>;

    for (const row of rows) {
      map.set(row.property_id, {
        offersLast30Days: Number(row.offers_30) || 0,
        offersLast60Days: Number(row.offers_60) || 0,
      });
    }
  } catch (err) {
    // Table may not exist yet on environments that haven't run db:migrate.
    console.warn('[propertyOffers] offer counts skipped:', err);
  }

  return map;
}

/** Record that a broker offered a listing to a client (Broker Desk hook). */
export async function recordPropertyOffer(input: {
  propertyId: string;
  brokerUserId?: number | null;
  leadId?: number | null;
  clientName?: string | null;
  clientPhone?: string | null;
  notes?: string | null;
}) {
  await client`
    INSERT INTO property_offers (property_id, broker_user_id, lead_id, client_name, client_phone, notes)
    VALUES (
      ${input.propertyId},
      ${input.brokerUserId ?? null},
      ${input.leadId ?? null},
      ${input.clientName?.trim() || null},
      ${input.clientPhone?.trim() || null},
      ${input.notes?.trim() || null}
    )
  `;
}
