import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await AsyncStorage.getItem("@canyoldasi:jwt");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...opts, headers });
}

async function uploadPhoto(localUri: string, uploadErrorMsg: string): Promise<string> {
  const filename = localUri.split("/").pop() ?? "photo.jpg";
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
  if (!res.ok) throw new Error(uploadErrorMsg);
  const data = await res.json() as { url: string };
  return data.url;
}

const C = {
  purple:     "#7B5EA7",
  purpleDark: "#4A2D8F",
  bg:         "#F8F9FC",
  white:      "#FFFFFF",
  text:       "#1A0A3C",
  muted:      "#8B8FA8",
  border:     "#EEE9F8",
  red:        "#DC2626",
};

const HELP_STATUSES = [
  { key: "same_location",  icon: "map-pin",          color: "#7B5EA7" },
  { key: "injured",        icon: "injured",          color: "#DC2626" },
  { key: "emergency",      icon: "warning-outline",  color: "#EA580C" },
  { key: "fed",            icon: "food",             color: "#16A34A" },
  { key: "watered",        icon: "droplets",         color: "#0284C7" },
  { key: "taken_to_vet",   icon: "car",              color: "#7B5EA7" },
  { key: "at_vet",         icon: "stethoscope",      color: "#0EA5E9" },
  { key: "safe",           icon: "shield-checkmark", color: "#16A34A" },
  { key: "adopted",        icon: "home",             color: "#7B5EA7" },
  { key: "not_found",      icon: "eye-off-outline",  color: "#8B8FA8" },
] as const;

