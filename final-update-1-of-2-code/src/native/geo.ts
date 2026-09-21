import { Geolocation } from '@capacitor/geolocation';
import { isNativeApp } from '../utils/platform';

/**
 * Drop-in for navigator.geolocation.getCurrentPosition, built to actually
 * succeed on real phones:
 *   1. FAST attempt first — network/coarse location (works indoors, returns in
 *      a second or two, accepts a cached fix up to 10 minutes old);
 *   2. only if that fails (not for a permission refusal) a PRECISE GPS attempt
 *      with a longer 15 s timeout.
 * Inside the installed Android app it goes through Capacitor's Geolocation
 * plugin (proper runtime permission prompt); in a browser it uses the browser API.
 */
const FAST: PositionOptions = { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 };
const PRECISE: PositionOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

export function getCurrentPositionCompat(onSuccess: PositionCallback, onError: PositionErrorCallback): void {
  if (!isNativeApp()) {
    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) onError(err);
        else navigator.geolocation.getCurrentPosition(onSuccess, onError, PRECISE);
      },
      FAST
    );
    return;
  }

  const fail = (code: 1 | 2 | 3) =>
    onError({ code, message: '', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
  const codeOf = (e: unknown): 1 | 2 | 3 => {
    const msg = String((e as { message?: string })?.message ?? e).toLowerCase();
    return msg.includes('denied') || msg.includes('permission') ? 1 : msg.includes('timeout') || msg.includes('timed out') ? 3 : 2;
  };

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
    } catch (e) {
      fail(codeOf(e));
      return;
    }
    try {
      const pos = await Geolocation.getCurrentPosition(FAST);
      onSuccess(pos as unknown as GeolocationPosition);
    } catch (e1) {
      if (codeOf(e1) === 1) {
        fail(1);
        return;
      }
      try {
        const pos = await Geolocation.getCurrentPosition(PRECISE);
        onSuccess(pos as unknown as GeolocationPosition);
      } catch (e2) {
        fail(codeOf(e2));
      }
    }
  })();
}

export function geolocationSupported(): boolean {
  return isNativeApp() || 'geolocation' in navigator;
}
