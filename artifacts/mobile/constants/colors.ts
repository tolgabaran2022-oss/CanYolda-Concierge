export type ThemeColors = {
  bg:           string;
  bgSecondary:  string;
  card:         string;
  cardElevated: string;
  text:         string;
  textMuted:    string;
  textFaint:    string;
  border:       string;
  borderStrong: string;
  purple:       string;
  purpleDark:   string;
  purpleLight:  string;
  purpleFaint:  string;
  input:        string;
  inputBorder:  string;
  placeholder:  string;
  tabBar:       string;
  tabBarBorder: string;
  headerGrad:   [string, string];
  divider:      string;
  overlay:      string;
  isDark:       boolean;
};

export const lightColors: ThemeColors = {
  bg:           "#F9F8FF",
  bgSecondary:  "#F3EEFF",
  card:         "#FFFFFF",
  cardElevated: "#FAFAFE",
  text:         "#1A0A3C",
  textMuted:    "#888888",
  textFaint:    "#B0A3C4",
  border:       "rgba(123,94,167,0.10)",
  borderStrong: "rgba(123,94,167,0.18)",
  purple:       "#7B5EA7",
  purpleDark:   "#3D2070",
  purpleLight:  "#A988D4",
  purpleFaint:  "rgba(123,94,167,0.10)",
  input:        "#FAFAFE",
  inputBorder:  "rgba(123,94,167,0.22)",
  placeholder:  "#B0A8C8",
  tabBar:       "rgba(255,255,255,0.97)",
  tabBarBorder: "rgba(123,94,167,0.08)",
  headerGrad:   ["#F3EEFF", "#EDE5FF"],
  divider:      "rgba(123,94,167,0.10)",
  overlay:      "rgba(0,0,0,0.45)",
  isDark:       false,
};

export const darkColors: ThemeColors = {
  bg:           "#12121C",
  bgSecondary:  "#1A1A2A",
  card:         "#1E1E2E",
  cardElevated: "#252538",
  text:         "#EEEAFF",
  textMuted:    "#9B94B8",
  textFaint:    "#6B6488",
  border:       "rgba(123,94,167,0.22)",
  borderStrong: "rgba(155,127,212,0.32)",
  purple:       "#9B7FD4",
  purpleDark:   "#7B5EA7",
  purpleLight:  "#C4A8F0",
  purpleFaint:  "rgba(155,127,212,0.15)",
  input:        "#1A1A2A",
  inputBorder:  "rgba(155,127,212,0.28)",
  placeholder:  "#6B6488",
  tabBar:       "rgba(18,18,28,0.97)",
  tabBarBorder: "rgba(123,94,167,0.18)",
  headerGrad:   ["#1E1A30", "#18152A"],
  divider:      "rgba(123,94,167,0.18)",
  overlay:      "rgba(0,0,0,0.65)",
  isDark:       true,
};

const colors = {
  light: lightColors,
  dark:  darkColors,
  radius: 16,
};

export default colors;
