/**
 * Presentation layer for permissions. The effective set always arrives from the
 * API already resolved, so nothing here decides access — it only labels and
 * groups the keys for the permission editor, and answers "can I show this?".
 */

export type Role = 'super_admin' | 'admin' | 'manager' | 'broker' | 'user';

export const STAFF_ROLES: Role[] = ['super_admin', 'admin', 'manager', 'broker'];

export const ROLE_RANK: Record<Role, number> = {
  super_admin: 100,
  admin: 80,
  manager: 60,
  broker: 40,
  user: 10,
};

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'სუპერ ადმინი',
  admin: 'ადმინი',
  manager: 'მენეჯერი',
  broker: 'ბროკერი',
  user: 'მომხმარებელი',
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  super_admin: 'სრული წვდომა, უფლებების მართვა',
  admin: 'ყველაფერი უფლებების შაბლონების გარდა',
  manager: 'განცხადებები, ბროკერები, ბლოგი, მოდერაცია',
  broker: 'მთელი ბაზის ნახვა, მესაკუთრის კონტაქტი მხოლოდ საკუთარ განცხადებებზე',
  user: 'საიტის მომხმარებელი — რჩეულები და განაცხადები',
};

/** Tailwind-friendly accent per role, used for badges. */
export const ROLE_COLOR: Record<Role, { bg: string; text: string; border: string }> = {
  super_admin: { bg: '#111827', text: '#ffffff', border: '#111827' },
  admin: { bg: '#1d4ed8', text: '#ffffff', border: '#1d4ed8' },
  manager: { bg: '#047857', text: '#ffffff', border: '#047857' },
  broker: { bg: '#b45309', text: '#ffffff', border: '#b45309' },
  user: { bg: '#e2e8f0', text: '#334155', border: '#cbd5e1' },
};

export const PERMISSION_GROUP_LABEL: Record<string, string> = {
  listings: 'განცხადებები',
  leads: 'ლიდები',
  agents: 'ბროკერები',
  blog: 'ბლოგი',
  staff: 'თანამშრომლები',
  members: 'მომხმარებლები',
  system: 'სისტემა',
};

export interface PermissionDef {
  key: string;
  group: string;
  label: string;
  sensitive?: boolean;
  /** Ticking this for a manager or broker has no effect — the server keeps refusing. */
  adminOnly?: boolean;
}

/** Roles the admin-only floor lets through. */
export function meetsAdminFloor(role: string): boolean {
  return rankOf(role) >= ROLE_RANK.admin;
}

/** Cadastral code on the public listing page — managers and admins only. */
export function canViewCadastral(role?: string): boolean {
  return rankOf(role ?? '') >= ROLE_RANK.manager;
}

export function isRole(value: string): value is Role {
  return value in ROLE_RANK;
}

export function roleLabel(role: string): string {
  return isRole(role) ? ROLE_LABEL[role] : role;
}

export function roleColor(role: string) {
  return isRole(role) ? ROLE_COLOR[role] : ROLE_COLOR.user;
}

export function rankOf(role: string): number {
  return isRole(role) ? ROLE_RANK[role] : 0;
}

/** Whether the signed-in actor may create / edit / delete someone with `targetRole`. */
export function canManageRole(actorRole: string, targetRole: string): boolean {
  if (actorRole === 'super_admin') return true;
  return rankOf(actorRole) > rankOf(targetRole);
}

export function groupPermissions(catalog: PermissionDef[]): [string, PermissionDef[]][] {
  const groups = new Map<string, PermissionDef[]>();
  for (const item of catalog) {
    const list = groups.get(item.group);
    if (list) list.push(item);
    else groups.set(item.group, [item]);
  }
  return [...groups.entries()];
}

export const MODERATION_LABEL: Record<string, string> = {
  approved: 'გამოქვეყნებული',
  pending: 'განხილვაში',
  changes_requested: 'დასაზუსტებელია',
  rejected: 'უარყოფილი',
  draft: 'დრაფტი',
};

export const MODERATION_COLOR: Record<string, { bg: string; text: string }> = {
  approved: { bg: '#dcfce7', text: '#166534' },
  pending: { bg: '#fef3c7', text: '#92400e' },
  changes_requested: { bg: '#dbeafe', text: '#1e40af' },
  rejected: { bg: '#fee2e2', text: '#991b1b' },
  draft: { bg: '#e2e8f0', text: '#475569' },
};

/** The reviewer checklist — must mirror MODERATION_CHECKS on the server. */
export const MODERATION_CHECKS: { key: string; label: string }[] = [
  { key: 'photos', label: 'ფოტოები ნათელია და ობიექტს შეესაბამება' },
  { key: 'address', label: 'მისამართი და რაიონი სწორია' },
  { key: 'price', label: 'ფასი რეალისტურია ბაზრისთვის' },
  { key: 'description', label: 'აღწერა სრულია, კონტაქტების გარეშე' },
  { key: 'area', label: 'ფართი და ოთახები შეესაბამება ფოტოებს' },
  { key: 'contact', label: 'განმცხადებელთან დაკავშირება შესაძლებელია' },
];

export const CALL_OUTCOME_LABEL: Record<string, string> = {
  reached: 'დაუკავშირდა',
  no_answer: 'არ პასუხობს',
  interested: 'დაინტერესებულია',
  not_interested: 'აღარ აინტერესებს',
  rented_elsewhere: 'სხვაგან გააქირავა',
  wrong_number: 'არასწორი ნომერი',
};

