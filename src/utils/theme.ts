// 主题管理工具

import Taro from '@tarojs/taro';

export type ThemeMode = 'light' | 'dark' | 'auto';

const THEME_STORAGE_KEY = 'theme_mode';

// 获取当前主题模式
export function getThemeMode(): ThemeMode {
  try {
    const theme = Taro.getStorageSync(THEME_STORAGE_KEY);
    return (theme || 'light') as ThemeMode;
  } catch (e) {
    return 'light';
  }
}

// 设置主题模式
export function setThemeMode(mode: ThemeMode) {
  try {
    Taro.setStorageSync(THEME_STORAGE_KEY, mode);
    applyTheme(mode);
  } catch (e) {
    console.error('设置主题失败', e);
  }
}

// 应用主题
export function applyTheme(mode: ThemeMode) {
  if (mode === 'auto') {
    // 自动模式：根据系统设置
    // 在Taro中，可能需要通过系统API检测，这里简化为light
    mode = 'light';
  }
  
  // 设置CSS变量或类名
  // 在Taro中，主要通过页面级的类名来控制主题
  // 各个组件会根据主题类名应用不同的样式
  if (typeof document !== 'undefined') {
    const html = document.documentElement;
    if (mode === 'dark') {
      html.classList.add('dark-mode');
      html.classList.remove('light-mode');
    } else {
      html.classList.add('light-mode');
      html.classList.remove('dark-mode');
    }
  }
}

// 初始化主题
export function initTheme() {
  const mode = getThemeMode();
  applyTheme(mode);
}

