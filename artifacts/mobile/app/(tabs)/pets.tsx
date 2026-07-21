import { EvcilimTab } from "@/components/EvcilimTab";
import { useTheme } from "@/hooks/useTheme";
import * as Haptics from "expo-haptics";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DARK  = "#4B267D";
const WHITE = "#FFFFFF";
const TAB_H = 68;

// ── Evcilim header ────────────────────────────────────────────────────────────
function EvcilimHeader({ topPad }: { topPad: number }) {
  const T = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[eh.wrap, { paddingTop: topPad + 6, backgroundColor: T.bg }]}>
      <View style={eh.titleRow}>
        <Text style={[eh.title, { color: DARK }]}>{t("pets.title")}</Text>
        <View style={eh.underline} />
      </View>
    </View>
  );
}
const eh = StyleSheet.create({
  wrap:      { paddingHorizontal: 20, paddingBottom: 12, backgroundColor: WHITE },
  titleRow:  { alignItems: "flex-start" },
  title:     { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.3 },
  underline: { height: 3, backgroundColor: "#7C4DCC", borderRadius: 2, marginTop: 4, width: "100%" },
});

const divider = StyleSheet.create({
  line: { height: 1, backgroundColor: "rgba(124,77,204,0.12)" },
});

// ── Main Evcilim Screen ───────────────────────────────────────────────────────
export default function PetsScreen() {
  const insets        = useSafeAreaInsets();
  const { width: SW } = useWindowDimensions();

  const topPad = Platform.OS === "web" ? (SW < 1024 ? 54 : 16) : insets.top;
  const botPad = Platform.OS === "web" ? (SW < 1024 ? 100 : 24) : (insets.bottom + TAB_H);

  return (
    <View style={s.root}>
      <EvcilimHeader topPad={topPad} />
      <View style={divider.line} />
      <EvcilimTab botPad={botPad} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F4FF" },
});
