import bcrypt from 'bcryptjs';
import { db, client } from './db.js';
import { adminUsers, siteSettings } from './schema.js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const ADMIN_EMAIL = 'admin@tbilisirealtors.ge';
const ADMIN_PASSWORD = 'TbilisiAdmin2024!';
const ADMIN_NAME = 'სუპერ ადმინი';

async function seed() {
  console.log('Seeding database...');

  try {
    // Create admin user if not exists
    const [existing] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, ADMIN_EMAIL));

    if (!existing) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await db.insert(adminUsers).values({
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash,
        role: 'super_admin',
        isActive: true,
      });

      console.log('\n✅ Admin user created:');
      console.log(`   Email:    ${ADMIN_EMAIL}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
      console.log('   ⚠️  Change this password after first login!\n');
    } else {
      console.log('ℹ️  Admin user already exists, skipping...');
    }

    // Seed default site settings
    const defaultSettings = [
      { key: 'site_name', value: 'TbilisiRealtors.ge', label: 'საიტის სახელი' },
      { key: 'site_email', value: 'info@tbilisirealtors.ge', label: 'კონტაქტის Email' },
      { key: 'site_phone', value: '+995 322 000 000', label: 'ტელეფონი' },
      { key: 'site_address', value: 'თბილისი, საქართველო', label: 'მისამართი' },
      { key: 'facebook_url', value: 'https://facebook.com/tbilisirealtors', label: 'Facebook' },
      { key: 'instagram_url', value: 'https://instagram.com/tbilisirealtors', label: 'Instagram' },
      { key: 'properties_per_page', value: '12', label: 'განცხადება გვერდზე' },
      { key: 'featured_properties_count', value: '6', label: 'VIP განცხადებები' },
    ];

    for (const setting of defaultSettings) {
      await db
        .insert(siteSettings)
        .values(setting)
        .onConflictDoNothing();
    }

    console.log('✅ Default settings seeded');
    console.log('\n🎉 Database seeding complete!');
  } catch (err) {
    console.error('❌ Seed error:', err);
    throw err;
  } finally {
    await client.end();
  }
}

seed();
