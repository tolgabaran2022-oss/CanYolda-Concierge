import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAdoption } from "@/contexts/AdoptionContext";
import { useAnimals } from "@/contexts/AnimalsContext";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileStoryAvatar } from "@/components/ProfileStoryAvatar";
import { apiFetchUserPosts, apiFetchBookmarkedPosts } from "@/lib/feedApi";
import type { ApiPost } from "@/lib/feedApi";
import { apiGetFollowCounts } from "@/lib/socialApi";
import type { FollowCounts } from "@/lib/socialApi";

const { width: SW } = Dimensions.get("window");
const GRID_GAP  = 2;
const GRID_ITEM = (SW - GRID_GAP * 2) / 3;

const PURPLE      = "#7B5EA7";
const PURPLE_DARK = "#3D2070";
const BG          = "#F9F8FF";
const CAT_AVATAR_DEFAULT = "https://loremflickr.com/300/300/cat?lock=500";

const TAB_FLOAT_H    = 64;
const TAB_BOTTOM_GAP = Platform.OS === "web" ? 12 : 10;

type GridTab = "posts" | "animals" | "saved";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, changePassword } = useAuth();
  const { animals } = useAnimals();
  const { listings } = useAdoption();
  const router = useRouter();

  const myAnimals  = animals.filter((a) => a.userId === user?.id);
  const myListings = listings.filter((l) => l.userId === user?.id);

  const topPad      = Platform.OS === "web" ? 67 : insets.top;
  const tabClearance = insets.bottom + TAB_BOTTOM_GAP + TAB_FLOAT_H;

  const [gridTab,      setGridTab]      = useState<GridTab>("posts");
  const [userPosts,    setUserPosts]    = useState<ApiPost[]>([]);
  const [savedPosts,   setSavedPosts]   = useState<ApiPost[]>([]);
  const [followCounts, setFollowCounts] = useState<FollowCounts>({ followers: 0, following: 0 });

  useEffect(() => {
    if (!user?.id) return;
    apiFetchUserPosts(user.id)
      .then(setUserPosts)
      .catch(() => setUserPosts([]));
    apiFetchBookmarkedPosts(user.id)
      .then(setSavedPosts)
      .catch(() => setSavedPosts([]));
    apiGetFollowCounts(user.id)
      .then(setFollowCounts)
      .catch(() => {});
  }, [user?.id]);

  /* ── Password modal ── */
  const [pwModalVisible, setPwModalVisible] = useState(false);
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading,   setPwLoading]   = useState(false);

  const openPwModal = () => {
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setPwModalVisible(true);
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun."); return;
    }
    if (newPw.length < 6) {
      Alert.alert("Hata", "Yeni şifre en az 6 karakter olmalıdır."); return;
    }
    if (newPw !== confirmPw) {
      Alert.alert("Hata", "Yeni şifreler eşleşmiyor."); return;
    }
    setPwLoading(true);
    try {
      await changePassword(currentPw, newPw);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPwModalVisible(false);
      Alert.alert("Başarılı", "Şifreniz güncellendi.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Şifre değiştirilemedi.";
      Alert.alert("Hata", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Hesabından çıkmak istiyor musun?")) {
        logout().then(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      }
      return;
    }
    Alert.alert("Çıkış Yap", "Hesabından çıkmak istiyor musun?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Çıkış Yap", style: "destructive",
        onPress: async () => {
          await logout();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  if (!user) return null;

  /* ── Grid data ── */
  const postGridImages = userPosts.map((p) => ({
    id: `p-${p.id}`, uri: p.imageUrl, label: p.caption,
  }));

  const animalGridImages = myAnimals.map((a) => ({
    id: `a-${a.id}`, uri: a.image ?? CAT_AVATAR_DEFAULT, label: a.locationName ?? "Hayvan",
  }));

  const savedImages = savedPosts.length > 0
    ? savedPosts.map((p) => ({ id: `p-${p.id}`, uri: p.imageUrl, label: p.caption }))
    : listings.filter((l) => l.userId !== user.id).slice(0, 9).map((l) => ({
        id: `sl-${l.id}`, uri: l.photo ?? CAT_AVATAR_DEFAULT, label: l.petName,
      }));

  const currentGrid =
    gridTab === "posts"   ? postGridImages :
    gridTab === "animals" ? animalGridImages :
    savedImages;

  const totalPostCount = userPosts.length + myAnimals.length + myListings.length;

  return (
    <View style={S.root}>
      <ScrollView
        style={S.scroll}
        contentContainerStyle={[S.container, { paddingTop: topPad, paddingBottom: tabClearance + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Header ─────────────────────────────── */}
        <View style={S.profileHeader}>
          {/* Avatar + stats row */}
          <View style={S.avatarStatsRow}>
            <ProfileStoryAvatar
              userId={user.id}
              username={user.username ?? user.name}
              avatarUrl={user.avatar}
              size={90}
            />
            <View style={S.statsArea}>
              <StatPill value={totalPostCount} label="Gönderi" />
              <Pressable onPress={() => router.push("/search")}>
                <StatPill value={followCounts.followers} label="Takipçi" />
              </Pressable>
              <Pressable onPress={() => router.push("/search")}>
                <StatPill value={followCounts.following} label="Takip" />
              </Pressable>
            </View>
          </View>

          {/* Name + bio */}
          <Text style={S.userName}>{user.name}</Text>
          {user.username ? (
            <Text style={[S.userHandle]}>@{user.username}</Text>
          ) : null}
          <Text style={S.userBio}>
            {user.bio || "🐾 Sokak dostlarının yanındayım"}
            {user.location ? ` · ${user.location}` : " · İstanbul"}
          </Text>
          <Text style={S.userEmail}>{user.email}</Text>

          {/* Action buttons */}
          <View style={S.actionBtnRow}>
            <Pressable
              style={({ pressed }) => [S.editBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => router.push("/profile-edit")}
            >
              <Text style={S.editBtnText}>Profili Düzenle</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [S.msgBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/messages"); }}
            >
              <Ionicons name="chatbubble-outline" size={19} color={PURPLE} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [S.newPostBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/create-post"); }}
            >
              <Ionicons name="add" size={22} color="#FFF" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [S.shareBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Ionicons name="share-outline" size={18} color={PURPLE_DARK} />
            </Pressable>
          </View>
        </View>

        {/* ── Grid Tabs ──────────────────────────────────── */}
        <View style={S.gridTabBar}>
          {([
            { key: "posts",   icon: "grid-outline"     },
            { key: "animals", icon: "paw-outline"       },
            { key: "saved",   icon: "bookmark-outline"  },
          ] as const).map(({ key, icon }) => (
            <Pressable
              key={key}
              style={[S.gridTabBtn, gridTab === key && S.gridTabActive]}
              onPress={() => setGridTab(key)}
            >
              <Ionicons name={icon} size={22} color={gridTab === key ? PURPLE : "#AAAACC"} />
            </Pressable>
          ))}
        </View>

        {/* ── Photo Grid ─────────────────────────────────── */}
        {currentGrid.length === 0 ? (
          <View style={S.emptyGrid}>
            <Ionicons name="images-outline" size={48} color="#C5BAE8" />
            <Text style={S.emptyGridText}>Henüz paylaşım yok</Text>
          </View>
        ) : (
          <View style={S.grid}>
            {currentGrid.map((item, idx) => {
              const isPost    = gridTab === "posts" && item.id.startsWith("p-");
              const realPostId = isPost ? item.id.replace(/^p-/, "") : null;
              return (
                <Pressable
                  key={item.id}
                  style={[S.gridItem, idx % 3 !== 2 && { marginRight: GRID_GAP }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (realPostId) router.push(`/post-detail/${encodeURIComponent(realPostId)}`);
                  }}
                >
                  <Image source={{ uri: item.uri }} style={S.gridImage} contentFit="cover" />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ── Hesap Ayarları ─────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Hesap Ayarları</Text>
          <View style={S.card}>
            <Pressable style={({ pressed }) => [S.cardRow, { opacity: pressed ? 0.75 : 1 }]} onPress={openPwModal}>
              <View style={S.iconBadge}><Ionicons name="lock-closed-outline" size={18} color={PURPLE} /></View>
              <Text style={S.cardRowLabel}>Şifre Değiştir</Text>
              <Ionicons name="chevron-forward" size={16} color="#8874A8" />
            </Pressable>
          </View>
        </View>

        <Pressable style={({ pressed }) => [S.logoutBtn, { opacity: pressed ? 0.75 : 1 }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#D94040" />
          <Text style={S.logoutText}>Çıkış Yap</Text>
        </Pressable>
      </ScrollView>

      {/* ── Şifre Değiştir Modal ──────────────────────── */}
      <Modal visible={pwModalVisible} animationType="slide" transparent onRequestClose={() => setPwModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={S.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPwModalVisible(false)} />
          <View style={[S.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={S.modalHandle} />
            <Text style={S.modalTitle}>Şifre Değiştir</Text>
            <Text style={S.modalSubtitle}>Güvenliğin için güçlü bir şifre seç</Text>
            {[
              { label: "Mevcut Şifre",      icon: "lock-closed-outline" as const, val: currentPw,  set: setCurrentPw,  show: showCurrent, toggleShow: () => setShowCurrent((v) => !v) },
              { label: "Yeni Şifre",         icon: "key-outline"         as const, val: newPw,       set: setNewPw,       show: showNew,     toggleShow: () => setShowNew((v) => !v)     },
              { label: "Yeni Şifre (Tekrar)", icon: "key-outline"        as const, val: confirmPw,  set: setConfirmPw,  show: showConfirm, toggleShow: () => setShowConfirm((v) => !v)  },
            ].map(({ label, icon, val, set, show, toggleShow }) => (
              <View key={label} style={S.modalInputGroup}>
                <Text style={S.modalLabel}>{label}</Text>
                <View style={S.modalInputWrap}>
                  <Ionicons name={icon} size={18} color={PURPLE} />
                  <TextInput
                    style={S.modalInput}
                    value={val}
                    onChangeText={set}
                    placeholder={label}
                    placeholderTextColor="#B0A8C8"
                    secureTextEntry={!show}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={toggleShow}>
                    <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={18} color={PURPLE} />
                  </Pressable>
                </View>
              </View>
            ))}
            <View style={S.modalBtnRow}>
              <Pressable style={({ pressed }) => [S.modalCancelBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={() => setPwModalVisible(false)}>
                <Text style={S.modalCancelText}>İptal</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [S.modalSaveBtn, { opacity: pressed ? 0.85 : 1 }]} onPress={handleChangePassword} disabled={pwLoading}>
                {pwLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={S.modalSaveText}>Kaydet</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* ── StatPill ──────────────────────────────────────────────── */
function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <View style={S.statPill}>
      <Text style={S.statValue}>{value}</Text>
      <Text style={S.statLabel}>{label}</Text>
    </View>
  );
}

/* ── Styles ────────────────────────────────────────────────── */
const S = StyleSheet.create({
  root:      { flex: 1, backgroundColor: BG },
  scroll:    { flex: 1 },
  container: { flexGrow: 1 },

  /* Profile header */
  profileHeader: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  avatarStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 16,
  },
  statsArea: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statPill:  { alignItems: "center" },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold",    color: "#1A0A3C" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#888",   marginTop: 2 },

  userName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#1A0A3C",
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: PURPLE,
    marginBottom: 4,
  },
  userBio: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#555",
    lineHeight: 18,
    marginBottom: 3,
  },
  userEmail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#999",
    marginBottom: 14,
  },

  /* Action buttons */
  actionBtnRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  editBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EDE5F8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.20)",
  },
  editBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: PURPLE_DARK,
  },
  msgBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#EDE5F8",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(123,94,167,0.20)",
  },
  newPostBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: PURPLE,
    alignItems: "center", justifyContent: "center",
  },
  shareBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#EDE5F8",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(123,94,167,0.20)",
  },

  /* Grid tab bar */
  gridTabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(123,94,167,0.12)",
    marginTop: 16,
    backgroundColor: "#FFF",
  },
  gridTabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  gridTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: PURPLE,
  },

  /* Photo grid */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  gridItem: {
    width: GRID_ITEM,
    height: GRID_ITEM,
    marginBottom: GRID_GAP,
  },
  gridImage: { width: "100%", height: "100%" },
  emptyGrid: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyGridText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#9B8EBD",
  },

  /* Section */
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#555",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  /* Card rows */
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.10)",
    overflow: "hidden",
    ...Platform.select({
      ios:     { shadowColor: PURPLE, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  cardRowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#1A0A3C",
  },
  iconBadge: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "rgba(123,94,167,0.10)",
    alignItems: "center", justifyContent: "center",
  },

  /* Logout */
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FFF3F3",
    borderWidth: 1,
    borderColor: "rgba(217,64,64,0.15)",
  },
  logoutText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#D94040",
  },

  /* Password modal */
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 14,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#E0D8F0",
    alignSelf: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#1A0A3C",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888",
    textAlign: "center",
    marginTop: -6,
  },
  modalInputGroup: { gap: 6 },
  modalLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#888",
  },
  modalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(123,94,167,0.22)",
    backgroundColor: "#FAFAFE",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  modalInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#1A0A3C",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#EDE5F8",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: PURPLE_DARK,
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: PURPLE,
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
});
