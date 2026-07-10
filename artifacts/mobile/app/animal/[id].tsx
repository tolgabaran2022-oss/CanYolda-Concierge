import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
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
import { formatTimeAgo } from "@/utils/formatters";

const C = {
  purple:     "#7B5EA7",
  purpleDark: "#4A2D8F",
  bg:         "#F8F9FC",
  white:      "#FFFFFF",
  text:       "#1A0A3C",
  muted:      "#8B8FA8",
  border:     "#EEE9F8",
  divider:    "#F3F0FB",
};

const STATUS_CONFIG = {
  hungry:  { emoji: "🟡", label: "Mama Bekliyor",   accentBg: "#FEF3C7", accentText: "#92400E" },
  injured: { emoji: "🔴", label: "Acil Durum",      accentBg: "#FEE2E2", accentText: "#991B1B" },
  healthy: { emoji: "🟢", label: "Güvende",         accentBg: "#D1FAE5", accentText: "#065F46" },
  unknown: { emoji: "⚪", label: "Durum Bilinmiyor", accentBg: "#F3F4F6", accentText: "#374151" },
};

function PressableScale({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() =>
        Animated.timing(scale, { toValue: 0.95, duration: 80, useNativeDriver: true }).start()
      }
      onPressOut={() =>
        Animated.timing(scale, { toValue: 1, duration: 140, useNativeDriver: true }).start()
      }
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export default function AnimalDetailScreen() {
  const T        = useTheme();
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { user } = useAuth();
  const { getAnimal, toggleNeedsHelp, addComment } = useAnimals();

  const animal = getAnimal(id ?? "");
  const [commentText, setCommentText] = useState("");
  const [helped,      setHelped]      = useState(false);
  const [mapOpened,   setMapOpened]   = useState(0);
  const helpScale = useRef(new Animated.Value(1)).current;

  if (!animal) {
    return (
      <View style={[D.center, { paddingTop: insets.top }]}>
        <View style={D.notFoundIcon}>
          <Ionicons name="alert-circle-outline" size={36} color={C.muted} />
        </View>
        <Text style={D.notFoundTitle}>Hayvan bulunamadı</Text>
        <Text style={D.notFoundSub}>Bu ilan silinmiş olabilir.</Text>
        <Pressable onPress={() => router.back()} style={D.backBtn}>
          <Text style={D.backBtnText}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  const statusDotColor = STATUS_COLORS[animal.status];
  const statusCfg      = STATUS_CONFIG[animal.status];
  const helpCount      = animal.needsHelpByUsers.length + (helped ? 1 : 0);

  const handleHelp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHelped((v) => !v);
    Animated.sequence([
      Animated.timing(helpScale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(helpScale, { toValue: 1,    duration: 160, useNativeDriver: true }),
    ]).start();
    if (user) await toggleNeedsHelp(animal.id, user.id);
  };

  const handleComment = async () => {
    const t = commentText.trim();
    if (!t) return;
    if (!user) { Alert.alert("Giriş gerekli", "Yorum yapmak için giriş yapın."); return; }
    await addComment(animal.id, { userId: user.id, userName: user.name, text: t });
    setCommentText("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleMapOpen = () => {
    setMapOpened((n) => n + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Konumu Aç",
      animal.locationName
        ? `${animal.locationName} konumunu haritada açmak istiyor musunuz?`
        : `${animal.latitude.toFixed(4)}, ${animal.longitude.toFixed(4)}`,
      [{ text: "İptal", style: "cancel" }, { text: "Aç", style: "default" }]
    );
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      message: `CanYoldaşı: ${animal.notes} — ${animal.locationName ?? ""}`,
    });
  };

  const animalType = "🐾 Sokak Hayvanı";

  const statusLabel =
    animal.status === "hungry"  ? "Aç"
    : animal.status === "injured" ? "Yaralı"
    : animal.status === "healthy" ? "Sağlıklı"
    : "Bilinmiyor";

  const topPad = Platform.OS === "web" ? 16 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.bottom + 80}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        >
          {/* ── Hero image ──────────────────────────── */}
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
                  <Ionicons name="camera-outline" size={36} color="#B0A8CC" />
                </View>
                <Text style={D.imagePlaceholderText}>Henüz fotoğraf eklenmemiş</Text>
              </View>
            )}

            {/* Top gradient for header legibility */}
            {animal.image && (
              <LinearGradient
                colors={["rgba(0,0,0,0.52)", "transparent"]}
                style={D.imageOverlayTop}
              />
            )}

            {/* Top bar */}
            <View style={[D.topBar, { paddingTop: topPad + 12 }]}>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
                style={[D.circleBtn, !animal.image && D.circleBtnDark]}
                hitSlop={12}
              >
                <Ionicons
                  name="arrow-back"
                  size={19}
                  color={animal.image ? "#FFF" : C.purpleDark}
                />
              </Pressable>
              <Pressable
                onPress={handleShare}
                style={[D.circleBtn, !animal.image && D.circleBtnDark]}
                hitSlop={12}
              >
                <Feather name="share" size={17} color={animal.image ? "#FFF" : C.purpleDark} />
              </Pressable>
            </View>

            {/* Status overlay (only on photo) */}
            {animal.image && (
              <View style={D.imageBadgeWrap}>
                <View style={[D.statusDot, { backgroundColor: statusDotColor }]} />
                <StatusBadge status={animal.status} size="sm" />
              </View>
            )}
          </View>

          {/* ── White content card ───────────────────── */}
          <View style={[D.card, { backgroundColor: T.card }]}>

            {/* Status indicator row (always visible) */}
            <View style={D.statusRow}>
              <View style={[D.statusPill, { backgroundColor: statusCfg.accentBg }]}>
                <Text style={D.statusPillEmoji}>{statusCfg.emoji}</Text>
                <Text style={[D.statusPillText, { color: statusCfg.accentText }]}>
                  {statusCfg.label}
                </Text>
              </View>
              {!animal.image && (
                <View style={D.typePill}>
                  <Text style={D.typePillText}>{animalType}</Text>
                </View>
              )}
            </View>

            {/* Title */}
            <Text style={[D.noteTitle, { color: T.text }]}>{animal.notes}</Text>

            {/* Reporter row */}
            <View style={D.reporterRow}>
              <View style={D.avatarCircle}>
                <Ionicons name="person" size={15} color={T.purple} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={[D.reporterName, { color: T.text }]}>{animal.userName}</Text>
                <Text style={[D.reporterTime, { color: T.textMuted }]}>{formatTimeAgo(animal.timestamp)}</Text>
              </View>
              <View style={D.locPill}>
                <Ionicons name="location-outline" size={12} color={C.purple} />
                <Text style={D.locPillText} numberOfLines={1}>
                  {animal.locationName ?? "Konum Yok"}
                </Text>
              </View>
            </View>

            <View style={[D.divider, { backgroundColor: T.divider }]} />

            {/* Description */}
            <Text style={[D.sectionTitle, { color: T.text }]}>Hayvanın Durumu</Text>
            <Text style={[D.descText, { color: T.textMuted }]}>{animal.notes}</Text>

            <View style={[D.divider, { backgroundColor: T.divider }]} />

            {/* Info grid — 2×3 */}
            <Text style={[D.sectionTitle, { color: T.text }]}>Durum Bilgileri</Text>
            <View style={D.infoGrid}>
              <InfoCard
                icon="time-outline"
                label="Bildirim Tarihi"
                value={formatTimeAgo(animal.timestamp)}
              />
              <InfoCard
                icon="location-outline"
                label="Konum"
                value={animal.locationName ?? "Belirtilmedi"}
              />
              <InfoCard
                icon="information-circle-outline"
                label="Durum"
                value={statusLabel}
                accent={statusCfg.accentText}
              />
              <InfoCard
                icon="paw-outline"
                label="Tür"
                value={animalType}
              />
              <InfoCard
                icon="transgender-outline"
                label="Cinsiyet"
                value="Bilinmiyor"
              />
              <InfoCard
                icon="calendar-outline"
                label="Tahmini Yaş"
                value="Bilinmiyor"
              />
            </View>

            <View style={[D.divider, { backgroundColor: T.divider }]} />

            {/* Map preview section */}
            <Text style={[D.sectionTitle, { color: T.text }]}>Konum</Text>
            <Pressable
              style={D.mapPreview}
              onPress={handleMapOpen}
            >
              <LinearGradient
                colors={["#EDE9F8", "#DDD5F5"]}
                style={D.mapGradient}
              >
                <View style={D.mapPinWrap}>
                  <Ionicons name="location" size={28} color={C.purple} />
                </View>
                <Text style={D.mapCoords}>
                  {animal.locationName
                    ? animal.locationName
                    : `${animal.latitude.toFixed(4)}, ${animal.longitude.toFixed(4)}`}
                </Text>
              </LinearGradient>
              <View style={[D.mapOpenRow, { backgroundColor: T.card, borderTopColor: T.border }]}>
                <Ionicons name="map-outline" size={15} color={T.purple} />
                <Text style={[D.mapOpenText, { color: T.purple }]}>Haritada Aç</Text>
                <Ionicons name="chevron-forward" size={14} color={T.purple} />
              </View>
            </Pressable>

            <View style={[D.divider, { backgroundColor: T.divider }]} />

            {/* Interaction stats */}
            <Text style={[D.sectionTitle, { color: T.text }]}>Etkileşim</Text>
            <View style={D.statsRow}>
              <StatCard
                icon={helped ? "heart" : "heart-outline"}
                iconColor={helped ? "#EF4444" : C.purple}
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
                onPress={() => {}}
              />
              <StatCard
                icon="location-outline"
                iconColor={C.purple}
                value={mapOpened}
                label="Konum Açıldı"
                onPress={handleMapOpen}
              />
            </View>

            <View style={[D.divider, { backgroundColor: T.divider }]} />

            {/* Comments */}
            <Text style={[D.sectionTitle, { color: T.text }]}>
              Yorumlar{animal.comments.length > 0 ? ` (${animal.comments.length})` : ""}
            </Text>
            {animal.comments.length === 0 ? (
              <View style={[D.emptyComments, { backgroundColor: T.bgSecondary }]}>
                <Ionicons name="chatbubbles-outline" size={24} color="#C0B8D8" />
                <Text style={[D.noComment, { color: T.textMuted }]}>Henüz yorum yok. İlk yorumu sen yap!</Text>
              </View>
            ) : (
              animal.comments.map((c) => (
                <View key={c.id} style={D.commentRow}>
                  <View style={D.commentAvatar}>
                    <Ionicons name="person" size={12} color={T.purple} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={D.commentHeader}>
                      <Text style={[D.commentUser, { color: T.text }]}>{c.userName}</Text>
                      <Text style={[D.commentTime, { color: T.textFaint }]}>{formatTimeAgo(c.timestamp)}</Text>
                    </View>
                    <Text style={[D.commentText, { color: T.textMuted }]}>{c.text}</Text>
                  </View>
                </View>
              ))
            )}

            {/* Comment input */}
            <View style={[D.inputRow, { backgroundColor: T.bgSecondary, borderColor: T.border }]}>
              <TextInput
                style={[D.input, { color: T.text }]}
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Yorum ekle..."
                placeholderTextColor={T.placeholder}
                returnKeyType="send"
                onSubmitEditing={handleComment}
              />
              <Pressable onPress={handleComment} style={D.sendBtn} hitSlop={10}>
                <View style={D.sendCircle}>
                  <Ionicons name="send" size={15} color="#FFF" />
                </View>
              </Pressable>
            </View>

            <Text style={[D.footer, { color: T.textFaint }]}>Küçük bir destek, büyük bir hayat kurtarır. 🙏</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Sticky action bar ───────────────────── */}
      <View style={[D.actionBar, { backgroundColor: T.card, borderTopColor: T.border }]}>
        <PressableScale onPress={handleMapOpen} style={D.actionOutline}>
          <Ionicons name="chatbubble-outline" size={19} color={C.purple} />
          <Text style={D.actionOutlineText}>Yorum Yap</Text>
        </PressableScale>

        <Pressable onPress={handleHelp} style={{ flex: 1 }}>
          <Animated.View style={{ transform: [{ scale: helpScale }] }}>
            <LinearGradient
              colors={helped ? ["#F87171", "#EF4444"] : ["#9C7FE0", "#5B3FD6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={D.actionFill}
            >
              <Ionicons
                name={helped ? "heart" : "heart-outline"}
                size={19}
                color="#FFF"
              />
              <Text style={D.actionFillText}>
                {helped ? "Yardım Edildi!" : "Yardım Et"}
              </Text>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function InfoCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: string;
}) {
  const T = useTheme();
  return (
    <View style={[D.infoBox, { backgroundColor: T.bgSecondary, borderColor: T.border }]}>
      <View style={D.infoIconWrap}>
        <Ionicons name={icon as any} size={16} color={T.purple} />
      </View>
      <Text style={[D.infoLabel, { color: T.textMuted }]}>{label}</Text>
      <Text style={[D.infoValue, { color: T.text }, accent ? { color: accent } : undefined]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

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
  const T = useTheme();
  const localScale = useRef(new Animated.Value(1)).current;
  const s = scale ?? localScale;
  return (
    <Pressable
      style={[D.statBox, { backgroundColor: T.bgSecondary, borderColor: T.border }]}
      onPress={onPress}
      onPressIn={() =>
        Animated.timing(s, { toValue: 0.93, duration: 70, useNativeDriver: true }).start()
      }
      onPressOut={() =>
        Animated.timing(s, { toValue: 1, duration: 140, useNativeDriver: true }).start()
      }
    >
      <Animated.View style={[{ alignItems: "center", gap: 6 }, { transform: [{ scale: s }] }]}>
        <View style={D.statIconWrap}>
          <Ionicons name={icon as any} size={22} color={iconColor} />
        </View>
        <Text style={[D.statNum, { color: T.text }]}>{value}</Text>
        <Text style={[D.statLabel, { color: T.textMuted }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ── Styles ─────────────────────────────────────────────── */

const D = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#F8F9FC",
    padding: 24,
  },
  notFoundIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#EEE9F8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  notFoundTitle: { fontSize: 17, fontFamily: "Inter_700Bold",   color: "#1A0A3C" },
  notFoundSub:   { fontSize: 13, fontFamily: "Inter_400Regular", color: "#8B8FA8" },
  backBtn:       {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#7B5EA7",
    borderRadius: 14,
  },
  backBtnText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },

  /* ── Hero ── */
  imageWrap: { position: "relative", backgroundColor: "#EDE9F8" },
  heroImage: { width: "100%", height: 210 },
  imagePlaceholder: {
    width: "100%",
    height: 210,
    backgroundColor: "#EDE9F8",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  placeholderIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(123,94,167,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#B0A8CC",
  },
  imageOverlayTop: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 120,
  },

  /* Top bar */
  topBar: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.30)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleBtnDark: {
    backgroundColor: "rgba(123,94,167,0.12)",
  },

  imageBadgeWrap: {
    position: "absolute",
    bottom: 32,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFF",
  },

  /* ── Card ── */
  card: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
    shadowColor: "#1E0B4B",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusPillEmoji: { fontSize: 13 },
  statusPillText: {
    fontSize: 12.5,
    fontFamily: "Inter_600SemiBold",
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(123,94,167,0.08)",
    alignSelf: "flex-start",
  },
  typePillText: {
    fontSize: 12.5,
    fontFamily: "Inter_600SemiBold",
    color: "#7B5EA7",
  },

  noteTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#1A0A3C",
    lineHeight: 28,
    letterSpacing: -0.4,
    marginBottom: 16,
  },

  reporterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(123,94,167,0.10)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reporterName: { fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: "#1A0A3C" },
  reporterTime: { fontSize: 11.5, fontFamily: "Inter_400Regular",  color: "#8B8FA8" },
  locPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(123,94,167,0.08)",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 130,
  },
  locPillText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#7B5EA7",
    flexShrink: 1,
  },

  divider: { height: 1, backgroundColor: "#F3F0FB", marginVertical: 20 },

  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#1A0A3C",
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  descText: {
    fontSize: 14.5,
    fontFamily: "Inter_400Regular",
    color: "#374151",
    lineHeight: 24,
  },

  /* Info grid — 2 col */
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  infoBox: {
    width: "47.5%",
    backgroundColor: "#F8F9FC",
    borderRadius: 16,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: "#EEE9F8",
    shadowColor: "#1E0B4B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(123,94,167,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8B8FA8" },
  infoValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1A0A3C" },

  /* Map preview */
  mapPreview: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEE9F8",
    shadowColor: "#1E0B4B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  mapGradient: {
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  mapPinWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(123,94,167,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  mapCoords: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#4A2D8F",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  mapOpenRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#EEE9F8",
  },
  mapOpenText: {
    fontSize: 13.5,
    fontFamily: "Inter_600SemiBold",
    color: "#7B5EA7",
  },

  /* Stats */
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: {
    flex: 1,
    backgroundColor: "#F8F9FC",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE9F8",
    shadowColor: "#1E0B4B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(123,94,167,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  statNum:   { fontSize: 20, fontFamily: "Inter_700Bold", color: "#1A0A3C" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8B8FA8", textAlign: "center" },

  /* Comments */
  emptyComments: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    backgroundColor: "#F8F9FC",
    borderRadius: 16,
    marginBottom: 16,
  },
  noComment: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#B0A8CC",
    textAlign: "center",
  },
  commentRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
    alignItems: "flex-start",
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(123,94,167,0.10)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  commentUser:   { fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: "#1A0A3C" },
  commentTime:   { fontSize: 11, fontFamily: "Inter_400Regular", color: "#B0A8CC" },
  commentText:   { fontSize: 13.5, fontFamily: "Inter_400Regular", color: "#374151", lineHeight: 20 },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8F9FC",
    borderRadius: 28,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#EEE9F8",
    marginTop: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#1A0A3C",
    paddingVertical: 6,
  },
  sendBtn: { padding: 2 },
  sendCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#7B5EA7",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#B0A8CC",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 8,
  },

  /* Action bar */
  actionBar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    flexDirection: "row",
    gap: 12,
    paddingLeft: 31,
    paddingRight: 28,
    paddingTop: 15,
    paddingBottom: 53,
    marginTop: -10,
    marginBottom: -10,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#F0EDF8",
    shadowColor: "#1E0B4B",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
  },
  actionOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#7B5EA7",
    borderRadius: 18,
    height: 54,
    marginVertical: 3,
    marginHorizontal: 18,
    paddingHorizontal: 9,
  },
  actionOutlineText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#7B5EA7",
  },
  actionFill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 18,
    height: 54,
    marginVertical: 4,
    marginHorizontal: 19,
    paddingVertical: 7,
    paddingHorizontal: 10,
    shadowColor: "#5B3FD6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  actionFillText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    letterSpacing: -0.2,
  },
});
