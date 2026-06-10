import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAdoption } from "@/contexts/AdoptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { formatTimeAgo } from "@/utils/formatters";

export default function AdoptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getListing, deleteListing } = useAdoption();
  const { user } = useAuth();

  const listing = getListing(id ?? "");
  const isOwner = listing?.userId === user?.id;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!listing) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
          İlan bulunamadı.
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  const handleContact = () => {
    const info = listing.contactInfo;
    if (info.includes("@")) {
      Linking.openURL(`mailto:${info}`).catch(() =>
        Alert.alert("İletişim", `İletişim bilgisi: ${info}`)
      );
    } else {
      Linking.openURL(`tel:${info.replace(/\s/g, "")}`).catch(() =>
        Alert.alert("İletişim", `İletişim bilgisi: ${info}`)
      );
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleDelete = () => {
    Alert.alert("İlanı Kaldır", "Bu ilanı kaldırmak istediğine emin misin?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Kaldır",
        style: "destructive",
        onPress: async () => {
          await deleteListing(listing.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: bottomPad + 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Photo */}
      {listing.photo ? (
        <Image source={{ uri: listing.photo }} style={styles.heroImage} contentFit="cover" />
      ) : (
        <View style={[styles.heroPlaceholder, { backgroundColor: colors.muted }]}>
          <Ionicons name="heart" size={64} color={colors.primary} />
        </View>
      )}

      <View style={styles.body}>
        {/* Pet info */}
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.petName, { color: colors.foreground }]}>{listing.petName}</Text>
            <Text style={[styles.petMeta, { color: colors.mutedForeground }]}>
              {listing.petType}
              {listing.petAge ? ` · ${listing.petAge}` : ""}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.secondary + "22" }]}>
            <Text style={[styles.badgeText, { color: colors.secondary }]}>
              Sahip Arıyor
            </Text>
          </View>
        </View>

        {/* Posted by + time */}
        <View style={styles.postedRow}>
          <View style={[styles.avatarSmall, { backgroundColor: colors.secondary }]}>
            <Text style={styles.avatarText}>
              {listing.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.postedBy, { color: colors.mutedForeground }]}>
            {listing.userName} · {formatTimeAgo(listing.createdAt)}
          </Text>
        </View>

        {/* Location */}
        <View style={[styles.locationRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="location-outline" size={18} color={colors.primary} />
          <Text style={[styles.locationText, { color: colors.foreground }]}>
            {listing.location}
          </Text>
        </View>

        {/* Description */}
        <View style={[styles.descCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.descLabel, { color: colors.foreground }]}>Açıklama</Text>
          <Text style={[styles.descText, { color: colors.mutedForeground }]}>
            {listing.description}
          </Text>
        </View>

        {/* Contact button */}
        {!isOwner && (
          <Pressable
            style={({ pressed }) => [
              styles.contactBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleContact}
          >
            <Ionicons name="call-outline" size={20} color="white" />
            <Text style={styles.contactBtnText}>İletişime Geç</Text>
          </Pressable>
        )}

        {/* Contact info display */}
        <View style={[styles.contactInfo, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.contactInfoText, { color: colors.mutedForeground }]}>
            {listing.contactInfo}
          </Text>
        </View>

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
              İlanı Kaldır
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
  heroImage: { width: "100%", height: 260 },
  heroPlaceholder: {
    width: "100%",
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: 16, gap: 16 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  petName: { fontSize: 26, fontFamily: "Inter_700Bold" },
  petMeta: { fontSize: 15, fontFamily: "Inter_400Regular", marginTop: 2 },
  badge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  postedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "white" },
  postedBy: { fontSize: 13, fontFamily: "Inter_400Regular" },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  descCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  descLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  descText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: "#E07A35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  contactBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "white" },
  contactInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  contactInfoText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
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
