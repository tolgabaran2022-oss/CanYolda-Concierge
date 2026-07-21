import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { AnimalStatus } from "@/contexts/AnimalsContext";

const STATUS_COLORS_MAP: Record<AnimalStatus, { bg: string; color: string }> = {
  hungry:  { bg: "#FEF3C7", color: "#92400E" },
  injured: { bg: "#FEE2E2", color: "#991B1B" },
  healthy: { bg: "#D1FAE5", color: "#065F46" },
  unknown: { bg: "#F3F4F6", color: "#374151" },
};

export const STATUS_COLORS: Record<AnimalStatus, string> = {
  hungry:  "#F59E0B",
  injured: "#EF4444",
  healthy: "#10B981",
  unknown: "#9CA3AF",
};

interface Props {
  status: AnimalStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: Props) {
  const { t } = useTranslation();
  const cfg = STATUS_COLORS_MAP[status] ?? STATUS_COLORS_MAP.unknown;
  const isSmall = size === "sm";
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: cfg.bg },
        isSmall && styles.badgeSm,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: cfg.color },
          isSmall && styles.textSm,
        ]}
      >
        {t(`animals.status.${status}`, { defaultValue: status })}
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
