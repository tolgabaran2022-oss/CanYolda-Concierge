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
      {/* Thumbnail */}
      <View style={styles.imageWrap}>
        {animal.image ? (
          <Image
            source={{ uri: animal.image }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View
            style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: STATUS_COLORS[animal.status] },
              ]}
            />
            <Ionicons name="paw" size={21} color={colors.mutedForeground} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Status badge + time on same row */}
        <View style={styles.topRow}>
          <StatusBadge status={animal.status} size="sm" />
          <Text style={[styles.time, { color: colors.mutedForeground }]}>
            {formatTimeAgo(animal.timestamp)}
          </Text>
        </View>

        {/* Notes — up to 2 lines with comfortable line-height */}
        {animal.notes ? (
          <Text
            style={[styles.notes, { color: colors.foreground }]}
            numberOfLines={2}
          >
            {animal.notes}
          </Text>
        ) : (
          <Text style={[styles.noNotes, { color: colors.mutedForeground }]}>
            Not eklenmemiş
          </Text>
        )}

        {/* Footer: username + stats */}
        <View style={styles.footer}>
          <Text
            style={[styles.userName, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {animal.userName}
          </Text>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Ionicons
                name="restaurant-outline"
                size={10}
                color={colors.secondary}
              />
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                {animal.fedByUsers.length}
              </Text>
            </View>
            {animal.needsHelpByUsers.length > 0 && (
              <View style={styles.stat}>
                <Ionicons name="alert-circle-outline" size={10} color="#EF4444" />
                <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                  {animal.needsHelpByUsers.length}
                </Text>
              </View>
            )}
            {animal.comments.length > 0 && (
              <View style={styles.stat}>
                <Ionicons
                  name="chatbubble-outline"
                  size={10}
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

      {/* Chevron */}
      <View style={styles.chevronWrap}>
        <Ionicons name="chevron-forward" size={11} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 14,
    marginVertical: 3,
    overflow: "hidden",
    minHeight: 35,
  },
  imageWrap: {
    width: 50,
    alignSelf: "stretch",
  },
  image: {
    width: 50,
    height: "100%",
  },
  imagePlaceholder: {
    width: 50,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    position: "absolute",
    top: 5,
    left: 5,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "white",
  },
  content: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 3,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  time: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  notes: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },
  noNotes: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userName: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    flex: 1,
    marginRight: 4,
  },
  stats: {
    flexDirection: "row",
    gap: 5,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  statText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  chevronWrap: {
    paddingRight: 8,
    paddingLeft: 3,
  },
});
