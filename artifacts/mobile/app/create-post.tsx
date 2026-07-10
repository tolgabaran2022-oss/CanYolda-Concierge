import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { apiCreatePost } from "@/lib/feedApi";
import { useTheme } from "@/hooks/useTheme";

const PURPLE      = "#7B5EA7";
const PURPLE_DARK = "#3D2070";
const BG          = "#F9F8FF";
const MAX_CAPTION = 500;
const CAT_DEFAULT = "https://loremflickr.com/300/300/cat?lock=500";

export default function CreatePostScreen() {
  const T      = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [imageUri,   setImageUri]   = useState<string | null>(null);
  const [caption,    setCaption]    = useState("");
  const [location,   setLocation]   = useState("");
  const [publishing, setPublishing] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("İzin gerekli", "Kamera iznini ayarlardan etkinleştirin.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePublish = async () => {
    if (!user) return;
    if (!imageUri) {
      Alert.alert("Fotoğraf gerekli", "Gönderi için bir fotoğraf seçin.");
      return;
    }
    setPublishing(true);
    try {
      await apiCreatePost({
        userId:   user.id,
        username: user.username ?? user.name,
        avatarUrl: user.avatar ?? CAT_DEFAULT,
        imageUrl:  imageUri,
        caption:   caption.trim(),
        location:  location.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert("Hata", "Gönderi paylaşılamadı. Tekrar deneyin.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPublishing(false);
    }
  };

  if (!user) return null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[S.root, { paddingTop: insets.top, backgroundColor: T.bg }]}>
        {/* ── Top bar ──────────────────────────────── */}
        <View style={[S.topBar, { backgroundColor: T.card, borderBottomColor: T.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={S.topBarBtn}>
            <Ionicons name="close" size={24} color={T.text} />
          </Pressable>
          <Text style={[S.topBarTitle, { color: T.text }]}>Yeni Gönderi</Text>
          <Pressable
            onPress={handlePublish}
            hitSlop={12}
            style={({ pressed }) => [S.publishBtn, { opacity: pressed ? 0.75 : 1 }]}
            disabled={publishing || !imageUri}
          >
            {publishing
              ? <ActivityIndicator size="small" color={PURPLE} />
              : <Text style={[S.publishBtnText, !imageUri && { color: "#BBBBDD" }]}>Paylaş</Text>
            }
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Image picker ─────────────────────── */}
          {imageUri ? (
            <View style={S.previewWrap}>
              <Image source={{ uri: imageUri }} style={S.preview} contentFit="cover" />
              <Pressable
                style={S.changePhotoChip}
                onPress={pickImage}
              >
                <Ionicons name="camera-reverse-outline" size={16} color="#FFF" />
                <Text style={S.changePhotoText}>Değiştir</Text>
              </Pressable>
            </View>
          ) : (
            <View style={S.pickWrap}>
              <Pressable
                style={({ pressed }) => [S.pickArea, { opacity: pressed ? 0.85 : 1 }]}
                onPress={pickImage}
              >
                <LinearGradient
                  colors={["rgba(123,94,167,0.08)", "rgba(123,94,167,0.04)"]}
                  style={S.pickAreaInner}
                >
                  <View style={S.pickIconCircle}>
                    <Ionicons name="images-outline" size={36} color={PURPLE} />
                  </View>
                  <Text style={S.pickTitle}>Fotoğraf Seç</Text>
                  <Text style={S.pickSub}>Galeriden bir fotoğraf seçin</Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                style={({ pressed }) => [S.cameraBtn, { opacity: pressed ? 0.85 : 1 }]}
                onPress={takePhoto}
              >
                <Ionicons name="camera-outline" size={20} color={PURPLE} />
                <Text style={S.cameraBtnText}>Kameradan Çek</Text>
              </Pressable>
            </View>
          )}

          {/* ── Caption ──────────────────────────── */}
          <View style={S.section}>
            <View style={[S.card, { backgroundColor: T.card, borderColor: T.border }]}>
              {/* User row */}
              <View style={S.userRow}>
                <Image
                  source={{ uri: user.avatar ?? CAT_DEFAULT }}
                  style={S.userAvatar}
                  contentFit="cover"
                />
                <Text style={[S.userName, { color: T.text }]}>{user.name}</Text>
              </View>

              <TextInput
                style={[S.captionInput, { color: T.text }]}
                value={caption}
                onChangeText={(v) => setCaption(v.slice(0, MAX_CAPTION))}
                placeholder="Bugün sokaktaki dostlarımızla güzel bir gün geçirdik 🐾"
                placeholderTextColor={T.placeholder}
                multiline
                maxLength={MAX_CAPTION}
                textAlignVertical="top"
              />
              <Text style={[S.charCount, { color: T.textFaint }]}>{caption.length}/{MAX_CAPTION}</Text>
            </View>
          </View>

          {/* ── Location ─────────────────────────── */}
          <View style={S.section}>
            <View style={[S.card, { backgroundColor: T.card, borderColor: T.border }]}>
              <View style={S.locationRow}>
                <Ionicons name="location-outline" size={20} color={T.purple} />
                <TextInput
                  style={[S.locationInput, { color: T.text }]}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Konum ekle (örn. Kadıköy, İstanbul)"
                  placeholderTextColor={T.placeholder}
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>

          {/* ── Publish button ───────────────────── */}
          <View style={S.section}>
            <Pressable
              style={({ pressed }) => [S.bigPublishBtn, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handlePublish}
              disabled={publishing || !imageUri}
            >
              <LinearGradient
                colors={imageUri ? ["#9478D8", "#5B3FD6"] : ["#CCCCDD", "#CCCCDD"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={S.bigPublishGradient}
              >
                {publishing
                  ? <ActivityIndicator color="#FFF" />
                  : <>
                      <Ionicons name="paper-plane-outline" size={18} color="#FFF" />
                      <Text style={S.bigPublishText}>Gönderiyi Paylaş</Text>
                    </>
                }
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  /* top bar */
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1, borderBottomColor: "rgba(123,94,167,0.10)",
  },
  topBarTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: PURPLE_DARK },
  topBarBtn:   { padding: 4, minWidth: 56 },
  publishBtn:  { minWidth: 56, alignItems: "flex-end", padding: 4 },
  publishBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: PURPLE },

  /* image picker */
  pickWrap: { marginTop: 16, gap: 12 },
  pickArea: { borderRadius: 18, overflow: "hidden" },
  pickAreaInner: {
    height: 220, alignItems: "center", justifyContent: "center", gap: 10,
    borderWidth: 1.5, borderColor: "rgba(123,94,167,0.20)", borderRadius: 18, borderStyle: "dashed",
  },
  pickIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(123,94,167,0.10)", alignItems: "center", justifyContent: "center",
  },
  pickTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: PURPLE_DARK },
  pickSub:   { fontSize: 13, fontFamily: "Inter_400Regular", color: "#8888AA" },

  cameraBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: "rgba(123,94,167,0.22)",
    backgroundColor: "rgba(123,94,167,0.04)",
  },
  cameraBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: PURPLE },

  /* preview */
  previewWrap: { marginTop: 16, borderRadius: 18, overflow: "hidden", position: "relative" },
  preview:     { width: "100%", aspectRatio: 4 / 3 },
  changePhotoChip: {
    position: "absolute", bottom: 12, right: 12,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  changePhotoText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFF" },

  /* section / card */
  section: { marginTop: 16 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(123,94,167,0.10)", padding: 14,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },

  /* user row */
  userRow:   { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  userAvatar:{ width: 36, height: 36, borderRadius: 18 },
  userName:  { fontSize: 14, fontFamily: "Inter_700Bold", color: PURPLE_DARK },

  /* caption */
  captionInput: { fontSize: 15, fontFamily: "Inter_400Regular", color: PURPLE_DARK, minHeight: 80, lineHeight: 22 },
  charCount:    { fontSize: 11, fontFamily: "Inter_400Regular", color: "#ABABCC", textAlign: "right", marginTop: 6 },

  /* location */
  locationRow:  { flexDirection: "row", alignItems: "center", gap: 10 },
  locationInput:{ flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: PURPLE_DARK, paddingVertical: 4 },

  /* publish */
  bigPublishBtn:     { borderRadius: 16, overflow: "hidden" },
  bigPublishGradient:{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  bigPublishText:    { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
});
