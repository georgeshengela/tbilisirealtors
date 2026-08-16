import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  numeric,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * One table for everyone: super admins, admins, managers, brokers and the members
 * who register on the public site. `role` decides which world you land in.
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  /** Display name kept in sync from firstName + lastName for JWT / admin UI. */
  name: varchar('name', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 120 }),
  lastName: varchar('last_name', { length: 120 }),
  dateOfBirth: date('date_of_birth'),
  phone: varchar('phone', { length: 50 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  jobTitle: varchar('job_title', { length: 120 }),
  bio: text('bio'),
  /** When false (default), personal name never appears on the public site. */
  showOnFrontend: boolean('show_on_frontend').notNull().default(false),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  isActive: boolean('is_active').notNull().default(true),
  /** Per-user grants/revokes layered over the role template. */
  permissions: jsonb('permissions').$type<Record<string, boolean>>().default({}),
  /** 'own' limits a staff member to listings they created; 'all' sees everything. */
  scope: varchar('scope', { length: 10 }).notNull().default('all'),
  /** Bumped on role / permission / password change so live tokens stop working. */
  tokenVersion: integer('token_version').notNull().default(1),
  lastLoginAt: timestamp('last_login_at'),
  emailVerifiedAt: timestamp('email_verified_at'),
  blockedReason: varchar('blocked_reason', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** Legacy alias — the table used to be `admin_users`. */
export const adminUsers = users;

/** Editable default permission set per role, seeded from code defaults. */
export const rolePermissions = pgTable('role_permissions', {
  role: varchar('role', { length: 50 }).primaryKey(),
  permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** Owner of the property — internal contact details, never exposed publicly. */
export interface PropertyOwner {
  name?: string;
  phone?: string;
  email?: string;
  idNumber?: string;
  address?: string;
  note?: string;
}

/** A signed agreement stored against the listing. */
export interface PropertyContract {
  id: string;
  title: string;
  url: string;
  kind: 'pdf' | 'image' | 'link';
  addedAt: string;
  addedBy?: string;
}

/** Internal comment — registry details and anything that must not go public. */
export interface InternalNote {
  id: string;
  text: string;
  author?: string;
  createdAt: string;
}

export const properties = pgTable('properties', {
  id: varchar('id', { length: 50 }).primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  descriptionEn: text('description_en'),
  descriptionRu: text('description_ru'),
  price: numeric('price').notNull(),
  /* A listing can be offered for sale and for rent at the same time. */
  rentPrice: numeric('rent_price'),
  pricePerSqm: numeric('price_per_sqm'),
  address: varchar('address', { length: 500 }),
  city: varchar('city', { length: 255 }),
  district: varchar('district', { length: 255 }),
  type: varchar('type', { length: 50 }),
  status: varchar('status', { length: 50 }),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  area: numeric('area'),
  floor: integer('floor'),
  totalFloors: integer('total_floors'),
  yearBuilt: integer('year_built'),
  images: jsonb('images').$type<string[]>().default([]),
  /* Uploaded but held back from the public gallery. */
  hiddenImages: jsonb('hidden_images').$type<string[]>().default([]),
  amenities: jsonb('amenities').$type<string[]>().default([]),
  features: jsonb('features').$type<string[]>().default([]),
  isFeatured: boolean('is_featured').default(false),
  isNew: boolean('is_new').default(false),
  isPremium: boolean('is_premium').default(false),
  coordinates: jsonb('coordinates').$type<{ lat: number; lng: number }>(),
  viewCount: integer('view_count').default(0),
  listedDate: date('listed_date'),
  agentId: varchar('agent_id', { length: 50 }),
  agentName: varchar('agent_name', { length: 255 }),
  agentPhone: varchar('agent_phone', { length: 50 }),
  agentEmail: varchar('agent_email', { length: 255 }),
  agentCompany: varchar('agent_company', { length: 255 }),
  agentTaxId: varchar('agent_tax_id', { length: 50 }),
  invoiceRef: varchar('invoice_ref', { length: 120 }),

  /* Owner, agreements and private notes — admin only. */
  owner: jsonb('owner').$type<PropertyOwner>(),
  contracts: jsonb('contracts').$type<PropertyContract[]>().default([]),
  internalNotes: jsonb('internal_notes').$type<InternalNote[]>().default([]),

  /* Paid listings may show the exact street number; ours stay approximate. */
  showAddress: boolean('show_address').default(true),

  /* Where the listing came from, so admins can open the original ad. */
  source: varchar('source', { length: 30 }),
  sourceUrl: varchar('source_url', { length: 600 }),
  sourceId: varchar('source_id', { length: 100 }),

  /* Lifecycle: new → current → old (rented out) → new_r (term expired, call back). */
  lifecycleState: varchar('lifecycle_state', { length: 20 }).notNull().default('new'),
  rentTermMonths: integer('rent_term_months'),
  rentStartedAt: date('rent_started_at'),
  rentExpiresAt: date('rent_expires_at'),
  lifecycleNote: varchar('lifecycle_note', { length: 500 }),
  lifecycleUpdatedAt: timestamp('lifecycle_updated_at'),

  /* Who owns this record — drives "own listings only" scope for brokers. */
  createdByUserId: integer('created_by_user_id'),
  assignedToUserId: integer('assigned_to_user_id'),
  assignedByUserId: integer('assigned_by_user_id'),
  assignedAt: timestamp('assigned_at'),

  /* Call-back desk: last owner contact and the date it should happen again. */
  lastCallAt: timestamp('last_call_at'),
  lastCallOutcome: varchar('last_call_outcome', { length: 30 }),
  nextFollowUpAt: date('next_follow_up_at'),

  /* Member submissions stay invisible until staff approves them. */
  moderationStatus: varchar('moderation_status', { length: 20 }).notNull().default('approved'),
  moderationNote: varchar('moderation_note', { length: 500 }),
  moderatedByUserId: integer('moderated_by_user_id'),
  moderatedAt: timestamp('moderated_at'),
  /* When the listing last entered the queue — drives the SLA timer. */
  moderationRequestedAt: timestamp('moderation_requested_at'),
  /* Reviewer's per-item verdicts, e.g. { photos: true, price: false }. */
  moderationChecklist: jsonb('moderation_checklist').$type<Record<string, boolean>>().default({}),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** A single job on a listing: call the owner, reshoot photos, chase a contract. */
export const listingTasks = pgTable('listing_tasks', {
  id: serial('id').primaryKey(),
  propertyId: varchar('property_id', { length: 50 }).notNull(),
  title: varchar('title', { length: 300 }).notNull(),
  /** call | visit | photo | document | price | other */
  kind: varchar('kind', { length: 20 }).notNull().default('other'),
  /** open | done | cancelled */
  status: varchar('status', { length: 20 }).notNull().default('open'),
  priority: varchar('priority', { length: 10 }).notNull().default('normal'),
  assignedToUserId: integer('assigned_to_user_id'),
  /** Extra people pulled in with @name, stored as user ids. */
  mentionedUserIds: jsonb('mentioned_user_ids').$type<number[]>().default([]),
  dueAt: date('due_at'),
  note: text('note'),
  createdByUserId: integer('created_by_user_id'),
  createdByName: varchar('created_by_name', { length: 255 }),
  completedByUserId: integer('completed_by_user_id'),
  completedByName: varchar('completed_by_name', { length: 255 }),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** One row per owner call, so a manager can see who chased what and how it went. */
export const listingCallLogs = pgTable('listing_call_logs', {
  id: serial('id').primaryKey(),
  propertyId: varchar('property_id', { length: 50 }).notNull(),
  actorUserId: integer('actor_user_id'),
  actorName: varchar('actor_name', { length: 255 }),
  /** reached | no_answer | interested | not_interested | rented_elsewhere | wrong_number */
  outcome: varchar('outcome', { length: 30 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  note: varchar('note', { length: 1000 }),
  followUpAt: date('follow_up_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

/** Reusable approve / reject wording so moderation decisions stay consistent. */
export const moderationTemplates = pgTable('moderation_templates', {
  id: serial('id').primaryKey(),
  /** approve | reject */
  kind: varchar('kind', { length: 10 }).notNull(),
  label: varchar('label', { length: 160 }).notNull(),
  body: varchar('body', { length: 600 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * One row per myhome.ge / ss.ge import attempt, written whether the parse
 * succeeded or blew up. Without this the import quality report has nothing to
 * measure: a failed scrape leaves no other trace anywhere in the database.
 */
export const listingImports = pgTable('listing_imports', {
  id: serial('id').primaryKey(),
  /** myhome.ge | ss.ge | unknown — 'unknown' when the URL was rejected outright. */
  source: varchar('source', { length: 30 }).notNull().default('unknown'),
  sourceUrl: varchar('source_url', { length: 600 }),
  sourceId: varchar('source_id', { length: 100 }),
  /** ok | partial | failed */
  status: varchar('status', { length: 10 }).notNull(),
  /** Important fields the parser could not fill, e.g. ['price', 'district']. */
  missingFields: jsonb('missing_fields').$type<string[]>().default([]),
  /** Softer quality flags, e.g. ['coords_defaulted', 'few_photos']. */
  warnings: jsonb('warnings').$type<string[]>().default([]),
  /** Stable code so the report can group failures without matching Georgian text. */
  errorCode: varchar('error_code', { length: 40 }),
  errorMessage: varchar('error_message', { length: 300 }),
  /** Completeness score from the parser — how many tracked fields came back filled. */
  fieldCount: integer('field_count').notNull().default(0),
  photoCount: integer('photo_count').notNull().default(0),
  durationMs: integer('duration_ms').notNull().default(0),
  /** True once a retry produced a better result, so the report can hide noise. */
  retryOfId: integer('retry_of_id'),
  actorUserId: integer('actor_user_id'),
  actorName: varchar('actor_name', { length: 255 }),
  /** Filled in when the imported data was actually saved as a listing. */
  propertyId: varchar('property_id', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
});

/** Every price edit, so the table can show what the price was before and who moved it. */
export const propertyPriceHistory = pgTable('property_price_history', {
  id: serial('id').primaryKey(),
  propertyId: varchar('property_id', { length: 50 }).notNull(),
  oldPrice: numeric('old_price'),
  newPrice: numeric('new_price').notNull(),
  changedBy: varchar('changed_by', { length: 255 }),
  source: varchar('source', { length: 30 }).notNull().default('admin'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * One row per counted public view. Session key dedupes refreshes / React StrictMode
 * so admin KPIs stay honest.
 */
export const propertyViews = pgTable('property_views', {
  id: serial('id').primaryKey(),
  propertyId: varchar('property_id', { length: 50 }).notNull(),
  sessionKey: varchar('session_key', { length: 64 }).notNull(),
  viewedAt: timestamp('viewed_at').defaultNow().notNull(),
});

export const agents = pgTable('agents', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  photo: varchar('photo', { length: 500 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  rating: numeric('rating').default('5.0'),
  reviewCount: integer('review_count').default(0),
  propertyCount: integer('property_count').default(0),
  yearsExperience: integer('years_experience').default(0),
  specialization: jsonb('specialization').$type<string[]>().default([]),
  bio: text('bio'),
  company: varchar('company', { length: 255 }),
  verified: boolean('verified').default(false),
  languages: jsonb('languages').$type<string[]>().default([]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const blogPosts = pgTable('blog_posts', {
  id: varchar('id', { length: 50 }).primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  excerpt: text('excerpt'),
  content: text('content'),
  authorId: varchar('author_id', { length: 50 }),
  authorName: varchar('author_name', { length: 255 }),
  category: varchar('category', { length: 100 }),
  tags: jsonb('tags').$type<string[]>().default([]),
  image: varchar('image', { length: 500 }),
  publishDate: date('publish_date'),
  readTime: integer('read_time').default(5),
  isFeatured: boolean('is_featured').default(false),
  isPublished: boolean('is_published').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const siteSettings = pgTable('site_settings', {
  key: varchar('key', { length: 255 }).primaryKey(),
  value: text('value'),
  label: varchar('label', { length: 255 }),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** Listings a member saved from the public site. */
export const userFavorites = pgTable('user_favorites', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  propertyId: varchar('property_id', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, table => ({
  uniqueFavorite: uniqueIndex('user_favorites_unique_idx').on(table.userId, table.propertyId),
}));

/** A named filter set a member wants to come back to. */
export const savedSearches = pgTable('saved_searches', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: varchar('name', { length: 160 }).notNull(),
  query: jsonb('query').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

/** Audit trail for permission changes, moderation decisions and deletions. */
export const activityLog = pgTable('activity_log', {
  id: serial('id').primaryKey(),
  actorUserId: integer('actor_user_id'),
  actorName: varchar('actor_name', { length: 255 }),
  action: varchar('action', { length: 60 }).notNull(),
  entity: varchar('entity', { length: 40 }),
  entityId: varchar('entity_id', { length: 60 }),
  meta: jsonb('meta').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  token: varchar('token', { length: 128 }).primaryKey(),
  userId: integer('user_id').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Every enquiry that arrives from the public site: contact form, property question,
 * viewing request or newsletter signup. This is the top of the sales funnel — before
 * this table existed the forms discarded whatever the visitor typed.
 */
export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  /** contact | property | viewing | newsletter */
  kind: varchar('kind', { length: 20 }).notNull().default('contact'),
  name: varchar('name', { length: 200 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  subject: varchar('subject', { length: 300 }),
  message: text('message'),
  /** Listing the visitor was looking at, when the enquiry came from a property page. */
  propertyId: varchar('property_id', { length: 50 }),
  /** Requested viewing slot for kind='viewing'. */
  preferredAt: timestamp('preferred_at'),
  /** Page the enquiry was sent from, for attribution. */
  sourceUrl: varchar('source_url', { length: 600 }),
  locale: varchar('locale', { length: 10 }),
  /** new | contacted | viewing | offer | won | lost */
  stage: varchar('stage', { length: 20 }).notNull().default('new'),
  lostReason: varchar('lost_reason', { length: 300 }),
  assignedToUserId: integer('assigned_to_user_id'),
  assignedByUserId: integer('assigned_by_user_id'),
  assignedAt: timestamp('assigned_at'),
  /** First time a staff member actually recorded contact — drives the response SLA. */
  firstResponseAt: timestamp('first_response_at'),
  nextFollowUpAt: date('next_follow_up_at'),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** Timeline entry on a lead: note, call, email, stage change or assignment. */
export const leadEvents = pgTable('lead_events', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id').notNull(),
  /** created | note | call | email | meeting | stage | assign */
  kind: varchar('kind', { length: 20 }).notNull().default('note'),
  body: varchar('body', { length: 1000 }),
  meta: jsonb('meta').$type<Record<string, unknown>>().default({}),
  actorUserId: integer('actor_user_id'),
  actorName: varchar('actor_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export type User = typeof users.$inferSelect;
export type AdminUser = typeof users.$inferSelect;
export type RolePermissionRow = typeof rolePermissions.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type PropertyPriceChange = typeof propertyPriceHistory.$inferSelect;
export type PropertyView = typeof propertyViews.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
export type SiteSetting = typeof siteSettings.$inferSelect;
export type UserFavorite = typeof userFavorites.$inferSelect;
export type SavedSearch = typeof savedSearches.$inferSelect;
export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type ListingTask = typeof listingTasks.$inferSelect;
export type ListingCallLog = typeof listingCallLogs.$inferSelect;
export type ModerationTemplate = typeof moderationTemplates.$inferSelect;
export type ListingImportAttempt = typeof listingImports.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type LeadEvent = typeof leadEvents.$inferSelect;
