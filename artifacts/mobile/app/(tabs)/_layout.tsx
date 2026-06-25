import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PURPLE = "#7B5EA7";
const INACTIVE = "#B0A3C4";
const TAB_H = 72;

type TabItem = {
  name: string;
  title: string;
  sfSymbol: string;
  featherIcon: string;
};

const TABS: TabItem[] = [
  { name: "index",   title: "Harita",    sfSymbol: "map",      featherIcon: "map-pin" },
  { name: "animals", title: "Hayvanlar", sfSymbol: "pawprint", featherIcon: "list"    },
  { name: "pets",    title: "Evcil",     sfSymbol: "heart",    featherIcon: "heart"   },
  { name: "profile", title: "Profil",    sfSymbol: "person",   featherIcon: "user"    },
];

function TabIcon({
  focused,
  sfSymbol,
  featherIcon,
  title,
}: {
  focused: boolean;
  sfSymbol: string;
  featherIcon: string;
  title: string;
}) {
  const isIOS = Platform.OS === "ios";
  const iconColor = focused ? PURPLE : INACTIVE;

  return (
    <View style={styles.tabItem}>
      {focused && <View style={styles.activeDot} />}
      <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
        {isIOS ? (
          <SymbolView name={sfSymbol as any} tintColor={iconColor} size={22} />
        ) : (
          <Feather name={featherIcon as any} size={21} color={iconColor} />
        )}
      </View>
      <Text style={[styles.label, { color: iconColor }]} numberOfLines={1}>{title}</Text>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const pillBottom = insets.bottom + (isWeb ? 12 : 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PURPLE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          position: "absolute",
          bottom: pillBottom,
          left: 18,
          right: 18,
          height: TAB_H,
          borderRadius: 36,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: "#2D1B4E",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.14,
          shadowRadius: 24,
          overflow: "hidden",
        },
        tabBarBackground: () => <View style={styles.tabBg} />,
        tabBarItemStyle: {
          paddingTop: 0,
          paddingBottom: 0,
          height: TAB_H,
        },
        tabBarLabelStyle: { display: "none" },
        tabBarShowLabel: false,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                sfSymbol={tab.sfSymbol}
                featherIcon={tab.featherIcon}
                title={tab.title}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.10)",
  },
  tabItem: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: TAB_H,
    paddingTop: 8,
    paddingBottom: 8,
  },
  activeDot: {
    position: "absolute",
    top: 6,
    width: 22,
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
  },
  iconWrapActive: {
    backgroundColor: `${PURPLE}15`,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    includeFontPadding: false,
    lineHeight: 13,
  },
});
