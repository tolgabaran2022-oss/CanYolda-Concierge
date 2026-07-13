import { Icon } from "@/components/Icon";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AdoptionListing } from "@/contexts/AdoptionContext";
import { useBoost } from "@/contexts/BoostContext";
import { useColors } from "@/hooks/useColors";
import { formatTimeAgo } from "@/utils/formatters";

interface Props {
  listing: AdoptionListing;
}

export function AdoptionCard({ listing }: Props) {
  const colors = useColors();
  const router = useRouter();
  const { boostStatuses } = useBoost();
  const boost = boostStatuses[listing.id];
  const isFeatured = boost?.isFeatured ?? false;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isFeatured ? "#E07A35" : colors.border,
          borderWidth: isFeatured ? 1.5 : 1,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
      onPress={() => router.push(`/adoption/${listing.id}` as const)}
    >
      {isFeatured && (
        <View style={styles.featuredBanner}>
          <Icon name="star" size={11} color="white" />
          <Text style={styles.featuredText}>Öne Çıkan</Text>
        </View>
      )}

      {listing.photo ? (
        <Image
          source={{ uri: listing.photo }}
          style={styles.image}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}>
          <Icon name="heart" size={32} color={colors.primary} />
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {listing.petName}
          </Text>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: colors.secondary + "22" },
            ]}
          >
            <Text style={[styles.typeText, { color: colors.secondary }]}>
              {listing.petType}
            </Text>
          </View>
        </View>
        {listing.petAge ? (
          <Text style={[styles.age, { color: colors.mutedForeground }]}>
            {listing.petAge}
          </Text>
        ) : null}
        <Text
          style={[styles.description, { color: colors.mutedForeground }]}
          numberOfLines={2}
        >
          {listing.description}
        </Text>
        <View style={styles.footer}>
          <View style={styles.locationRow}>
            <Icon
              name="location-outline"
              size={12}
              color={colors.mutedForeground}
            />
            <Text style={[styles.location, { color: colors.mutedForeground }]}>
              {listing.location}
            </Text>
          </View>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>
            {formatTimeAgo(listing.createdAt)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: "hidden",
  },
  featuredBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E07A35",
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  featuredText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "white",
    letterSpacing: 0.3,
  },
  image: {
    width: "100%",
    height: 160,
  },
  imagePlaceholder: {
    width: "100%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 14,
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  typeBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  age: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  location: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
