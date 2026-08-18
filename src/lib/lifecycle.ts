/** Shared admin labels for why a listing was parked as "old". */
export const LIFECYCLE_OUTCOMES = [
  'paused',
  'sold_owner',
  'sold',
  'sold_us',
  'withdrawn',
  'rented_owner',
  'rented_us',
] as const;

export type LifecycleOutcome = (typeof LIFECYCLE_OUTCOMES)[number];

export const LIFECYCLE_OUTCOME_META: Record<LifecycleOutcome, {
  label: string;
  hint: string;
  /** Stays on the live sale table instead of the archive. */
  staysLive?: boolean;
  needsResume?: boolean;
  needsTerm?: boolean;
  needsPrice?: boolean;
}> = {
  paused: {
    label: 'დროებით შეჩერებულია',
    hint: 'ვერ დავუკავშირდით — რამდენიმე დღით გადავადება, შემდეგ New R',
    needsResume: true,
  },
  sold_owner: {
    label: 'გაყიდულია',
    hint: 'მესაკუთრემ თავისით გაყიდა, ჩვენი ჩართულობის გარეშე',
  },
  sold: {
    label: 'გაყიდვა',
    hint: 'ჩვენ გავყიდეთ',
  },
  sold_us: {
    label: 'გავყიდეთ',
    hint: 'ჩვენი ჩართულობით გაიყიდა',
  },
  withdrawn: {
    label: 'აღარ იყიდება',
    hint: 'მესაკუთრემ გადაიფიქრა გაყიდვა',
  },
  rented_owner: {
    label: 'გაქირავდა',
    hint: 'იყიდება, მაგრამ მესაკუთრემ გააქირავა — რჩება გაყიდვაზე, შიდა ნიშნით',
    staysLive: true,
  },
  rented_us: {
    label: 'გავაქირავეთ',
    hint: 'ჩვენი ჩართულობით გააქირავა — ვადა და ქირის ფასი სტატისტიკისთვის',
    needsTerm: true,
    needsPrice: true,
  },
};

export function isLifecycleOutcome(value: unknown): value is LifecycleOutcome {
  return typeof value === 'string' && (LIFECYCLE_OUTCOMES as readonly string[]).includes(value);
}
