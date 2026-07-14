import AsyncStorage from "@react-native-async-storage/async-storage";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBadge, STATUS_COLORS } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useAnimals } from "@/contexts/AnimalsContext";
import { apiGetUser, type SocialUser } from "@/lib/socialApi";
import { formatTimeAgo } from "@/utils/formatters";
import { getDefaultAnimalImageUri } from "@/utils/animalDefaults";
import type { AnimalStatus } from "@/contexts/AnimalsContext";

/* ── API helper (mirrors AnimalsContext) ───────────────────────────────────── */
const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

async function apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const token = await AsyncStorage.getItem("@canyoldasi:jwt");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...opts, headers });
}

/* ── Design tokens ─────────────────────────────────────────────────────────── */
const C = {
  purple:     "#7B5EA7",
  purpleDark: "#4A2D8F",
  purpleFaint:"rgba(123,94,167,0.08)",
  bg:         "#F8F9FC",
  white:      "#FFFFFF",
  text:       "#1A0A3C",
  muted:      "#8B8FA8",
  border:     "#EEE9F8",
  divider:    "#F3F0FB",
  red:        "#DC2626",
  green:      "#16A34A",
  amber:      "#D97706",
};

/* ── Status mapping (Ionicons only — no emoji) ──────────────────────────────── */
const STATUS_CFG: Record<AnimalStatus, {
  icon: string;
  label: string;
  color: string;
  bg: string;
}> = {
  hungry:  { icon: "warning-outline",       label: "Yardım Bekliyor", color: C.amber,  bg: "#FEF3C7" },
  injured: { icon: "medkit-outline",         label: "Acil Durum",      color: C.red,    bg: "#FEE2E2" },
  healthy: { icon: "checkmark-circle-outline",label: "Sağlıklı",        color: C.green,  bg: "#D1FAE5" },
  unknown: { icon: "help-circle-outline",    label: "Durum Bilinmiyor",color: C.muted,  bg: "#F3F4F6" },
};

const STATUS_LABEL: Record<AnimalStatus, string> = {
  hungry:  "Yardım Bekliyor",
  injured: "Acil",
  healthy: "Sağlıklı",
  unknown: "Bilinmiyor",
};

const HELP_STATUS_MAP: Record<string, { label: string; color: string }> = {
  same_location:  { label: "Aynı Bölgede",          color: "#7B5EA7" },
  injured:        { label: "Yaralı",                  color: "#DC2626" },
  emergency:      { label: "Acil Yardım Gerekli",     color: "#EA580C" },
  fed:            { label: "Beslendi",                color: "#16A34A" },
  watered:        { label: "Su Verildi",              color: "#0284C7" },
  taken_to_vet:   { label: "Tedaviye Götürüldü",      color: "#7B5EA7" },
  at_vet:         { label: "Veteriner Kontrolünde",   color: "#0EA5E9" },
  safe:           { label: "Güvende",                 color: "#16A34A" },
  adopted:        { label: "Sahiplendirildi",         color: "#7B5EA7" },
  not_found:      { label: "Bulunamadı",              color: "#8B8FA8" },
};

interface HelpUpdateItem {
  id:        string;
  animalId:  string;
  userId:    string;
  userName:  string;
  photoUrl:  string;
  status:    string;
  note:      string;
  createdAt: string;
}

/* ── Animal type display ────────────────────────────────────────────────────── */
function formatAnimalType(raw?: string): string {
  if (!raw) return "Sokak Hayvanı";
  const map: Record<string, string> = {
    cat: "Kedi", kedi: "Kedi",
    dog: "Köpek", köpek: "Köpek", kopek: "Köpek",
    bird: "Kuş", kuş: "Kuş",
    rabbit: "Tavşan",
    other: "Diğer", diğer: "Diğer",
  };
  return map[raw.toLowerCase()] ?? raw;
}

/* ── Initials avatar ────────────────────────────────────────────────────────── */
function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "?";
}

