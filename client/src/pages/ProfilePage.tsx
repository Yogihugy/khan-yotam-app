import { useMemo, useState, type FormEvent } from 'react';
import { PROFILE_COLORS, TRAVELER_TYPES, type TravelerType } from '../lib/constants';
import { updateOwnProfile } from '../lib/mapData';
import { writeCachedUser } from '../lib/userStore';
import type { PublicUser } from '../lib/api';

type Props = {
  user: PublicUser;
  onUserChange: (user: PublicUser) => void;
};

/** One-time seed for first/last from split fields, or legacy name fallback. */
function seedNameParts(user: PublicUser): { firstName: string; lastName: string } {
  if (user.first_name || user.last_name) {
    return {
      firstName: user.first_name || '',
      lastName: user.last_name || '',
    };
  }

  const legacy = (user.name || '').trim();
  if (!legacy) {
    return { firstName: '', lastName: '' };
  }

  const spaceIdx = legacy.indexOf(' ');
  if (spaceIdx === -1) {
    return { firstName: legacy, lastName: '' };
  }

  return {
    firstName: legacy.slice(0, spaceIdx),
    lastName: legacy.slice(spaceIdx + 1).trim(),
  };
}

export function ProfilePage({ user, onUserChange }: Props) {
  const [firstName, setFirstName] = useState(() => seedNameParts(user).firstName);
  const [lastName, setLastName] = useState(() => seedNameParts(user).lastName);
  const [bio, setBio] = useState(user.bio || '');
  const [socialLink, setSocialLink] = useState(user.social_link || '');
  const [travelerType, setTravelerType] = useState<TravelerType>(
    (user.traveler_type as TravelerType) || 'hiker',
  );
  const [color, setColor] = useState(user.color || PROFILE_COLORS[1]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const phone = useMemo(() => user.phone || '—', [user.phone]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const updated = await updateOwnProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        bio: bio.trim() || null,
        social_link: socialLink.trim() || null,
        traveler_type: travelerType,
        color,
      });
      writeCachedUser(updated);
      onUserChange(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="shell-page">
      <form className="panel" onSubmit={onSubmit}>
        <h1>פרופיל</h1>
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
          <input value={phone} readOnly disabled />
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
          {saving ? 'שומרים…' : saved ? 'נשמר ✓' : 'שמירה'}
        </button>
      </form>
    </main>
  );
}
