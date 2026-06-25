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
            <Ionicons name="camera-outline" size={22} color={colors.mutedForeground} />
            <Text style={[styles.photoHint, { color: colors.mutedForeground }]}>
              Fotoğraf{"\n"}ekle
            </Text>
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

      {/* Chevron */}
      <View style={styles.chevronWrap}>
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 2,
    overflow: "hidden",
  },
  imageWrap: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: "hidden",
    marginLeft: 12,
    flexShrink: 0,
  },
  image: {
    width: 64,
    height: 64,
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  photoHint: {
    fontSize: 8,
    textAlign: "center",
    lineHeight: 11,
    fontFamily: "Inter_400Regular",
  },
  statusDot: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "white",
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 2,
    justifyContent: "flex-start",
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
  },
  noNotes: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userName: {
    fontSize: 11.5,
    fontFamily: "Inter_500Medium",
    flex: 1,
    marginRight: 6,
  },
  stats: {
    flexDirection: "row",
    gap: 8,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  chevronWrap: {
    paddingRight: 12,
    paddingLeft: 4,
  },
});
