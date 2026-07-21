import { Icon } from "@/components/Icon";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Pet } from "@/contexts/PetsContext";
import { useColors } from "@/hooks/useColors";

const PET_TYPE_ICONS: Record<string, string> = {
  Kedi: "paw",
  Köpek: "paw",
  Kuş: "leaf",
  Tavşan: "leaf",
};

interface Props {
  pet: Pet;
  isOwner?: boolean;
}

export function PetCard({ pet, isOwner }: Props) {
  const { t } = useTranslation();
  const colors = useColors();
  const router = useRouter();
  const icon = PET_TYPE_ICONS[pet.type] ?? "paw";

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
      onPress={() => router.push(`/pet/${pet.id}` as const)}
    >
      <View style={styles.imageWrap}>
        {pet.image ? (
          <Image
            source={{ uri: pet.image }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View
            style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}
          >
            <Icon name={icon} size={30} color={colors.primary} />
          </View>
        )}
      </View>
      <Text
        style={[styles.name, { color: colors.foreground }]}
        numberOfLines={1}
      >
        {pet.name}
      </Text>
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        {pet.type}
        {pet.age ? ` • ${pet.age}` : ""}
      </Text>
      {pet.vaccinationInfo ? (
        <View style={styles.vaccineBadge}>
          <Icon name="shield-checkmark" size={10} color={colors.secondary} />
          <Text style={[styles.vaccineText, { color: colors.secondary }]}>
            {t("petCard.vaccinated")}
          </Text>
        </View>
      ) : null}
      {isOwner && (
        <View
          style={[styles.ownerBadge, { backgroundColor: colors.primary + "20" }]}
        >
          <Text style={[styles.ownerText, { color: colors.primary }]}>
            {t("petCard.mine")}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "47%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  imageWrap: {
    width: "100%",
    aspectRatio: 1,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
    marginHorizontal: 10,
  },
  meta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginHorizontal: 10,
    marginBottom: 4,
  },
  vaccineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginHorizontal: 10,
    marginBottom: 8,
  },
  vaccineText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  ownerBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ownerText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
