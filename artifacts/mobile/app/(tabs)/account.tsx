import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import { useAuth } from "@/contexts/AuthContext";

const PURPLE      = "#7B5EA7";
const PURPLE_DARK = "#3D2070";
const BG          = "#F9F8FF";

const TAB_FLOAT_H    = 64;
const TAB_BOTTOM_GAP = Platform.OS === "web" ? 12 : 10;

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, changePassword } = useAuth();
  const router = useRouter();

  const topPad       = Platform.OS === "web" ? 67 : insets.top;
  const tabClearance = insets.bottom + TAB_BOTTOM_GAP + TAB_FLOAT_H;

  /* ── Password modal state ── */
  const [pwModalVisible, setPwModalVisible] = useState(false);
  const [currentPw,   setCurrentPw]   = useState("");
  const [newPw,       setNewPw]       = useState("");
  const [confirmPw,   setConfirmPw]   = useState("");
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

  return (
    <View style={S.root}>
      {/* ── Header ──────────────────────────────────────── */}
      <LinearGradient
        colors={["#F3EEFF", "#EDE5FF"]}
        style={[S.header, { paddingTop: topPad + 8 }]}
      >
        <View style={S.headerInner}>
          <View style={S.avatarCircle}>
            <Ionicons name="person" size={28} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.headerName}>{user.name}</Text>
            <Text style={S.headerEmail}>{user.email}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[S.container, { paddingBottom: tabClearance + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hesap Ayarları ─────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Hesap Ayarları</Text>
          <View style={S.card}>
            <Pressable
              style={({ pressed }) => [S.row, { opacity: pressed ? 0.75 : 1 }]}
              onPress={openPwModal}
            >
              <View style={S.iconBadge}>
                <Ionicons name="lock-closed-outline" size={18} color={PURPLE} />
              </View>
              <Text style={S.rowLabel}>Şifre Değiştir</Text>
              <Ionicons name="chevron-forward" size={16} color="#8874A8" />
            </Pressable>

            <View style={S.divider} />

            <Pressable
              style={({ pressed }) => [S.row, { opacity: pressed ? 0.75 : 1 }]}
              onPress={() => router.push("/(auth)/forgot-password" as any)}
            >
              <View style={S.iconBadge}>
                <Ionicons name="key-outline" size={18} color={PURPLE} />
              </View>
              <Text style={S.rowLabel}>Şifremi Unuttum</Text>
              <Ionicons name="chevron-forward" size={16} color="#8874A8" />
            </Pressable>
          </View>
        </View>

        {/* ── Oturum ─────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Oturum</Text>
          <View style={S.card}>
            <Pressable
              style={({ pressed }) => [S.row, { opacity: pressed ? 0.75 : 1 }]}
              onPress={handleLogout}
            >
              <View style={[S.iconBadge, S.iconBadgeDanger]}>
                <Ionicons name="log-out-outline" size={18} color="#D94040" />
              </View>
              <Text style={[S.rowLabel, { color: "#D94040" }]}>Çıkış Yap</Text>
              <Ionicons name="chevron-forward" size={16} color="#D94040" />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* ── Şifre Değiştir Modal ──────────────────────── */}
      <Modal
        visible={pwModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPwModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={S.modalOverlay}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPwModalVisible(false)} />
          <View style={[S.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={S.modalHandle} />
            <Text style={S.modalTitle}>Şifre Değiştir</Text>
            <Text style={S.modalSubtitle}>Güvenliğin için güçlü bir şifre seç</Text>

            {[
              { label: "Mevcut Şifre",       icon: "lock-closed-outline" as const, val: currentPw, set: setCurrentPw, show: showCurrent, toggleShow: () => setShowCurrent((v) => !v) },
              { label: "Yeni Şifre",          icon: "key-outline"         as const, val: newPw,      set: setNewPw,      show: showNew,     toggleShow: () => setShowNew((v) => !v)     },
              { label: "Yeni Şifre (Tekrar)", icon: "key-outline"         as const, val: confirmPw, set: setConfirmPw, show: showConfirm, toggleShow: () => setShowConfirm((v) => !v)  },
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
              <Pressable
                style={({ pressed }) => [S.modalCancelBtn, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => setPwModalVisible(false)}
              >
                <Text style={S.modalCancelText}>İptal</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [S.modalSaveBtn, { opacity: pressed ? 0.85 : 1 }]}
                onPress={handleChangePassword}
                disabled={pwLoading}
              >
                {pwLoading
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={S.modalSaveText}>Kaydet</Text>
                }
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  /* Header */
  header:      { paddingHorizontal: 20, paddingBottom: 20 },
  headerInner: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: PURPLE,
    alignItems: "center", justifyContent: "center",
    ...Platform.select({
      ios:     { shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  headerName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
  },
  headerEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888",
    marginTop: 2,
  },

  /* Content */
  container: { paddingHorizontal: 16, paddingTop: 20, gap: 0 },
  section:   { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  /* Card */
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(123,94,167,0.10)",
    marginLeft: 60,
  },
  rowLabel: {
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
  iconBadgeDanger: { backgroundColor: "rgba(217,64,64,0.08)" },

  /* Modal */
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