/* ── Owner Action Sheet ────────────────────────────────────────────────────── */
function OwnerSheet({
  visible,
  onClose,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 300,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [visible, slideAnim]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={OS.overlay} onPress={onClose}>
        <Animated.View style={[OS.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <Pressable>
            <View style={OS.handle} />
            <Text style={OS.title}>Bildirim İşlemleri</Text>
            <View style={OS.sep} />
            <Pressable
              style={({ pressed }) => [OS.action, pressed && OS.pressed]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onClose();
                setTimeout(onDelete, 220);
              }}
            >
              <View style={[OS.iconBox, { backgroundColor: "#FEE2E2" }]}>
                <Icon name="trash-outline" size={20} color={C.red} />
              </View>
              <Text style={[OS.actionLabel, { color: C.red }]}>Bildirimi Sil</Text>
            </Pressable>
            <View style={OS.sep} />
            <Pressable
              style={({ pressed }) => [OS.cancel, pressed && OS.pressed]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}
            >
              <Text style={OS.cancelLabel}>Vazgeç</Text>
            </Pressable>
            <View style={{ height: Platform.OS === "ios" ? 20 : 8 }} />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
const OS = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: "rgba(15,5,36,0.45)", justifyContent: "flex-end" },
  sheet:       { backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 12, elevation: 20, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20 },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D5D0E0", alignSelf: "center", marginBottom: 16 },
  title:       { fontSize: 16, fontFamily: "Inter_700Bold", color: C.text, textAlign: "center", marginBottom: 16, letterSpacing: -0.2 },
  sep:         { height: 1, backgroundColor: "#F0EBF8", marginVertical: 8, marginHorizontal: -16 },
  action:      { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 4, borderRadius: 14, minHeight: 56 },
  pressed:     { backgroundColor: "#F7F3FD" },
  iconBox:     { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionLabel: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium" },
  cancel:      { alignItems: "center", paddingVertical: 16, borderRadius: 14, marginTop: 4 },
  cancelLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.muted },
});

