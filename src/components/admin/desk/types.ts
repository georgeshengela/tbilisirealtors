/** Shapes returned by /api/admin/desk — kept in one place so the boards agree. */

export interface StaffOption {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  isActive: boolean;
}

export interface DeskSummary {
  unassigned: number;
  pendingModeration: number;
  slaBreached: number;
  callbacksDue: number;
  overdueTasks: number;
  myOpenTasks: number;
  openLeads: number;
  unassignedLeads: number;
  leadsBreached: number;
}

export type LeadKind = 'contact' | 'property' | 'viewing' | 'newsletter';
export type LeadStage = 'new' | 'contacted' | 'viewing' | 'offer' | 'won' | 'lost';
export type LeadEventKind = 'created' | 'note' | 'call' | 'email' | 'meeting' | 'stage' | 'assign';

export interface Lead {
  id: number;
  kind: LeadKind;
  name: string | null;
  phone: string | null;
  email: string | null;
  subject: string | null;
  message: string | null;
  propertyId: string | null;
  propertyTitle: string | null;
  propertyPrice: number | null;
  preferredAt: string | null;
  sourceUrl: string | null;
  locale: string | null;
  stage: LeadStage;
  lostReason: string | null;
  assignedToUserId: number | null;
  assignedToName: string | null;
  assignedAt: string | null;
  firstResponseAt: string | null;
  nextFollowUpAt: string | null;
  closedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  responseMinutes: number;
  slaBreached: boolean;
  eventCount: number;
}

export interface LeadEvent {
  id: number;
  leadId: number;
  kind: LeadEventKind;
  body: string | null;
  meta: Record<string, unknown>;
  actorUserId: number | null;
  actorName: string | null;
  createdAt: string | null;
}

export interface LeadStats {
  total: number;
  open: number;
  unassigned: number;
  newToday: number;
  new7d: number;
  breached: number;
  dueFollowUp: number;
  won30d: number;
  lost30d: number;
  conversionRate: number;
  medianResponseMinutes: number;
  slaMinutes: number;
  byStage: { stage: LeadStage; label: string; count: number }[];
  byKind: { kind: LeadKind; label: string; count: number }[];
}

export interface LeadBrokerLoad {
  userId: number;
  name: string;
  email: string;
  role: string;
  openLeads: number;
  breached: number;
  won30d: number;
  lost30d: number;
  conversionRate: number;
  medianResponseMinutes: number;
}

export interface LeadListResponse {
  data: Lead[];
  stats: LeadStats;
  brokers: LeadBrokerLoad[];
  can: { assign: boolean; manage: boolean; contact: boolean; viewAll: boolean };
  generatedAt: string;
}

export interface AssignStaff extends StaffOption {
  scope: string;
  phone: string | null;
  assignedCount: number;
  liveCount: number;
  attentionCount: number;
  openTasks: number;
}

export interface AssignListing {
  id: string;
  title: string;
  price: string | null;
  rentPrice: string | null;
  status: string | null;
  type: string | null;
  city: string | null;
  district: string | null;
  images: string[] | null;
  viewCount: number | null;
  lifecycleState: string;
  moderationStatus: string;
  createdAt: string | null;
  assignedToUserId: number | null;
  assignedAt: string | null;
  createdByUserId: number | null;
  assigneeName: string | null;
  creatorName: string | null;
}

export interface CallLog {
  id: number;
  propertyId: string;
  actorUserId: number | null;
  actorName: string | null;
  outcome: string;
  phone: string | null;
  note: string | null;
  followUpAt: string | null;
  createdAt: string | null;
}

export interface CallbackListing {
  id: string;
  title: string;
  price: string | null;
  rentPrice: string | null;
  status: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  images: string[] | null;
  owner?: { name?: string; phone?: string; email?: string; note?: string } | null;
  lifecycleState: string;
  lifecycleNote: string | null;
  rentStartedAt: string | null;
  rentExpiresAt: string | null;
  rentTermMonths: number | null;
  lastCallAt: string | null;
  lastCallOutcome: string | null;
  nextFollowUpAt: string | null;
  assignedToUserId: number | null;
  assigneeName: string | null;
  daysUntilExpiry: number | null;
  daysUntilFollowUp: number | null;
  lastCall: {
    outcome: string;
    note: string | null;
    actorName: string | null;
    createdAt: string | null;
    followUpAt: string | null;
  } | null;
}

export interface CallbackBuckets {
  expired: number;
  followUpDue: number;
  expiringSoon: number;
  neverCalled: number;
}

export interface ModerationSubmitter {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  memberSince: string | null;
  approvedCount: number;
  rejectedCount: number;
}

export interface ModerationListing {
  id: string;
  title: string;
  description: string | null;
  price: string | null;
  rentPrice: string | null;
  area: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  type: string | null;
  status: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  images: string[] | null;
  coordinates: { lat: number; lng: number } | null;
  moderationStatus: string;
  moderationNote: string | null;
  moderationChecklist: Record<string, boolean> | null;
  moderatedAt: string | null;
  createdAt: string | null;
  waitingHours: number;
  slaBreached: boolean;
  photoCount: number;
  submitter: ModerationSubmitter | null;
}

export interface ModerationTemplate {
  id: number;
  kind: 'approve' | 'reject';
  label: string;
  body: string;
  sortOrder: number;
}

export interface DeskTask {
  id: number;
  propertyId: string;
  title: string;
  kind: string;
  status: string;
  priority: string;
  assignedToUserId: number | null;
  mentionedUserIds: number[] | null;
  dueAt: string | null;
  note: string | null;
  createdByName: string | null;
  completedByName: string | null;
  completedAt: string | null;
  createdAt: string | null;
  assigneeName: string | null;
  propertyTitle: string | null;
  propertyCity: string | null;
  propertyDistrict: string | null;
  propertyImage: string | null;
  daysUntilDue: number | null;
}

export interface PerformanceRow {
  userId: number;
  name: string;
  email: string;
  role: string;
  scope: string;
  phone: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  liveListings: number;
  totalListings: number;
  totalViews: number;
  avgViews: number;
  needsAttention: number;
  pendingModeration: number;
  newLast30: number;
  dealsLast90: number;
  openTasks: number;
  overdueTasks: number;
  doneTasksLast30: number;
  callsLast30: number;
  lastCallAt: string | null;
  lastListingUpdateAt: string | null;
  lastActivityAt: string | null;
}

export interface PerformanceTotals {
  liveListings: number;
  totalViews: number;
  needsAttention: number;
  overdueTasks: number;
  callsLast30: number;
  dealsLast90: number;
}

/** Every board gets the same escape hatches from the parent page. */
export interface DeskBoardProps {
  api: (path: string, options?: RequestInit) => Promise<unknown>;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onCountsChanged: () => void;
}
