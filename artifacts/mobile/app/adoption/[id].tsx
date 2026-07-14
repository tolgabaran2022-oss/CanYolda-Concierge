import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Modal,
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
import { apiCheckAdoptionRequest } from "@/lib/adoptionRequestsApi";
import { useBoost } from "@/contexts/BoostContext";
import { useTheme } from "@/hooks/useTheme";
import { formatTimeAgo } from "@/utils/formatters";
import { apiGetContactPrefs, apiRevealPhone, type ContactPrefs } from "@/lib/contactApi";
import { apiGetOrCreateConversation } from "@/lib/messagesApi";
import {
  getHealthStatusLabel,
  getVaccinationStatusLabel,
  getEnvironmentTypeLabel,
  getChildCompatibilityLabel,
  getCatCompatibilityLabel,
  getDogCompatibilityLabel,
  getToiletTrainingLabel,
} from "@/lib/petDetailOptions";

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
        <Icon name="star" size={12} color={WHITE} />
        <Text style={S.boostTxt}>Öne Çıkan · {hoursLeft > 0 ? `${hoursLeft}s ` : ""}{minutesLeft}dk kaldı</Text>
      </LinearGradient>
    </View>
  );
}

// Quick stat pill
function StatPill({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={S.statPill}>
      <View style={S.statIcon}>
        <Icon name={icon} size={16} color={P} />
      </View>
      <Text style={S.statLabel}>{label}</Text>
      <Text style={S.statValue}>{value}</Text>
    </View>
  );
}

