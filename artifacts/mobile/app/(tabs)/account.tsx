import { Icon } from "@/components/Icon";
import { UserAvatar } from "@/components/UserAvatar";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  KeyboardAvoidingView,
  Modal,
  Platform,
  useWindowDimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { apiFetch, API_BASE } from "@/lib/apiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

async function uploadAvatarPhoto(localUri: string): Promise<string> {
  const filename = localUri.split("/").pop() ?? "avatar.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const mimeType = match ? `image/${match[1].toLowerCase().replace("jpg", "jpeg")}` : "image/jpeg";
  const formData = new FormData();
  if (Platform.OS === "web") {
    const response = await fetch(localUri);
    const blob = await response.blob();
    formData.append("image", blob, filename);
  } else {
    formData.append("image", { uri: localUri, name: filename, type: mimeType } as unknown as Blob);
  }
  const token = await AsyncStorage.getItem("@canyoldasi:jwt");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData, headers });
  if (!res.ok) throw new Error("Profil fotoğrafı yüklenemedi. Lütfen tekrar deneyin.");
  const data = await res.json() as { url: string };
  return data.url;
}


const TAB_FLOAT_H    = 64;
const TAB_BOTTOM_GAP = Platform.OS === "web" ? 12 : 10;

export default function AccountScreen() {
  const insets        = useSafeAreaInsets();
  const { width: SW } = useWindowDimensions();
  const { user, logout, changePassword, updateProfile } = useAuth();
  const router        = useRouter();
  const T             = useTheme();

  const topPad       = Platform.OS === "web" ? (SW < 1024 ? 54 : 16) : insets.top;
  const tabClearance = Platform.OS === "web" ? (SW < 1024 ? 100 : 24) : (insets.bottom + TAB_BOTTOM_GAP + TAB_FLOAT_H);

  /* ── Change password modal state ───────────────────────────── */
  const [avatarUploading, setAvatarUploading] = useState(false);

  const pickFromSource = async (source: "camera" | "gallery") => {
    if (source === "camera") {
      if (Platform.OS === "web") {
        Alert.alert("Bu cihazda kamera kullanılamıyor.");
        return;
      }
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "İzin verilmedi",
          "Profil fotoğrafı eklemek için uygulama ayarlarından kamera iznini açabilirsiniz."
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"] as unknown as ImagePicker.MediaType[],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;
      await doUpload(result.assets[0].uri);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "İzin verilmedi",
          "Profil fotoğrafı seçmek için uygulama ayarlarından fotoğraf erişimini açabilirsiniz."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"] as unknown as ImagePicker.MediaType[],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;
      await doUpload(result.assets[0].uri);
    }
  };

  const doUpload = async (localUri: string) => {
    setAvatarUploading(true);
    try {
      const url = await uploadAvatarPhoto(localUri);
      await updateProfile({ avatar: url });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Başarılı", "Profil fotoğrafın güncellendi.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Profil fotoğrafı yüklenemedi. Lütfen tekrar deneyin.";
      Alert.alert("Hata", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarPress = () => {
    const hasPhoto = !!user?.avatar;

    if (Platform.OS === "ios") {
      const options = ["Fotoğraf Çek", "Galeriden Seç", ...(hasPhoto ? ["Mevcut Fotoğrafı Kaldır"] : []), "İptal"];
      const destructiveIdx = hasPhoto ? options.indexOf("Mevcut Fotoğrafı Kaldır") : -1;
      const cancelIdx = options.length - 1;
      ActionSheetIOS.showActionSheetWithOptions(
        { title: "Profil Fotoğrafı", options, cancelButtonIndex: cancelIdx, destructiveButtonIndex: destructiveIdx >= 0 ? destructiveIdx : undefined },
        (idx) => {
          if (idx === 0) pickFromSource("camera");
          else if (idx === 1) pickFromSource("gallery");
          else if (hasPhoto && idx === 2) confirmRemovePhoto();
        }
      );
    } else {
      const btns: { text: string; style?: "cancel" | "destructive"; onPress?: () => void }[] = [
        { text: "Fotoğraf Çek",    onPress: () => pickFromSource("camera") },
        { text: "Galeriden Seç",   onPress: () => pickFromSource("gallery") },
        ...(hasPhoto ? [{ text: "Mevcut Fotoğrafı Kaldır", style: "destructive" as const, onPress: confirmRemovePhoto }] : []),
        { text: "İptal", style: "cancel" as const },
      ];
      Alert.alert("Profil Fotoğrafı", undefined, btns);
    }
  };

  const confirmRemovePhoto = () => {
    Alert.alert(
      "Fotoğrafı Kaldır",
      "Profil fotoğrafını kaldırmak istediğine emin misin?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Fotoğrafı Kaldır", style: "destructive",
          onPress: async () => {
            setAvatarUploading(true);
            try {
              await updateProfile({ avatar: null });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              Alert.alert("Hata", "Fotoğraf kaldırılamadı.");
            } finally {
              setAvatarUploading(false);
            }
          },
        },
      ]
    );
  };

  const [pwModalVisible, setPwModalVisible] = useState(false);
  const [currentPw,   setCurrentPw]   = useState("");
  const [newPw,       setNewPw]       = useState("");
  const [confirmPw,   setConfirmPw]   = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading,   setPwLoading]   = useState(false);

  /* ── Delete account modal state ────────────────────────────── */
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePw,     setDeletePw]     = useState("");
  const [showDeletePw, setShowDeletePw] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openPwModal = () => {
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setPwModalVisible(true);
  };

  const openDeleteModal = () => {
    setDeletePw("");
    setDeleteModalVisible(true);
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

  const handleDeleteAccount = async () => {
    if (!deletePw) {
      Alert.alert("Hata", "Şifrenizi girin."); return;
    }
    setDeleteLoading(true);
    try {
      await apiFetch("/auth/account", { method: "DELETE", body: JSON.stringify({ password: deletePw }) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDeleteModalVisible(false);
      await logout();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Hesap silinemedi.";
      Alert.alert("Hata", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDeleteAccount = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Hesabınızı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
        openDeleteModal();
      }
      return;
    }
    Alert.alert(
      "Hesabı Sil",
      "Bu işlem geri alınamaz. Tüm kişisel verileriniz silinecek. Devam etmek istiyor musunuz?",
      [
        { text: "İptal", style: "cancel" },
        { text: "Evet, Sil", style: "destructive", onPress: openDeleteModal },
      ],
    );
  };

  if (!user) return null;

  return (
    <View style={[S.root, { backgroundColor: T.bg }]}>
      {/* ── Header ──────────────────────────────────────── */}
      <LinearGradient
        colors={T.headerGrad}
        style={[S.header, { paddingTop: topPad + 8 }]}
      >
        <View style={S.headerInner}>
          <View style={{ position: "relative" }}>
            <UserAvatar
              uri={user.avatar}
              name={user.name}
              size={52}
              uploading={avatarUploading}
            />
            {!avatarUploading && (
              <Pressable
                onPress={handleAvatarPress}
                accessibilityRole="button"
                accessibilityLabel="Profil fotoğrafını değiştir"
                style={({ pressed }) => [S.cameraBadge, { opacity: pressed ? 0.8 : 1 }]}
              >
                <Icon name="camera" size={11} color="#FFF" />
              </Pressable>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[S.headerName, { color: T.purpleDark }]}>{user.name}</Text>
            <Text style={[S.headerEmail, { color: T.textMuted }]}>{user.email}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[S.container, { paddingBottom: tabClearance + 24 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hesap Ayarları ─────────────────────────────── */}
        <View style={S.section}>
          <Text style={[S.sectionTitle, { color: T.textFaint }]}>Hesap Ayarları</Text>
          <View style={[S.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <Pressable
              style={({ pressed }) => [S.row, { opacity: pressed ? 0.75 : 1 }]}
              onPress={openPwModal}
            >
              <View style={[S.iconBadge, { backgroundColor: T.purpleFaint }]}>
                <Icon name="lock-closed-outline" size={18} color={T.purple} />
              </View>
              <Text style={[S.rowLabel, { flex: 1, color: T.text }]}>Şifre Değiştir</Text>
              <Icon name="chevron-forward" size={16} color={T.textFaint} />
            </Pressable>

            <View style={[S.divider, { backgroundColor: T.divider }]} />

            <Pressable
              style={({ pressed }) => [S.row, { opacity: pressed ? 0.75 : 1 }]}
              onPress={() => router.push("/(auth)/forgot-password" as any)}
            >
              <View style={[S.iconBadge, { backgroundColor: T.purpleFaint }]}>
                <Icon name="key-outline" size={18} color={T.purple} />
              </View>
              <Text style={[S.rowLabel, { flex: 1, color: T.text }]}>Şifremi Unuttum</Text>
              <Icon name="chevron-forward" size={16} color={T.textFaint} />
            </Pressable>
          </View>
        </View>

        {/* ── Oturum ─────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={[S.sectionTitle, { color: T.textFaint }]}>Oturum</Text>
          <View style={[S.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <Pressable
              style={({ pressed }) => [S.row, { opacity: pressed ? 0.75 : 1 }]}
              onPress={handleLogout}
            >
              <View style={[S.iconBadge, S.iconBadgeDanger]}>
                <Icon name="log-out-outline" size={18} color="#D94040" />
              </View>
              <Text style={[S.rowLabel, { flex: 1, color: "#D94040" }]}>Çıkış Yap</Text>
              <Icon name="chevron-forward" size={16} color="#D94040" />
            </Pressable>
          </View>
        </View>

        {/* ── Hukuki ─────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={[S.sectionTitle, { color: T.textFaint }]}>Hukuki</Text>
          <View style={[S.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <Pressable
              style={({ pressed }) => [S.row, { opacity: pressed ? 0.75 : 1 }]}
              onPress={() => router.push("/privacy-policy" as any)}
            >
              <View style={[S.iconBadge, { backgroundColor: T.purpleFaint }]}>
                <Icon name="shield-checkmark-outline" size={18} color={T.purple} />
              </View>
              <Text style={[S.rowLabel, { flex: 1, color: T.text }]}>Gizlilik Politikası</Text>
              <Icon name="chevron-forward" size={16} color={T.textFaint} />
            </Pressable>
            <View style={[S.divider, { backgroundColor: T.divider }]} />
            <Pressable
              style={({ pressed }) => [S.row, { opacity: pressed ? 0.75 : 1 }]}
              onPress={() => router.push("/terms-of-service" as any)}
            >
              <View style={[S.iconBadge, { backgroundColor: T.purpleFaint }]}>
                <Icon name="document-text-outline" size={18} color={T.purple} />
              </View>
              <Text style={[S.rowLabel, { flex: 1, color: T.text }]}>Kullanım Koşulları</Text>
              <Icon name="chevron-forward" size={16} color={T.textFaint} />
            </Pressable>
          </View>
        </View>

        {/* ── Tehlikeli Alan ──────────────────────────────── */}
        <View style={S.section}>
          <Text style={[S.sectionTitle, { color: T.textFaint }]}>Tehlikeli Alan</Text>
          <View style={[S.card, { backgroundColor: T.card, borderColor: "#D94040" }]}>
            <Pressable
              style={({ pressed }) => [S.row, { opacity: pressed ? 0.75 : 1 }]}
              onPress={confirmDeleteAccount}
            >
              <View style={[S.iconBadge, S.iconBadgeDanger]}>
                <Icon name="trash-outline" size={18} color="#D94040" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.rowLabel, { color: "#D94040" }]}>Hesabı Sil</Text>
                <Text style={[S.rowDesc, { color: T.textFaint }]}>Tüm veriler kalıcı olarak silinir</Text>
              </View>
              <Icon name="chevron-forward" size={16} color="#D94040" />
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
          style={[S.modalOverlay, { backgroundColor: T.overlay }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPwModalVisible(false)} />
          <View style={[
            S.modalSheet,
            { backgroundColor: T.card, paddingBottom: Math.max(insets.bottom, 24) },
          ]}>
            <View style={[S.modalHandle, { backgroundColor: T.border }]} />
            <Text style={[S.modalTitle, { color: T.text }]}>Şifre Değiştir</Text>
            <Text style={[S.modalSubtitle, { color: T.textMuted }]}>
              Güvenliğin için güçlü bir şifre seç
            </Text>

            {[
              { label: "Mevcut Şifre",       icon: "lock-closed-outline" as const, val: currentPw, set: setCurrentPw, show: showCurrent, toggleShow: () => setShowCurrent((v) => !v) },
              { label: "Yeni Şifre",          icon: "key-outline"         as const, val: newPw,      set: setNewPw,      show: showNew,     toggleShow: () => setShowNew((v) => !v)     },
              { label: "Yeni Şifre (Tekrar)", icon: "key-outline"         as const, val: confirmPw, set: setConfirmPw, show: showConfirm, toggleShow: () => setShowConfirm((v) => !v)  },
            ].map(({ label, icon, val, set, show, toggleShow }) => (
              <View key={label} style={S.modalInputGroup}>
                <Text style={[S.modalLabel, { color: T.textMuted }]}>{label}</Text>
                <View style={[S.modalInputWrap, { backgroundColor: T.input, borderColor: T.inputBorder }]}>
                  <Icon name={icon} size={18} color={T.purple} />
                  <TextInput
                    style={[S.modalInput, { color: T.text }]}
                    value={val}
                    onChangeText={set}
                    placeholder={label}
                    placeholderTextColor={T.placeholder}
                    secureTextEntry={!show}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={toggleShow}>
                    <Icon name={show ? "eye-off-outline" : "eye-outline"} size={18} color={T.purple} />
                  </Pressable>
                </View>
              </View>
            ))}

            <View style={S.modalBtnRow}>
              <Pressable
                style={({ pressed }) => [
                  S.modalCancelBtn,
                  { backgroundColor: T.purpleFaint, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => setPwModalVisible(false)}
              >
                <Text style={[S.modalCancelText, { color: T.purpleDark }]}>İptal</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  S.modalSaveBtn,
                  { backgroundColor: T.purple, opacity: pressed ? 0.85 : 1 },
                ]}
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

      {/* ── Hesap Sil Modal ──────────────────────────── */}
      <Modal
        visible={deleteModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[S.modalOverlay, { backgroundColor: T.overlay }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDeleteModalVisible(false)} />
          <View style={[
            S.modalSheet,
            { backgroundColor: T.card, paddingBottom: Math.max(insets.bottom, 24) },
          ]}>
            <View style={[S.modalHandle, { backgroundColor: T.border }]} />
            <Text style={[S.modalTitle, { color: "#D94040" }]}>Hesabı Kalıcı Sil</Text>
            <Text style={[S.modalSubtitle, { color: T.textMuted }]}>
              Bu işlem geri alınamaz. Onaylamak için şifrenizi girin.
            </Text>

            <View style={S.modalInputGroup}>
              <Text style={[S.modalLabel, { color: T.textMuted }]}>Şifreniz</Text>
              <View style={[S.modalInputWrap, { backgroundColor: T.input, borderColor: "#D94040" }]}>
                <Icon name="lock-closed-outline" size={18} color="#D94040" />
                <TextInput
                  style={[S.modalInput, { color: T.text }]}
                  value={deletePw}
                  onChangeText={setDeletePw}
                  placeholder="Şifrenizi girin"
                  placeholderTextColor={T.placeholder}
                  secureTextEntry={!showDeletePw}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowDeletePw((v) => !v)}>
                  <Icon name={showDeletePw ? "eye-off-outline" : "eye-outline"} size={18} color="#D94040" />
                </Pressable>
              </View>
            </View>

            <View style={S.modalBtnRow}>
              <Pressable
                style={({ pressed }) => [
                  S.modalCancelBtn,
                  { backgroundColor: T.purpleFaint, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={[S.modalCancelText, { color: T.purpleDark }]}>İptal</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  S.modalSaveBtn,
                  { backgroundColor: "#D94040", opacity: (pressed || deleteLoading) ? 0.85 : 1 },
                ]}
                onPress={handleDeleteAccount}
                disabled={deleteLoading || !deletePw}
                accessibilityState={{ disabled: deleteLoading || !deletePw }}
              >
                {deleteLoading
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={S.modalSaveText}>Hesabı Sil</Text>
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
  root: { flex: 1 },

  header:      { paddingHorizontal: 20, paddingBottom: 20 },
  headerInner: { flexDirection: "row", alignItems: "center", gap: 14 },
  headerSearchBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#7B5EA7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 3 },
      android: { elevation: 3 },
    }),
  },
  headerName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  headerEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },

  container: { paddingHorizontal: 16, paddingTop: 20, gap: 0 },
  section:   { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios:     { shadowColor: "#7B5EA7", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
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
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  rowDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  iconBadge: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  iconBadgeDanger: { backgroundColor: "rgba(217,64,64,0.10)" },

  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 14,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: -6,
  },
  modalInputGroup: { gap: 6 },
  modalLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  modalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  modalInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
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
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
});
