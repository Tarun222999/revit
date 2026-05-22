import { Platform } from 'react-native';

const { AppColors, Radius } = require('./tokens');

export { AppColors, Radius };

export const Colors = {
  light: {
    text: AppColors.archive[900],
    background: AppColors.archive[50],
    tint: AppColors.gold[500],
    icon: AppColors.archive[500],
    tabIconDefault: AppColors.archive[500],
    tabIconSelected: AppColors.gold[500],
  },
  dark: {
    text: AppColors.archive[50],
    background: AppColors.archive[900],
    tint: AppColors.gold[400],
    icon: AppColors.archive[300],
    tabIconDefault: AppColors.archive[300],
    tabIconSelected: AppColors.gold[400],
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
