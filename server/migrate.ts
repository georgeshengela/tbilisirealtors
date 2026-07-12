import { client } from './db.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  console.log('Running database migrations...');

  try {
    await client`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
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

    console.log('✅ All tables created successfully');
  } catch (err) {
    console.error('❌ Migration error:', err);
    throw err;
  } finally {
    await client.end();
  }
}

migrate();
