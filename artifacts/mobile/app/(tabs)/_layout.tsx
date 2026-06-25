import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const PURPLE = "#7B5EA7";

function ClassicTabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const pillBottom = insets.bottom + (isWeb ? 12 : 10);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: PURPLE,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: pillBottom,
          left: 18,
          right: 18,
          height: 64,
          borderRadius: 32,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: "#2D1B4E",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.14,
          shadowRadius: 24,
          overflow: "hidden",
        },
        tabBarBackground: () => (
          <View style={styles.tabBg} />
        ),
        tabBarItemStyle: {
          paddingTop: 8,
          paddingBottom: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_500Medium",
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Harita",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="map" tintColor={color} size={22} />
            ) : (
              <Feather name="map-pin" size={21} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="animals"
        options={{
          title: "Hayvanlar",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="pawprint" tintColor={color} size={22} />
            ) : (
              <Feather name="list" size={21} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="pets"
        options={{
          title: "Evcil",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="heart" tintColor={color} size={22} />
            ) : (
              <Feather name="heart" size={21} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={22} />
            ) : (
              <Feather name="user" size={21} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.10)",
  },
});

export default function TabLayout() {
  return <ClassicTabLayout />;
}
