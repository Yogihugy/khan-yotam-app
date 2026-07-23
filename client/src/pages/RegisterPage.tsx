import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { InAppBrowserBanner } from '../components/InAppBrowserBanner';
import { requestOtp, verifyOtp } from '../lib/api';
import { continueAfterAuth } from '../lib/continueAfterAuth';
import { setSessionFromTokens } from '../lib/supabase';

const RESEND_COOLDOWN_SEC = 60;

function hebrewAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : '';
  if (raw.includes('Invalid phone number')) return 'מספר טלפון לא תקין';
  if (raw.includes('Please wait before requesting another code')) {
    return 'יש להמתין לפני בקשת קוד נוסף';
  }
  if (raw.includes('Too many code requests')) {
    return 'נשלחו יותר מדי קודים. נסו שוב מאוחר יותר';
  }
  if (raw.includes('Invalid or expired code')) return 'קוד שגוי או שפג תוקפו';
  return raw || 'אירעה שגיאה. נסו שוב';
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const id = window.setInterval(() => {
      setResendIn((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendIn]);

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed) {
      setError('נא להזין מספר טלפון');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await requestOtp(trimmed);
      setStep('code');
      setCode('');
      setResendIn(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setError(hebrewAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      setError('נא להזין קוד בן 6 ספרות');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await verifyOtp(phone.trim(), trimmedCode);
      await setSessionFromTokens(result.session);
      continueAfterAuth(navigate, result.user, result.profile_complete);
    } catch (err) {
      setError(hebrewAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  function goBackToPhone() {
    setStep('phone');
    setCode('');
    setError(null);
  }

  return (
    <main className="page">
      <div className="panel">
        <InAppBrowserBanner />
        <h1>חאן יותם</h1>
        <p className="muted">הרשמה או כניסה עם מספר טלפון</p>

        {step === 'phone' ? (
          <form className="admin-form-grid" onSubmit={(e) => void sendCode(e)}>
            <label>
              טלפון
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0501234567"
                required
                disabled={busy}
              />
            </label>
            <button type="submit" className="primary" disabled={busy || !phone.trim()}>
              {busy ? 'שולחים…' : 'שלחו קוד'}
            </button>
          </form>
        ) : (
          <form className="admin-form-grid" onSubmit={(e) => void onVerify(e)}>
            <p className="muted">
              נשלח קוד ל־<code dir="ltr">{phone.trim()}</code>
            </p>
            <label>
              קוד אימות
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                disabled={busy}
              />
            </label>
            <button type="submit" className="primary" disabled={busy || code.trim().length !== 6}>
              {busy ? 'מאמתים…' : 'אימות'}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy || resendIn > 0}
              onClick={() => void sendCode()}
            >
              {resendIn > 0 ? `שלחו שוב (${resendIn})` : 'שלחו שוב'}
            </button>
            <button type="button" className="secondary" disabled={busy} onClick={goBackToPhone}>
              שנו מספר טלפון
            </button>
          </form>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}
