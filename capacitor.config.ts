import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sonu.icecream',
  appName: 'Sonu Ice Cream',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: false
    }
  }
};

export default config;
