import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "map", selected: "map.fill" }} />
        <Label>Harita</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="animals">
        <Icon sf={{ default: "pawprint", selected: "pawprint.fill" }} />
        <Label>Hayvanlar</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pets">
        <Icon sf={{ default: "heart", selected: "heart.fill" }} />
        <Label>Evcil</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const pillBottom = insets.bottom + (isWeb ? 12 : 10);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
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
          shadowColor: "#2D1B0E",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.14,
          shadowRadius: 28,
          overflow: "hidden",
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, styles.glassContainer]}>
            {isIOS ? (
              <BlurView
                intensity={90}
                tint={isDark ? "dark" : "systemChromeMaterial"}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: isDark
                      ? "rgba(30,22,14,0.88)"
                      : "rgba(253,250,245,0.90)",
                  },
                ]}
              />
            )}
            {/* Subtle top highlight line (liquid glass shimmer) */}
            <View style={styles.topHighlight} />
          </View>
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
          tabBarIcon: ({ color, size }) =>
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
  glassContainer: {
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 0.75,
    borderColor: "rgba(255,255,255,0.55)",
  },
  topHighlight: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
});

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
