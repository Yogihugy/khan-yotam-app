/**
 * Build users.name from first/last parts for Approach A (synced display field).
 * Trims each part; omits empty/null/undefined last (or first) so we never get
 * a trailing space or the literal string "null".
 * Keep in sync with client/src/lib/displayName.ts (no shared package).
 */
export function composeDisplayName(firstName, lastName) {
  const first = String(firstName ?? '').trim();
  const last = String(lastName ?? '').trim();
  return [first, last].filter(Boolean).join(' ');
}
