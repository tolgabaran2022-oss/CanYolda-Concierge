import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBadge, STATUS_COLORS } from "@/components/StatusBadge";
import type { StrayAnimal } from "@/contexts/AnimalsContext";
import { useColors } from "@/hooks/useColors";
import { formatTimeAgo } from "@/utils/formatters";

interface Props {
  animal: StrayAnimal;
}

export function AnimalCard({ animal }: Props) {
  const colors = useColors();
  const router = useRouter();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
      onPress={() => router.push(`/animal/${animal.id}` as const)}
    >
      <View style={styles.imageWrap}>
        {animal.image ? (
          <Image
            source={{ uri: animal.image }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.imagePlaceholder,
              { backgroundColor: colors.muted },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: STATUS_COLORS[animal.status] },
              ]}
            />
            <Ionicons name="paw" size={28} color={colors.mutedForeground} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <StatusBadge status={animal.status} size="sm" />
          <Text style={[styles.time, { color: colors.mutedForeground }]}>
            {formatTimeAgo(animal.timestamp)}
          </Text>
        </View>

        {animal.notes ? (
          <Text
            style={[styles.notes, { color: colors.foreground }]}
            numberOfLines={2}
          >
            {animal.notes}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Text style={[styles.userName, { color: colors.mutedForeground }]}>
            {animal.userName}
          </Text>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Ionicons
                name="restaurant-outline"
                size={13}
                color={colors.secondary}
              />
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                {animal.fedByUsers.length}
              </Text>
            </View>
            {animal.needsHelpByUsers.length > 0 && (
              <View style={styles.stat}>
                <Ionicons name="alert-circle-outline" size={13} color="#EF4444" />
                <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                  {animal.needsHelpByUsers.length}
                </Text>
              </View>
            )}
            {animal.comments.length > 0 && (
              <View style={styles.stat}>
                <Ionicons
                  name="chatbubble-outline"
                  size={13}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                  {animal.comments.length}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: "hidden",
  },
  imageWrap: {
    width: 96,
    height: 96,
  },
  image: {
    width: 96,
    height: 96,
  },
  imagePlaceholder: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "white",
  },
  content: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  notes: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  userName: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  stats: {
    flexDirection: "row",
    gap: 8,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  statText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