/* ── Compact Info Card (2-col grid) ────────────────────────────────────────── */
function InfoCard({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={IC.box}>
      <View style={IC.iconWrap}>
        <Icon name={icon} size={16} color={C.purple} />
      </View>
      <Text style={IC.label}>{label}</Text>
      <Text style={[IC.value, valueColor ? { color: valueColor } : undefined]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}
const IC = StyleSheet.create({
  box:      { flex: 1, minHeight: 94, backgroundColor: "#F8F5FF", borderRadius: 18, borderWidth: 1, borderColor: "rgba(116,79,190,0.08)", padding: 14, gap: 6 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: `${C.purple}12`, alignItems: "center", justifyContent: "center" },
  label:    { fontSize: 12, fontFamily: "Inter_500Medium", color: C.muted, marginTop: 2 },
  value:    { fontSize: 14, fontFamily: "Inter_700Bold", color: C.text, lineHeight: 19 },
});

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════════════════════════════════════ */
export default function AnimalDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { user } = useAuth();
  const { getAnimal, addComment, deleteAnimal } = useAnimals();

  const animal   = getAnimal(id ?? "");
  const isOwner  = !!user?.id && !!animal && animal.userId === user.id;

  const [commentText,        setCommentText]        = useState("");
  const [sheetVisible,       setSheetVisible]       = useState(false);
  const [deleting,           setDeleting]           = useState(false);
  const [reporter,           setReporter]           = useState<SocialUser | null>(null);
  const [isSubmitting,       setIsSubmitting]       = useState(false);
  const [locationOpenCount,  setLocationOpenCount]  = useState(0);
  const [isOpeningMap,       setIsOpeningMap]       = useState(false);

  /* ── Help updates ─── */
  const [helpUpdates,        setHelpUpdates]        = useState<HelpUpdateItem[]>([]);
  const [uniqueHelperCount,  setUniqueHelperCount]  = useState(0);
  const [helpUpdatesLoading, setHelpUpdatesLoading] = useState(false);

  const helpScale    = useRef(new Animated.Value(1)).current;
  const scrollRef    = useRef<ScrollView>(null);
  const commentsYRef = useRef(0);

  /* Fetch reporter profile for avatar */
  useEffect(() => {
    if (!animal?.userId) return;
    apiGetUser(animal.userId)
      .then((u) => { if (u) setReporter(u); })
      .catch(() => {});
  }, [animal?.userId]);

  /* Load initial location open count from API */
  useEffect(() => {
    if (!animal?.id) return;
    apiFetch(`/animals/${animal.id}`)
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => {
        const count = Number(data.locationOpenCount ?? 0);
        setLocationOpenCount(count);
      })
      .catch(() => {});
  }, [animal?.id]);

  /* ── Fetch help updates ─── */
  const fetchHelpUpdates = useCallback(async () => {
    if (!animal?.id) return;
    setHelpUpdatesLoading(true);
    try {
      const res = await apiFetch(`/animals/${animal.id}/help-updates`);
      if (res.ok) {
        const data = await res.json() as { updates: HelpUpdateItem[]; uniqueHelperCount: number };
        setHelpUpdates(data.updates ?? []);
        setUniqueHelperCount(data.uniqueHelperCount ?? 0);
      }
    } catch (err) {
      if (__DEV__) console.warn("[HELP FLOW] fetchHelpUpdates error:", err);
    } finally {
      setHelpUpdatesLoading(false);
    }
  }, [animal?.id]);

  useEffect(() => { fetchHelpUpdates(); }, [fetchHelpUpdates]);

  useFocusEffect(useCallback(() => {
    if (__DEV__) console.log("[HELP FLOW] update flow mounted, animalId:", animal?.id);
    fetchHelpUpdates();
  }, [fetchHelpUpdates]));

  /* ── Handlers ─── */
  const handleHelp = useCallback(() => {
    if (!animal) return;
    if (__DEV__) {
      console.log("[HELP FLOW] Visible Yardım Et pressed");
      console.log("[HELP FLOW] Opening animal help update flow");
      console.log("[HELP FLOW] post id:", animal.id);
      console.log("[HELP FLOW] authenticated user:", user?.id ?? "none");
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/help-update/${animal.id}`);
  }, [animal, router, user]);

  const handleComment = useCallback(async () => {
    const t = commentText.trim();
    if (!t) return;
    if (!user) { Alert.alert("Giriş gerekli", "Yorum yapmak için giriş yapın."); return; }
    if (!animal) return;
    await addComment(animal.id, { userId: user.id, userName: user.name, text: t });
    setCommentText("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [commentText, user, animal, addComment]);

  const handleMapOpen = useCallback(async () => {
    if (!animal || isOpeningMap) return;
    setIsOpeningMap(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const lat   = animal.latitude;
    const lng   = animal.longitude;
    const label = encodeURIComponent(animal.locationName ?? "Sokak Hayvanı");

    /* No location data at all */
    if (!lat && !lng && !animal.locationName) {
      Alert.alert("Konum Bilgisi Yok", "Bu bildirim için konum bilgisi bulunmuyor.");
      setIsOpeningMap(false);
      return;
    }

    /* Record the location open event before opening the map */
    try {
      const res = await apiFetch(`/animals/${animal.id}/location-open`, { method: "POST" });
      if (res.ok) {
        const data = await res.json() as { locationOpenCount: number };
        setLocationOpenCount(data.locationOpenCount);
      }
    } catch { /* non-critical — map still opens */ }

    const openMap = async (url: string, fallbackUrl?: string) => {
      const supported = await Linking.canOpenURL(url).catch(() => false);
      if (supported) {
        await Linking.openURL(url);
      } else if (fallbackUrl) {
        await Linking.openURL(fallbackUrl).catch(() => {
          Alert.alert("Hata", "Harita uygulaması açılamadı.");
        });
      } else {
        Alert.alert("Hata", "Harita uygulaması açılamadı.");
      }
    };

    /* Web — open Google Maps in browser */
    if (Platform.OS === "web") {
      const url = lat && lng
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${label}`;
      await Linking.openURL(url);
      setIsOpeningMap(false);
      return;
    }

    if (lat && lng) {
      if (Platform.OS === "ios") {
        /* Check if Google Maps is available, offer choice if so */
        const gmapsScheme = `comgooglemaps://?center=${lat},${lng}&q=${lat},${lng}`;
        const gmapsAvailable = await Linking.canOpenURL(gmapsScheme).catch(() => false);
        if (gmapsAvailable) {
          Alert.alert(
            "Haritada Aç",
            undefined,
            [
              { text: "Apple Haritalar", onPress: () => {
                const appleUrl = `https://maps.apple.com/?ll=${lat},${lng}&q=${label}`;
                Linking.openURL(appleUrl).catch(() => Alert.alert("Hata", "Apple Haritalar açılamadı."));
              }},
              { text: "Google Maps", onPress: () => {
                Linking.openURL(gmapsScheme).catch(() => Alert.alert("Hata", "Google Maps açılamadı."));
              }},
              { text: "Vazgeç", style: "cancel" },
            ]
          );
        } else {
          const appleUrl = `https://maps.apple.com/?ll=${lat},${lng}&q=${label}`;
          await openMap(appleUrl);
        }
      } else {
        /* Android — geo URI, fallback to Google Maps web */
        const geoUrl      = `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        await openMap(geoUrl, fallbackUrl);
      }
    } else {
      /* Coordinates missing — search by address text */
      const searchQuery = encodeURIComponent(animal.locationName ?? "");
      if (Platform.OS === "ios") {
        await openMap(`https://maps.apple.com/?q=${searchQuery}`);
      } else {
        const geoUrl      = `geo:0,0?q=${searchQuery}`;
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
        await openMap(geoUrl, fallbackUrl);
      }
    }

    setIsOpeningMap(false);
  }, [animal, isOpeningMap]);

  const handleShare = useCallback(async () => {
    if (!animal) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({ message: `CanYoldaşı: ${animal.notes} — ${animal.locationName ?? ""}` });
  }, [animal]);

  const handleDeleteRequest = useCallback(() => {
    Alert.alert(
      "Bildirimi sil?",
      "Bu sokak hayvanı bildirimi kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            if (!user?.id || !animal) return;
            setDeleting(true);
            try {
              await deleteAnimal(animal.id, user.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch {
              Alert.alert("Hata", "Bildirim silinemedi. Lütfen tekrar deneyin.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [user, animal, deleteAnimal, router]);

  /* ── Not found ─── */
  if (!animal) {
    return (
      <View style={D.center}>
        <View style={D.notFoundIcon}>
          <Icon name="alert-circle-outline" size={36} color={C.muted} />
        </View>
        <Text style={D.notFoundTitle}>Bildirim bulunamadı</Text>
        <Text style={D.notFoundSub}>Bu ilan silinmiş ya da mevcut değil.</Text>
        <Pressable onPress={() => router.back()} style={D.backBtn}>
          <Text style={D.backBtnText}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  /* ── Derived values ─── */
  const topPad      = Platform.OS === "web" ? 16 : insets.top;
  const statusCfg   = STATUS_CFG[animal.status];
  const statusDotColor = STATUS_COLORS[animal.status];
  /* `helped` is derived purely from context — no local state offset */
  const helped      = !!user && animal.needsHelpByUsers.some(
    (u) => u === user.id || u === "_current_user_"
  );
  const helpCount   = uniqueHelperCount;
  const thumbUri    = animal.image ?? animal.animalImage ?? getDefaultAnimalImageUri(animal.animalType);
  const animalLabel = formatAnimalType(animal.animalType);

  /* Date formatted */
  const dateStr = (() => {
    try {
      return new Date(animal.timestamp).toLocaleDateString("tr-TR", {
        day: "numeric", month: "long", year: "numeric",
      });
    } catch { return formatTimeAgo(animal.timestamp); }
  })();

  /* Reporter display name */
  const reporterName = reporter?.username ? `@${reporter.username}` : animal.userName;
  const reporterAvatar = reporter?.avatarUrl;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <OwnerSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onDelete={handleDeleteRequest}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.bottom + 80}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        >
          {/* ══════════════════════════════════════════
              HERO IMAGE
          ══════════════════════════════════════════ */}
          <View style={D.imageWrap}>
            {animal.image ? (
              <Image
                source={{ uri: animal.image }}
                style={D.heroImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={D.imagePlaceholder}>
                <View style={D.placeholderIconWrap}>
                  <Icon name="camera-outline" size={36} color="#B0A8CC" />
                </View>
                <Text style={D.imagePlaceholderText}>Henüz fotoğraf eklenmemiş</Text>
              </View>
            )}

            {/* Subtle top gradient — only for button legibility */}
            <LinearGradient
              colors={["rgba(0,0,0,0.38)", "transparent"]}
              style={D.imageOverlayTop}
            />

            {/* Bottom gradient for status badge */}
            {animal.image && (
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.28)"]}
                style={D.imageOverlayBottom}
              />
            )}

            {/* Top nav bar */}
            <View style={[D.topBar, { paddingTop: topPad + 10 }]}>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
                style={D.circleBtn}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Geri dön"
              >
                <Icon name="arrow-back" size={19} color="#FFF" />
              </Pressable>
              <View style={D.topBarRight}>
                {isOwner && (
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSheetVisible(true); }}
                    style={[D.circleBtn, deleting && { opacity: 0.4 }]}
                    hitSlop={12}
                    disabled={deleting}
                    accessibilityRole="button"
                    accessibilityLabel="Bildirim işlemleri"
                  >
                    <Icon name="ellipsis-horizontal" size={18} color="#FFF" />
                  </Pressable>
                )}
                <Pressable
                  onPress={handleShare}
                  style={D.circleBtn}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Paylaş"
                >
                  <Icon name="share-outline" size={18} color="#FFF" />
                </Pressable>
              </View>
            </View>

            {/* Status badge — lower left of image */}
            <View style={D.imageBadgeWrap}>
              <View style={[D.statusDot, { backgroundColor: statusDotColor }]} />
              <StatusBadge status={animal.status} size="sm" />
            </View>
          </View>

          {/* ══════════════════════════════════════════
              CONTENT CARD
          ══════════════════════════════════════════ */}
          <View style={D.card}>

            {/* Title — notes text, shown once */}
            <Text style={D.noteTitle} numberOfLines={4}>
              {animal.notes
                ? animal.notes
                : `${statusCfg.label} sokak hayvanı bildirimi`}
            </Text>

            {/* Reporter row — static, not tappable */}
            <View style={D.reporterRow}>
              {/* Avatar */}
              {reporterAvatar ? (
                <Image source={{ uri: reporterAvatar }} style={D.avatar} contentFit="cover" transition={180} />
              ) : (
                <View style={D.avatarFallback}>
                  <Text style={D.avatarInitials}>{initialsOf(animal.userName)}</Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={D.reporterName}>{reporterName || animal.userName}</Text>
                <Text style={D.reporterTime}>{formatTimeAgo(animal.timestamp)}</Text>
              </View>
            </View>

            {/* Location row (separate, tappable) */}
            {(animal.locationName || (animal.latitude !== 0 && animal.longitude !== 0)) ? (
              <Pressable style={D.locRow} onPress={handleMapOpen} accessibilityRole="button">
                <Icon name="location-outline" size={15} color={C.purple} />
                <Text style={D.locText} numberOfLines={1}>
                  {animal.locationName ?? `${animal.latitude.toFixed(4)}, ${animal.longitude.toFixed(4)}`}
                </Text>
              </Pressable>
            ) : null}

            {/* Hayvanın Durumu — description section */}
            <View style={D.section}>
              <Text style={D.sectionTitle}>Hayvanın Durumu</Text>
              <Text style={D.descText}>
                {animal.notes
                  ? animal.notes
                  : "Bu bildirim için ek açıklama bulunmuyor."}
              </Text>
            </View>

            {/* Durum Bilgileri — 2×2 grid */}
            <View style={D.section}>
              <Text style={D.sectionTitle}>Durum Bilgileri</Text>
              <View style={D.infoGrid}>
                <View style={D.infoRow}>
                  <InfoCard
                    icon="time-outline"
                    label="Bildirim Tarihi"
                    value={dateStr}
                  />
                  <InfoCard
                    icon="location-outline"
                    label="Konum"
                    value={
                      animal.locationName
                        ? animal.locationName
                        : (animal.latitude !== 0 && animal.longitude !== 0)
                          ? `${animal.latitude.toFixed(4)}, ${animal.longitude.toFixed(4)}`
                          : "Belirtilmedi"
                    }
                  />
                </View>
                <View style={D.infoRow}>
                  <InfoCard
                    icon={statusCfg.icon}
                    label="Durum"
                    value={STATUS_LABEL[animal.status]}
                    valueColor={statusCfg.color}
                  />
                  <InfoCard
                    icon="paw-outline"
                    label="Tür"
                    value={animalLabel}
                  />
                </View>
              </View>
            </View>

            {/* Map preview */}
            <View style={D.section}>
              <Text style={D.sectionTitle}>Konum</Text>
              <Pressable style={D.mapPreview} onPress={handleMapOpen} accessibilityRole="button">
                <LinearGradient colors={["#EDE9F8", "#DDD5F5"]} style={D.mapGradient}>
                  <View style={D.mapPinWrap}>
                    <Icon name="location" size={28} color={C.purple} />
                  </View>
                  <Text style={D.mapCoords}>
                    {animal.locationName ?? `${animal.latitude.toFixed(4)}, ${animal.longitude.toFixed(4)}`}
                  </Text>
                </LinearGradient>
                <View style={D.mapOpenRow}>
                  <Icon name="map-outline" size={15} color={C.purple} />
                  <Text style={D.mapOpenText}>Haritada Aç</Text>
                  <Icon name="chevron-forward" size={14} color={C.purple} />
                </View>
              </Pressable>
            </View>

            {/* Etkileşim stats */}
            <View style={D.section}>
              <Text style={D.sectionTitle}>Etkileşim</Text>
              <View style={D.statsRow}>
                <StatCard
                  icon="heart-outline"
                  iconColor={C.purple}
                  value={helpCount}
                  label="Yardımcı Oldu"
                  onPress={handleHelp}
                  scale={helpScale}
                />
                <StatCard
                  icon="chatbubble-outline"
                  iconColor={C.purple}
                  value={animal.comments.length}
                  label="Yorum"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    scrollRef.current?.scrollTo({ y: commentsYRef.current, animated: true });
                  }}
                />
                <StatCard
                  icon="location-outline"
                  iconColor={C.purple}
                  value={locationOpenCount}
                  label="Konum Açıldı"
                  onPress={handleMapOpen}
                />
              </View>
            </View>

            {/* Durum Güncellemeleri */}
            <View style={D.section}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <Text style={D.sectionTitle}>
                  {uniqueHelperCount > 0 ? `Durum Güncellemeleri (${uniqueHelperCount})` : "Durum Güncellemeleri"}
                </Text>
                <Pressable
                  onPress={handleHelp}
                  style={{ backgroundColor: `${C.purple}12`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}
                >
                  <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.purple }}>
                    + Güncelle
                  </Text>
                </Pressable>
              </View>
              {helpUpdatesLoading ? (
                <View style={{ alignItems: "center", paddingVertical: 20 }}>
                  <ActivityIndicator size="small" color={C.purple} />
                </View>
              ) : helpUpdates.length === 0 ? (
                <Pressable
                  style={{ alignItems: "center", gap: 10, paddingVertical: 28, backgroundColor: "#F8F5FF", borderRadius: 18 }}
                  onPress={handleHelp}
                >
                  <Icon name="heart-outline" size={28} color="#C0B8D8" />
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.purple }}>
                    İlk Güncellemeyi Ekle
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: C.muted, textAlign: "center", paddingHorizontal: 24 }}>
                    Bu hayvanı gördüysen güncel durumunu bildir
                  </Text>
                </Pressable>
              ) : (
                <View style={{ gap: 12 }}>
                  {helpUpdates.slice(0, 3).map((u) => (
                    <View key={u.id} style={{ backgroundColor: "#F8F5FF", borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: "rgba(116,79,190,0.08)" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${C.purple}18`, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: C.purple }}>
                            {initialsOf(u.userName || "?")}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text }}>
                            {u.userName || "Anonim"}
                          </Text>
                          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: C.muted }}>
                            {formatTimeAgo(u.createdAt)}
                          </Text>
                        </View>
                        <View style={{
                          backgroundColor: `${(HELP_STATUS_MAP[u.status]?.color ?? C.purple)}18`,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 10,
                        }}>
                          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: HELP_STATUS_MAP[u.status]?.color ?? C.purple }}>
                            {HELP_STATUS_MAP[u.status]?.label ?? u.status}
                          </Text>
                        </View>
                      </View>
                      {!!u.photoUrl && (
                        <Image
                          source={{ uri: u.photoUrl }}
                          style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 12 }}
                          contentFit="cover"
                        />
                      )}
                      {!!u.note && (
                        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: C.muted, lineHeight: 19 }}>
                          {u.note}
                        </Text>
                      )}
                    </View>
                  ))}
                  {helpUpdates.length > 3 && (
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: C.muted, textAlign: "center" }}>
                      +{helpUpdates.length - 3} güncelleme daha
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Comments */}
            <View
              style={D.section}
              onLayout={(e) => { commentsYRef.current = e.nativeEvent.layout.y; }}
            >
              <Text style={D.sectionTitle}>
                Yorumlar{animal.comments.length > 0 ? ` (${animal.comments.length})` : ""}
              </Text>
              {animal.comments.length === 0 ? (
                <View style={D.emptyComments}>
                  <Icon name="chatbubbles-outline" size={24} color="#C0B8D8" />
                  <Text style={D.noComment}>Henüz yorum yok. İlk yorumu sen yap!</Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {animal.comments.map((c) => (
                    <View key={c.id} style={D.commentRow}>
                      <View style={D.commentAvatar}>
                        <Text style={D.commentAvatarText}>{initialsOf(c.userName)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={D.commentHeader}>
                          <Text style={D.commentUser}>{c.userName}</Text>
                          <Text style={D.commentTime}>{formatTimeAgo(c.timestamp)}</Text>
                        </View>
                        <Text style={D.commentText}>{c.text}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Comment input */}
              <View style={D.inputRow}>
                <TextInput
                  style={D.input}
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Yorum ekle..."
                  placeholderTextColor={C.muted}
                  returnKeyType="send"
                  onSubmitEditing={handleComment}
                />
                <Pressable onPress={handleComment} style={D.sendBtn} hitSlop={10} accessibilityRole="button">
                  <View style={D.sendCircle}>
                    <Icon name="send" size={14} color="#FFF" />
                  </View>
                </Pressable>
              </View>
            </View>

            <Text style={D.footer}>Küçük bir destek, büyük bir hayat kurtarır.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ══════════════════════════════════════════
          STICKY BOTTOM ACTION BAR
      ══════════════════════════════════════════ */}
      <View style={[D.actionBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          style={({ pressed }) => [D.actionOutline, pressed && { opacity: 0.8 }]}
          onPress={handleComment}
          accessibilityRole="button"
          accessibilityLabel="Yorum yap"
        >
          <Icon name="chatbubble-outline" size={18} color={C.purple} />
          <Text style={D.actionOutlineText}>Yorum Yap</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [{ flex: 1.4 }, pressed && { opacity: 0.9 }]}
          onPress={handleHelp}
          accessibilityRole="button"
          accessibilityLabel="Yardım et"
        >
          <Animated.View style={{ transform: [{ scale: helpScale }] }}>
            <LinearGradient
              colors={["#9C7FE0", "#5B3FD6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={D.actionFill}
            >
              <Icon name="heart-outline" size={18} color="#FFF" />
              <Text style={D.actionFillText}>Yardım Et</Text>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

/* ── StatCard ────────────────────────────────────────────────────────────── */
function StatCard({
  icon,
  iconColor,
  value,
  label,
  onPress,
  scale,
}: {
  icon: string;
  iconColor: string;
  value: number;
  label: string;
  onPress: () => void;
  scale?: Animated.Value;
}) {
  const localScale = useRef(new Animated.Value(1)).current;
  const s = scale ?? localScale;
  return (
    <Pressable
      style={D.statBox}
      onPress={onPress}
      onPressIn={() => Animated.timing(s, { toValue: 0.93, duration: 70, useNativeDriver: true }).start()}
      onPressOut={() => Animated.timing(s, { toValue: 1,   duration: 140, useNativeDriver: true }).start()}
      accessibilityRole="button"
    >
      <Animated.View style={[{ alignItems: "center", gap: 6 }, { transform: [{ scale: s }] }]}>
        <View style={D.statIconWrap}>
          <Icon name={icon} size={21} color={iconColor} />
        </View>
        <Text style={D.statNum}>{value}</Text>
        <Text style={D.statLabel}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const D = StyleSheet.create({
  /* Not found */
  center:         { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: C.bg, padding: 24 },
  notFoundIcon:   { width: 72, height: 72, borderRadius: 20, backgroundColor: "#EEE9F8", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  notFoundTitle:  { fontSize: 17, fontFamily: "Inter_700Bold", color: C.text },
  notFoundSub:    { fontSize: 13, fontFamily: "Inter_400Regular", color: C.muted },
  backBtn:        { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: C.purple, borderRadius: 14 },
  backBtnText:    { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },

  /* Hero */
  imageWrap:      { position: "relative", backgroundColor: "#EDE9F8" },
  heroImage:      { width: "100%", height: 300 },
  imagePlaceholder: { width: "100%", height: 300, backgroundColor: "#EDE9F8", alignItems: "center", justifyContent: "center", gap: 12 },
  placeholderIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: "rgba(123,94,167,0.10)", alignItems: "center", justifyContent: "center" },
  imagePlaceholderText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#B0A8CC" },
  imageOverlayTop: { position: "absolute", top: 0, left: 0, right: 0, height: 130 },
  imageOverlayBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: 90 },

  /* Top nav */
  topBar:         { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  topBarRight:    { flexDirection: "row", gap: 10 },
  circleBtn:      { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(20,12,40,0.35)", alignItems: "center", justifyContent: "center" },

  /* Image badge */
  imageBadgeWrap: { position: "absolute", bottom: 36, left: 16, flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot:      { width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: "#FFF" },

  /* Content card */
  card:           { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -22, paddingHorizontal: 20, paddingTop: 26, paddingBottom: 8, shadowColor: "#1E0B4B", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },

  noteTitle:      { fontSize: 21, fontFamily: "Inter_700Bold", color: C.text, lineHeight: 30, letterSpacing: -0.4, marginBottom: 18 },

  /* Reporter */
  reporterRow:    { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10, paddingVertical: 4 },
  avatar:         { width: 42, height: 42, borderRadius: 21, backgroundColor: C.border, flexShrink: 0 },
  avatarFallback: { width: 42, height: 42, borderRadius: 21, backgroundColor: `${C.purple}18`, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarInitials: { fontSize: 14, fontFamily: "Inter_700Bold", color: C.purple },
  reporterName:   { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },
  reporterTime:   { fontSize: 12, fontFamily: "Inter_400Regular", color: C.muted, marginTop: 1 },

  /* Location row */
  locRow:         { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 24, paddingHorizontal: 2 },
  locText:        { fontSize: 13, fontFamily: "Inter_400Regular", color: C.muted, flex: 1 },

  /* Sections */
  section:        { marginTop: 24 },
  sectionTitle:   { fontSize: 16, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 14, letterSpacing: -0.2 },
  descText:       { fontSize: 15, fontFamily: "Inter_400Regular", color: C.muted, lineHeight: 23 },

  /* Info grid */
  infoGrid:       { gap: 10 },
  infoRow:        { flexDirection: "row", gap: 10 },

  /* Map */
  mapPreview:     { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  mapGradient:    { height: 110, alignItems: "center", justifyContent: "center", gap: 8 },
  mapPinWrap:     {},
  mapCoords:      { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.purpleDark, textAlign: "center", paddingHorizontal: 16 },
  mapOpenRow:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border },
  mapOpenText:    { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.purple },

  /* Stats */
  statsRow:       { flexDirection: "row", gap: 10 },
  statBox:        { flex: 1, backgroundColor: "#F8F5FF", borderRadius: 18, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(116,79,190,0.08)" },
  statIconWrap:   { width: 44, height: 44, borderRadius: 22, backgroundColor: `${C.purple}12`, alignItems: "center", justifyContent: "center" },
  statNum:        { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text },
  statLabel:      { fontSize: 11, fontFamily: "Inter_500Medium", color: C.muted, textAlign: "center" },

  /* Comments */
  emptyComments:  { alignItems: "center", gap: 8, paddingVertical: 24, backgroundColor: "#F8F5FF", borderRadius: 18 },
  noComment:      { fontSize: 13, fontFamily: "Inter_400Regular", color: C.muted, textAlign: "center", paddingHorizontal: 24 },
  commentRow:     { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  commentAvatar:  { width: 34, height: 34, borderRadius: 17, backgroundColor: `${C.purple}14`, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  commentAvatarText: { fontSize: 12, fontFamily: "Inter_700Bold", color: C.purple },
  commentHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  commentUser:    { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text },
  commentTime:    { fontSize: 11, fontFamily: "Inter_400Regular", color: C.muted },
  commentText:    { fontSize: 13.5, fontFamily: "Inter_400Regular", color: C.muted, lineHeight: 19 },

  /* Comment input */
  inputRow:       { flexDirection: "row", alignItems: "center", backgroundColor: "#F8F5FF", borderRadius: 18, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 6, gap: 8, marginTop: 16 },
  input:          { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: C.text, paddingVertical: 8, minHeight: 40 },
  sendBtn:        {},
  sendCircle:     { width: 36, height: 36, borderRadius: 18, backgroundColor: C.purple, alignItems: "center", justifyContent: "center" },

  footer:         { fontSize: 12, fontFamily: "Inter_400Regular", color: C.muted, textAlign: "center", marginTop: 28, marginBottom: 8 },

  /* Sticky action bar */
  actionBar:      { backgroundColor: C.white, borderTopWidth: 1, borderTopColor: "rgba(30,20,50,0.06)", paddingHorizontal: 16, paddingTop: 12, flexDirection: "row", gap: 12 },
  actionOutline:  { flex: 1, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: C.purple, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  actionOutlineText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.purple },
  actionFill:     { height: 52, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  actionFillText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
