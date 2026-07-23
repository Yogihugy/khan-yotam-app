type Props = {
  onRetry: () => void;
  busy?: boolean;
  onDismiss?: () => void;
  className?: string;
};

export function LocationDeniedHelp({ onRetry, busy = false, onDismiss, className }: Props) {
  return (
    <div className={className ? `denied-box ${className}` : 'denied-box'}>
      <p className="error">בלי הרשאת מיקום אי אפשר להשתמש במפה.</p>
      <p>
        באייפון / Safari לא ניתן לפתוח את ההגדרות מתוך האפליקציה. אחרי שדחיתם הרשאה פעם אחת, צריך
        לאפשר אותה ידנית ואז לנסות שוב:
      </p>
      <ol className="onboarding-list">
        <li>
          בספארי: לחצו על סמל <strong>aA</strong> בשורת הכתובת ←{' '}
          <strong>Website Settings</strong> / הגדרות אתר ← <strong>Location</strong> / מיקום ← בחרו{' '}
          <strong>Allow</strong> / אפשר.
        </li>
        <li>
          אם האפשרות לא מופיעה: הגדרות האייפון ← <strong>Privacy &amp; Security</strong> / פרטיות
          ואבטחה ← <strong>Location Services</strong> / שירותי מיקום ← ודאו ששירותי מיקום דלוקים ←{' '}
          <strong>Safari Websites</strong> ← הגדירו ל־<strong>Ask</strong> או{' '}
          <strong>While Using the App</strong>.
        </li>
      </ol>
      <div className="denied-box-actions">
        <button type="button" className="secondary" disabled={busy} onClick={onRetry}>
          {busy ? 'מבקשים מיקום…' : 'ניסיון חוזר'}
        </button>
        {onDismiss && (
          <button type="button" className="secondary" onClick={onDismiss}>
            סגור
          </button>
        )}
      </div>
    </div>
  );
}
