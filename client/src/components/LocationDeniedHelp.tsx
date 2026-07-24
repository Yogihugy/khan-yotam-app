import { useState } from 'react';
import {
  detectLocationHelpBrowser,
  type LocationHelpBrowser,
} from '../lib/locationHelpBrowser';

type Props = {
  onDismiss?: () => void;
  className?: string;
};

function LocationHelpCopy({ kind }: { kind: LocationHelpBrowser }) {
  switch (kind) {
    case 'safari-ios':
      return (
        <>
          <p>
            פתחו את הגדרות (Settings) באייפון ← Apps (אם קיים) ← Safari ← Settings for Websites ←
            Location ← מצאו את האתר ובחרו Allow.
          </p>
          <p>אם לא רואים &quot;Apps&quot;: חפשו Safari ישירות בהגדרות.</p>
          <p>אחרי שאישרתם, חזרו לכאן ורעננו את הדף.</p>
        </>
      );
    case 'chrome-ios':
      return (
        <>
          <p>
            פתחו את הגדרות (Settings) באייפון ← גללו למטה ומצאו Chrome ← Location ← בחרו While Using
            the App.
          </p>
          <p>אחרי שאישרתם, חזרו לכאן ורעננו את הדף.</p>
        </>
      );
    case 'chrome-android':
      return (
        <>
          <p>לחצו על שלוש הנקודות (⋮) בדפדפן ← הגדרות אתר ← מיקום ← אפשר.</p>
          <p>אחרי שאישרתם, חזרו לכאן ורעננו את הדף.</p>
        </>
      );
    case 'other':
      return (
        <>
          <p>בדקו את הגדרות המיקום של הדפדפן שלכם עבור האתר הזה, ואשרו גישה למיקום.</p>
          <p>אחרי שאישרתם, חזרו לכאן ורעננו את הדף.</p>
        </>
      );
  }
}

export function LocationDeniedHelp({ onDismiss, className }: Props) {
  const [kind] = useState(() => detectLocationHelpBrowser());

  return (
    <div className={className ? `denied-box ${className}` : 'denied-box'}>
      <p className="error">בלי הרשאת מיקום אי אפשר להשתמש במפה.</p>
      <LocationHelpCopy kind={kind} />
      {onDismiss && (
        <div className="denied-box-actions">
          <button type="button" className="secondary" onClick={onDismiss}>
            סגור
          </button>
        </div>
      )}
    </div>
  );
}
