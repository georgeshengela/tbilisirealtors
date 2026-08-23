const MAPS_QUERY = 'ეროსი მანჯგალაძის 81, თბილისი, საქართველო';

export const CONTACT = {
  mobile: {
    label: 'მობ',
    display: '+995 596 88 11 55',
    tel: '+995596881155',
    whatsapp: 'https://wa.me/995596881155',
  },
  phone: {
    label: 'ტელ',
    display: '+995 323 33 33 77',
    tel: '+995323333377',
    whatsapp: 'https://wa.me/995323333377',
  },
  email: 'info@tbilisirealtor.ge',
  city: 'თბილისი',
  street: 'ეროსი მანჯგალაძის 81',
  /** Full single-line address (legacy) */
  address: 'ეროსი მანჯგალაძის 81',
  googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAPS_QUERY)}`,
  coordinates: { lat: 41.7336823, lng: 44.7974868 },
  hoursShort: 'ორშ–პარ 10:00–18:00 · შაბ 11:00–15:00',
} as const;

export type BusinessHourRow = {
  id: string;
  label: string;
  time: string | null;
  closed?: boolean;
};

export const BUSINESS_HOURS: BusinessHourRow[] = [
  { id: 'weekdays', label: 'ორშაბათი – პარასკევი', time: '10:00 – 18:00' },
  { id: 'saturday', label: 'შაბათი', time: '11:00 – 15:00' },
  { id: 'sunday', label: 'კვირა', time: null, closed: true },
];

/** @deprecated use BUSINESS_HOURS — kept for backwards compat */
export const CONTACT_HOURS_LEGACY = BUSINESS_HOURS.map(row =>
  row.closed ? `${row.label} დასვენება` : `${row.label} ${row.time?.replace(' – ', '-')}`,
);

export function isBusinessOpenNow(date = new Date()): boolean {
  const day = date.getDay(); // 0 Sun … 6 Sat
  const mins = date.getHours() * 60 + date.getMinutes();
  if (day === 0) return false;
  if (day === 6) return mins >= 11 * 60 && mins < 15 * 60;
  return mins >= 10 * 60 && mins < 18 * 60;
}
