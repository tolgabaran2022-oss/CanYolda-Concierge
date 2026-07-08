import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { AppHeader } from "@/components/AppHeader";
import { useAdoption } from "@/contexts/AdoptionContext";
import { useAnimals } from "@/contexts/AnimalsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBoost } from "@/contexts/BoostContext";
import { usePets } from "@/contexts/PetsContext";

const PURPLE = "#7B5EA7";
const PURPLE_DARK = "#3D2070";
const BG = "#F5F1FF";

const TAB_FLOAT_H = 64;
const TAB_BOTTOM_GAP = Platform.OS === "web" ? 12 : 10;

const CAT_AVATAR = "https://loremflickr.com/300/300/cat?lock=500";

function formatExpiry(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  const hoursLeft = Math.max(0, Math.floor(diff / 3_600_000));
  const minutesLeft = Math.max(0, Math.floor((diff % 3_600_000) / 60_000));
  if (hoursLeft > 0) return `${hoursLeft} saat ${minutesLeft} dk`;
  return `${minutesLeft} dakika`;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, changePassword } = useAuth();
  const { animals } = useAnimals();
  const { pets } = usePets();
  const { listings } = useAdoption();
  const { myBoosts, fetchMyBoosts } = useBoost();
  const router = useRouter();

  const myAnimals = animals.filter((a) => a.userId === user?.id);
  const myPets = pets.filter((p) => p.userId === user?.id);
  const myListings = listings.filter((l) => l.userId === user?.id);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const tabClearance = insets.bottom + TAB_BOTTOM_GAP + TAB_FLOAT_H;

  useEffect(() => {
    if (user?.email) fetchMyBoosts(user.email);
  }, [user?.email, fetchMyBoosts]);

  /* ── Şifre Değiştir Modal ─────────────────── */
  const [pwModalVisible, setPwModalVisible] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const openPwModal = () => {
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setPwModalVisible(true);
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }
    if (newPw.length < 6) {
      Alert.alert("Hata", "Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert("Hata", "Yeni şifreler eşleşmiyor.");
      return;
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
        logout().then(() =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        );
      }
      return;
    }
    Alert.alert("Çıkış Yap", "Hesabından çıkmak istiyor musun?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: async () => {
          await logout();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  if (!user) return null;

  const activeBoosts = myBoosts.filter(
    (b) => new Date(b.expires_at ?? b.expiresAt).getTime() > Date.now()
  );

  const getListingName = (listingId: string) =>
    myListings.find((l) => l.id === listingId)?.petName ?? "Bilinmiyor";

  const quickActions = [
    {
      icon: "paw-outline" as const,
      label: "Sokak Hayvanı Ekle",
      action: () => router.push("/add-animal"),
    },
    {
      icon: "heart-outline" as const,
      label: "Evcil Hayvan Ekle",
      action: () => router.push("/add-pet"),
    },
    {
      icon: "hand-left-outline" as const,
      label: "Sahiplendirme İlanı Ver",
      action: () => router.push("/add-adoption"),
    },
  ];

  return (
    <View style={styles.outerContainer}>
      <AppHeader topPad={topPad} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: tabClearance + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: CAT_AVATAR }}
              style={styles.avatarImage}
              contentFit="cover"
            />
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>

          <View style={styles.statsRow}>
            {[
              { value: myAnimals.length, label: "Bildirdi" },
              { value: myPets.length, label: "Evcil" },
              { value: myListings.length, label: "İlan" },
            ].map((stat, i) => (
              <View
                key={i}
                style={[styles.statItem, i < 2 && styles.statBorder]}
              >
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Active Boosts */}
        {activeBoosts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aktif Öne Çıkarmalar</Text>
            <View style={styles.card}>
              {activeBoosts.map((boost, i) => {
                const expiresAt = boost.expires_at ?? boost.expiresAt;
                const listingId = boost.listing_id ?? boost.listingId;
                const hours = boost.package_hours ?? boost.packageHours;
                return (
                  <Pressable
                    key={boost.id ?? i}
                    style={({ pressed }) => [
                      styles.cardRow,
                      i > 0 && styles.cardRowBorder,
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                    onPress={() => router.push(`/adoption/${listingId}` as const)}
                  >
                    <View style={styles.iconBadge}>
                      <Ionicons name="star" size={18} color={PURPLE} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardRowLabel}>
                        {getListingName(listingId)}
                      </Text>
                      <Text style={styles.cardRowMeta}>
                        {hours}s paket · {formatExpiry(expiresAt)} kaldı
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#8874A8" />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
          <View style={styles.card}>
            {quickActions.map((item, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  styles.cardRow,
                  i > 0 && styles.cardRowBorder,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
                onPress={item.action}
              >
                <View style={styles.iconBadge}>
                  <Ionicons name={item.icon} size={20} color={PURPLE} />
                </View>
                <Text style={styles.cardRowLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#8874A8" />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Hesap Ayarları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Ayarları</Text>
          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [
                styles.cardRow,
                { opacity: pressed ? 0.75 : 1 },
              ]}
              onPress={openPwModal}
            >
              <View style={styles.iconBadge}>
                <Ionicons name="lock-closed-outline" size={20} color={PURPLE} />
              </View>
              <Text style={styles.cardRowLabel}>Şifre Değiştir</Text>
              <Ionicons name="chevron-forward" size={16} color="#8874A8" />
            </Pressable>
          </View>
        </View>

        {/* Logout */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutBtn,
            { opacity: pressed ? 0.75 : 1 },
          ]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#D94040" />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </Pressable>
      </ScrollView>

      {/* ── Şifre Değiştir Modal ─────────────────── */}
      <Modal
        visible={pwModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPwModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPwModalVisible(false)}
          />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Şifre Değiştir</Text>
            <Text style={styles.modalSubtitle}>Güvenliğin için güçlü bir şifre seç</Text>

            {/* Mevcut şifre */}
            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Mevcut Şifre</Text>
              <View style={styles.modalInputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={PURPLE} />
                <TextInput
                  style={styles.modalInput}
                  value={currentPw}
                  onChangeText={setCurrentPw}
                  placeholder="Mevcut şifreniz"
                  placeholderTextColor="#B0A8C8"
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowCurrent((v) => !v)}>
                  <Ionicons
                    name={showCurrent ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={PURPLE}
                  />
                </Pressable>
              </View>
            </View>

            {/* Yeni şifre */}
            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Yeni Şifre</Text>
              <View style={styles.modalInputWrap}>
                <Ionicons name="key-outline" size={18} color={PURPLE} />
                <TextInput
                  style={styles.modalInput}
                  value={newPw}
                  onChangeText={setNewPw}
                  placeholder="En az 6 karakter"
                  placeholderTextColor="#B0A8C8"
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowNew((v) => !v)}>
                  <Ionicons
                    name={showNew ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={PURPLE}
                  />
                </Pressable>
              </View>
            </View>

            {/* Yeni şifre tekrar */}
            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Yeni Şifre (Tekrar)</Text>
              <View style={styles.modalInputWrap}>
                <Ionicons name="key-outline" size={18} color={PURPLE} />
                <TextInput
                  style={styles.modalInput}
                  value={confirmPw}
                  onChangeText={setConfirmPw}
                  placeholder="Yeni şifreyi tekrar girin"
                  placeholderTextColor="#B0A8C8"
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowConfirm((v) => !v)}>
                  <Ionicons
                    name={showConfirm ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={PURPLE}
                  />
                </Pressable>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.modalBtnRow}>
              <Pressable
                style={({ pressed }) => [styles.modalCancelBtn, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => setPwModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalSaveBtn, { opacity: pressed ? 0.85 : 1 }]}
                onPress={handleChangePassword}
                disabled={pwLoading}
              >
                {pwLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Kaydet</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    gap: 14,
  },

  /* Profile card */
  profileCard: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.15)",
    alignItems: "center",
    paddingTop: 16,
    overflow: "hidden",
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: `${PURPLE}40`,
  },
  avatarImage: {
    width: 64,
    height: 64,
  },
  userName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
  },
  userEmail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#8874A8",
    marginTop: 2,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "rgba(123,94,167,0.12)",
  },
  statItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    gap: 1,
  },
  statBorder: {
    borderRightWidth: 1,
    borderRightColor: "rgba(123,94,167,0.12)",
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: PURPLE,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#8874A8",
  },

  /* Sections */
  section: { gap: 6 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
    paddingHorizontal: 2,
  },

  /* Card rows */
  card: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.15)",
    overflow: "hidden",
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  cardRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "rgba(123,94,167,0.1)",
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${PURPLE}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  cardRowLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: PURPLE_DARK,
  },
  cardRowMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#8874A8",
    marginTop: 2,
  },

  /* Logout */
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D94040",
    paddingVertical: 14,
    marginTop: 4,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#D94040",
  },

  /* ── Şifre Değiştir Modal ─────────────────── */
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.40)",
  },
  modalSheet: {
    backgroundColor: "#FAFAFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(123,94,167,0.25)",
    alignSelf: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#8874A8",
    textAlign: "center",
    marginTop: -6,
  },
  modalInputGroup: { gap: 6 },
  modalLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#5C4080",
  },
  modalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(123,94,167,0.22)",
    backgroundColor: "#FFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  modalInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#1A1A2E",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(123,94,167,0.10)",
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: PURPLE,
  },
  modalSaveBtn: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: PURPLE,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSaveText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
});
