import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

/** True only inside the installed Android/iOS app (Capacitor), never in a browser. */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

const MOBILE_QUERY = '(max-width: 1023px)';

/**
 * Whether to show the phone-style shell (bottom tabs, sky hero) instead of
 * the desktop sidebar layout. Always true inside the native app; in a
 * browser/Electron it follows the window width, so the desktop build keeps
 * its sidebar layout and a narrow browser window gets the phone layout.
 */
export function useIsMobileShell(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => isNativeApp() || window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    if (isNativeApp()) return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
