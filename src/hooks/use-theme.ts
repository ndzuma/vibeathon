import { Brand, getThemeColors, type ThemeColors } from '@/constants/theme';
import { useThemeContext } from '@/contexts/theme-context';

export function useTheme(): ThemeColors & { brand: typeof Brand; isDark: boolean } {
  const { isDark } = useThemeContext();
  const colors = getThemeColors(isDark);
  return { ...colors, brand: Brand, isDark };
}
