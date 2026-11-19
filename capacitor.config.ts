import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shiyin.player',
  appName: '诗音',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      // 不自动隐藏：由 App 首帧渲染后手动 hide（platform/splashScreen.ts），
      // 避免启动屏停留拖慢冷启动桥调用，也避免露出白屏 WebView
      launchAutoHide: false,
      launchShowDuration: 0,
      // 默认主题「纯净白」的底色近似值，与界面首帧衔接不跳色
      backgroundColor: '#F6F3EF',
    },
  },
};

export default config;
