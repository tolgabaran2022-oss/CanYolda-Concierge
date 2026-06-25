import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
  purpleDark: "#5B3FD6",
  bg:         "#F9F8FF",
  white:      "#FFFFFF",
  text:       "#111827",
  muted:      "#6B7280",
  border:     "#F0EDF8",
};

export default function AnimalDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { user } = useAuth();
  const { getAnimal, toggleNeedsHelp, addComment } = useAnimals();

  const animal = getAnimal(id ?? "");
  const [commentText, setCommentText] = useState("");
  const [helped,      setHelped]      = useState(false);
  const [mapOpened,   setMapOpened]   = useState(0);

  if (!animal) {
    return (
      <View style={[D.center, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={40} color={C.muted} />
        <Text style={D.notFound}>Hayvan bulunamadı</Text>
        <Pressable onPress={() => router.back()} style={D.backBtn}>
          <Text style={D.backBtnText}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  const statusDotColor = STATUS_COLORS[animal.status];
  const helpCount = animal.needsHelpByUsers.length + (helped ? 1 : 0);

  const handleHelp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHelped((v) => !v);
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
    Alert.alert(
      "Konumu Aç",
      animal.locationName
        ? `${animal.locationName} konumunu haritada açmak istiyor musunuz?`
        : `${animal.latitude.toFixed(4)}, ${animal.longitude.toFixed(4)}`,
      [{ text: "İptal", style: "cancel" }, { text: "Aç", style: "default" }]
    );
  };

  const handleShare = async () => {
    await Share.share({
      message: `CanYoldaşı: ${animal.notes} — ${animal.locationName ?? ""}`,
    });
  };

  const statusLabel =
    animal.status === "hungry"  ? "Aç"
    : animal.status === "injured" ? "Yaralı"
    : animal.status === "healthy" ? "Sağlıklı"
    : "Bilinmiyor";

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        >
          {/* ── Hero image ───────────────────────── */}
          <View style={D.imageWrap}>
            {animal.image ? (
              <Image source={{ uri: animal.image }} style={D.heroImage} contentFit="cover" />
            ) : (
              <View style={D.imagePlaceholder}>
                <Ionicons name="camera-outline" size={48} color="#C0B8D8" />
                <Text style={D.imagePlaceholderText}>Fotoğraf yok</Text>
              </View>
            )}

            {/* Dark gradient at top for header legibility */}
            <LinearGradient
              colors={["rgba(0,0,0,0.48)", "transparent"]}
              style={D.imageOverlayTop}
            />

            {/* Top bar */}
            <View style={[D.topBar, { paddingTop: insets.top + 8 }]}>
              <Pressable onPress={() => router.back()} style={D.circleBtn} hitSlop={12}>
                <Ionicons name="arrow-back" size={20} color="#FFF" />
              </Pressable>
              <Text style={D.topBarTitle}>Durum Detayı</Text>
              <Pressable onPress={handleShare} style={D.circleBtn} hitSlop={12}>
                <Feather name="share" size={18} color="#FFF" />
              </Pressable>
            </View>

            {/* Status badge overlay on image */}
            <View style={D.imageBadgeWrap}>
              <View style={[D.statusDot, { backgroundColor: statusDotColor }]} />
              <StatusBadge status={animal.status} size="sm" />
            </View>
          </View>

          {/* ── Content card ─────────────────────── */}
          <View style={D.card}>
            <Text style={D.noteTitle}>{animal.notes}</Text>

            {/* Reporter row */}
            <View style={D.reporterRow}>
              <View style={D.avatarCircle}>
                <Ionicons name="person" size={16} color={C.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={D.reporterName}>{animal.userName}</Text>
                <Text style={D.reporterTime}>{formatTimeAgo(animal.timestamp)}</Text>
              </View>
              <View style={D.locPill}>
                <Ionicons name="location-outline" size={13} color={C.purple} />
                <Text style={D.locPillText}>{animal.locationName ?? "Konum yok"}</Text>
              </View>
            </View>

            <View style={D.divider} />

            {/* Açıklama */}
            <Text style={D.sectionTitle}>Açıklama</Text>
            <Text style={D.descText}>
              {animal.notes}
              {"\n\n"}Lütfen mama desteği veya sahiplenme konusunda yardımcı olalım. 🐾❤️
            </Text>

            <View style={D.divider} />

            {/* Durum Bilgileri */}
            <Text style={D.sectionTitle}>Durum Bilgileri</Text>
            <View style={D.infoGrid}>
              <View style={D.infoBox}>
                <Ionicons name="time-outline" size={18} color={C.purple} />
                <Text style={D.infoLabel}>Bildirilme Zamanı</Text>
                <Text style={D.infoValue}>{formatTimeAgo(animal.timestamp)}</Text>
              </View>
              <View style={D.infoBox}>
                <Ionicons name="location-outline" size={18} color={C.purple} />
                <Text style={D.infoLabel}>Konum</Text>
                <Text style={D.infoValue} numberOfLines={2}>
                  {animal.locationName ?? "Belirtilmedi"}
                </Text>
              </View>
              <View style={D.infoBox}>
                <Ionicons name="information-circle-outline" size={18} color={C.purple} />
                <Text style={D.infoLabel}>Durum</Text>
                <Text style={D.infoValue}>{statusLabel}</Text>
              </View>
            </View>

            <View style={D.divider} />

            {/* Etkileşim */}
            <Text style={D.sectionTitle}>Etkileşim</Text>
            <View style={D.statsRow}>
              <Pressable style={D.statBox} onPress={handleHelp}>
                <Ionicons
                  name={helped ? "heart" : "heart-outline"}
                  size={22}
                  color={helped ? "#FF3B6B" : C.purple}
                />
                <Text style={D.statNum}>{helpCount}</Text>
                <Text style={D.statLabel}>Yardımcı Oldu</Text>
              </Pressable>
              <Pressable
                style={D.statBox}
                onPress={() => setCommentText("")}
              >
                <Ionicons name="chatbubble-outline" size={22} color={C.purple} />
                <Text style={D.statNum}>{animal.comments.length}</Text>
                <Text style={D.statLabel}>Yorum</Text>
              </Pressable>
              <Pressable style={D.statBox} onPress={handleMapOpen}>
                <Ionicons name="location-outline" size={22} color={C.purple} />
                <Text style={D.statNum}>{mapOpened}</Text>
                <Text style={D.statLabel}>Konum Açıldı</Text>
              </Pressable>
            </View>

            <View style={D.divider} />

            {/* Yorumlar */}
            <Text style={D.sectionTitle}>
              Yorumlar ({animal.comments.length})
            </Text>
            {animal.comments.length === 0 ? (
              <Text style={D.noComment}>
                Henüz yorum yok. İlk yorumu sen yap!
              </Text>
            ) : (
              animal.comments.map((c) => (
                <View key={c.id} style={D.commentRow}>
                  <View style={D.commentAvatar}>
                    <Ionicons name="person" size={13} color={C.purple} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={D.commentUser}>
                      {c.userName}{" "}
                      <Text style={D.commentTime}>
                        {formatTimeAgo(c.timestamp)}
                      </Text>
                    </Text>
                    <Text style={D.commentText}>{c.text}</Text>
                  </View>
                </View>
              ))
            )}

            {/* Comment input */}
            <View style={D.inputRow}>
              <TextInput
                style={D.input}
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Yorum ekle..."
                placeholderTextColor="#ABABBB"
                returnKeyType="send"
                onSubmitEditing={handleComment}
              />
              <Pressable onPress={handleComment} style={D.sendBtn} hitSlop={8}>
                <Ionicons name="send" size={18} color={C.purple} />
              </Pressable>
            </View>

            <Text style={D.footer}>
              Küçük bir destek, büyük bir hayat kurtarır. 🙏
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Sticky bottom action bar ───────────── */}
      <View style={[D.actionBar, { paddingBottom: insets.bottom + 10 }]}>
        <Pressable style={D.actionOutline} onPress={handleMapOpen}>
          <Ionicons name="chatbubble-outline" size={18} color={C.purple} />
          <Text style={D.actionOutlineText}>Yorum Yap</Text>
        </Pressable>
        <Pressable onPress={handleHelp} style={{ flex: 1 }}>
          <LinearGradient
            colors={helped ? ["#FF6B9D", "#FF3B6B"] : ["#9478D8", "#5B3FD6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={D.actionFill}
          >
            <Ionicons
              name={helped ? "heart" : "heart-outline"}
              size={18}
              color="#FFF"
            />
            <Text style={D.actionFillText}>
              {helped ? "Yardım Edildi!" : "Yardım Et"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const D = StyleSheet.create({
  center:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFound:     { fontSize: 16, fontFamily: "Inter_500Medium", color: "#6B7280" },
  backBtn:      { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#7B5EA7", borderRadius: 12 },
  backBtnText:  { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },

  /* Hero */
  imageWrap:           { position: "relative" },
  heroImage:           { width: "100%", height: 320 },
  imagePlaceholder:    { width: "100%", height: 260, backgroundColor: "#EDE9F8", alignItems: "center", justifyContent: "center", gap: 10 },
  imagePlaceholderText:{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#C0B8D8" },
  imageOverlayTop:     { position: "absolute", top: 0, left: 0, right: 0, height: 130 },

  topBar:       { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  circleBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  topBarTitle:  { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },

  imageBadgeWrap: { position: "absolute", bottom: 14, left: 14, flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot:      { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: "#FFF" },

  /* Card */
  card: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, paddingHorizontal: 18, paddingTop: 22, paddingBottom: 16 },

  noteTitle:    { fontSize: 19, fontFamily: "Inter_700Bold", color: "#1E0B4B", lineHeight: 27, marginBottom: 14 },

  reporterRow:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(123,94,167,0.10)", alignItems: "center", justifyContent: "center" },
  reporterName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1E0B4B" },
  reporterTime: { fontSize: 11.5, fontFamily: "Inter_400Regular", color: "#6B7280" },
  locPill:      { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(123,94,167,0.08)", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  locPillText:  { fontSize: 11.5, fontFamily: "Inter_500Medium", color: "#7B5EA7" },

  divider:      { height: 1, backgroundColor: "#F0EDF8", marginVertical: 14 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#1E0B4B", marginBottom: 10 },
  descText:     { fontSize: 14, fontFamily: "Inter_400Regular", color: "#374151", lineHeight: 22 },

  /* Info grid */
  infoGrid: { flexDirection: "row", gap: 8 },
  infoBox:  { flex: 1, backgroundColor: "#F9F8FF", borderRadius: 14, padding: 12, gap: 4, borderWidth: 1, borderColor: "#EEEAF8" },
  infoLabel:{ fontSize: 10.5, fontFamily: "Inter_400Regular", color: "#6B7280" },
  infoValue:{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#1E0B4B" },

  /* Stats */
  statsRow: { flexDirection: "row", gap: 8 },
  statBox:  { flex: 1, backgroundColor: "#F9F8FF", borderRadius: 14, padding: 14, alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#EEEAF8" },
  statNum:  { fontSize: 18, fontFamily: "Inter_700Bold", color: "#1E0B4B" },
  statLabel:{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#6B7280", textAlign: "center" },

  /* Comments */
  noComment:     { fontSize: 13, fontFamily: "Inter_400Regular", color: "#9CA3AF", marginBottom: 10 },
  commentRow:    { flexDirection: "row", gap: 10, marginBottom: 12 },
  commentAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(123,94,167,0.10)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  commentUser:   { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1E0B4B" },
  commentTime:   { fontSize: 11, fontFamily: "Inter_400Regular", color: "#9CA3AF" },
  commentText:   { fontSize: 13, fontFamily: "Inter_400Regular", color: "#374151", marginTop: 2 },

  inputRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F9F8FF", borderRadius: 24, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#EEEAF8", marginTop: 10 },
  input:    { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#111827" },
  sendBtn:  { padding: 4 },
  footer:   { fontSize: 12, fontFamily: "Inter_400Regular", color: "#9CA3AF", textAlign: "center", marginTop: 16 },

  /* Action bar */
  actionBar:        { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 12, paddingHorizontal: 18, paddingTop: 12, backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#F0EDF8", shadowColor: "#2D1B4E", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 6 },
  actionOutline:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: "#7B5EA7", borderRadius: 16, paddingVertical: 14 },
  actionOutlineText:{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#7B5EA7" },
  actionFill:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 14 },
  actionFillText:   { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
