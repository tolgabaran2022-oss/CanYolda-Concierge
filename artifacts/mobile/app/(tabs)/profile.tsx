import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
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
import { usePets } from "@/contexts/PetsContext";
import { ProfileStoryAvatar } from "@/components/ProfileStoryAvatar";
import { apiFetchUserPosts, apiFetchBookmarkedPosts } from "@/lib/feedApi";
import type { ApiPost } from "@/lib/feedApi";
import { apiGetFollowCounts } from "@/lib/socialApi";
import type { FollowCounts } from "@/lib/socialApi";
import { apiGetMyPets, apiCreatePet } from "@/lib/petsApi";
import type { ApiPetProfile } from "@/lib/petsApi";

const { width: SW } = Dimensions.get("window");
const GRID_GAP = 2;
const GRID_ITEM = (SW - GRID_GAP * 2) / 3;

const PURPLE = "#7B5EA7";
const PURPLE_DARK = "#3D2070";
const BG = "#F9F8FF";
const CAT_AVATAR_DEFAULT = "https://loremflickr.com/300/300/cat?lock=500";

const TAB_FLOAT_H = 64;
const TAB_BOTTOM_GAP = Platform.OS === "web" ? 12 : 10;

type GridTab = "posts" | "animals" | "saved";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, changePassword } = useAuth();
  const { animals } = useAnimals();
  const { pets } = usePets();
  const { listings } = useAdoption();
  const router = useRouter();

  const myAnimals = animals.filter((a) => a.userId === user?.id);
  const myPets = pets.filter((p) => p.userId === user?.id);
  const myListings = listings.filter((l) => l.userId === user?.id);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const tabClearance = insets.bottom + TAB_BOTTOM_GAP + TAB_FLOAT_H;

  const [gridTab,       setGridTab]       = useState<GridTab>("posts");
  const [userPosts,     setUserPosts]     = useState<ApiPost[]>([]);
  const [savedPosts,    setSavedPosts]    = useState<ApiPost[]>([]);
  const [followCounts,  setFollowCounts]  = useState<FollowCounts>({ followers: 0, following: 0 });
  const [backendPets,   setBackendPets]   = useState<ApiPetProfile[]>([]);
  const [showCreatePet, setShowCreatePet] = useState(false);
  const [newPetName,    setNewPetName]    = useState("");
  const [newPetType,    setNewPetType]    = useState("cat");
  const [newPetBreed,   setNewPetBreed]   = useState("");
  const [creatingPet,   setCreatingPet]   = useState(false);

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
    apiGetMyPets(user.id)
      .then(setBackendPets)
      .catch(() => setBackendPets([]));
  }, [user?.id]);

  const handleCreatePet = async () => {
    if (!user?.id || !newPetName.trim()) {
      Alert.alert("Hata", "Hayvan adı zorunlu."); return;
    }
    setCreatingPet(true);
    try {
      const pet = await apiCreatePet(user.id, {
        name: newPetName.trim(), type: newPetType, breed: newPetBreed,
        gender: "", birthDate: "", weight: "", color: "", avatarUrl: "", bio: "", location: "",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBackendPets((prev) => [pet, ...prev]);
      setShowCreatePet(false);
      setNewPetName(""); setNewPetType("cat"); setNewPetBreed("");
      router.push(`/pet-profile/${encodeURIComponent(pet.id)}`);
    } catch {
      Alert.alert("Hata", "Hayvan profili oluşturulamadı.");
    } finally { setCreatingPet(false); }
  };

  const [pwModalVisible, setPwModalVisible] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

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

  const totalPostCount = userPosts.length + myAnimals.length + myPets.length + myListings.length;

  return (
    <View style={S.root}>
      <ScrollView
        style={S.scroll}
        contentContainerStyle={[S.container, { paddingTop: topPad, paddingBottom: tabClearance + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Instagram-style Profile Header ─────────────── */}
        <View style={S.profileHeader}>
          {/* Avatar + stats row */}
          <View style={S.avatarStatsRow}>
            {/* Story-aware profile avatar */}
            <ProfileStoryAvatar
              userId={user.id}
              username={user.username ?? user.name}
              avatarUrl={user.avatar}
              size={90}
            />

            {/* Stats */}
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
            <Text style={[S.userEmail, { color: PURPLE, fontSize: 13, fontFamily: "Inter_500Medium" }]}>@{user.username}</Text>
          ) : null}
          <Text style={S.userBio}>{user.bio || "🐾 Sokak dostlarının yanındayım"}{user.location ? ` · ${user.location}` : " · İstanbul"}</Text>
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
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/messages");
              }}
            >
              <Ionicons name="chatbubble-outline" size={19} color={PURPLE} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [S.newPostBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/create-post");
              }}
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

        {/* ── Quick Actions ──────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Hızlı Erişim</Text>
          <View style={S.quickRow}>
            {[
              { icon: "paw" as const, label: "Sokak\nHayvanı", action: () => router.push("/add-animal") },
              { icon: "heart" as const, label: "Evcil\nHayvan", action: () => setShowCreatePet(true) },
              { icon: "hand-left" as const, label: "Sahiplen-\ndirme", action: () => router.push("/add-adoption") },
            ].map((item, i) => (
              <Pressable key={i} style={({ pressed }) => [S.quickItem, { opacity: pressed ? 0.75 : 1 }]} onPress={item.action}>
                <LinearGradient colors={["#A480D8", PURPLE]} style={S.quickIcon}>
                  <Ionicons name={item.icon} size={20} color="#FFF" />
                </LinearGradient>
                <Text style={S.quickLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Evcil Hayvanlarım ─────────────────────────── */}
        <View style={S.section}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={S.sectionTitle}>Evcil Hayvanlarım</Text>
            <Pressable
              onPress={() => setShowCreatePet(true)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, flexDirection: "row", alignItems: "center", gap: 4 }]}
            >
              <Ionicons name="add-circle-outline" size={18} color={PURPLE} />
              <Text style={{ color: PURPLE, fontSize: 13, fontWeight: "600" }}>Ekle</Text>
            </Pressable>
          </View>
          {backendPets.length === 0 ? (
            <Pressable
              onPress={() => setShowCreatePet(true)}
              style={({ pressed }) => [{
                backgroundColor: "#F0EAF8", borderRadius: 14, padding: 20,
                alignItems: "center", borderWidth: 1.5, borderColor: "#D5C4EE", borderStyle: "dashed",
                opacity: pressed ? 0.7 : 1,
              }]}
            >
              <Text style={{ fontSize: 28, marginBottom: 6 }}>🐾</Text>
              <Text style={{ color: PURPLE, fontWeight: "600", fontSize: 14 }}>İlk hayvanını ekle</Text>
              <Text style={{ color: "#888", fontSize: 12, marginTop: 2 }}>Her hayvanın kendi profili olsun</Text>
            </Pressable>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
              {backendPets.map((pet) => {
                const emoji = { cat: "🐱", dog: "🐶", bird: "🦜", rabbit: "🐰", other: "🐾" }[pet.type] ?? "🐾";
                const avatarUri = pet.avatarUrl || `https://loremflickr.com/120/120/${pet.type === "dog" ? "dog" : "cat"}?lock=700`;
                return (
                  <Pressable
                    key={pet.id}
                    onPress={() => router.push(`/pet-profile/${encodeURIComponent(pet.id)}`)}
                    style={({ pressed }) => [{
                      alignItems: "center", width: 90, opacity: pressed ? 0.75 : 1,
                    }]}
                  >
                    <LinearGradient colors={["#A480D8", PURPLE]} style={{ width: 74, height: 74, borderRadius: 37, padding: 2.5, marginBottom: 6 }}>
                      <Image
                        source={{ uri: avatarUri }}
                        style={{ width: "100%", height: "100%", borderRadius: 35 }}
                        contentFit="cover"
                      />
                    </LinearGradient>
                    <Text style={{ color: "#1a1a2e", fontSize: 13, fontWeight: "700", textAlign: "center" }} numberOfLines={1}>{emoji} {pet.name}</Text>
                    <Text style={{ color: "#888", fontSize: 11, marginTop: 1 }}>{pet.postsCount} gönderi</Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setShowCreatePet(true)}
                style={({ pressed }) => [{
                  width: 90, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1,
                }]}
              >
                <View style={{
                  width: 74, height: 74, borderRadius: 37, borderWidth: 2, borderColor: "#D5C4EE",
                  borderStyle: "dashed", justifyContent: "center", alignItems: "center", marginBottom: 6,
                }}>
                  <Ionicons name="add" size={28} color={PURPLE} />
                </View>
                <Text style={{ color: PURPLE, fontSize: 12, fontWeight: "600" }}>Ekle</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>

        {/* ── Grid Tabs ──────────────────────────────────── */}
        <View style={S.gridTabBar}>
          {([
            { key: "posts", icon: "grid-outline" },
            { key: "animals", icon: "paw-outline" },
            { key: "saved", icon: "bookmark-outline" },
          ] as const).map(({ key, icon }) => (
            <Pressable
              key={key}
              style={[S.gridTabBtn, gridTab === key && S.gridTabActive]}
              onPress={() => setGridTab(key)}
            >
              <Ionicons
                name={icon}
                size={22}
                color={gridTab === key ? PURPLE : "#AAAACC"}
              />
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
              const isPost = gridTab === "posts" && item.id.startsWith("p-");
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

        {/* ── Settings ───────────────────────────────────── */}
        <View style={[S.section, { marginTop: 8 }]}>
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
              { label: "Mevcut Şifre", icon: "lock-closed-outline" as const, val: currentPw, set: setCurrentPw, show: showCurrent, toggleShow: () => setShowCurrent((v) => !v) },
              { label: "Yeni Şifre", icon: "key-outline" as const, val: newPw, set: setNewPw, show: showNew, toggleShow: () => setShowNew((v) => !v) },
              { label: "Yeni Şifre (Tekrar)", icon: "key-outline" as const, val: confirmPw, set: setConfirmPw, show: showConfirm, toggleShow: () => setShowConfirm((v) => !v) },
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

      {/* ── Yeni Hayvan Profili Modal ─────────────────── */}
      <Modal visible={showCreatePet} animationType="slide" transparent onRequestClose={() => setShowCreatePet(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={S.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCreatePet(false)} />
          <View style={[S.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={S.modalHandle} />
            <Text style={S.modalTitle}>Yeni Hayvan Profili</Text>
            <Text style={S.modalSubtitle}>Her hayvanın kendi Instagram sayfası olsun 🐾</Text>

            <View style={S.modalInputGroup}>
              <Text style={S.modalLabel}>Hayvan Adı *</Text>
              <View style={S.modalInputWrap}>
                <Ionicons name="paw-outline" size={18} color={PURPLE} />
                <TextInput
                  style={S.modalInput} value={newPetName} onChangeText={setNewPetName}
                  placeholder="Pamuk, Max, Boncuk..." placeholderTextColor="#B0A8C8" autoCapitalize="words"
                />
              </View>
            </View>

            <View style={S.modalInputGroup}>
              <Text style={S.modalLabel}>Tür</Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {[
                  { k: "cat", label: "🐱 Kedi" }, { k: "dog", label: "🐶 Köpek" },
                  { k: "bird", label: "🦜 Kuş" }, { k: "rabbit", label: "🐰 Tavşan" },
                  { k: "other", label: "🐾 Diğer" },
                ].map(({ k, label }) => (
                  <Pressable
                    key={k}
                    onPress={() => setNewPetType(k)}
                    style={[{
                      paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
                      backgroundColor: newPetType === k ? PURPLE : "#EDE7F6",
                    }]}
                  >
                    <Text style={{ color: newPetType === k ? "#fff" : PURPLE_DARK, fontWeight: "600", fontSize: 13 }}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={S.modalInputGroup}>
              <Text style={S.modalLabel}>Cins (isteğe bağlı)</Text>
              <View style={S.modalInputWrap}>
                <Ionicons name="search-outline" size={18} color={PURPLE} />
                <TextInput
                  style={S.modalInput} value={newPetBreed} onChangeText={setNewPetBreed}
                  placeholder="British Shorthair, Golden..." placeholderTextColor="#B0A8C8"
                />
              </View>
            </View>

            <View style={S.modalBtnRow}>
              <Pressable style={({ pressed }) => [S.modalCancelBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={() => setShowCreatePet(false)}>
                <Text style={S.modalCancelText}>İptal</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [S.modalSaveBtn, { opacity: pressed ? 0.85 : 1 }]} onPress={handleCreatePet} disabled={creatingPet}>
                {creatingPet ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={S.modalSaveText}>Profil Oluştur</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <View style={S.statPill}>
      <Text style={S.statValue}>{value}</Text>
      <Text style={S.statLabel}>{label}</Text>
    </View>
  );
}

const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 0 },

  /* ── Profile header ──────────────────────────── */
  profileHeader: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(123,94,167,0.10)",
  },
  avatarStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 12,
    gap: 20,
  },
  avatarGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  avatarBorder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: "hidden",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },
  avatarImg: { width: "100%", height: "100%" },

  statsArea: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statPill:  { alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: PURPLE_DARK },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8874A8" },

  userName: { fontSize: 15, fontFamily: "Inter_700Bold", color: PURPLE_DARK },
  userBio:  { fontSize: 13, fontFamily: "Inter_400Regular", color: "#555577", marginTop: 3 },
  userEmail:{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#AAAACC", marginTop: 2 },

  actionBtnRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  editBtn: {
    flex: 1,
    backgroundColor: "rgba(123,94,167,0.10)",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.18)",
  },
  editBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: PURPLE_DARK },
  newPostBtn: {
    width: 40,
    backgroundColor: PURPLE,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  msgBtn: {
    width: 40,
    backgroundColor: "rgba(123,94,167,0.10)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.18)",
  },
  shareBtn: {
    width: 40,
    backgroundColor: "rgba(123,94,167,0.10)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.18)",
  },

  /* ── Quick actions ───────────────────────────── */
  section:    { paddingHorizontal: 18, gap: 10, marginTop: 18 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: PURPLE_DARK },
  quickRow:   { flexDirection: "row", gap: 12 },
  quickItem:  { flex: 1, alignItems: "center", gap: 8 },
  quickIcon:  { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  quickLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#555577", textAlign: "center" },

  /* ── Grid tab bar ────────────────────────────── */
  gridTabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(123,94,167,0.12)",
    marginTop: 20,
    backgroundColor: "#FFFFFF",
  },
  gridTabBtn:    { flex: 1, alignItems: "center", paddingVertical: 12 },
  gridTabActive: { borderTopWidth: 1.5, borderTopColor: PURPLE },

  /* ── Photo grid ──────────────────────────────── */
  grid:      { flexDirection: "row", flexWrap: "wrap", marginBottom: 2 },
  gridItem:  { width: GRID_ITEM, height: GRID_ITEM, marginBottom: GRID_GAP },
  gridImage: { width: "100%", height: "100%" },
  emptyGrid: { alignItems: "center", paddingVertical: 48, gap: 12, backgroundColor: "#FFF" },
  emptyGridText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#AAAACC" },

  /* ── Card rows ───────────────────────────────── */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.12)",
    overflow: "hidden",
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  cardRowBorder: { borderTopWidth: 1, borderTopColor: "rgba(123,94,167,0.09)" },
  iconBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: `${PURPLE}18`, alignItems: "center", justifyContent: "center" },
  cardRowLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: PURPLE_DARK },
  cardRowMeta:  { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8874A8", marginTop: 2 },

  /* ── Logout ──────────────────────────────────── */
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginHorizontal: 18, marginTop: 4,
    borderRadius: 14, borderWidth: 1.5, borderColor: "#D94040",
    paddingVertical: 14,
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#D94040" },

  /* ── Password modal ──────────────────────────── */
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.40)" },
  modalSheet: {
    backgroundColor: "#FAFAFF", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, gap: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.10, shadowRadius: 20, elevation: 10,
  },
  modalHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(123,94,167,0.25)", alignSelf: "center", marginBottom: 6 },
  modalTitle:    { fontSize: 20, fontFamily: "Inter_700Bold", color: PURPLE_DARK, textAlign: "center" },
  modalSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#8874A8", textAlign: "center", marginTop: -6 },
  modalInputGroup: { gap: 6 },
  modalLabel:    { fontSize: 13, fontFamily: "Inter_500Medium", color: "#5C4080" },
  modalInputWrap: {
    flexDirection: "row", alignItems: "center", borderRadius: 12,
    borderWidth: 1.5, borderColor: "rgba(123,94,167,0.22)", backgroundColor: "#FFF",
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  modalInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: "#1A1A2E" },
  modalBtnRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  modalCancelBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center", backgroundColor: "rgba(123,94,167,0.10)" },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: PURPLE },
  modalSaveBtn: {
    flex: 2, borderRadius: 14, paddingVertical: 14, alignItems: "center",
    backgroundColor: PURPLE, shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 4,
  },
  modalSaveText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
