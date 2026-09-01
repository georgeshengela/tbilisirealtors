import { client } from './db.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  console.log('Running database migrations...');

  try {
    // admin_users became the single users table when public members were added.
    await client`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users')
           AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users')
        THEN
          ALTER TABLE admin_users RENAME TO users;
        END IF;
      END $$;
    `;

    await client`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS properties (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        price NUMERIC NOT NULL,
        price_per_sqm NUMERIC,
        address VARCHAR(500),
        city VARCHAR(255),
        district VARCHAR(255),
        type VARCHAR(50),
        status VARCHAR(50),
        bedrooms INTEGER,
        bathrooms INTEGER,
        area NUMERIC,
        floor INTEGER,
        total_floors INTEGER,
        year_built INTEGER,
        images JSONB DEFAULT '[]',
        amenities JSONB DEFAULT '[]',
        features JSONB DEFAULT '[]',
        is_featured BOOLEAN DEFAULT false,
        is_new BOOLEAN DEFAULT false,
        is_premium BOOLEAN DEFAULT false,
        coordinates JSONB,
        view_count INTEGER DEFAULT 0,
        listed_date DATE,
        agent_id VARCHAR(50),
        agent_name VARCHAR(255),
        agent_phone VARCHAR(50),
        agent_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Source of the listing + rental lifecycle, added after the table shipped.
    await client`
      ALTER TABLE properties
        ADD COLUMN IF NOT EXISTS source VARCHAR(30),
        ADD COLUMN IF NOT EXISTS source_url VARCHAR(600),
        ADD COLUMN IF NOT EXISTS source_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS lifecycle_state VARCHAR(20) NOT NULL DEFAULT 'new',
        ADD COLUMN IF NOT EXISTS rent_term_months INTEGER,
        ADD COLUMN IF NOT EXISTS rent_started_at DATE,
        ADD COLUMN IF NOT EXISTS rent_expires_at DATE,
        ADD COLUMN IF NOT EXISTS lifecycle_note VARCHAR(500),
        ADD COLUMN IF NOT EXISTS lifecycle_updated_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS lifecycle_outcome VARCHAR(30),
        ADD COLUMN IF NOT EXISTS lifecycle_deal_price NUMERIC
    `;

    // Dual pricing, owner records, agreements, private notes and translations.
    await client`
      ALTER TABLE properties
        ADD COLUMN IF NOT EXISTS description_en TEXT,
        ADD COLUMN IF NOT EXISTS description_ru TEXT,
        ADD COLUMN IF NOT EXISTS rent_price NUMERIC,
        ADD COLUMN IF NOT EXISTS hidden_images JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS agent_company VARCHAR(255),
        ADD COLUMN IF NOT EXISTS agent_tax_id VARCHAR(50),
        ADD COLUMN IF NOT EXISTS invoice_ref VARCHAR(120),
        ADD COLUMN IF NOT EXISTS owner JSONB,
        ADD COLUMN IF NOT EXISTS contracts JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS internal_notes JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS show_address BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS cadastral_code VARCHAR(80)
    `;

    await client`
      CREATE TABLE IF NOT EXISTS property_price_history (
        id SERIAL PRIMARY KEY,
        property_id VARCHAR(50) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        old_price NUMERIC,
        new_price NUMERIC NOT NULL,
        changed_by VARCHAR(255),
        source VARCHAR(30) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await client`
      CREATE INDEX IF NOT EXISTS property_price_history_property_idx
        ON property_price_history (property_id, created_at DESC)
    `;

    await client`
      CREATE INDEX IF NOT EXISTS properties_lifecycle_idx
        ON properties (lifecycle_state, rent_expires_at)
    `;

    // Daily aggregate benchmarks scraped from external market portals (MyGE et al).
    // One row per source/day/city builds the history the portals do not publish.
    await client`
      CREATE TABLE IF NOT EXISTS external_market_snapshots (
        id SERIAL PRIMARY KEY,
        source VARCHAR(50) NOT NULL,
        snapshot_date DATE NOT NULL,
        city_slug VARCHAR(120) NOT NULL,
        city VARCHAR(255) NOT NULL,
        total_listings INTEGER DEFAULT 0,
        sale_listings INTEGER DEFAULT 0,
        rent_listings INTEGER DEFAULT 0,
        sale_sample INTEGER DEFAULT 0,
        sale_median_price NUMERIC,
        sale_median_per_sqm NUMERIC,
        sale_avg_per_sqm NUMERIC,
        sale_p25_per_sqm NUMERIC,
        sale_p75_per_sqm NUMERIC,
        rent_sample INTEGER DEFAULT 0,
        rent_median_price NUMERIC,
        rent_avg_price NUMERIC,
        rent_median_per_sqm NUMERIC,
        source_updated DATE,
        payload JSONB,
        fetched_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT external_market_snapshots_unique UNIQUE (source, snapshot_date, city_slug)
      )
    `;

    await client`
      CREATE INDEX IF NOT EXISTS external_market_snapshots_lookup_idx
        ON external_market_snapshots (source, city_slug, snapshot_date DESC)
    `;

    // Public enquiries: contact form, property questions, viewing requests, newsletter.
    await client`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        kind VARCHAR(20) NOT NULL DEFAULT 'contact',
        name VARCHAR(200),
        phone VARCHAR(50),
        email VARCHAR(255),
        subject VARCHAR(300),
        message TEXT,
        property_id VARCHAR(50) REFERENCES properties(id) ON DELETE SET NULL,
        preferred_at TIMESTAMP,
        source_url VARCHAR(600),
        locale VARCHAR(10),
        stage VARCHAR(20) NOT NULL DEFAULT 'new',
        lost_reason VARCHAR(300),
        assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        assigned_by_user_id INTEGER,
        assigned_at TIMESTAMP,
        first_response_at TIMESTAMP,
        next_follow_up_at DATE,
        closed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await client`
      CREATE INDEX IF NOT EXISTS leads_queue_idx
        ON leads (stage, assigned_to_user_id, created_at DESC)
    `;

    await client`
      CREATE INDEX IF NOT EXISTS leads_property_idx ON leads (property_id)
    `;

    await client`
      CREATE TABLE IF NOT EXISTS lead_events (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        kind VARCHAR(20) NOT NULL DEFAULT 'note',
        body VARCHAR(1000),
        meta JSONB DEFAULT '{}',
        actor_user_id INTEGER,
        actor_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await client`
      CREATE INDEX IF NOT EXISTS lead_events_lead_idx
        ON lead_events (lead_id, created_at DESC)
    `;

    await client`
      CREATE TABLE IF NOT EXISTS agents (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        photo VARCHAR(500),
        phone VARCHAR(50),
        email VARCHAR(255),
        rating NUMERIC DEFAULT 5.0,
        review_count INTEGER DEFAULT 0,
        property_count INTEGER DEFAULT 0,
        years_experience INTEGER DEFAULT 0,
        specialization JSONB DEFAULT '[]',
        bio TEXT,
        company VARCHAR(255),
        verified BOOLEAN DEFAULT false,
        languages JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        excerpt TEXT,
        content TEXT,
        author_id VARCHAR(50),
        author_name VARCHAR(255),
        category VARCHAR(100),
        tags JSONB DEFAULT '[]',
        image VARCHAR(500),
        publish_date DATE,
        read_time INTEGER DEFAULT 5,
        is_featured BOOLEAN DEFAULT false,
        is_published BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS site_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT,
        label VARCHAR(255),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Admin profile details + public-visibility toggle.
    await client`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS first_name VARCHAR(120),
        ADD COLUMN IF NOT EXISTS last_name VARCHAR(120),
        ADD COLUMN IF NOT EXISTS date_of_birth DATE,
        ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
        ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
        ADD COLUMN IF NOT EXISTS job_title VARCHAR(120),
        ADD COLUMN IF NOT EXISTS bio TEXT,
        ADD COLUMN IF NOT EXISTS show_on_frontend BOOLEAN NOT NULL DEFAULT false
    `;

    // Split legacy single "name" into first / last where still empty.
    await client`
      UPDATE users
      SET
        first_name = COALESCE(NULLIF(trim(first_name), ''), split_part(trim(name), ' ', 1)),
        last_name = COALESCE(
          NULLIF(trim(last_name), ''),
          NULLIF(trim(substring(trim(name) from length(split_part(trim(name), ' ', 1)) + 1)), '')
        )
      WHERE first_name IS NULL OR trim(first_name) = ''
    `;

    // Roles, granular permissions and instant token revocation.
    await client`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS scope VARCHAR(10) NOT NULL DEFAULT 'all',
        ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS blocked_reason VARCHAR(255)
    `;

    await client`
      ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user'
    `;

    await client`CREATE INDEX IF NOT EXISTS users_role_idx ON users (role, is_active)`;

    await client`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role VARCHAR(50) PRIMARY KEY,
        permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Real public view events (session-deduped) for honest admin analytics.
    await client`
      CREATE TABLE IF NOT EXISTS property_views (
        id SERIAL PRIMARY KEY,
        property_id VARCHAR(50) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        session_key VARCHAR(64) NOT NULL,
        viewed_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    await client`
      CREATE INDEX IF NOT EXISTS property_views_property_idx
        ON property_views (property_id, viewed_at DESC)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS property_views_session_idx
        ON property_views (property_id, session_key, viewed_at DESC)
    `;

    await client`
      CREATE TABLE IF NOT EXISTS property_offers (
        id SERIAL PRIMARY KEY,
        property_id VARCHAR(50) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        broker_user_id INTEGER,
        lead_id INTEGER,
        client_name VARCHAR(255),
        client_phone VARCHAR(50),
        offered_at TIMESTAMP NOT NULL DEFAULT NOW(),
        notes TEXT
      )
    `;
    await client`
      CREATE INDEX IF NOT EXISTS property_offers_property_idx
        ON property_offers (property_id, offered_at DESC)
    `;

    // Listing ownership + moderation of member submissions.
    await client`
      ALTER TABLE properties
        ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER,
        ADD COLUMN IF NOT EXISTS assigned_to_user_id INTEGER,
        ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'approved',
        ADD COLUMN IF NOT EXISTS moderation_note VARCHAR(500),
        ADD COLUMN IF NOT EXISTS moderated_by_user_id INTEGER,
        ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP
    `;

    // Everything that already existed was published by staff.
    await client`
      UPDATE properties
      SET moderation_status = 'approved'
      WHERE moderation_status IS NULL OR trim(moderation_status) = ''
    `;

    await client`
      CREATE INDEX IF NOT EXISTS properties_moderation_idx
        ON properties (moderation_status, created_by_user_id)
    `;

    await client`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        property_id VARCHAR(50) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await client`
      CREATE UNIQUE INDEX IF NOT EXISTS user_favorites_unique_idx
        ON user_favorites (user_id, property_id)
    `;

    await client`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(160) NOT NULL,
        query JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await client`
      CREATE INDEX IF NOT EXISTS saved_searches_user_idx ON saved_searches (user_id, created_at DESC)
    `;

    await client`
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        actor_user_id INTEGER,
        actor_name VARCHAR(255),
        action VARCHAR(60) NOT NULL,
        entity VARCHAR(40),
        entity_id VARCHAR(60),
        meta JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await client`
      CREATE INDEX IF NOT EXISTS activity_log_created_idx ON activity_log (created_at DESC)
    `;

    await client`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token VARCHAR(128) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Manager desk: assignment trail, call-back tracking and moderation SLA.
    await client`
      ALTER TABLE properties
        ADD COLUMN IF NOT EXISTS assigned_by_user_id INTEGER,
        ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS last_call_outcome VARCHAR(30),
        ADD COLUMN IF NOT EXISTS next_follow_up_at DATE,
        ADD COLUMN IF NOT EXISTS moderation_requested_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS moderation_checklist JSONB DEFAULT '{}'::jsonb
    `;

    // Anything already waiting entered the queue when it was created.
    await client`
      UPDATE properties
      SET moderation_requested_at = COALESCE(moderation_requested_at, created_at, NOW())
      WHERE moderation_status = 'pending' AND moderation_requested_at IS NULL
    `;

    await client`
      CREATE INDEX IF NOT EXISTS properties_assigned_idx
        ON properties (assigned_to_user_id, lifecycle_state)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS properties_follow_up_idx
        ON properties (next_follow_up_at)
        WHERE next_follow_up_at IS NOT NULL
    `;

    await client`
      CREATE TABLE IF NOT EXISTS listing_tasks (
        id SERIAL PRIMARY KEY,
        property_id VARCHAR(50) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        title VARCHAR(300) NOT NULL,
        kind VARCHAR(20) NOT NULL DEFAULT 'other',
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        priority VARCHAR(10) NOT NULL DEFAULT 'normal',
        assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        mentioned_user_ids JSONB DEFAULT '[]'::jsonb,
        due_at DATE,
        note TEXT,
        created_by_user_id INTEGER,
        created_by_name VARCHAR(255),
        completed_by_user_id INTEGER,
        completed_by_name VARCHAR(255),
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await client`
      CREATE INDEX IF NOT EXISTS listing_tasks_open_idx
        ON listing_tasks (status, due_at)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS listing_tasks_assignee_idx
        ON listing_tasks (assigned_to_user_id, status)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS listing_tasks_property_idx
        ON listing_tasks (property_id, created_at DESC)
    `;

    await client`
      CREATE TABLE IF NOT EXISTS listing_call_logs (
        id SERIAL PRIMARY KEY,
        property_id VARCHAR(50) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        actor_user_id INTEGER,
        actor_name VARCHAR(255),
        outcome VARCHAR(30) NOT NULL,
        phone VARCHAR(50),
        note VARCHAR(1000),
        follow_up_at DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await client`
      CREATE INDEX IF NOT EXISTS listing_call_logs_property_idx
        ON listing_call_logs (property_id, created_at DESC)
    `;

    await client`
      CREATE TABLE IF NOT EXISTS moderation_templates (
        id SERIAL PRIMARY KEY,
        kind VARCHAR(10) NOT NULL,
        label VARCHAR(160) NOT NULL,
        body VARCHAR(600) NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS listing_imports (
        id SERIAL PRIMARY KEY,
        source VARCHAR(30) NOT NULL DEFAULT 'unknown',
        source_url VARCHAR(600),
        source_id VARCHAR(100),
        status VARCHAR(10) NOT NULL,
        missing_fields JSONB DEFAULT '[]'::jsonb,
        warnings JSONB DEFAULT '[]'::jsonb,
        error_code VARCHAR(40),
        error_message VARCHAR(300),
        field_count INTEGER NOT NULL DEFAULT 0,
        photo_count INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        retry_of_id INTEGER,
        actor_user_id INTEGER,
        actor_name VARCHAR(255),
        property_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await client`
      CREATE INDEX IF NOT EXISTS listing_imports_recent_idx
        ON listing_imports (created_at DESC)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS listing_imports_quality_idx
        ON listing_imports (source, status, created_at DESC)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS listing_imports_source_id_idx
        ON listing_imports (source, source_id)
    `;

    /**
     * Role templates are seeded once and then owned by the panel, so newly shipped
     * permissions have to be added to the stored templates explicitly. Only keys
     * introduced by this release are listed, and only missing ones are appended —
     * a permission an admin deliberately removed earlier stays removed.
     */
    const LEAD_DESK = ['leads.view', 'leads.manage', 'leads.assign', 'leads.viewAll', 'leads.contact'];

    const NEW_ROLE_PERMISSIONS: Record<string, string[]> = {
      super_admin: LEAD_DESK,
      admin: ['listings.tasks', 'listings.tasksAll', 'analytics.imports', ...LEAD_DESK],
      manager: ['listings.tasks', 'listings.tasksAll', 'analytics.imports', ...LEAD_DESK],
      // A broker works the leads handed to them; distribution stays with managers.
      broker: ['listings.tasks', 'leads.view', 'leads.manage', 'leads.contact'],
    };

    for (const [role, keys] of Object.entries(NEW_ROLE_PERMISSIONS)) {
      for (const key of keys) {
        const patch = JSON.stringify([key]);
        await client`
          UPDATE role_permissions
          SET permissions = permissions || ${patch}::jsonb,
              updated_at = NOW()
          WHERE role = ${role}
            AND NOT permissions @> ${patch}::jsonb
        `;
      }
    }
    console.log('✅ Role templates topped up with new permissions');

    await client`ALTER TABLE properties ADD COLUMN IF NOT EXISTS placement VARCHAR(20) NOT NULL DEFAULT 'free'`;
    await client`ALTER TABLE properties ADD COLUMN IF NOT EXISTS placement_package VARCHAR(80)`;

    console.log('✅ All tables created successfully');
  } catch (err) {
    console.error('❌ Migration error:', err);
    throw err;
  } finally {
    await client.end();
  }
}

migrate();
