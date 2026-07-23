export type InAppBrowserKind = 'whatsapp' | 'instagram' | 'facebook';

/** Detect common in-app browsers via user-agent only (no library). */
export function detectInAppBrowser(
  ua = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): InAppBrowserKind | null {
  if (/WhatsApp/i.test(ua)) return 'whatsapp';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV/i.test(ua)) return 'facebook';
  return null;
}

export function inAppBrowserOpenHint(kind: InAppBrowserKind): string {
  switch (kind) {
    case 'whatsapp':
      return "נפתח מתוך וואטסאפ — לחצו על שלוש הנקודות למעלה ובחרו 'פתח בדפדפן'";
    case 'instagram':
      return "נפתח מתוך אינסטגרם — לחצו על שלוש הנקודות למעלה ובחרו 'פתח בדפדפן' / Open in Browser";
    case 'facebook':
      return "נפתח מתוך פייסבוק — לחצו על שלוש הנקודות למעלה ובחרו 'פתח בדפדפן' / Open in Browser";
  }
}
