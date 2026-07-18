import { useEffect, useState } from 'react';
import { fetchEmergencyPhone } from '../lib/mapData';

type Props = {
  className?: string;
};

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
      חירום - לחצו להתקשר
    </a>
  );
}
