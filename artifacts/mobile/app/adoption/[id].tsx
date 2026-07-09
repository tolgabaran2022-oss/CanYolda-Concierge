import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
import { formatTimeAgo } from "@/utils/formatters";

// ── Palette (same as rest of app) ────────────────────────────────────────────
const P     = "#7C4DCC";
const P2    = "#A480D8";
const DARK  = "#4B267D";
const BODY  = "#6E6290";
const BG    = "#F8F4FF";
const WHITE = "#FFFFFF";
const BORDER = "rgba(124,77,204,0.12)";

const IOS_SHADOW = Platform.select({
  ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 18 },
  android: { elevation: 4 },
  default: {},
});
const BTN_SHADOW = Platform.select({
  ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 16 },
  android: { elevation: 6 },
  default: {},
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function BoostBadge({ expiresAt, packageHours }: { expiresAt: string; packageHours: number }) {
  const remaining = new Date(expiresAt).getTime() - Date.now();
  const hoursLeft = Math.max(0, Math.floor(remaining / 3_600_000));
  const minutesLeft = Math.max(0, Math.floor((remaining % 3_600_000) / 60_000));
  return (
    <View style={S.boostBadge}>
      <LinearGradient colors={["#FFB347", "#E07A35"]} style={S.boostGrad}>
        <Ionicons name="star" size={12} color={WHITE} />
        <Text style={S.boostTxt}>Öne Çıkan · {hoursLeft > 0 ? `${hoursLeft}s ` : ""}{minutesLeft}dk kaldı</Text>
      </LinearGradient>
    </View>
  );
}

// Quick stat pill
function StatPill({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={S.statPill}>
      <View style={S.statIcon}>
        <Ionicons name={icon} size={16} color={P} />
      </View>
      <Text style={S.statLabel}>{label}</Text>
      <Text style={S.statValue}>{value}</Text>
    </View>
  );
}

// Trait chip
function TraitChip({ label }: { label: string }) {
  return (
    <View style={S.traitChip}>
      <Text style={S.traitTxt}>{label}</Text>
    </View>
  );
}

// Section header
function SectionHead({ title }: { title: string }) {
  return <Text style={S.sectionHead}>{title}</Text>;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdoptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getListing, deleteListing } = useAdoption();
  const { user } = useAuth();
  const { boostStatuses, fetchBoostStatus } = useBoost();
  const [liked, setLiked] = useState(false);

  const listing = getListing(id ?? "");
  const isOwner = listing?.userId === user?.id;
  const boost   = boostStatuses[id ?? ""];
  const botPad  = Platform.OS === "web" ? 34 : insets.bottom;

  const pressScale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () => Animated.spring(pressScale, { toValue: 1,    useNativeDriver: true, speed: 20 }).start();

  useEffect(() => { if (id) fetchBoostStatus([id]); }, [id]);

  if (!listing) {
    return (
      <View style={S.notFound}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={S.notFoundIllo}>
          <Ionicons name="heart-dislike-outline" size={44} color={`${P}80`} />
        </View>
        <Text style={S.notFoundTitle}>İlan Bulunamadı</Text>
        <Text style={S.notFoundSub}>Bu ilan kaldırılmış ya da mevcut değil.</Text>
        <Pressable style={S.notFoundBtn} onPress={() => router.back()}>
          <Text style={S.notFoundBtnTxt}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  // Derive display data from available fields
  const typeTraits: Record<string, string[]> = {
    Kedi:   ["Bağımsız", "Oyuncu", "Sevecen"],
    Köpek:  ["Sadık", "Enerjik", "Eğitilebilir"],
    Kuş:    ["Sosyal", "Akıllı", "Neşeli"],
    Tavşan: ["Sakin", "Nazik", "Meraklı"],
  };
  const traits = typeTraits[listing.petType] ?? ["Uyumlu", "Sağlıklı", "Dostane"];

  const isPhone = !listing.contactInfo.includes("@");
  const topBarPad = Platform.OS === "web" ? 20 : insets.top + 6;

  const handleContact = (mode: "message" | "call") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const info = listing.contactInfo;
    if (mode === "call") {
      if (isPhone) {
        Linking.openURL(`tel:${info.replace(/\s/g, "")}`).catch(() =>
          Alert.alert("İletişim", info)
        );
      } else {
        Alert.alert("İletişim Bilgisi", info);
      }
    } else {
      if (info.includes("@")) {
        Linking.openURL(`mailto:${info}`).catch(() =>
          Alert.alert("İletişim", info)
        );
      } else {
        Alert.alert("İletişim Bilgisi", info, [
          { text: "Kapat", style: "cancel" },
          { text: "Ara", onPress: () => Linking.openURL(`tel:${info.replace(/\s/g, "")}`) },
        ]);
      }
    }
  };

  const handleDelete = () => {
    Alert.alert("İlanı Kaldır", "Bu ilanı kaldırmak istediğine emin misin?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Kaldır", style: "destructive",
        onPress: async () => {
          await deleteListing(listing.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
      },
    ]);
  };

  const handleBoost = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/boost-packages", params: { listingId: listing.id, petName: listing.petName } } as any);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={S.root}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: botPad + 100 }}
        >
          {/* ── Hero image ── */}
          <View style={S.heroWrap}>
            {listing.photo ? (
              <Image
                source={{ uri: listing.photo }}
                style={S.heroImg}
                contentFit="cover"
                contentPosition={{ top: 0.25 }}
              />
            ) : (
              <LinearGradient colors={[`${P2}60`, `${P}40`, `${DARK}50`]} style={S.heroImg}>
                <View style={S.heroPlaceholderInner}>
                  <Ionicons name="paw" size={56} color={`${WHITE}80`} />
                </View>
              </LinearGradient>
            )}

            {/* Bottom scrim — smooth fade into sheet */}
            <LinearGradient
              colors={["transparent", "transparent", "rgba(248,244,255,0.7)", BG]}
              locations={[0, 0.5, 0.82, 1]}
              style={S.heroScrim}
              pointerEvents="none"
            />

            {/* Top bar: back + like */}
            <View style={[S.topBar, { paddingTop: topBarPad }]}>
              <Pressable
                style={S.blurBtn}
                onPress={() => router.back()}
                hitSlop={10}
              >
                {Platform.OS === "ios" ? (
                  <BlurView intensity={55} tint="dark" style={S.blurInner}>
                    <Ionicons name="chevron-back" size={20} color={WHITE} />
                  </BlurView>
                ) : (
                  <View style={[S.blurInner, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
                    <Ionicons name="chevron-back" size={20} color={WHITE} />
                  </View>
                )}
              </Pressable>

              <Pressable
                style={S.blurBtn}
                onPress={() => { setLiked((v) => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                hitSlop={10}
              >
                {Platform.OS === "ios" ? (
                  <BlurView intensity={55} tint="dark" style={S.blurInner}>
                    <Ionicons name={liked ? "heart" : "heart-outline"} size={19} color={liked ? "#FF4466" : WHITE} />
                  </BlurView>
                ) : (
                  <View style={[S.blurInner, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
                    <Ionicons name={liked ? "heart" : "heart-outline"} size={19} color={liked ? "#FF4466" : WHITE} />
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* ── Bottom sheet card ── */}
          <View style={S.sheet}>

            {/* Name + status badge */}
            <View style={S.nameRow}>
              <View style={{ flex: 1 }}>
                <Text style={S.petName}>{listing.petName}</Text>
                <View style={S.petTypeRow}>
                  <View style={S.typePill}>
                    <Ionicons name="paw" size={11} color={P} />
                    <Text style={S.typePillTxt}>{listing.petType}</Text>
                  </View>
                  <View style={S.statusPill}>
                    <View style={S.statusDot} />
                    <Text style={S.statusTxt}>Sahip Arıyor</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Boost badge */}
            {boost?.isFeatured && boost.expiresAt && (
              <BoostBadge expiresAt={boost.expiresAt} packageHours={boost.packageHours ?? 24} />
            )}

            {/* Quick stats */}
            <View style={S.statsRow}>
              {listing.petAge ? (
                <StatPill icon="calendar-outline" label="Yaş" value={listing.petAge} />
              ) : (
                <StatPill icon="calendar-outline" label="Yaş" value="Belirtilmemiş" />
              )}
              <StatPill icon="location-outline" label="Konum" value={listing.location.split(",")[0]} />
              <StatPill icon="shield-checkmark-outline" label="Sağlık" value="İyi" />
            </View>

            {/* Divider */}
            <View style={S.divider} />

            {/* Owner / poster */}
            <SectionHead title="İlan Sahibi" />
            <View style={S.ownerCard}>
              <LinearGradient colors={[P2, P, DARK]} style={S.ownerAvatar}>
                <Text style={S.ownerAvatarTxt}>{listing.userName.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <View style={S.ownerNameRow}>
                  <Text style={S.ownerName}>{listing.userName}</Text>
                  <View style={S.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={13} color={P} />
                    <Text style={S.verifiedTxt}>Doğrulandı</Text>
                  </View>
                </View>
                <Text style={S.ownerTime}>{formatTimeAgo(listing.createdAt)} yayınlandı</Text>
              </View>
              <View style={S.ownerChevron}>
                <Ionicons name="chevron-forward" size={16} color={`${BODY}80`} />
              </View>
            </View>

            {/* Divider */}
            <View style={S.divider} />

            {/* Description */}
            <SectionHead title="Hakkında" />
            <View style={S.descCard}>
              <Text style={S.descText}>{listing.description}</Text>
            </View>

            {/* Personality traits */}
            <SectionHead title="Karakter Özellikleri" />
            <View style={S.traitsWrap}>
              {traits.map((t) => <TraitChip key={t} label={t} />)}
            </View>

            {/* Info grid */}
            <SectionHead title="Detay Bilgiler" />
            <View style={S.infoGrid}>
              <View style={S.infoCell}>
                <Ionicons name="medkit-outline" size={18} color={P} />
                <Text style={S.infoCellLabel}>Sağlık Durumu</Text>
                <Text style={S.infoCellValue}>İyi</Text>
              </View>
              <View style={S.infoCell}>
                <Ionicons name="shield-checkmark-outline" size={18} color={"#34C759"} />
                <Text style={S.infoCellLabel}>Aşı</Text>
                <Text style={S.infoCellValue}>Var</Text>
              </View>
              <View style={S.infoCell}>
                <Ionicons name="home-outline" size={18} color={"#007AFF"} />
                <Text style={S.infoCellLabel}>İç/Dış Mekan</Text>
                <Text style={S.infoCellValue}>İç Mekan</Text>
              </View>
              <View style={S.infoCell}>
                <Ionicons name="people-outline" size={18} color={"#FF9500"} />
                <Text style={S.infoCellLabel}>Çocuk Uyumu</Text>
                <Text style={S.infoCellValue}>Uyumlu</Text>
              </View>
            </View>

            {/* Adoption note */}
            <View style={S.adoptionNote}>
              <LinearGradient colors={[`${P2}20`, `${P}12`]} style={S.adoptionNoteGrad}>
                <Ionicons name="heart-circle-outline" size={20} color={P} />
                <Text style={S.adoptionNoteTxt}>
                  Sahiplenmeden önce lütfen yaşam koşullarınızı ve hayvanın ihtiyaçlarını değerlendirin. Yüz yüze tanışma önerilir.
                </Text>
              </LinearGradient>
            </View>

            {/* Contact info display */}
            <View style={S.contactInfoCard}>
              <Ionicons name={isPhone ? "call-outline" : "mail-outline"} size={16} color={BODY} />
              <Text style={S.contactInfoTxt}>{listing.contactInfo}</Text>
            </View>

            {/* Owner actions */}
            {isOwner && (
              <View style={S.ownerActionsWrap}>
                <View style={S.divider} />
                <SectionHead title="İlan Yönetimi" />

                {/* Edit button */}
                <Pressable
                  style={({ pressed }) => [S.editBtn, { opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push(`/adoption/edit/${listing.id}` as any);
                  }}
                >
                  <View style={S.editBtnInner}>
                    <Ionicons name="create-outline" size={18} color={P} />
                    <View style={{ flex: 1 }}>
                      <Text style={S.editBtnTitle}>İlanı Düzenle</Text>
                      <Text style={S.editBtnSub}>Fotoğraf, bilgi ve iletişim bilgilerini güncelle</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={`${P}80`} />
                  </View>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [S.boostBtn, { opacity: pressed ? 0.85 : 1 }]}
                  onPress={handleBoost}
                >
                  <LinearGradient colors={["#FFB347", "#E07A35"]} style={S.boostBtnGrad}>
                    <Ionicons name="star" size={18} color={WHITE} />
                    <View style={{ flex: 1 }}>
                      <Text style={S.boostBtnTitle}>{boost?.isFeatured ? "Öne Çıkarmayı Yenile" : "İlanı Öne Çıkar"}</Text>
                      <Text style={S.boostBtnSub}>{boost?.isFeatured ? "Süre uzatmak için yeni paket al" : "₺50'den başlayan fiyatlarla"}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={WHITE} />
                  </LinearGradient>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [S.deleteBtn, { opacity: pressed ? 0.75 : 1 }]}
                  onPress={handleDelete}
                >
                  <Ionicons name="trash-outline" size={16} color="#E53E3E" />
                  <Text style={S.deleteBtnTxt}>İlanı Kaldır</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>

        {/* ── Sticky bottom action buttons ── */}
        {!isOwner && (
          <View style={[S.stickyBottom, { paddingBottom: botPad + 12 }]}>
            <Animated.View style={[{ flex: 1 }, { transform: [{ scale: pressScale }] }]}>
              <Pressable
                onPress={() => handleContact("message")}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={S.msgBtnOuter}
              >
                <LinearGradient colors={[P2, P, DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.msgBtn}>
                  <Ionicons name="chatbubble-ellipses" size={18} color={WHITE} />
                  <Text style={S.msgBtnTxt}>Mesaj Gönder</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Pressable
              style={({ pressed }) => [S.callBtn, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => handleContact("call")}
            >
              <Ionicons name={isPhone ? "call" : "mail"} size={20} color={P} />
            </Pressable>
          </View>
        )}
      </View>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },

  // Not found
  notFound:      { flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center", gap: 10 },
  notFoundIllo:  { width: 90, height: 90, borderRadius: 45, backgroundColor: `${P}14`, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  notFoundTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: DARK },
  notFoundSub:   { fontSize: 14, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center", paddingHorizontal: 40 },
  notFoundBtn:   { marginTop: 8, backgroundColor: P, borderRadius: 50, paddingVertical: 12, paddingHorizontal: 28 },
  notFoundBtnTxt:{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: WHITE },

  // Hero
  heroWrap:            { position: "relative", height: 330 },
  heroImg:             { width: "100%", height: 330 },
  heroPlaceholderInner:{ alignItems: "center", justifyContent: "center", flex: 1 },
  heroScrim:           { position: "absolute", bottom: 0, left: 0, right: 0, height: 160 },
  topBar:              { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between" },
  blurBtn:             { width: 40, height: 40, borderRadius: 20, overflow: "hidden" },
  blurInner:           { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  // Bottom sheet
  sheet: {
    backgroundColor: BG,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    paddingHorizontal: 20,
    paddingTop: 28,
    gap: 16,
  },

  // Name row
  nameRow:    { gap: 8 },
  petName:    { fontSize: 30, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.6, lineHeight: 36 },
  petTypeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  typePill:   { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: `${P}16`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  typePillTxt:{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: P },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#E8F8EE", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  statusDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: "#34C759" },
  statusTxt:  { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#2D8B47" },

  // Boost
  boostBadge: { overflow: "hidden", borderRadius: 12, alignSelf: "flex-start" },
  boostGrad:  { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  boostTxt:   { fontSize: 12, fontFamily: "Inter_700Bold", color: WHITE },

  // Stats row
  statsRow: { flexDirection: "row", gap: 10 },
  statPill: { flex: 1, backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, alignItems: "center", paddingVertical: 12, gap: 4, ...IOS_SHADOW },
  statIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${P}14`, alignItems: "center", justifyContent: "center" },
  statLabel:{ fontSize: 10, fontFamily: "Inter_400Regular", color: BODY },
  statValue:{ fontSize: 12, fontFamily: "Inter_700Bold", color: DARK, textAlign: "center" },

  // Divider
  divider: { height: 1, backgroundColor: `${P}10`, marginVertical: -4 },

  // Section head
  sectionHead: { fontSize: 16, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.2 },

  // Owner card
  ownerCard:     { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: WHITE, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 14, ...IOS_SHADOW },
  ownerAvatar:   { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  ownerAvatarTxt:{ fontSize: 18, fontFamily: "Inter_700Bold", color: WHITE },
  ownerNameRow:  { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  ownerName:     { fontSize: 15, fontFamily: "Inter_700Bold", color: DARK },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  verifiedTxt:   { fontSize: 11, fontFamily: "Inter_600SemiBold", color: P },
  ownerTime:     { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, marginTop: 2 },
  ownerChevron:  { padding: 4 },

  // Description
  descCard: { backgroundColor: WHITE, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 16 },
  descText: { fontSize: 14, fontFamily: "Inter_400Regular", color: BODY, lineHeight: 23 },

  // Traits
  traitsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  traitChip:  { backgroundColor: `${P}14`, borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8 },
  traitTxt:   { fontSize: 13, fontFamily: "Inter_600SemiBold", color: P },

  // Info grid
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  infoCell: { width: "47%", backgroundColor: WHITE, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 14, gap: 6, alignItems: "flex-start", ...IOS_SHADOW },
  infoCellLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: BODY },
  infoCellValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: DARK },

  // Adoption note
  adoptionNote:     { borderRadius: 18, overflow: "hidden" },
  adoptionNoteGrad: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: `${P}20` },
  adoptionNoteTxt:  { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: BODY, lineHeight: 20 },

  // Contact info display
  contactInfoCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: WHITE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 12 },
  contactInfoTxt:  { fontSize: 14, fontFamily: "Inter_500Medium", color: BODY, flex: 1 },

  // Owner actions
  ownerActionsWrap: { gap: 12 },
  editBtn:      { borderRadius: 18, borderWidth: 1.5, borderColor: BORDER, backgroundColor: WHITE, overflow: "hidden", ...IOS_SHADOW },
  editBtnInner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  editBtnTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: DARK },
  editBtnSub:   { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, marginTop: 2 },
  boostBtn:    { borderRadius: 18, overflow: "hidden" },
  boostBtnGrad:{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 18 },
  boostBtnTitle:{ fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE },
  boostBtnSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)", marginTop: 2 },
  deleteBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, borderWidth: 1.5, borderColor: "#FFD5D5", paddingVertical: 14, backgroundColor: "#FFF5F5" },
  deleteBtnTxt:{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#E53E3E" },

  // Sticky bottom
  stickyBottom: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: `${P}10`,
  },
  msgBtnOuter: { borderRadius: 18, overflow: "hidden", flex: 1, ...BTN_SHADOW },
  msgBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 56, borderRadius: 18 },
  msgBtnTxt:   { fontSize: 16, fontFamily: "Inter_700Bold", color: WHITE },
  callBtn:     { width: 56, height: 56, borderRadius: 18, backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER, alignItems: "center", justifyContent: "center", ...IOS_SHADOW },
});