// Section header
function SectionHead({ title }: { title: string }) {
  return <Text style={S.sectionHead}>{title}</Text>;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdoptionDetailScreen() {
  const T = useTheme();
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const isPreviewMode = preview === "true";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getListing, deleteListing, isFollowed, followListing, unfollowListing } = useAdoption();
  const { user } = useAuth();
  const { boostStatuses, fetchBoostStatus } = useBoost();
  const [followLoading, setFollowLoading] = useState(false);

  /* Contact-reveal state */
  const [contactPrefs,     setContactPrefs]     = useState<ContactPrefs>({ allowPhoneContact: true, allowMessages: true });
  const [phoneModalOpen,   setPhoneModalOpen]   = useState(false);
  const [revealedPhone,    setRevealedPhone]    = useState<string | null>(null);
  const [revealLoading,    setRevealLoading]    = useState(false);
  const [revealError,      setRevealError]      = useState<string | null>(null);
  const [msgSending,       setMsgSending]       = useState(false);
  /* Contact intent sheet */
  const [intentSheet,      setIntentSheet]      = useState(false);
  const [existingRequest,  setExistingRequest]  = useState<{ hasRequest: boolean; status?: string } | null>(null);

  const listing = getListing(id ?? "");
  const isOwner = listing?.userId === user?.id;
  const boost   = boostStatuses[id ?? ""];
  const botPad  = Platform.OS === "web" ? 34 : insets.bottom;
  const liked   = isFollowed(id ?? "");

  const handleToggleFollow = async () => {
    if (!user) {
      Alert.alert("Giriş Gerekli", "İlanı takip etmek için giriş yapın.");
      return;
    }
    if (followLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFollowLoading(true);
    try {
      if (liked) {
        await unfollowListing(id!);
      } else {
        await followListing(id!);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const pressScale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () => Animated.spring(pressScale, { toValue: 1,    useNativeDriver: true, speed: 20 }).start();

  useEffect(() => { if (id) fetchBoostStatus([id]); }, [id]);

  /* Check if requester already has a pending/reviewing request */
  useEffect(() => {
    if (!id || !user || isOwner) return;
    apiCheckAdoptionRequest(id, user.id).then(setExistingRequest).catch(() => {});
  }, [id, user, isOwner]);

  /* Fetch public contact prefs when listing loads */
  useEffect(() => {
    if (!id || !listing) return;
    /* Prefer persisted booleans from AsyncStorage if already present */
    if (listing.allowPhoneContact !== undefined || listing.allowMessages !== undefined) {
      setContactPrefs({
        allowPhoneContact: listing.allowPhoneContact ?? true,
        allowMessages:     listing.allowMessages     ?? true,
      });
      return;
    }
    apiGetContactPrefs(id).then(setContactPrefs).catch(() => {});
  }, [id, listing?.id]);

  if (!listing) {
    return (
      <View style={S.notFound}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={S.notFoundIllo}>
          <Icon name="heart-dislike-outline" size={44} color={`${P}80`} />
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
  const isPhone = !listing.contactInfo.includes("@");
  const topBarPad = Platform.OS === "web" ? 20 : insets.top + 6;

  const handleRevealPhone = async () => {
    if (!user) { Alert.alert("Giriş Gerekli", "Telefon numarasını görmek için giriş yapın."); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhoneModalOpen(true);
    if (revealedPhone) return; /* already revealed */
    setRevealLoading(true);
    setRevealError(null);
    try {
      const result = await apiRevealPhone(user.id, id!);
      setRevealedPhone(result.phoneNumber);
    } catch (e: any) {
      setRevealError(e?.message ?? "Telefon numarası alınamadı");
    } finally {
      setRevealLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user) {
      Alert.alert("Giriş Gerekli", "Mesaj göndermek için lütfen giriş yapın.");
      return;
    }
    if (!listing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMsgSending(true);
    try {
      const conv = await apiGetOrCreateConversation(
        user.id,
        listing.userId,
        {
          id:       listing.id,
          title:    listing.petName,
          imageUrl: listing.photo ?? "",
        }
      );
      router.push(`/messages/${encodeURIComponent(conv.id)}` as any);
    } catch {
      Alert.alert("Hata", "Mesaj başlatılamadı, lütfen tekrar deneyin.");
    } finally {
      setMsgSending(false);
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
                  <Icon name="paw" size={56} color={`${WHITE}80`} />
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
                    <Icon name="chevron-back" size={20} color={WHITE} />
                  </BlurView>
                ) : (
                  <View style={[S.blurInner, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
                    <Icon name="chevron-back" size={20} color={WHITE} />
                  </View>
                )}
              </Pressable>

              <Pressable
                style={S.blurBtn}
                onPress={handleToggleFollow}
                hitSlop={10}
                disabled={followLoading}
              >
                {Platform.OS === "ios" ? (
                  <BlurView intensity={55} tint="dark" style={S.blurInner}>
                    <Icon name={liked ? "heart" : "heart-outline"} size={19} color={liked ? "#FF4466" : WHITE} />
                  </BlurView>
                ) : (
                  <View style={[S.blurInner, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
                    <Icon name={liked ? "heart" : "heart-outline"} size={19} color={liked ? "#FF4466" : WHITE} />
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* ── Bottom sheet card ── */}
          <View style={S.sheet}>

            {/* ── Preview mode banner ── */}
            {isPreviewMode && (
              <View style={S.previewBanner}>
                <View style={S.previewBannerIcon}>
                  <Icon name="eye-outline" size={15} color={P} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.previewBannerTitle}>Önizleme Modu</Text>
                  <Text style={S.previewBannerSub}>Bu ilan diğer kullanıcılara bu şekilde görünecek.</Text>
                </View>
                <Pressable
                  onPress={() => router.back()}
                  hitSlop={10}
                  style={({ pressed }) => [S.previewBannerClose, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Icon name="close" size={18} color={`${P}80`} />
                </Pressable>
              </View>
            )}

            {/* Name + status badge */}
            <View style={S.nameRow}>
              <View style={{ flex: 1 }}>
                <Text style={S.petName}>{listing.petName}</Text>
                <View style={S.petTypeRow}>
                  <View style={S.typePill}>
                    <Icon name="paw" size={11} color={P} />
                    <Text style={S.typePillTxt}>{listing.petType}</Text>
                  </View>
                  <View style={[S.statusPill, { backgroundColor: T.isDark ? "rgba(52,199,89,0.15)" : "#E8F8EE" }]}>
                    <View style={S.statusDot} />
                    <Text style={[S.statusTxt, { color: T.isDark ? "#6ED98B" : "#1A7F37" }]}>Sahip Arıyor</Text>
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
              <StatPill icon="shield-checkmark-outline" label="Sağlık" value={getHealthStatusLabel(listing.healthStatus)} />
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
                    <Icon name="checkmark-circle" size={13} color={P} />
                    <Text style={S.verifiedTxt}>Doğrulandı</Text>
                  </View>
                </View>
                <Text style={S.ownerTime}>{formatTimeAgo(listing.createdAt)} yayınlandı</Text>
              </View>
              <View style={S.ownerChevron}>
                <Icon name="chevron-forward" size={16} color={`${BODY}80`} />
              </View>
            </View>

            {/* Divider */}
            <View style={S.divider} />

            {/* Description */}
            <SectionHead title="Hakkında" />
            <View style={S.descCard}>
              <Text style={S.descText}>{listing.description}</Text>
            </View>

            {/* Info grid */}
            <SectionHead title="Detay Bilgiler" />
            <View style={S.infoGrid}>
              <View style={S.infoCell}>
                <Icon name="medkit-outline" size={18} color={P} />
                <Text style={S.infoCellLabel}>Sağlık Durumu</Text>
                <Text style={S.infoCellValue}>{getHealthStatusLabel(listing.healthStatus)}</Text>
              </View>
              <View style={S.infoCell}>
                <Icon name="shield-checkmark-outline" size={18} color={"#34C759"} />
                <Text style={S.infoCellLabel}>Aşı</Text>
                <Text style={S.infoCellValue}>{getVaccinationStatusLabel(listing.vaccinationStatus)}</Text>
              </View>
              <View style={S.infoCell}>
                <Icon name="home-outline" size={18} color={"#007AFF"} />
                <Text style={S.infoCellLabel}>İç/Dış Mekan</Text>
                <Text style={S.infoCellValue}>{getEnvironmentTypeLabel(listing.environmentType)}</Text>
              </View>
              <View style={S.infoCell}>
                <Icon name="people-outline" size={18} color={"#FF9500"} />
                <Text style={S.infoCellLabel}>Çocuk Uyumu</Text>
                <Text style={S.infoCellValue}>{getChildCompatibilityLabel(listing.childCompatibility)}</Text>
              </View>
              <View style={S.infoCell}>
                <Icon name="paw" size={18} color={"#AF52DE"} />
                <Text style={S.infoCellLabel}>Kedi Uyumu</Text>
                <Text style={S.infoCellValue}>{getCatCompatibilityLabel(listing.catCompatibility)}</Text>
              </View>
              <View style={S.infoCell}>
                <Icon name="paw" size={18} color={"#FF6B35"} />
                <Text style={S.infoCellLabel}>Köpek Uyumu</Text>
                <Text style={S.infoCellValue}>{getDogCompatibilityLabel(listing.dogCompatibility)}</Text>
              </View>
            </View>
            <View style={[S.infoCell, S.infoCellFull]}>
              <Icon name="checkmark-circle-outline" size={18} color={"#34C759"} />
              <Text style={S.infoCellLabel}>Tuvalet Eğitimi</Text>
              <Text style={S.infoCellValue}>{getToiletTrainingLabel(listing.toiletTraining)}</Text>
            </View>

            {/* Adoption note */}
            <View style={S.adoptionNote}>
              <LinearGradient colors={[`${P2}20`, `${P}12`]} style={S.adoptionNoteGrad}>
                <Icon name="heart-circle" size={20} color={P} />
                <Text style={S.adoptionNoteTxt}>
                  Sahiplenmeden önce lütfen yaşam koşullarınızı ve hayvanın ihtiyaçlarını değerlendirin. Yüz yüze tanışma önerilir.
                </Text>
              </LinearGradient>
            </View>

            {/* Contact info display */}
            <View style={S.contactInfoCard}>
              <Icon name={isPhone ? "call-outline" : "mail-outline"} size={16} color={BODY} />
              <Text style={S.contactInfoTxt}>{listing.contactInfo}</Text>
            </View>

            {/* Owner actions — hidden in preview mode */}
            {isOwner && !isPreviewMode && (
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
                    <Icon name="create-outline" size={18} color={P} />
                    <View style={{ flex: 1 }}>
                      <Text style={S.editBtnTitle}>İlanı Düzenle</Text>
                      <Text style={S.editBtnSub}>Fotoğraf, bilgi ve iletişim bilgilerini güncelle</Text>
                    </View>
                    <Icon name="chevron-forward" size={16} color={`${P}80`} />
                  </View>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [S.deleteBtn, { opacity: pressed ? 0.75 : 1, backgroundColor: T.card, borderColor: T.isDark ? "#7A3838" : "#FFD5D5" }]}
                  onPress={handleDelete}
                >
                  <Icon name="trash-outline" size={16} color="#E53E3E" />
                  <Text style={S.deleteBtnTxt}>İlanı Kaldır</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>

        {/* ── Sticky bottom action buttons ── */}
        {isPreviewMode ? (
          <View style={[S.stickyBottom, { paddingBottom: botPad + 12 }]}>
            <Animated.View style={[{ flex: 1 }, { transform: [{ scale: pressScale }] }]}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/adoption/edit/${listing.id}` as any);
                }}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={S.msgBtnOuter}
              >
                <LinearGradient colors={[P2, P, DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.msgBtn}>
                  <Icon name="create-outline" size={18} color={WHITE} />
                  <Text style={S.msgBtnTxt}>İlanı Düzenle</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
            <Pressable
              style={({ pressed }) => [S.callBtn, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => router.back()}
              hitSlop={8}
            >
              <Icon name="eye-off-outline" size={20} color={P} />
            </Pressable>
          </View>
        ) : !isOwner ? (
          <View style={[S.stickyBottom, { paddingBottom: botPad + 12 }]}>
            <Animated.View style={[{ flex: 1 }, { transform: [{ scale: pressScale }] }]}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setIntentSheet(true);
                }}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={S.msgBtnOuter}
              >
                <LinearGradient colors={[P2, P, DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.msgBtn}>
                  <Icon name="paw" size={18} color={WHITE} />
                  <Text style={S.msgBtnTxt}>İletişim</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {contactPrefs.allowPhoneContact && (
              <Pressable
                style={({ pressed }) => [S.callBtn, { opacity: pressed ? 0.85 : 1 }]}
                onPress={handleRevealPhone}
              >
                <Icon name="call-outline" size={20} color={P} />
              </Pressable>
            )}
          </View>
        ) : null}
      </View>

      {/* ── Contact Intent Sheet ── */}
      <Modal
        visible={intentSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setIntentSheet(false)}
      >
        <Pressable style={S.modalOverlay} onPress={() => setIntentSheet(false)} />
        <View style={[S.intentModal, { paddingBottom: botPad + 16 }]}>
          <View style={S.phoneModalHandle} />

          {/* Animal summary */}
          <View style={S.intentHeader}>
            <Icon name="heart-circle" size={26} color={P} />
            <View style={{ flex: 1 }}>
              <Text style={S.intentTitle}>Bu patili dostla ilgileniyor musun?</Text>
              <Text style={S.intentSub}>
                İlan sahibine sahiplendirme talebi gönderebilir veya mesajlaşabilirsin.
              </Text>
            </View>
          </View>

          <View style={S.intentDivider} />

          {/* Primary: adoption request */}
          {existingRequest?.hasRequest && (existingRequest.status === "pending" || existingRequest.status === "reviewing") ? (
            <View style={S.existingRequestBanner}>
              <Icon name="time" size={16} color="#FF9500" />
              <Text style={S.existingRequestTxt}>Bu ilan için zaten bir talebin var ({existingRequest.status === "pending" ? "Beklemede" : "İnceleniyor"})</Text>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [S.intentPrimaryBtn, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => {
                if (!user) { Alert.alert("Giriş Gerekli", "Talep göndermek için lütfen giriş yapın."); return; }
                setIntentSheet(false);
                router.push(`/adoption-request/${listing!.id}` as any);
              }}
            >
              <LinearGradient colors={[P2, P, DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.intentPrimaryInner}>
                <Icon name="paw" size={18} color={WHITE} />
                <Text style={S.intentPrimaryTxt}>Sahiplenmek İstiyorum</Text>
              </LinearGradient>
            </Pressable>
          )}

          {/* Secondary: message */}
          {contactPrefs.allowMessages && (
            <Pressable
              style={({ pressed }) => [S.intentSecondaryBtn, { opacity: pressed ? 0.85 : 1 }]}
              disabled={msgSending}
              onPress={async () => {
                setIntentSheet(false);
                await handleSendMessage();
              }}
            >
              <Icon name="chatbubble-ellipses-outline" size={18} color={P} />
              <Text style={S.intentSecondaryTxt}>{msgSending ? "Açılıyor…" : "Mesaj Gönder"}</Text>
            </Pressable>
          )}

          {/* Tertiary: dismiss */}
          <Pressable
            style={({ pressed }) => [S.intentDismissBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => setIntentSheet(false)}
          >
            <Text style={S.intentDismissTxt}>Vazgeç</Text>
          </Pressable>
        </View>
      </Modal>

      {/* ── Phone Reveal Modal ── */}
      <Modal
        visible={phoneModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPhoneModalOpen(false)}
      >
        <Pressable style={S.modalOverlay} onPress={() => setPhoneModalOpen(false)} />
        <View style={[S.phoneModal, { paddingBottom: botPad + 16 }]}>
          <View style={S.phoneModalHandle} />
          <Text style={S.phoneModalTitle}>Telefon Numarası</Text>

          {revealLoading ? (
            <View style={{ paddingVertical: 28, alignItems: "center" }}>
              <ActivityIndicator color={P} size="large" />
              <Text style={{ marginTop: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: BODY }}>Yükleniyor...</Text>
            </View>
          ) : revealError ? (
            <View style={{ paddingVertical: 20, alignItems: "center", gap: 12 }}>
              <Icon name="alert-circle-outline" size={40} color="#E53E3E" />
              <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: "#E53E3E", textAlign: "center" }}>{revealError}</Text>
            </View>
          ) : revealedPhone ? (
            <View style={{ alignItems: "center", gap: 18, paddingVertical: 12 }}>
              <View style={S.phoneDisplay}>
                <Icon name="call-outline" size={20} color={P} />
                <Text style={S.phoneDisplayTxt} selectable>{revealedPhone}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [S.callNowBtn, { opacity: pressed ? 0.85 : 1 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Linking.openURL(`tel:${revealedPhone.replace(/\s/g, "")}`).catch(() => {});
                }}
              >
                <LinearGradient colors={[P2, P, DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.callNowBtnInner}>
                  <Icon name="call-outline" size={18} color={WHITE} />
                  <Text style={S.callNowBtnTxt}>Şimdi Ara</Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [S.phoneModalClose, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => setPhoneModalOpen(false)}
          >
            <Text style={S.phoneModalCloseTxt}>Kapat</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },

  // Preview mode banner
  previewBanner:     { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: `${P}10`, borderRadius: 18, borderWidth: 1, borderColor: `${P}20`, padding: 14 },
  previewBannerIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: `${P}20`, alignItems: "center", justifyContent: "center" },
  previewBannerTitle:{ fontSize: 13, fontFamily: "Inter_700Bold", color: P },
  previewBannerSub:  { fontSize: 11, fontFamily: "Inter_400Regular", color: BODY, marginTop: 1 },
  previewBannerClose:{ padding: 4 },

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
  infoCellFull: { width: "100%", marginTop: 10 },
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

  // Contact intent sheet
  intentModal: {
    backgroundColor: BG,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingTop: 8, paddingHorizontal: 22, gap: 12,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20 },
      android: { elevation: 20 },
      default: {},
    }),
  },
  intentHeader:   { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingTop: 6, paddingBottom: 4 },
  intentTitle:    { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.3, lineHeight: 24 },
  intentSub:      { fontSize: 13, fontFamily: "Inter_400Regular", color: BODY, lineHeight: 20, marginTop: 4 },
  intentDivider:  { height: 1, backgroundColor: BORDER },
  intentPrimaryBtn:   { borderRadius: 18, overflow: "hidden" },
  intentPrimaryInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 56, borderRadius: 18 },
  intentPrimaryTxt:   { fontSize: 16, fontFamily: "Inter_700Bold", color: WHITE },
  intentSecondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: BORDER, backgroundColor: WHITE },
  intentSecondaryTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: P },
  intentDismissBtn:   { alignItems: "center", paddingVertical: 14 },
  intentDismissTxt:   { fontSize: 14, fontFamily: "Inter_500Medium", color: BODY },
  existingRequestBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF5E6", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#FFD5A0" },
  existingRequestTxt:    { fontSize: 13, fontFamily: "Inter_500Medium", color: "#8B6300", flex: 1 },

  // Phone modal
  modalOverlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  phoneModal: {
    backgroundColor: BG,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingTop: 8, paddingHorizontal: 24,
    gap: 4,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20 },
      android: { elevation: 20 },
      default: {},
    }),
  },
  phoneModalHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: `${P}30`, alignSelf: "center", marginBottom: 14, marginTop: 4 },
  phoneModalTitle:    { fontSize: 18, fontFamily: "Inter_700Bold", color: DARK, textAlign: "center", marginBottom: 8 },
  phoneDisplay: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: WHITE, borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 16, alignSelf: "stretch",
    borderWidth: 1.5, borderColor: `${P}25`,
  },
  phoneDisplayTxt:    { fontSize: 20, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: 1.2, flex: 1 },
  callNowBtn:         { width: "100%", borderRadius: 18, overflow: "hidden" },
  callNowBtnInner:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 54, borderRadius: 18 },
  callNowBtnTxt:      { fontSize: 16, fontFamily: "Inter_700Bold", color: WHITE },
  phoneModalClose:    { paddingVertical: 16, alignItems: "center" },
  phoneModalCloseTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: BODY },
});
