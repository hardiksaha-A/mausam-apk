import { LocalNotifications } from '@capacitor/local-notifications';
import { isNativeApp } from '../utils/platform';

/**
 * On-device notifications (free — no server, no account).
 *  • Installed Android/iOS app: Capacitor Local Notifications (works while the
 *    app is closed for the scheduled daily summaries).
 *  • Browser / desktop build: the standard Web Notification API (while the app is open).
 * Alerts are raised when the app fetches fresh data; that is the honest limit
 * of a serverless design, and the Profile screen says so.
 */
export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export async function getPermission(): Promise<PermissionState> {
  try {
    if (isNativeApp()) {
      const r = await LocalNotifications.checkPermissions();
      return r.display === 'granted' ? 'granted' : r.display === 'denied' ? 'denied' : 'prompt';
    }
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission === 'granted' ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'prompt';
  } catch {
    return 'unsupported';
  }
}

export async function requestPermission(): Promise<PermissionState> {
  try {
    if (isNativeApp()) {
      const r = await LocalNotifications.requestPermissions();
      return r.display === 'granted' ? 'granted' : 'denied';
    }
    if (typeof Notification === 'undefined') return 'unsupported';
    const p = await Notification.requestPermission();
    return p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt';
  } catch {
    return 'unsupported';
  }
}

let channelsReady = false;
async function ensureChannels(): Promise<void> {
  if (channelsReady || !isNativeApp()) return;
  try {
    await LocalNotifications.createChannel({ id: 'mausam-alerts', name: 'Weather & air quality alerts', importance: 4, vibration: true, visibility: 1 });
    await LocalNotifications.createChannel({ id: 'mausam-summary', name: 'Daily weather summary', importance: 3, vibration: false, visibility: 1 });
  } catch {
    // Channels are Android-only; iOS throws — ignore.
  }
  channelsReady = true;
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1_000_000) + 1000; // stays clear of the 7000-range used for summaries? see SUMMARY_BASE
}

/** Show a notification immediately. Returns false if it could not be shown. */
export async function notifyNow(title: string, body: string, kind: 'alerts' | 'summary' = 'alerts', key?: string): Promise<boolean> {
  if ((await getPermission()) !== 'granted') return false;
  try {
    if (isNativeApp()) {
      await ensureChannels();
      await LocalNotifications.schedule({
        notifications: [{ id: hash(key ?? `${title}${Date.now()}`) + 2_000_000, title, body, channelId: kind === 'alerts' ? 'mausam-alerts' : 'mausam-summary', smallIcon: 'ic_stat_mausam' }],
      });
      return true;
    }
    new Notification(title, { body, tag: key });
    return true;
  } catch {
    return false;
  }
}

const SUMMARY_BASE = 7000;
const SUMMARY_SLOTS = 7;

export async function cancelDailySummaries(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await LocalNotifications.cancel({ notifications: Array.from({ length: SUMMARY_SLOTS }, (_, i) => ({ id: SUMMARY_BASE + i })) });
  } catch {
    // ignore
  }
}

/** Replace the scheduled morning summaries (native app only) with fresh ones built from the real forecast. */
export async function scheduleDailySummaries(items: { at: Date; title: string; body: string }[]): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await ensureChannels();
    await cancelDailySummaries();
    const future = items.filter((i) => i.at.getTime() > Date.now() + 60_000).slice(0, SUMMARY_SLOTS);
    if (future.length === 0) return;
    await LocalNotifications.schedule({
      notifications: future.map((it, i) => ({
        id: SUMMARY_BASE + i,
        title: it.title,
        body: it.body,
        schedule: { at: it.at, allowWhileIdle: true },
        channelId: 'mausam-summary',
        smallIcon: 'ic_stat_mausam',
      })),
    });
  } catch {
    // ignore — scheduling is best effort
  }
}
