export type LocationHelpBrowser =
  | 'safari-ios'
  | 'chrome-ios'
  | 'chrome-android'
  | 'other';

/** Detect browser for location-permission help copy (UA only, no library). */
export function detectLocationHelpBrowser(
  ua = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): LocationHelpBrowser {
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  // Chrome on iOS reports CriOS (UA also contains "Safari" — check CriOS first)
  if (isIos && /CriOS/i.test(ua)) return 'chrome-ios';

  // Real Safari on iOS: Version/ + Safari, not another iOS browser shell
  if (
    isIos &&
    /Safari/i.test(ua) &&
    /Version\//i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)
  ) {
    return 'safari-ios';
  }

  // Chrome on Android (exclude common Android Chromium shells)
  if (isAndroid && /Chrome\//i.test(ua) && !/EdgA|OPR|SamsungBrowser/i.test(ua)) {
    return 'chrome-android';
  }

  return 'other';
}
