import { Geolocation } from '@capacitor/geolocation';
import { isNativeApp } from '../utils/platform';

/**
 * Drop-in for navigator.geolocation.getCurrentPosition. Inside the installed
 * Android app it goes through Capacitor's Geolocation plugin, which asks for
 * the runtime location permission properly; in a browser/desktop build it
 * just uses the browser API exactly as before.
 */
export function getCurrentPositionCompat(
  onSuccess: PositionCallback,
  onError: PositionErrorCallback,
  options?: PositionOptions
): void {
  if (!isNativeApp()) {
    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    return;
  }

  const fail = (code: 1 | 2 | 3) =>
    onError({ code, message: '', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);

  (async () => {
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
        const asked = await Geolocation.requestPermissions();
        if (asked.location !== 'granted' && asked.coarseLocation !== 'granted') {
          fail(1);
          return;
        }
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 60000,
      });
      onSuccess(pos as unknown as GeolocationPosition);
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? e).toLowerCase();
      fail(msg.includes('denied') || msg.includes('permission') ? 1 : msg.includes('timeout') || msg.includes('timed out') ? 3 : 2);
    }
  })();
}

export function geolocationSupported(): boolean {
  return isNativeApp() || 'geolocation' in navigator;
}
