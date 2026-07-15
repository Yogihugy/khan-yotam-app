import { useMemo, useState, type FormEvent } from 'react';
import { PROFILE_COLORS, TRAVELER_TYPES, type TravelerType } from '../lib/constants';
import { updateOwnProfile } from '../lib/mapData';
import { writeCachedUser } from '../lib/userStore';
import type { PublicUser } from '../lib/api';

type Props = {
  user: PublicUser;
  onUserChange: (user: PublicUser) => void;
};

export function ProfilePage({ user, onUserChange }: Props) {
  const [name, setName] = useState(user.name || '');
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
        name: name.trim(),
        traveler_type: travelerType,
        color,
      });
      writeCachedUser(updated);
      onUserChange(updated);
      setSaved(true);
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
        <p className="muted">שם תצוגה, סוג מטייל וצבע על המפה.</p>

        <label>
          שם תצוגה
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            autoComplete="name"
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
        {saved && <p className="muted">נשמר.</p>}

        <button type="submit" className="primary" disabled={saving}>
          {saving ? 'שומרים…' : 'שמירה'}
        </button>
      </form>
    </main>
  );
}
