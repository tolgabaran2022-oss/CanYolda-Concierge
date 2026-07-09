import { Tabs, usePathname, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

let SymbolView: any = null;
if (Platform.OS === "ios") {
  try {
    SymbolView = require("expo-symbols").SymbolView;
  } catch {
    SymbolView = null;
  }
}

const PURPLE   = "#7B5EA7";
const INACTIVE = "#B0A3C4";
const TAB_H    = 68;

type TabItem = {
  name: string;
  path: string;
  title: string;
  sfSymbol: string;
  featherIcon: string;
};

const TABS: TabItem[] = [
  { name: "index",   path: "/",         title: "Harita",    sfSymbol: "map",          featherIcon: "map-pin" },
  { name: "feed",    path: "/feed",     title: "Akış",      sfSymbol: "house",        featherIcon: "home"    },
  { name: "animals", path: "/animals",  title: "Hayvanlar", sfSymbol: "pawprint",     featherIcon: "list"    },
  { name: "pets",    path: "/pets",     title: "Evcil",     sfSymbol: "heart",        featherIcon: "heart"   },
  { name: "account", path: "/account",  title: "Hesap",     sfSymbol: "person.circle", featherIcon: "user"   },
];

function CustomTabBar() {
  const insets   = useSafeAreaInsets();
  const isWeb    = Platform.OS === "web";
  const isIOS    = Platform.OS === "ios";
  const pathname = usePathname();
  const router   = useRouter();
  const bottom   = insets.bottom + (isWeb ? 8 : 4);

  return (
    <View style={[styles.barOuter, { bottom }]}>
      <View style={styles.barInner}>
        {TABS.map((tab) => {
          const active =
            tab.path === "/"
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

export default function TabLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
      >
        {TABS.map((tab) => (
          <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
        ))}
        {/* Profile is a tab-group screen navigated to via push, not shown in tab bar */}
        <Tabs.Screen name="profile" options={{ href: null, headerShown: false }} />
      </Tabs>
      <CustomTabBar />
    </>
  );
}

const styles = StyleSheet.create({
  barOuter:  { position: "absolute", left: 14, right: 14 },
  barInner:  {
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
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    paddingLeft: 4,
    paddingBottom: 0,
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
    gap: 2,
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
