import { client } from './db.js';

const users = await client`SELECT id, email, role, scope, is_active, token_version FROM users ORDER BY id`;
console.log('users:', users);

const mod = await client`SELECT moderation_status, count(*)::int FROM properties GROUP BY 1`;
console.log('moderation:', mod);

const roles = await client`SELECT role, jsonb_array_length(permissions) AS n FROM role_permissions ORDER BY role`;
console.log('role templates:', roles);

await client.end();
