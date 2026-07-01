import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { AnimalStatus } from "@/contexts/AnimalsContext";

const STATUS_CONFIG: Record<
  AnimalStatus,
  { label: string; bg: string; color: string }
> = {
  hungry: { label: "Aç", bg: "#FEF3C7", color: "#92400E" },
  injured: { label: "Yaralı", bg: "#FEE2E2", color: "#991B1B" },
  healthy: { label: "Sağlıklı", bg: "#D1FAE5", color: "#065F46" },
  unknown: { label: "Bilinmiyor", bg: "#F3F4F6", color: "#374151" },
};

export const STATUS_COLORS: Record<AnimalStatus, string> = {
  hungry: "#F59E0B",
  injured: "#EF4444",
  healthy: "#10B981",
  unknown: "#9CA3AF",
};

interface Props {
  status: AnimalStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: Props) {
  const config = STATUS_CONFIG[status];
  const isSmall = size === "sm";
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        isSmall && styles.badgeSm,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: config.color },
          isSmall && styles.textSm,
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: "flex-start",
    minHeight: 26,
    justifyContent: "center",
  },
  badgeSm: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    minHeight: 22,
  },
  text: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.1,
  },
  textSm: {
    fontSize: 11.5,
    fontFamily: "Inter_600SemiBold",
  },
});
