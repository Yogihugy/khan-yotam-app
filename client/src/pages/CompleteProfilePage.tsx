import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeProfile } from '../lib/api';
import { PROFILE_COLORS, TRAVELER_TYPES, type TravelerType } from '../lib/constants';
import { getAccessToken } from '../lib/supabase';
import { hasCompletedOnboarding, readCachedUser, writeCachedUser } from '../lib/userStore';

export function CompleteProfilePage() {
  const navigate = useNavigate();
  const cached = useMemo(() => readCachedUser(), []);
  const [firstName, setFirstName] = useState(
    cached?.first_name || (cached?.last_name ? '' : cached?.name) || '',
  );
  const [lastName, setLastName] = useState(cached?.last_name || '');
  const [bio, setBio] = useState(cached?.bio || '');
  const [socialLink, setSocialLink] = useState(cached?.social_link || '');
  const [travelerType, setTravelerType] = useState<TravelerType>('hiker');
  const [color, setColor] = useState<string>(PROFILE_COLORS[1]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('אין סשן פעיל — פתחו שוב את קישור ההזמנה');
      }

      const result = await completeProfile(accessToken, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        bio: bio.trim(),
        social_link: socialLink.trim(),
        traveler_type: travelerType,
        color,
      });

      writeCachedUser(result.user);
      navigate(hasCompletedOnboarding() ? '/' : '/onboarding', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת הפרופיל');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <form className="panel" onSubmit={onSubmit}>
        <h1>השלמת פרופיל</h1>
        <p className="muted">שם, כמה מילים עליך, סוג מטייל וצבע על המפה.</p>

        <div className="name-row">
          <label>
            שם פרטי
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              maxLength={80}
              autoComplete="given-name"
            />
          </label>
          <label>
            שם משפחה
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={80}
              autoComplete="family-name"
            />
          </label>
        </div>

        <label>
          כמה מילים עליי
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder="אופציונלי"
          />
        </label>

        <label>
          קישור לרשת חברתית
          <input
            value={socialLink}
            onChange={(e) => setSocialLink(e.target.value)}
            maxLength={500}
            placeholder="https://… (אופציונלי)"
            autoComplete="url"
            inputMode="url"
          />
        </label>

        <label>
          טלפון
          <input value={cached?.phone || '—'} readOnly disabled />
        </label>

        <fieldset>
          <legend>סוג מטייל</legend>
          <div className="chip-row">
            {TRAVELER_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={travelerType === t.value ? 'chip active' : 'chip'}
                onClick={() => setTravelerType(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>צבע על המפה</legend>
          <div className="color-row">
            {PROFILE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={color === c ? 'swatch active' : 'swatch'}
                style={{ background: c }}
                aria-label={c}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </fieldset>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="primary" disabled={saving}>
          {saving ? 'שומרים…' : 'שמירה והמשך'}
        </button>
      </form>
    </main>
  );
}
