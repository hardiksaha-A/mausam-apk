import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { runTopBackHandler } from './backStack';

/** Everything here is best-effort: a failure must never stop the app from loading. */
export async function initNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // The PWA service worker is pointless inside the app (assets are bundled)
  // and could serve stale files after an app update — remove it.
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // ignore
  }

  // Android hardware Back: close the top sheet, else go back a screen, else leave the app.
  try {
    await App.addListener('backButton', () => {
      if (runTopBackHandler()) return;
      if (window.location.pathname !== '/' && window.history.length > 1) {
        window.history.back();
        return;
      }
      App.minimizeApp().catch(() => App.exitApp());
    });
  } catch {
    // ignore
  }

  try {
    await SplashScreen.hide();
  } catch {
    // ignore
  }
}

/** 'dark-content' = dark icons (for light backgrounds); 'light-content' = light icons. */
export function setSystemBarContent(content: 'dark-content' | 'light-content'): void {
  if (!Capacitor.isNativePlatform()) return;
  SystemBars.setStyle({
    style: content === 'light-content' ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
  }).catch(() => undefined);
}