export default function HelpUpdateScreen() {
  const { t }        = useTranslation();
  const { animalId } = useLocalSearchParams<{ animalId: string }>();
  const router       = useRouter();
  const insets       = useSafeAreaInsets();
  const { user }     = useAuth();

  const [photoUri,       setPhotoUri]       = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [note,           setNote]           = useState("");
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const submissionLock = useRef(false);

  const canSubmit = !!photoUri && !!selectedStatus && !isSubmitting;

  const clearPhoto = useCallback(() => {
    setPhotoUri(null);
  }, []);

  const handleCamera = useCallback(async () => {
    if (Platform.OS === "web") return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        t("helpUpdate.cameraPermTitle"),
        t("helpUpdate.cameraPermMsg")
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"] as unknown as ImagePicker.MediaType[],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, [t]);

  const handleGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        t("helpUpdate.galleryPermTitle"),
        t("helpUpdate.galleryPermMsg")
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as unknown as ImagePicker.MediaType[],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, [t]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    if (submissionLock.current) return;
    if (!user?.id) {
      Alert.alert(t("helpUpdate.authRequired"), t("helpUpdate.authRequiredMsg"));
      return;
    }
    if (!animalId) return;

    submissionLock.current = true;
    setIsSubmitting(true);

    try {
      const photoUrl = await uploadPhoto(photoUri!, t("helpUpdate.uploadError"));

      const res = await apiFetch(`/animals/${animalId}/help-updates`, {
        method: "POST",
        body: JSON.stringify({
          photoUrl,
          status: selectedStatus,
          note: note.trim(),
          userName: user.name ?? user.email ?? "",
        }),
      });

      if (!res.ok) {
        let errMsg = t("helpUpdate.errorSave");
        try {
          const errData = await res.json() as { error?: string };
          if (errData.error) errMsg = errData.error;
        } catch {
          /* ignore JSON parse errors */
        }
        throw new Error(errMsg);
      }

      let pointsEarned = 0;
      let cooldownActive = false;
      try {
        const data = await res.json() as { pointsEarned?: number; cooldownActive?: boolean };
        pointsEarned = data.pointsEarned ?? 0;
        cooldownActive = data.cooldownActive ?? false;
      } catch { /* ignore */ }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      let alertMsg = t("helpUpdate.successDefault");
      if (pointsEarned > 0) {
        alertMsg = t("helpUpdate.successWithPoints", { points: pointsEarned });
      } else if (cooldownActive) {
        alertMsg = t("helpUpdate.successCooldown");
      }

      Alert.alert(
        t("helpUpdate.successTitle"),
        alertMsg,
        [{ text: t("common.ok"), onPress: () => router.back() }]
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("helpUpdate.errorDefault");
      Alert.alert(t("errors.error"), msg);
    } finally {
      setIsSubmitting(false);
      submissionLock.current = false;
    }
  }, [canSubmit, user, animalId, photoUri, selectedStatus, note, router, t]);

  const topPad = Platform.OS === "web" ? 16 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[S.header, { paddingTop: topPad + 10 }]}>
        <Pressable
          onPress={() => router.back()}
          style={S.backBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("helpUpdate.backAccessibility")}
        >
          <Icon name="arrow-back" size={20} color={C.text} />
        </Pressable>
        <Text style={S.headerTitle} numberOfLines={2}>
          {t("helpUpdate.headerTitle")}
        </Text>
        <View style={{ width: 42 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.bottom + 80}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 120 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={S.subtitle}>
            {t("helpUpdate.subtitle")}
          </Text>

          {/* Photo Section */}
          <View style={S.section}>
            <Text style={S.sectionTitle}>{t("helpUpdate.photoSection")}</Text>
            <Text style={S.sectionHint}>{t("helpUpdate.photoHint")}</Text>

            {photoUri ? (
              <View style={S.photoPreviewWrap}>
                <Image
                  source={{ uri: photoUri }}
                  style={S.photoPreview}
                  contentFit="cover"
                  transition={200}
                />
                <View style={S.photoOverlay}>
                  <Pressable style={S.removeBtn} onPress={clearPhoto} hitSlop={8}>
                    <Icon name="close" size={15} color={C.white} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={S.photoButtons}>
                {Platform.OS !== "web" && (
                  <Pressable
                    style={({ pressed }) => [S.photoBtn, pressed && { opacity: 0.75 }]}
                    onPress={handleCamera}
                  >
                    <View style={S.photoBtnIcon}>
                      <Icon name="camera-outline" size={22} color={C.purple} />
                    </View>
                    <Text style={S.photoBtnText}>{t("helpUpdate.cameraBtn")}</Text>
                  </Pressable>
                )}
                <Pressable
                  style={({ pressed }) => [S.photoBtn, S.photoBtnFull, pressed && { opacity: 0.75 }]}
                  onPress={handleGallery}
                >
                  <View style={S.photoBtnIcon}>
                    <Icon name="images-outline" size={22} color={C.purple} />
                  </View>
                  <Text style={S.photoBtnText}>{t("helpUpdate.galleryBtn")}</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Status Section */}
          <View style={S.section}>
            <Text style={S.sectionTitle}>{t("helpUpdate.statusSection")}</Text>
            <Text style={S.sectionHint}>{t("helpUpdate.statusHint")}</Text>
            <View style={S.statusGrid}>
              {HELP_STATUSES.map((s) => {
                const active = selectedStatus === s.key;
                return (
                  <Pressable
                    key={s.key}
                    style={[
                      S.statusChip,
                      active && {
                        backgroundColor: `${s.color}12`,
                        borderColor: s.color,
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedStatus(s.key);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Icon name={s.icon} size={18} color={active ? s.color : C.muted} />
                    <Text
                      style={[
                        S.statusLabel,
                        active && { color: s.color, fontFamily: "Inter_600SemiBold" },
                      ]}
                      numberOfLines={2}
                    >
                      {t(`animals.status.${s.key}`, { defaultValue: s.key })}
                    </Text>
                    {active && (
                      <View style={[S.statusActiveDot, { backgroundColor: s.color }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Note Section */}
          <View style={S.section}>
            <Text style={S.sectionTitle}>{t("helpUpdate.noteSection")}</Text>
            <View style={S.noteWrap}>
              <TextInput
                style={S.noteInput}
                multiline
                value={note}
                onChangeText={(txt) => setNote(txt.slice(0, 300))}
                placeholder={t("helpUpdate.notePlaceholder")}
                placeholderTextColor={C.muted}
                maxLength={300}
                textAlignVertical="top"
              />
              <Text style={S.charCount}>{note.length} / 300</Text>
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={[S.footer, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
          <Pressable
            style={[S.submitBtn, !canSubmit && S.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel={t("helpUpdate.submitAccessibility")}
          >
            {isSubmitting ? (
              <View style={S.submitInner}>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={S.submitText}>{t("helpUpdate.submittingBtn")}</Text>
              </View>
            ) : (
              <LinearGradient
                colors={canSubmit ? ["#9C7FE0", "#5B3FD6"] : ["#C8C0DC", "#A899C0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={S.submitGradient}
              >
                <Icon name="checkmark-circle" size={20} color="#FFF" />
                <Text style={S.submitText}>{t("helpUpdate.submitBtn")}</Text>
              </LinearGradient>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const S = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 8,
    maxWidth: Platform.OS === "web" ? 640 : undefined,
    alignSelf: Platform.OS === "web" ? "center" : undefined,
    width: "100%",
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#F0EBF8",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: C.text,
    letterSpacing: -0.2,
    textAlign: "center",
  },

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    maxWidth: Platform.OS === "web" ? 640 : undefined,
    alignSelf: Platform.OS === "web" ? "center" : undefined,
    width: "100%",
  },

  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.muted,
    lineHeight: 21,
    marginBottom: 4,
  },

  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.text,
    marginBottom: 5,
    letterSpacing: -0.2,
  },
  sectionHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.muted,
    marginBottom: 14,
    lineHeight: 19,
  },

  photoButtons: {
    flexDirection: "row",
    gap: 12,
  },
  photoBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: "dashed",
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.white,
    minHeight: 110,
  },
  photoBtnFull: {
    flex: 1,
  },
  photoBtnIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: `${C.purple}10`,
    alignItems: "center", justifyContent: "center",
  },
  photoBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.purple,
  },

  photoPreviewWrap: {
    borderRadius: 18,
    overflow: "hidden",
  },
  photoPreview: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 18,
  },
  photoOverlay: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  removeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center", justifyContent: "center",
  },

  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusChip: {
    width: "47.5%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    minHeight: 52,
    position: "relative",
  },
  statusLabel: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: "Inter_500Medium",
    color: C.text,
    lineHeight: 17,
  },
  statusActiveDot: {
    position: "absolute",
    top: 8, right: 8,
    width: 7, height: 7, borderRadius: 4,
  },

  noteWrap: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    backgroundColor: C.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  noteInput: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.text,
    minHeight: 90,
    lineHeight: 21,
  },
  charCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.muted,
    textAlign: "right",
    marginTop: 4,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    maxWidth: Platform.OS === "web" ? 640 : undefined,
    alignSelf: Platform.OS === "web" ? "center" : undefined,
    width: "100%",
  },
  submitBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  submitBtnDisabled: {
    opacity: 0.55,
  },
  submitGradient: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  submitInner: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#9C7FE0",
    borderRadius: 16,
  },
  submitText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
});
