import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gomoku.yanyan',
  appName: '彦彦的五子棋',
  webDir: 'out',
  server: {
    androidScheme: 'http',
  },
};

export default config;
