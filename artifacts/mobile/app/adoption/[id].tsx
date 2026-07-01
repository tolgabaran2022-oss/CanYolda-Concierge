import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Alert,
  Animated,
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
import { useBoost } from "@/contexts/BoostContext";
import { useColors } from "@/hooks/useColors";
import { formatTimeAgo } from "@/utils/formatters";

const PURPLE = "#7B5EA7";
const PURPLE_DARK = "#4A2D8F";
const BG = "#F8F9FC";
const NAVY = "#1A0A3C";
const LILAC = "#7C6F9A";
const MUTED = "#9CA3AF";

function BoostStatusBadge({
  expiresAt,
  packageHours,
}: {
  expiresAt: string;
  packageHours: number;
}) {
  const remaining = new Date(expiresAt).getTime() - Date.now();
  const hoursLeft = Math.max(0, Math.floor(remaining / 3_600_000));
  const minutesLeft = Math.max(0, Math.floor((remaining % 3_600_000) / 60_000));
  return (
    <View style={S.boostBadge}>
      <Ionicons name="star" size={14} color={PURPLE} />
      <Text style={S.boostBadgeText}>
        Öne Çıkan · {hoursLeft > 0 ? `${hoursLeft}s ` : ""}
        {minutesLeft}dk kaldı
      </Text>
    </View>
  );
}

