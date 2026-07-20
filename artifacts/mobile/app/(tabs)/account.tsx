import { Icon } from "@/components/Icon";
import { UserAvatar } from "@/components/UserAvatar";
import { useLanguage } from "@/contexts/LanguageContext";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  useWindowDimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { apiFetch, API_BASE } from "@/lib/apiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LangCode } from "@/i18n";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import * as Notifications from "expo-notifications";
import { requestAndRegisterPushToken } from "@/services/notifications";

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
  if (!res.ok) throw new Error("upload_failed");
  const data = await res.json() as { url: string };
  return data.url;
}

const TAB_FLOAT_H    = 64;
const TAB_BOTTOM_GAP = Platform.OS === "web" ? 12 : 10;

/* ── Language selection modal (reusable) ──────────────────────────── */
function LanguageModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const T = useTheme();

  const handleSelect = async (code: LangCode) => {
    await changeLanguage(code);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[S.modalOverlay, { backgroundColor: T.overlay }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[S.modalSheet, { backgroundColor: T.card, paddingBottom: 32 }]}>
          <View style={[S.modalHandle, { backgroundColor: T.border }]} />
          <Text style={[S.modalTitle, { color: T.text }]}>{t("language.select")}</Text>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const selected = currentLanguage === lang.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => handleSelect(lang.code)}
                style={({ pressed }) => [
                  S.langOption,
                  selected && { backgroundColor: T.purpleFaint },
                  pressed && { opacity: 0.75 },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <Text style={[S.langOptionLabel, { color: selected ? T.purple : T.text }]}>
                  {lang.nativeLabel}
                </Text>
                {selected && <Icon name="checkmark" size={18} color={T.purple} />}
              </Pressable>
            );
          })}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function AccountScreen() {
  const insets        = useSafeAreaInsets();
  const { width: SW } = useWindowDimensions();
  const { user, logout, changePassword, updateProfile } = useAuth();
  const router        = useRouter();
  const T             = useTheme();
  const { t }         = useTranslation();
  const { currentLanguage, supportedLanguages } = useLanguage();

  const topPad       = Platform.OS === "web" ? (SW < 1024 ? 54 : 16) : insets.top;
  const tabClearance = Platform.OS === "web" ? (SW < 1024 ? 100 : 24) : (insets.bottom + TAB_BOTTOM_GAP + TAB_FLOAT_H);

  /* ── Avatar ──────────────────────────────────────────────────── */
  const [avatarUploading, setAvatarUploading] = useState(false);

  const pickFromSource = async (source: "camera" | "gallery") => {
    if (source === "camera") {
      if (Platform.OS === "web") {
        Alert.alert(t("account.avatar.cameraNotAvailable"));
        return;
      }
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("common.permissionDenied"), t("account.avatar.cameraPermission"));
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
        Alert.alert(t("common.permissionDenied"), t("account.avatar.galleryPermission"));
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
      Alert.alert(t("common.success"), t("account.avatar.uploadSuccess"));
    } catch {
      Alert.alert(t("common.error"), t("account.avatar.uploadError"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarPress = () => {
    const hasPhoto = !!user?.avatar;

    if (Platform.OS === "ios") {
      const options = [t("common.takePhoto"), t("common.chooseFromGallery"), ...(hasPhoto ? [t("common.removePhoto")] : []), t("common.cancel")];
      const destructiveIdx = hasPhoto ? options.indexOf(t("common.removePhoto")) : -1;
      const cancelIdx = options.length - 1;
      ActionSheetIOS.showActionSheetWithOptions(
        { title: t("account.avatar.title"), options, cancelButtonIndex: cancelIdx, destructiveButtonIndex: destructiveIdx >= 0 ? destructiveIdx : undefined },
        (idx) => {
          if (idx === 0) pickFromSource("camera");
          else if (idx === 1) pickFromSource("gallery");
          else if (hasPhoto && idx === 2) confirmRemovePhoto();
        }
      );
    } else {
      const btns: { text: string; style?: "cancel" | "destructive"; onPress?: () => void }[] = [
        { text: t("common.takePhoto"),        onPress: () => pickFromSource("camera") },
        { text: t("common.chooseFromGallery"), onPress: () => pickFromSource("gallery") },
        ...(hasPhoto ? [{ text: t("common.removePhoto"), style: "destructive" as const, onPress: confirmRemovePhoto }] : []),
        { text: t("common.cancel"), style: "cancel" as const },
      ];
      Alert.alert(t("account.avatar.title"), undefined, btns);
    }
  };

  const confirmRemovePhoto = () => {
    Alert.alert(
      t("common.removePhoto"),
      "",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.removePhoto"), style: "destructive",
          onPress: async () => {
            setAvatarUploading(true);
            try {
              await updateProfile({ avatar: null });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              Alert.alert(t("common.error"), t("account.avatar.removeError"));
            } finally {
              setAvatarUploading(false);
            }
          },
        },
      ]
    );
  };

  /* ── Change password modal ───────────────────────────────────── */
  const [pwModalVisible, setPwModalVisible] = useState(false);
  const [currentPw,   setCurrentPw]   = useState("");
  const [newPw,       setNewPw]       = useState("");
  const [confirmPw,   setConfirmPw]   = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading,   setPwLoading]   = useState(false);

  /* ── Delete account modal ────────────────────────────────────── */
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePw,      setDeletePw]      = useState("");
  const [showDeletePw,  setShowDeletePw]  = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* ── Language modal ──────────────────────────────────────────── */
  const [langModalVisible, setLangModalVisible] = useState(false);

  /* ── Push permission status ─────────────────────────────────── */
  const [pushPermGranted, setPushPermGranted] = useState<boolean | null>(null);
  const [pushEnabling,    setPushEnabling]    = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") { setPushPermGranted(false); return; }
    Notifications.getPermissionsAsync().then((p) => {
      setPushPermGranted((p as any).granted === true || (p as any).status === "granted");
    }).catch(() => setPushPermGranted(false));
  }, []);

  const handleEnableNotifications = useCallback(async () => {
    const storedToken = await AsyncStorage.getItem("@canyoldasi:jwt").catch(() => null);
    if (!storedToken) return;
    setPushEnabling(true);
    try {
      const success = await requestAndRegisterPushToken(storedToken);
      if (success) {
        setPushPermGranted(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert(t("account.pushNotifications.deniedTitle"), t("account.pushNotifications.deniedBody"));
      }
    } finally {
      setPushEnabling(false);
    }
  }, [t]);

  /* ── Notification preferences ────────────────────────────────── */
  type NotifPrefs = {
    generalEnabled:   boolean;
    messagesEnabled:  boolean;
    adoptionEnabled:  boolean;
    remindersEnabled: boolean;
    emergencyEnabled: boolean;
  };
  const defaultPrefs: NotifPrefs = {
    generalEnabled:   true,
    messagesEnabled:  true,
    adoptionEnabled:  true,
    remindersEnabled: true,
    emergencyEnabled: true,
  };
  const [notifPrefs,   setNotifPrefs]   = useState<NotifPrefs>(defaultPrefs);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiFetch("/push-tokens/preferences")
      .then((r) => r.json() as Promise<NotifPrefs>)
      .then((data) => setNotifPrefs(data))
      .catch(() => {/* silently keep defaults */});
  }, [user]);

  const saveNotifPref = useCallback(async (key: keyof NotifPrefs, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    setNotifLoading(true);
    try {
      await apiFetch("/push-tokens/preferences", {
        method: "PATCH",
        body: JSON.stringify({ [key]: value }),
      });
    } catch {
      /* revert on failure */
      setNotifPrefs(notifPrefs);
    } finally {
      setNotifLoading(false);
    }
  }, [notifPrefs]);

  /* ── Subscription management ─────────────────────────────────── */
  const handleManageSubscription = useCallback(() => {
    const iosUrl     = "https://apps.apple.com/account/subscriptions";
    const androidUrl = "https://play.google.com/store/account/subscriptions";
    if (Platform.OS === "ios") {
      Linking.openURL(iosUrl);
    } else if (Platform.OS === "android") {
      Linking.openURL(androidUrl);
    } else {
      Alert.alert(
        t("account.manageSubscription"),
        t("account.manageSubscriptionWebInfo")
      );
    }
  }, [t]);

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
      Alert.alert(t("common.error"), t("account.passwordModal.errorFillAll")); return;
    }
    if (newPw.length < 6) {
      Alert.alert(t("common.error"), t("account.passwordModal.errorTooShort")); return;
    }
    if (newPw !== confirmPw) {
      Alert.alert(t("common.error"), t("account.passwordModal.errorMismatch")); return;
    }
    setPwLoading(true);
    try {
      await changePassword(currentPw, newPw);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPwModalVisible(false);
      Alert.alert(t("common.success"), t("account.passwordModal.successMsg"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("errors.generic");
      Alert.alert(t("common.error"), msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      if (window.confirm(t("account.logoutConfirm"))) {
        logout().then(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      }
      return;
    }
    Alert.alert(t("account.logout"), t("account.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("account.logoutConfirmYes"), style: "destructive",
        onPress: async () => {
          await logout();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    if (!deletePw) {
      Alert.alert(t("common.error"), t("account.deleteModal.passwordRequired")); return;
    }
    setDeleteLoading(true);
    try {
      await apiFetch("/auth/account", { method: "DELETE", body: JSON.stringify({ password: deletePw }) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDeleteModalVisible(false);
      await logout();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("errors.generic");
      Alert.alert(t("common.error"), msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDeleteAccount = () => {
    if (Platform.OS === "web") {
      if (window.confirm(t("account.deleteAccountConfirm"))) {
        openDeleteModal();
      }
      return;
    }
    Alert.alert(
      t("account.deleteAccount"),
      t("account.deleteAccountWarning"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.yes"), style: "destructive", onPress: openDeleteModal },
      ],
    );
  };

  if (!user) return null;

  const currentLangMeta = supportedLanguages.find((l) => l.code === currentLanguage) ?? supportedLanguages[0];

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
                accessibilityLabel={t("account.avatar.title")}
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
          <Text style={[S.sectionTitle, { color: T.textFaint }]}>{t("account.settings")}</Text>
          <View style={[S.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <Pressable
              style={({ pressed }) => [S.row, { opacity: pressed ? 0.75 : 1 }]}
              onPress={openPwModal}
            >
              <View style={[S.iconBadge, { backgroundColor: T.purpleFaint }]}>
                <Icon name="lock-closed-outline" size={18} color={T.purple} />
              </View>
              <Text style={[S.rowLabel, { flex: 1, color: T.text }]}>{t("account.changePassword")}</Text>
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
              <Text style={[S.rowLabel, { flex: 1, color: T.text }]}>{t("account.forgotPassword")}</Text>
              <Icon name="chevron-forward" size={16} color={T.textFaint} />
            </Pressable>

            <View style={[S.divider, { backgroundColor: T.divider }]} />

            {/* ── Dil / Language ────────────────────────── */}
            <Pressable
              style={({ pressed }) => [S.row, { opacity: pressed ? 0.75 : 1 }]}
              onPress={() => setLangModalVisible(true)}
            >
              <View style={[S.iconBadge, { backgroundColor: T.purpleFaint }]}>
                <Icon name="globe" size={18} color={T.purple} />
              </View>
              <Text style={[S.rowLabel, { flex: 1, color: T.text }]}>{t("account.language")}</Text>
              <Text style={[S.rowValueText, { color: T.textMuted }]}>{currentLangMeta.nativeLabel}</Text>
              <Icon name="chevron-forward" size={16} color={T.textFaint} />
            </Pressable>
          </View>
        </View>

        {/* ── Abonelik ───────────────────────────────────── */}
        <View style={S.section}>
          <Text style={[S.sectionTitle, { color: T.textFaint }]}>{t("account.subscription")}</Text>
          <View style={[S.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <Pressable
              style={({ pressed }) => [S.row, { opacity: pressed ? 0.75 : 1 }]}
              onPress={handleManageSubscription}
            >
              <View style={[S.iconBadge, { backgroundColor: T.purpleFaint }]}>
                <Icon name="card-outline" size={18} color={T.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.rowLabel, { color: T.text }]}>{t("account.manageSubscription")}</Text>
                <Text style={[S.rowDesc, { color: T.textFaint }]}>
                  {Platform.OS === "ios"
                    ? t("account.manageSubscriptionIosInfo")
                    : Platform.OS === "android"
                    ? t("account.manageSubscriptionAndroidInfo")
                    : t("account.manageSubscriptionWebInfo")}
                </Text>
              </View>
              <Icon name="chevron-forward" size={16} color={T.textFaint} />
            </Pressable>
          </View>
        </View>

        {/* ── Bildirimler ─────────────────────────────────── */}
        <View style={S.section}>
          <Text style={[S.sectionTitle, { color: T.textFaint }]}>{t("account.notifications")}</Text>

          {/* Enable push notifications prompt — shown only on native when permission not yet granted */}
          {Platform.OS !== "web" && pushPermGranted === false && (
            <Pressable
              onPress={handleEnableNotifications}
              disabled={pushEnabling}
              style={({ pressed }) => [{
                backgroundColor: T.purpleFaint,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: T.purple + "44",
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
                opacity: pressed ? 0.75 : 1,
              }]}
            >
              <Icon name="notifications-outline" size={20} color={T.purple} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: T.purple, fontWeight: "600", fontSize: 14 }}>
                  {t("account.pushNotifications.enableTitle")}
                </Text>
                <Text style={{ color: T.textFaint, fontSize: 12, marginTop: 2 }}>
                  {t("account.pushNotifications.enableSubtitle")}
                </Text>
              </View>
              {pushEnabling
                ? <ActivityIndicator size="small" color={T.purple} />
                : <Icon name="chevron-forward-outline" size={16} color={T.purple} />}
            </Pressable>
          )}

          <View style={[S.card, { backgroundColor: T.card, borderColor: T.border }]}>

            {/* General / Ana toggle */}
            <View style={S.row}>
              <View style={[S.iconBadge, { backgroundColor: T.purpleFaint }]}>
                <Icon name="notifications-outline" size={18} color={T.purple} />
              </View>
              <Text style={[S.rowLabel, { flex: 1, color: T.text }]}>{t("account.pushNotifications.general")}</Text>
              <Switch
                value={notifPrefs.generalEnabled}
                onValueChange={(v) => saveNotifPref("generalEnabled", v)}
                trackColor={{ false: T.border, true: T.purple }}
                thumbColor="#FFF"
                disabled={notifLoading}
              />
            </View>

            <View style={[S.divider, { backgroundColor: T.divider }]} />

            {/* Messages */}
            <View style={[S.row, { opacity: notifPrefs.generalEnabled ? 1 : 0.45 }]}>
              <View style={[S.iconBadge, { backgroundColor: T.purpleFaint }]}>
                <Icon name="chatbubble-outline" size={18} color={T.purple} />
              </View>
              <Text style={[S.rowLabel, { flex: 1, color: T.text }]}>{t("account.pushNotifications.messages")}</Text>
              <Switch
                value={notifPrefs.messagesEnabled && notifPrefs.generalEnabled}
                onValueChange={(v) => saveNotifPref("messagesEnabled", v)}
                trackColor={{ false: T.border, true: T.purple }}
                thumbColor="#FFF"
                disabled={notifLoading || !notifPrefs.generalEnabled}
              />
            </View>

            <View style={[S.divider, { backgroundColor: T.divider }]} />

            {/* Adoption */}
            <View style={[S.row, { opacity: notifPrefs.generalEnabled ? 1 : 0.45 }]}>
              <View style={[S.iconBadge, { backgroundColor: T.purpleFaint }]}>
                <Icon name="heart-outline" size={18} color={T.purple} />
              </View>
              <Text style={[S.rowLabel, { flex: 1, color: T.text }]}>{t("account.pushNotifications.adoption")}</Text>
              <Switch
                value={notifPrefs.adoptionEnabled && notifPrefs.generalEnabled}
                onValueChange={(v) => saveNotifPref("adoptionEnabled", v)}
                trackColor={{ false: T.border, true: T.purple }}
                thumbColor="#FFF"
                disabled={notifLoading || !notifPrefs.generalEnabled}
              />
            </View>

            <View style={[S.divider, { backgroundColor: T.divider }]} />

            {/* Reminders */}
            <View style={[S.row, { opacity: notifPrefs.generalEnabled ? 1 : 0.45 }]}>
              <View style={[S.iconBadge, { backgroundColor: T.purpleFaint }]}>
                <Icon name="alarm-outline" size={18} color={T.purple} />
              </View>
              <Text style={[S.rowLabel, { flex: 1, color: T.text }]}>{t("account.pushNotifications.reminders")}</Text>
              <Switch
                value={notifPrefs.remindersEnabled && notifPrefs.generalEnabled}
                onValueChange={(v) => saveNotifPref("remindersEnabled", v)}
                trackColor={{ false: T.border, true: T.purple }}
                thumbColor="#FFF"
                disabled={notifLoading || !notifPrefs.generalEnabled}
              />
            </View>

            <View style={[S.divider, { backgroundColor: T.divider }]} />

            {/* Emergency */}
            <View style={[S.row, { opacity: notifPrefs.generalEnabled ? 1 : 0.45 }]}>
              <View style={[S.iconBadge, { backgroundColor: "#FEF2F2" }]}>
                <Icon name="warning-outline" size={18} color="#D94040" />
              </View>
              <Text style={[S.rowLabel, { flex: 1, color: T.text }]}>{t("account.pushNotifications.emergency")}</Text>
              <Switch
                value={notifPrefs.emergencyEnabled && notifPrefs.generalEnabled}
                onValueChange={(v) => saveNotifPref("emergencyEnabled", v)}
                trackColor={{ false: T.border, true: "#D94040" }}
                thumbColor="#FFF"
                disabled={notifLoading || !notifPrefs.generalEnabled}
              />
            </View>
          </View>
        </View>

        {/* ── Oturum ─────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={[S.sectionTitle, { color: T.textFaint }]}>{t("account.session")}</Text>
          <View style={[S.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <Pressable
              style={({ pressed }) => [S.row, { opacity: pressed ? 0.75 : 1 }]}
              onPress={handleLogout}
            >
              <View style={[S.iconBadge, S.iconBadgeDanger]}>
                <Icon name="log-out-outline" size={18} color="#D94040" />
              </View>
              <Text style={[S.rowLabel, { flex: 1, color: "#D94040" }]}>{t("account.logout")}</Text>
              <Icon name="chevron-forward" size={16} color="#D94040" />
            </Pressable>
          </View>
        </View>

        {/* ── Hukuki ─────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={[S.sectionTitle, { color: T.textFaint }]}>{t("account.legal")}</Text>
          <View style={[S.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <Pressable
              style={({ pressed }) => [S.row, { opacity: pressed ? 0.75 : 1 }]}
              onPress={() => router.push("/privacy-policy" as any)}
            >
              <View style={[S.iconBadge, { backgroundColor: T.purpleFaint }]}>
                <Icon name="shield-checkmark-outline" size={18} color={T.purple} />
              </View>
              <Text style={[S.rowLabel, { flex: 1, color: T.text }]}>{t("account.privacyPolicy")}</Text>
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
              <Text style={[S.rowLabel, { flex: 1, color: T.text }]}>{t("account.termsOfService")}</Text>
              <Icon name="chevron-forward" size={16} color={T.textFaint} />
            </Pressable>
          </View>
        </View>

        {/* ── Tehlikeli Alan ──────────────────────────────── */}
        <View style={S.section}>
          <Text style={[S.sectionTitle, { color: T.textFaint }]}>{t("account.dangerZone")}</Text>
          <View style={[S.card, { backgroundColor: T.card, borderColor: "#D94040" }]}>
            <Pressable
              style={({ pressed }) => [S.row, { opacity: pressed ? 0.75 : 1 }]}
              onPress={confirmDeleteAccount}
            >
              <View style={[S.iconBadge, S.iconBadgeDanger]}>
                <Icon name="trash-outline" size={18} color="#D94040" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.rowLabel, { color: "#D94040" }]}>{t("account.deleteAccount")}</Text>
                <Text style={[S.rowDesc, { color: T.textFaint }]}>{t("account.deleteAccountDesc")}</Text>
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
            <Text style={[S.modalTitle, { color: T.text }]}>{t("account.passwordModal.title")}</Text>
            <Text style={[S.modalSubtitle, { color: T.textMuted }]}>
              {t("account.passwordModal.subtitle")}
            </Text>

            {[
              { labelKey: "account.passwordModal.currentPassword", icon: "lock-closed-outline" as const, val: currentPw, set: setCurrentPw, show: showCurrent, toggleShow: () => setShowCurrent((v) => !v) },
              { labelKey: "account.passwordModal.newPassword",     icon: "key-outline"         as const, val: newPw,      set: setNewPw,      show: showNew,     toggleShow: () => setShowNew((v) => !v)     },
              { labelKey: "account.passwordModal.newPasswordRepeat", icon: "key-outline"       as const, val: confirmPw, set: setConfirmPw, show: showConfirm, toggleShow: () => setShowConfirm((v) => !v)  },
            ].map(({ labelKey, icon, val, set, show, toggleShow }) => (
              <View key={labelKey} style={S.modalInputGroup}>
                <Text style={[S.modalLabel, { color: T.textMuted }]}>{t(labelKey)}</Text>
                <View style={[S.modalInputWrap, { backgroundColor: T.input, borderColor: T.inputBorder }]}>
                  <Icon name={icon} size={18} color={T.purple} />
                  <TextInput
                    style={[S.modalInput, { color: T.text }]}
                    value={val}
                    onChangeText={set}
                    placeholder={t(labelKey)}
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
                <Text style={[S.modalCancelText, { color: T.purpleDark }]}>{t("common.cancel")}</Text>
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
                  : <Text style={S.modalSaveText}>{t("account.passwordModal.save")}</Text>
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
            <Text style={[S.modalTitle, { color: "#D94040" }]}>{t("account.deleteModal.title")}</Text>
            <Text style={[S.modalSubtitle, { color: T.textMuted }]}>
              {t("account.deleteModal.subtitle")}
            </Text>

            <View style={S.modalInputGroup}>
              <Text style={[S.modalLabel, { color: T.textMuted }]}>{t("account.deleteModal.passwordLabel")}</Text>
              <View style={[S.modalInputWrap, { backgroundColor: T.input, borderColor: "#D94040" }]}>
                <Icon name="lock-closed-outline" size={18} color="#D94040" />
                <TextInput
                  style={[S.modalInput, { color: T.text }]}
                  value={deletePw}
                  onChangeText={setDeletePw}
                  placeholder={t("account.deleteModal.passwordPlaceholder")}
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
                <Text style={[S.modalCancelText, { color: T.purpleDark }]}>{t("common.cancel")}</Text>
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
                  : <Text style={S.modalSaveText}>{t("account.deleteModal.submit")}</Text>
                }
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Dil Seçimi Modal ─────────────────────────── */}
      <LanguageModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },

  header:      { paddingHorizontal: 20, paddingBottom: 20 },
  headerInner: { flexDirection: "row", alignItems: "center", gap: 14 },
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
  rowValueText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  iconBadge: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  iconBadgeDanger: { backgroundColor: "rgba(217,64,64,0.10)" },

  /* ── Language option ─── */
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  langOptionLabel: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
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
