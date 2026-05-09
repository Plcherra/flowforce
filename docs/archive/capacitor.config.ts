import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.fb5a0aa8385444d5bf39ada17945856b',
  appName: 'connectflow-operations-suite',
  webDir: 'dist',
  server: {
    url: 'https://fb5a0aa8-3854-44d5-bf39-ada17945856b.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: false
    }
  }
};

export default config;