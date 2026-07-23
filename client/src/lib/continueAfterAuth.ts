import type { NavigateFunction } from 'react-router-dom';
import type { PublicUser } from './api';
import { hasCompletedOnboarding, writeCachedUser } from './userStore';

/** Shared post-login routing used by invite + self-registration. */
export function continueAfterAuth(
  navigate: NavigateFunction,
  user: PublicUser,
  profileComplete: boolean,
) {
  writeCachedUser(user);
  if (!hasCompletedOnboarding()) {
    navigate('/onboarding', { replace: true });
  } else if (profileComplete) {
    navigate('/', { replace: true });
  } else {
    navigate('/complete-profile', { replace: true });
  }
}
