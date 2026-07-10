import { Tabs, usePathname, useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

let SymbolView: any = null;
if (Platform.OS === "ios") {
  try { SymbolView = require("expo-symbols").SymbolView; } catch { SymbolView = null; }
}

const PURPLE     = "#7B5EA7";
const INACTIVE   = "#B0A3C4";
const TAB_H      = 68;
const BP_DESKTOP = 1024;

type TabItem = { name: string; path: string; title: string; sfSymbol: string; featherIcon: string };

const TABS: TabItem[] = [
  { name: "index",   path: "/",        title: "Harita",    sfSymbol: "map",           featherIcon: "map-pin" },
  { name: "feed",    path: "/feed",    title: "Akış",      sfSymbol: "house",         featherIcon: "home"    },
  { name: "animals", path: "/animals", title: "Hayvanlar", sfSymbol: "pawprint",      featherIcon: "list"    },
  { name: "pets",    path: "/pets",    title: "Evcil",     sfSymbol: "heart",         featherIcon: "heart"   },
  { name: "account", path: "/account", title: "Hesap",     sfSymbol: "person.circle", featherIcon: "user"    },
];

/* ── Desktop sidebar (web ≥ 1024 px) ────────────────────────── */
function DesktopSidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  return (
    <View style={DS.root}>
      <View style={DS.logoRow}>
        <Ionicons name="heart" size={15} color={PURPLE} />
        <Text style={DS.logoText}>canyoldaşı</Text>
      </View>

      {TABS.map((tab) => {
        const active = tab.path === "/"
          ? pathname === "/" || pathname === ""
          : pathname.startsWith(tab.path);
        const color = active ? PURPLE : INACTIVE;

        return (
          <Pressable
            key={tab.name}
            style={[DS.item, active && DS.itemActive]}
            onPress={() => router.navigate(tab.path as any)}
            accessibilityRole="link"
            accessibilityLabel={tab.title}
          >
            <View style={[DS.iconWrap, active && DS.iconWrapActive]}>
              <Feather name={tab.featherIcon as any} size={20} color={color} />
            </View>
            <Text style={[DS.label, { color }]}>{tab.title}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── Bottom tab bar (native + mobile web < 1024 px) ─────────── */
function CustomTabBar() {
  const { width } = useWindowDimensions();
  const insets    = useSafeAreaInsets();
  const isWeb     = Platform.OS === "web";
  const isIOS     = Platform.OS === "ios";
  const pathname  = usePathname();
  const router    = useRouter();

  if (isWeb && width >= BP_DESKTOP) return null;

  const barOuterStyle = isWeb
    ? { position: "fixed" as const, left: 14, right: 14, bottom: 8, zIndex: 999 }
    : [styles.barOuter, { bottom: insets.bottom + 4 }];

  return (
    <View style={barOuterStyle as any}>
      <View style={styles.barInner}>
        {TABS.map((tab) => {
          const active = tab.path === "/"
            ? pathname === "/" || pathname === ""
            : pathname.startsWith(tab.path);
          const color = active ? PURPLE : INACTIVE;

          return (
            <Pressable
              key={tab.name}
              style={styles.tabBtn}
              android_ripple={{ color: `${PURPLE}20`, borderless: true, radius: 32 }}
              accessibilityLabel={tab.title}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => router.navigate(tab.path as any)}
            >
              {active && <View style={styles.activeDot} />}
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                {isIOS && SymbolView ? (
                  <SymbolView name={tab.sfSymbol as any} tintColor={color} size={20} />
                ) : (
                  <Feather name={tab.featherIcon as any} size={20} color={color} />
                )}
              </View>
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {tab.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ── Root layout ─────────────────────────────────────────────── */
export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isWeb     = Platform.OS === "web";
  const isDesktop = isWeb && width >= BP_DESKTOP;

  const screens = (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
      <Tabs.Screen name="profile" options={{ href: null, headerShown: false }} />
    </Tabs>
  );

  if (isWeb) {
    return (
      <>
        <View style={WL.root}>
          {isDesktop && <DesktopSidebar />}
          <View style={WL.mainArea}>
            <View style={[WL.contentWrap, isDesktop && WL.contentWrapDesktop]}>
              {screens}
            </View>
          </View>
        </View>
        <CustomTabBar />
      </>
    );
  }

  return (
    <>
      {screens}
      <CustomTabBar />
    </>
  );
}

/* ── Styles ──────────────────────────────────────────────────── */

const WL = StyleSheet.create({
  root:               { flex: 1, flexDirection: "row", backgroundColor: "#F9F8FF" },
  mainArea:           { flex: 1, alignItems: "center" },
  contentWrap:        { flex: 1, width: "100%" },
  contentWrapDesktop: {
    maxWidth: 680,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(123,94,167,0.08)",
  },
});

const DS = StyleSheet.create({
  root: {
    width: 220,
    paddingTop: 28,
    paddingHorizontal: 12,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "rgba(123,94,167,0.10)",
  },
  logoRow:  { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10, marginBottom: 20 },
  logoText: { fontSize: 19, fontFamily: "Inter_700Bold", color: "#3D2080", letterSpacing: -0.5 },

  item:       { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 11, marginBottom: 2 },
  itemActive: { backgroundColor: `${PURPLE}10` },

  iconWrap:       { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  iconWrapActive: { backgroundColor: `${PURPLE}15` },

  label: { fontSize: 14.5, fontFamily: "Inter_600SemiBold" },
});

const styles = StyleSheet.create({
  barOuter: { position: "absolute", left: 14, right: 14 },
  barInner: {
    flexDirection: "row",
    height: TAB_H,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.08)",
    shadowColor: "#2D1B4E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 28,
    elevation: 14,
    overflow: "hidden",
    paddingLeft: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 6,
    paddingBottom: 6,
    minHeight: 44,
  },
  activeDot: {
    position: "absolute",
    top: 8,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: PURPLE,
  },
  iconWrap: {
    width: 40,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    marginLeft: -4,
    marginRight: -4,
    paddingLeft: 3,
    paddingRight: 3,
  },
  iconWrapActive: { backgroundColor: `${PURPLE}12` },
  label: {
    fontSize: 10.5,
    fontFamily: "Inter_600SemiBold",
    includeFontPadding: false,
    lineHeight: 13,
    textAlign: "center",
  },
});
