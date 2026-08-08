import { useEffect, useState } from 'react';
import { fetchEmergencyPhone } from '../lib/mapData';

type Props = {
  className?: string;
};

function PhoneIcon() {
  return (
    <svg
      className="emergency-banner-phone"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
      />
    </svg>
  );
}

export function EmergencyBanner({ className }: Props) {
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchEmergencyPhone()
      .then((value) => {
        if (!cancelled) setPhone(value);
      })
      .catch(() => {
        if (!cancelled) setPhone(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!phone) return null;

  return (
    <a
      className={className ? `emergency-banner ${className}` : 'emergency-banner'}
      href={`tel:${phone}`}
      aria-label={`לחצו להתקשר לקצין תורן: ${phone}`}
    >
      <span className="emergency-banner-main">
        <span>חירום - לחצו להתקשר</span>
        <PhoneIcon />
        <span className="emergency-banner-sos">SOS</span>
      </span>
    </a>
  );
}
