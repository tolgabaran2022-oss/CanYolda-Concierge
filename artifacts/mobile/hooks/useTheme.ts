import { darkColors, lightColors, type ThemeColors } from "@/constants/colors";
import { useThemeContext } from "@/contexts/ThemeContext";

export type { ThemeColors };

export function useTheme(): ThemeColors {
  const { resolvedScheme } = useThemeContext();
  return resolvedScheme === "dark" ? darkColors : lightColors;
}