export default function AdoptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getListing, deleteListing } = useAdoption();
  const { user } = useAuth();
  const { boostStatuses, fetchBoostStatus } = useBoost();

  const listing = getListing(id ?? "");
  const isOwner = listing?.userId === user?.id;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const boost = boostStatuses[id ?? ""];

  const pressScale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(pressScale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
    }).start();
  const onPressOut = () =>
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();

  useEffect(() => {
    if (id) fetchBoostStatus([id]);
  }, [id, fetchBoostStatus]);

  if (!listing) {
    return (
      <View style={[S.notFound, { backgroundColor: BG }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="heart-dislike-outline" size={48} color={LILAC} />
        <Text style={S.notFoundText}>İlan bulunamadı.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={S.backLink}>Geri Dön</Text>
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
    Alert.alert(
      "İlanı Kaldır",
      "Bu ilanı kaldırmak istediğine emin misin?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Kaldır",
          style: "destructive",
          onPress: async () => {
            await deleteListing(listing.id);
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
            router.back();
          },
        },
      ]
    );
  };

  const handleBoost = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/boost-packages",
      params: { listingId: listing.id, petName: listing.petName },
    } as any);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={S.root}>
        <ScrollView
          style={S.scroll}
          contentContainerStyle={{ paddingBottom: bottomPad + 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero ── */}
          <View style={S.heroWrap}>
            {listing.photo ? (
              <Image
                source={{ uri: listing.photo }}
                style={S.heroImage}
                contentFit="cover"
              />
            ) : (
              <LinearGradient
                colors={["#EDE6FF", "#C9B4F0", "#D8CBF8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={S.heroPlaceholder}
              >
                <View style={S.placeholderRing}>
                  <Ionicons name="heart" size={36} color={PURPLE} />
                </View>
              </LinearGradient>
            )}
            <LinearGradient
              colors={["rgba(0,0,0,0.18)", "transparent", "rgba(0,0,0,0.22)"]}
              locations={[0, 0.4, 1]}
              style={S.heroOverlay}
              pointerEvents="none"
            />
            <View style={[S.topBar, { paddingTop: insets.top + 6 }]}>
              <Pressable
                style={S.circleBtn}
                onPress={() => router.back()}
                hitSlop={10}
              >
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* ── Content card ── */}
          <View style={S.card}>
            {/* Pet name + badge */}
            <View style={S.titleRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={S.petName}>{listing.petName}</Text>
                <Text style={S.petMeta}>
                  {listing.petType}
                  {listing.petAge ? ` · ${listing.petAge}` : ""}
                </Text>
              </View>
              <View style={S.badge}>
                <Ionicons name="heart" size={11} color={PURPLE} />
                <Text style={S.badgeText}>Sahip Arıyor</Text>
              </View>
            </View>

            {/* Boost */}
            {boost?.isFeatured && boost.expiresAt && (
              <BoostStatusBadge
                expiresAt={boost.expiresAt}
                packageHours={boost.packageHours ?? 24}
              />
            )}

            {/* Posted by */}
            <View style={S.postedRow}>
              <LinearGradient
                colors={[`${PURPLE}CC`, PURPLE_DARK]}
                style={S.avatar}
              >
                <Text style={S.avatarText}>
                  {listing.userName.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={S.postedName}>{listing.userName}</Text>
                <Text style={S.postedTime}>
                  {formatTimeAgo(listing.createdAt)}
                </Text>
              </View>
            </View>

            <View style={S.divider} />

            {/* Location */}
            <View style={S.locationCard}>
              <View style={S.locationIconWrap}>
                <Ionicons name="location" size={16} color={PURPLE} />
              </View>
              <Text style={S.locationText}>{listing.location}</Text>
            </View>

            {/* Description */}
            <View style={S.descCard}>
              <Text style={S.descLabel}>Açıklama</Text>
              <Text style={S.descText}>{listing.description}</Text>
            </View>

            {/* Contact button */}
            {!isOwner && (
              <>
                <Animated.View style={{ transform: [{ scale: pressScale }] }}>
                  <Pressable
                    onPress={handleContact}
                    onPressIn={onPressIn}
                    onPressOut={onPressOut}
                    android_ripple={{
                      color: "rgba(255,255,255,0.25)",
                      borderless: false,
                    }}
                  >
                    <LinearGradient
                      colors={[PURPLE, PURPLE_DARK]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={S.contactBtn}
                    >
                      <Ionicons name="call" size={20} color="white" />
                      <Text style={S.contactBtnText}>İletişime Geç</Text>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>

                <View style={S.contactInfoRow}>
                  <Ionicons name="mail-outline" size={13} color={MUTED} />
                  <Text style={S.contactInfoText}>{listing.contactInfo}</Text>
                </View>
              </>
            )}

            {/* Owner actions */}
            {isOwner && (
              <View style={S.ownerActions}>
                <Pressable
                  style={({ pressed }) => [
                    S.boostBtn,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={handleBoost}
                >
                  <Ionicons name="star" size={18} color={PURPLE} />
                  <View style={{ flex: 1 }}>
                    <Text style={S.boostBtnTitle}>
                      {boost?.isFeatured
                        ? "Öne Çıkarmayı Yenile"
                        : "İlanı Öne Çıkar"}
                    </Text>
                    <Text style={S.boostBtnSub}>
                      {boost?.isFeatured
                        ? "Süre uzatmak için yeni paket al"
                        : "₺50'den başlayan fiyatlarla"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={PURPLE} />
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    S.deleteBtn,
                    { borderColor: colors.destructive, opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={handleDelete}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.destructive}
                  />
                  <Text style={[S.deleteBtnText, { color: colors.destructive }]}>
                    İlanı Kaldır
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },

  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  notFoundText: { fontSize: 16, fontFamily: "Inter_400Regular", color: LILAC },
  backLink: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: PURPLE,
  },

  // ── Hero ──
  heroWrap: { position: "relative" },
  heroImage: { width: "100%", aspectRatio: 16 / 9 },
  heroPlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.40)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.30)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Content card ──
  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
    gap: 14,
    minHeight: 100,
  },

  // ── Title row ──
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  petName: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: NAVY,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  petMeta: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: LILAC,
    marginTop: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${PURPLE}12`,
    borderWidth: 1,
    borderColor: `${PURPLE}28`,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: PURPLE,
  },

  // ── Boost badge ──
  boostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${PURPLE}30`,
    backgroundColor: `${PURPLE}10`,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  boostBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: PURPLE,
  },

  // ── Posted by ──
  postedRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "white",
  },
  postedName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: NAVY,
  },
  postedTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: MUTED,
    marginTop: 2,
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: "#F0ECF8",
    marginVertical: -2,
  },

  // ── Location ──
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: `${PURPLE}07`,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${PURPLE}16`,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${PURPLE}14`,
    alignItems: "center",
    justifyContent: "center",
  },
  locationText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: NAVY,
    flex: 1,
  },

  // ── Description ──
  descCard: {
    backgroundColor: "#F8F6FF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDE8FF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  descLabel: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: NAVY,
  },
  descText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: LILAC,
    lineHeight: 24,
  },

  // ── Contact button ──
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    height: 56,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  contactBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "white",
  },
  contactInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    marginTop: -4,
  },
  contactInfoText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: MUTED,
  },

  // ── Owner actions ──
  ownerActions: { gap: 12, marginTop: 4 },
  boostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: `${PURPLE}50`,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: `${PURPLE}06`,
  },
  boostBtnTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: PURPLE,
  },
  boostBtnSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: MUTED,
    marginTop: 1,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    backgroundColor: "transparent",
  },
  deleteBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
