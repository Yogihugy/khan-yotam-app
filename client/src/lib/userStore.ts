import type { PublicUser } from './api';

const USER_KEY = 'khan-yotam-user';
const ONBOARD_KEY = 'khan-yotam-onboarded';

export function readCachedUser(): PublicUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as PublicUser) : null;
  } catch {
    return null;
  }
}

export function writeCachedUser(user: PublicUser) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearCachedUser() {
  sessionStorage.removeItem(USER_KEY);
}

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARD_KEY) === '1';
}

export function markOnboardingComplete() {
  localStorage.setItem(ONBOARD_KEY, '1');
}

export function isAccessExpired(user: Pick<PublicUser, 'expires_at'> | null | undefined): boolean {
  if (!user?.expires_at) return false;
  return new Date(user.expires_at).getTime() < Date.now();
}
