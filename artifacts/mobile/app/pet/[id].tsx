import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { usePets } from "@/contexts/PetsContext";
import { useColors } from "@/hooks/useColors";
import { formatTimeAgo } from "@/utils/formatters";

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getPet, deletePet } = usePets();
  const { user } = useAuth();

  const pet = getPet(id ?? "");
  const isOwner = pet?.userId === user?.id;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!pet) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
          Evcil hayvan bulunamadı.
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      "Profili Sil",
      `${pet.name} profilini silmek istediğine emin misin?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            await deletePet(pet.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: bottomPad + 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      {pet.image ? (
        <Image source={{ uri: pet.image }} style={styles.heroImage} contentFit="cover" />
      ) : (
        <View style={[styles.heroPlaceholder, { backgroundColor: colors.muted }]}>
          <Ionicons name="paw" size={64} color={colors.primary} />
        </View>
      )}

      <View style={styles.body}>
        {/* Name + type */}
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.petName, { color: colors.foreground }]}>{pet.name}</Text>
            <Text style={[styles.petMeta, { color: colors.mutedForeground }]}>
              {pet.type}
              {pet.breed ? ` · ${pet.breed}` : ""}
              {pet.age ? ` · ${pet.age}` : ""}
            </Text>
          </View>
          {pet.vaccinationInfo ? (
            <View style={[styles.vacBadge, { backgroundColor: colors.secondary + "20" }]}>
              <Ionicons name="shield-checkmark" size={14} color={colors.secondary} />
              <Text style={[styles.vacText, { color: colors.secondary }]}>Aşılı</Text>
            </View>
          ) : null}
        </View>

        {/* Added date */}
        <Text style={[styles.addedDate, { color: colors.mutedForeground }]}>
          Eklenme: {formatTimeAgo(pet.createdAt)}
        </Text>

        {/* Info sections */}
        {[
          { label: "Aşı Bilgisi", value: pet.vaccinationInfo, icon: "shield-checkmark-outline" as const },
          { label: "Beslenme Notları", value: pet.feedingNotes, icon: "restaurant-outline" as const },
        ].map((section) =>
          section.value ? (
            <View
              key={section.label}
              style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.infoHeader}>
                <Ionicons name={section.icon} size={18} color={colors.primary} />
                <Text style={[styles.infoLabel, { color: colors.foreground }]}>
                  {section.label}
                </Text>
              </View>
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                {section.value}
              </Text>
            </View>
          ) : null
        )}

        {/* Owner actions */}
        {isOwner && (
          <Pressable
            style={({ pressed }) => [
              styles.deleteBtn,
              { borderColor: colors.destructive, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>
              Profili Sil
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  backLink: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  heroImage: { width: "100%", height: 280 },
  heroPlaceholder: {
    width: "100%",
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: 16, gap: 16 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  petName: { fontSize: 26, fontFamily: "Inter_700Bold" },
  petMeta: { fontSize: 15, fontFamily: "Inter_400Regular", marginTop: 2 },
  vacBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  vacText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  addedDate: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  infoHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  infoText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    marginTop: 8,
  },
  deleteBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
