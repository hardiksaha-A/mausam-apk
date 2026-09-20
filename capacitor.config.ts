import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.mausam.mobile',
  appName: 'Mausam',
  webDir: 'dist',
  backgroundColor: '#EAF3FD',
  android: {
    backgroundColor: '#EAF3FD',
  },
  ios: {
    backgroundColor: '#EAF3FD',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_mausam',
      iconColor: '#1D6FDC',
    },
  },
};

export default config;
