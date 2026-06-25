import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const PURPLE = "#7B5EA7";
const PURPLE_DARK = "#3D2070";
const BLOB = "rgba(180,155,220,0.22)";
const BLOB2 = "rgba(160,130,210,0.16)";

interface Props {
  topPad: number;
}

export function AppHeader({ topPad }: Props) {
  return (
    <>
      {/* Decorative blobs — absolute over the whole screen */}
      <View style={[styles.blobTL, { top: -50 + topPad * 0.3 }]} />
      <View style={[styles.blobTR, { top: -30 + topPad * 0.3 }]} />

      {/* Logo section */}
      <View style={[styles.logoSection, { paddingTop: topPad + 6 }]}>
        <View style={styles.logoRow}>
          <Ionicons name="heart" size={16} color={PURPLE} />
          <Text style={styles.appName}>canyoldaşı</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  blobTL: {
    position: "absolute",
    left: -55,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: BLOB,
    transform: [{ scaleX: 1.3 }],
    zIndex: 0,
  },
  blobTR: {
    position: "absolute",
    right: -45,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: BLOB2,
    transform: [{ scaleY: 1.5 }],
    zIndex: 0,
  },
  logoSection: {
    alignItems: "center",
    paddingBottom: 8,
    zIndex: 1,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  appName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
    letterSpacing: -0.3,
  },
});
