import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeProfile } from '../lib/api';
import { PROFILE_COLORS, TRAVELER_TYPES, type TravelerType } from '../lib/constants';
import { getAccessToken } from '../lib/supabase';
import type { PublicUser } from '../lib/api';

function readCachedUser(): PublicUser | null {
  try {
    const raw = sessionStorage.getItem('khan-yotam-user');
    return raw ? (JSON.parse(raw) as PublicUser) : null;
  } catch {
    return null;
  }
}

export function CompleteProfilePage() {
  const navigate = useNavigate();
  const cached = useMemo(() => readCachedUser(), []);
  const [name, setName] = useState(cached?.name || '');
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
        name: name.trim(),
        traveler_type: travelerType,
        color,
      });

      sessionStorage.setItem('khan-yotam-user', JSON.stringify(result.user));
      navigate('/', { replace: true });
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
        <p className="muted">שם התצוגה, סוג מטייל וצבע על המפה.</p>

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
