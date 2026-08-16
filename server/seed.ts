import bcrypt from 'bcryptjs';
import { db, client } from './db.js';
import { users, siteSettings, rolePermissions } from './schema.js';
import { eq } from 'drizzle-orm';
import { ROLES, ROLE_DEFAULT_PERMISSIONS, ROLE_DEFAULT_SCOPE } from './permissions.js';
import dotenv from 'dotenv';

dotenv.config();

const ADMIN_EMAIL = 'admin@tbilisirealtor.ge';
const ADMIN_PASSWORD = 'TbilisiAdmin2024!';
const ADMIN_NAME = 'სუპერ ადმინი';

async function seed() {
  console.log('Seeding database...');

  try {
    // Role templates — inserted once, editable from the panel afterwards.
    for (const role of ROLES) {
      await db
        .insert(rolePermissions)
        .values({ role, permissions: ROLE_DEFAULT_PERMISSIONS[role] })
        .onConflictDoNothing();
    }
    console.log('✅ Role permission templates seeded');

    // Create admin user if not exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, ADMIN_EMAIL));

    if (!existing) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await db.insert(users).values({
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash,
        role: 'super_admin',
        scope: ROLE_DEFAULT_SCOPE.super_admin,
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
      { key: 'site_name', value: 'TbilisiRealtor.GE', label: 'საიტის სახელი' },
      { key: 'site_email', value: 'info@tbilisirealtor.ge', label: 'კონტაქტის Email' },
      { key: 'site_phone', value: '+995 596 88 11 55', label: 'ტელეფონი' },
      { key: 'site_phone_2', value: '+995 323 33 33 77', label: 'ტელეფონი 2' },
      { key: 'site_address', value: 'ქ. თბილისი, ეროსი მანჯგალაძის 81', label: 'მისამართი' },
      { key: 'facebook_url', value: 'https://facebook.com/tbilisirealtor', label: 'Facebook' },
      { key: 'instagram_url', value: 'https://instagram.com/tbilisirealtor', label: 'Instagram' },
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