export const CALL_OUTCOME_COLOR: Record<string, { bg: string; text: string }> = {
  reached: { bg: '#dcfce7', text: '#166534' },
  interested: { bg: '#dcfce7', text: '#166534' },
  no_answer: { bg: '#fef3c7', text: '#92400e' },
  not_interested: { bg: '#fee2e2', text: '#991b1b' },
  rented_elsewhere: { bg: '#e2e8f0', text: '#475569' },
  wrong_number: { bg: '#fee2e2', text: '#991b1b' },
};

export const TASK_KIND_LABEL: Record<string, string> = {
  call: 'დარეკვა',
  visit: 'ვიზიტი',
  photo: 'ფოტო',
  document: 'დოკუმენტი',
  price: 'ფასი',
  other: 'სხვა',
};

export const TASK_PRIORITY_LABEL: Record<string, string> = {
  low: 'დაბალი',
  normal: 'ჩვეულებრივი',
  high: 'მაღალი',
};

export const TASK_PRIORITY_COLOR: Record<string, { bg: string; text: string }> = {
  low: { bg: '#e2e8f0', text: '#475569' },
  normal: { bg: '#dbeafe', text: '#1e40af' },
  high: { bg: '#fee2e2', text: '#991b1b' },
};

export const LIFECYCLE_LABEL: Record<string, string> = {
  new: 'ახალი',
  current: 'აქტიური',
  old: 'გაქირავებული',
  new_r: 'დასარეკია',
};

/* ── Analytics vocabulary ────────────────────────────────────────────────── */

export const DEAL_STATUS_LABEL: Record<string, string> = {
  sale: 'იყიდება',
  rent: 'ქირავდება',
  both: 'იყიდება და ქირავდება',
  daily_rent: 'დღიურად',
  pledge: 'გირავნობა',
  unknown: 'მიუთითებელი',
};

export const PROPERTY_TYPE_LABEL: Record<string, string> = {
  apartment: 'ბინა',
  house: 'სახლი',
  villa: 'აგარაკი',
  commercial: 'კომერციული',
  land: 'მიწა',
  hotel: 'სასტუმრო',
  unknown: 'მიუთითებელი',
};

/** Funnel stages, in order, with the question each one answers. */
export const FUNNEL_STAGE: { id: string; label: string; hint: string }[] = [
  { id: 'submitted', label: 'შემოსული', hint: 'ყველა განცხადება ფილტრში' },
  { id: 'approved', label: 'დამტკიცებული', hint: 'მოდერაცია გავლილი' },
  { id: 'live', label: 'ბაზარზე', hint: 'აქტიური ან ახალი' },
  { id: 'engaged', label: 'ნანახი', hint: 'მინიმუმ ერთი ნახვა' },
  { id: 'converted', label: 'ჩაბარებული', hint: 'გაქირავებული ან დასარეკი' },
];

export const AGE_BUCKET_LABEL: Record<string, string> = {
  '0-7': '0–7 დღე',
  '8-30': '8–30 დღე',
  '31-90': '31–90 დღე',
  '91-180': '91–180 დღე',
  '180+': '180+ დღე',
};

export const IMPORT_STATUS_LABEL: Record<string, string> = {
  ok: 'სრული',
  partial: 'ნაწილობრივი',
  failed: 'წარუმატებელი',
};

export const IMPORT_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  ok: { bg: '#dcfce7', text: '#166534' },
  partial: { bg: '#fef3c7', text: '#92400e' },
  failed: { bg: '#fee2e2', text: '#991b1b' },
};

/** Why an import failed, in words a manager can act on. */
export const IMPORT_ERROR_LABEL: Record<string, string> = {
  bad_url: 'ბმული არასწორია',
  bad_protocol: 'ბმული http/https არ არის',
  unsupported_host: 'საიტი მხარდაუჭერელია',
  id_not_found: 'ბმულში ID ვერ მოიძებნა',
  upstream_status: 'წყარო შეცდომას აბრუნებს',
  upstream_empty: 'წყარომ ცარიელი პასუხი დააბრუნა',
  page_fetch_failed: 'გვერდი ვერ ჩამოიტვირთა',
  payload_not_found: 'გვერდზე მონაცემები ვერ მოიძებნა',
  parse_failed: 'მონაცემები ვერ წაიკითხა',
  unknown: 'დაუზუსტებელი შეცდომა',
};

/** Fields the parser tracks — used for the "what is usually missing" table. */
export const IMPORT_FIELD_LABEL: Record<string, string> = {
  title: 'სათაური',
  description: 'აღწერა',
  price: 'ფასი',
  area: 'ფართი',
  rooms: 'ოთახები',
  city: 'ქალაქი',
  district: 'რაიონი',
  address: 'მისამართი',
  floor: 'სართული',
  images: 'ფოტოები',
  coordinates: 'კოორდინატები',
  agentPhone: 'ტელეფონი',
};

export const IMPORT_WARNING_LABEL: Record<string, string> = {
  coords_defaulted: 'რუკის პინი თბილისის ცენტრზეა',
  few_photos: '5-ზე ნაკლები ფოტო',
  short_description: 'აღწერა მოკლეა',
  enum_room_ids: 'ოთახების რიცხვი გადასამოწმებელია',
  no_cadastral_code: 'საკადასტრო კოდი არ არის',
  no_agent_name: 'საკონტაქტო პირი არ არის',
  price_without_area: 'ფასი არის, ფართი არა',
};

export function importFieldLabel(field: string): string {
  return IMPORT_FIELD_LABEL[field] ?? IMPORT_WARNING_LABEL[field] ?? field;
}
