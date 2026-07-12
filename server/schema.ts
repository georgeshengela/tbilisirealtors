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
} from 'drizzle-orm/pg-core';

export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('admin'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const properties = pgTable('properties', {
  id: varchar('id', { length: 50 }).primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  price: numeric('price').notNull(),
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
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
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

export type AdminUser = typeof adminUsers.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
export type SiteSetting = typeof siteSettings.$inferSelect;
