import { Tabs, usePathname, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  { name: "index",   path: "/",        title: "Harita",    sfSymbol: "map",         featherIcon: "map-pin" },
  { name: "feed",    path: "/feed",    title: "Akış",      sfSymbol: "house",       featherIcon: "home"    },
  { name: "animals", path: "/animals", title: "Hayvanlar", sfSymbol: "pawprint",    featherIcon: "list"    },
  { name: "pets",    path: "/pets",    title: "Evcil",     sfSymbol: "heart",       featherIcon: "heart"   },
  { name: "profile", path: "/profile", title: "Profil",    sfSymbol: "person",      featherIcon: "user"    },
];

function CustomTabBar() {
  const insets   = useSafeAreaInsets();
  const isWeb    = Platform.OS === "web";
  const isIOS    = Platform.OS === "ios";
  const pathname = usePathname();
  const router   = useRouter();
  const bottom   = insets.bottom + (isWeb ? 12 : 10);

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
                {isIOS ? (
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
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.10)",
    shadowColor: "#2D1B4E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 12,
    overflow: "hidden",
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingTop: 8,
    paddingBottom: 8,
  },
  activeDot: {
    position: "absolute",
    top: 6,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: PURPLE,
  },
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  iconWrapActive: { backgroundColor: `${PURPLE}15` },
  label: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    includeFontPadding: false,
    lineHeight: 12,
    textAlign: "center",
  },
});
