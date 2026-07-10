import { darkColors, lightColors } from "@/constants/colors";
import { useThemeContext } from "@/contexts/ThemeContext";

/**
 * Returns design tokens for the current color scheme.
 * Includes both the new ThemeColors shape and legacy aliases
 * for backward compatibility (background, foreground, primary, …).
 */
export function useColors() {
  const { resolvedScheme } = useThemeContext();
  const p = resolvedScheme === "dark" ? darkColors : lightColors;
  return {
    ...p,
    radius: 16,
    /* Legacy aliases used by older screens */
    background:             p.bg,
    foreground:             p.text,
    primary:                p.purple,
    primaryForeground:      "#FFFFFF",
    secondary:              "#6FA870",
    secondaryForeground:    "#FFFFFF",
    muted:                  p.purpleFaint,
    mutedForeground:        p.textMuted,
    accent:                 p.purpleLight,
    accentForeground:       "#FFFFFF",
    destructive:            "#D94040",
    destructiveForeground:  "#FFFFFF",
    cardForeground:         p.text,
    tint:                   p.purple,
  };
}
