/**
 * Removing a public member, from the admin panel or by the member themselves.
 *
 * Nothing in the schema cascades, so the member's own rows are cleared by hand:
 * favourites, saved searches, open reset links and every listing they submitted
 * (their own name and phone are the contact on those, so they go with them).
 */

import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { passwordResetTokens, properties, savedSearches, userFavorites, users } from '../schema.js';

export async function deleteMemberAccount(userId: number): Promise<{ listings: number }> {
  return db.transaction(async tx => {
    const removed = await tx
      .delete(properties)
      .where(eq(properties.createdByUserId, userId))
      .returning({ id: properties.id });
    await tx.delete(userFavorites).where(eq(userFavorites.userId, userId));
    await tx.delete(savedSearches).where(eq(savedSearches.userId, userId));
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await tx.delete(users).where(eq(users.id, userId));
    return { listings: removed.length };
  });
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;
