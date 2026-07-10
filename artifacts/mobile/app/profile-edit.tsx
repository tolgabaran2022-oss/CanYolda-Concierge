import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import type { UserSettings } from "@/contexts/AuthContext";
import { DEFAULT_SETTINGS } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";

const PURPLE = "#7B5EA7";
const PURPLE_DARK = "#3D2070";
const BG = "#F9F8FF";
const CAT_AVATAR = "https://loremflickr.com/300/300/cat?lock=500";

export default function ProfileEditScreen() {
  const T      = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateProfile, getSettings, updateSettings } = useAuth();

  const [name,      setName]      = useState(user?.name     ?? "");
  const [username,  setUsername]  = useState(user?.username ?? "");
  const [bio,       setBio]       = useState(user?.bio      ?? "");
  const [location,  setLocation]  = useState(user?.location ?? "");
  const [avatar,    setAvatar]    = useState<string | null>(user?.avatar ?? null);
  const [saving,    setSaving]    = useState(false);

  /* ── Privacy & notification prefs ──────────────────────── */
  const [settings,        setSettings]        = useState<UserSettings>({ ...DEFAULT_SETTINGS });
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSettings().then((s) => { if (!cancelled) { setSettings(s); setSettingsLoading(false); } })
                 .catch(() => { if (!cancelled) setSettingsLoading(false); });
    return () => { cancelled = true; };
  }, [getSettings]);

  const patchSetting = (key: keyof UserSettings, val: boolean) =>
    setSettings((prev) => ({ ...prev, [key]: val }));


  /* ── Avatar picker ───────────────────────────────────── */
  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) setAvatar(result.assets[0].uri);
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("İzin gerekli", "Kamera iznini ayarlardan etkinleştirin."); return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) setAvatar(result.assets[0].uri);
  };

  const handleAvatarPress = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["İptal", "Fotoğraf Seç", "Kameradan Çek", "Fotoğrafı Kaldır"],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 3,
        },
        (idx) => {
          if (idx === 1) pickFromLibrary();
          else if (idx === 2) pickFromCamera();
          else if (idx === 3) setAvatar(null);
        }
      );
    } else {
      Alert.alert("Profil Fotoğrafı", "Nasıl değiştirmek istersiniz?", [
        { text: "İptal", style: "cancel" },
        { text: "Fotoğraf Seç", onPress: pickFromLibrary },
        { text: "Kameradan Çek", onPress: pickFromCamera },
        { text: "Fotoğrafı Kaldır", style: "destructive", onPress: () => setAvatar(null) },
      ]);
    }
  };

  /* ── Save ────────────────────────────────────────────── */
  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) { Alert.alert("Hata", "Ad Soyad boş olamaz."); return; }
    const trimmedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, "");
    setSaving(true);
    try {
      await Promise.all([
        updateProfile({
          name: trimmedName,
          username: trimmedUsername || undefined,
          bio: bio.trim(),
          location: location.trim(),
          avatar: avatar,
        }),
        updateSettings(settings),
      ]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Başarılı", "Profil ayarları kaydedildi.");
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ayarlar kaydedilemedi. Lütfen tekrar deneyin.";
      Alert.alert("Hata", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
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
            <Ionicons name="chevron-back" size={24} color={T.text} />
          </Pressable>
          <Text style={[S.topBarTitle, { color: T.text }]}>Profili Düzenle</Text>
          <Pressable
            onPress={handleSave}
            hitSlop={12}
            style={({ pressed }) => [S.topBarBtn, S.saveBtn, { opacity: pressed ? 0.75 : 1 }]}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color={PURPLE} />
              : <Text style={S.saveBtnText}>Kaydet</Text>
            }
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Avatar ───────────────────────────── */}
          <View style={S.avatarSection}>
            <Pressable onPress={handleAvatarPress} style={S.avatarWrap}>
              <LinearGradient
                colors={["#C278F0", "#7B5EA7", "#5B3FD6"]}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
                style={S.avatarRing}
              >
                <View style={S.avatarInner}>
                  <Image
                    source={{ uri: avatar ?? CAT_AVATAR }}
                    style={S.avatarImg}
                    contentFit="cover"
                  />
                </View>
              </LinearGradient>
              <View style={S.cameraChip}>
                <Ionicons name="camera" size={14} color="#FFF" />
              </View>
            </Pressable>
            <Pressable onPress={handleAvatarPress}>
              <Text style={S.changePhotoText}>Fotoğrafı Değiştir</Text>
            </Pressable>
          </View>

          {/* ── Kişisel Bilgiler ──────────────────── */}
          <SectionHeader title="Kişisel Bilgiler" />
          <View style={[S.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <Field
              icon="person-outline"
              label="Ad Soyad"
              value={name}
              onChange={setName}
              placeholder="Adınızı girin"
            />
            <FieldDivider />
            <Field
              icon="at-outline"
              label="Kullanıcı Adı"
              value={username}
              onChange={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
              placeholder="kullaniciadi"
              prefix="@"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <FieldDivider />
            <View style={S.fieldRow}>
              <View style={S.fieldIconWrap}>
                <Ionicons name="text-outline" size={18} color={PURPLE} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={S.fieldLabel}>Biyografi</Text>
                <TextInput
                  style={[S.fieldInput, S.bioInput]}
                  value={bio}
                  onChangeText={(v) => setBio(v.slice(0, 150))}
                  placeholder="Kendinizden bahsedin..."
                  placeholderTextColor="#ABABCC"
                  multiline
                  maxLength={150}
                  textAlignVertical="top"
                />
                <Text style={S.charCount}>{bio.length}/150</Text>
              </View>
            </View>
            <FieldDivider />
            <Field
              icon="mail-outline"
              label="E-posta"
              value={user.email}
              onChange={() => {}}
              placeholder={user.email}
              editable={false}
              hint="E-posta değiştirilemez"
            />
            <FieldDivider />
            <Field
              icon="location-outline"
              label="Şehir / Konum"
              value={location}
              onChange={setLocation}
              placeholder="İstanbul"
            />
          </View>

          {/* ── Gizlilik ─────────────────────────── */}
          <SectionHeader title="Gizlilik" />
          <View style={[S.card, { backgroundColor: T.card, borderColor: T.border }]}>
            {settingsLoading ? (
              <ActivityIndicator color={PURPLE} style={{ margin: 20 }} />
            ) : (
              <>
                <ToggleRow
                  icon="earth-outline"
                  label="Profil herkese açık"
                  sub="Kapalıysa sadece takipçiler görür"
                  value={settings.isProfilePublic}
                  onChange={(v) => patchSetting("isProfilePublic", v)}
                />
                <FieldDivider />
                <ToggleRow
                  icon="play-circle-outline"
                  label="Hikayelerim görünür"
                  sub="Hikayelerini kimin görebileceğini ayarla"
                  value={settings.areStoriesVisible}
                  onChange={(v) => patchSetting("areStoriesVisible", v)}
                />
              </>
            )}
          </View>

          {/* ── Bildirimler ───────────────────────── */}
          <SectionHeader title="Bildirimler" />
          <View style={[S.card, { backgroundColor: T.card, borderColor: T.border }]}>
            {settingsLoading ? (
              <ActivityIndicator color={PURPLE} style={{ margin: 20 }} />
            ) : (
              <>
                <ToggleRow
                  icon="heart-outline"
                  label="Beğeni bildirimleri"
                  value={settings.likeNotificationsEnabled}
                  onChange={(v) => patchSetting("likeNotificationsEnabled", v)}
                />
                <FieldDivider />
                <ToggleRow
                  icon="chatbubble-outline"
                  label="Yorum bildirimleri"
                  value={settings.commentNotificationsEnabled}
                  onChange={(v) => patchSetting("commentNotificationsEnabled", v)}
                />
                <FieldDivider />
                <ToggleRow
                  icon="mail-outline"
                  label="Mesaj bildirimleri"
                  value={settings.messageNotificationsEnabled}
                  onChange={(v) => patchSetting("messageNotificationsEnabled", v)}
                />
              </>
            )}
          </View>

          {/* ── Save button ───────────────────────── */}
          <Pressable
            style={({ pressed }) => [S.bigSaveBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <LinearGradient
              colors={["#9478D8", "#5B3FD6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={S.bigSaveGradient}
            >
              {saving
                ? <ActivityIndicator color="#FFF" />
                : <Text style={S.bigSaveBtnText}>Profili Kaydet</Text>
              }
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function SectionHeader({ title }: { title: string }) {
  const T = useTheme();
  return <Text style={[S.sectionHeader, { color: T.textMuted }]}>{title}</Text>;
}

function FieldDivider() {
  return <View style={S.divider} />;
}

function Field({
  icon, label, value, onChange, placeholder, prefix, editable = true,
  autoCapitalize = "words", autoCorrect = true, hint,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  editable?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  hint?: string;
}) {
  return (
    <View style={S.fieldRow}>
      <View style={S.fieldIconWrap}>
        <Ionicons name={icon} size={18} color={editable ? PURPLE : "#ABABCC"} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={S.fieldLabel}>{label}</Text>
        <View style={S.fieldInputRow}>
          {prefix ? <Text style={S.prefix}>{prefix}</Text> : null}
          <TextInput
            style={[S.fieldInput, !editable && S.fieldInputDisabled]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#ABABCC"
            editable={editable}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
          />
        </View>
        {hint ? <Text style={S.hint}>{hint}</Text> : null}
      </View>
    </View>
  );
}


function ToggleRow({
  icon, label, sub, value, onChange,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const T = useTheme();
  return (
    <View style={S.settingsRow}>
      <View style={S.settingsIconWrap}>
        <Ionicons name={icon} size={18} color={T.purple} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[S.settingsLabel, { color: T.text }]}>{label}</Text>
        {sub ? <Text style={[S.settingsSub, { color: T.textMuted }]}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#E0DAF0", true: T.purple }}
        thumbColor="#FFF"
        ios_backgroundColor="#E0DAF0"
      />
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────── */
const S = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  scroll:  { paddingHorizontal: 18, paddingTop: 12 },

  /* top bar */
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1, borderBottomColor: "rgba(123,94,167,0.10)",
  },
  topBarTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: PURPLE_DARK },
  topBarBtn:   { padding: 4, minWidth: 60 },
  saveBtn:     { alignItems: "flex-end" },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: PURPLE },

  /* avatar */
  avatarSection: { alignItems: "center", paddingVertical: 24, gap: 10 },
  avatarWrap:    { position: "relative" },
  avatarRing:    { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", padding: 3 },
  avatarInner:   { width: 90, height: 90, borderRadius: 45, overflow: "hidden", borderWidth: 2.5, borderColor: "#FFFFFF" },
  avatarImg:     { width: "100%", height: "100%" },
  cameraChip:    {
    position: "absolute", bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: PURPLE, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#FFFFFF",
  },
  changePhotoText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: PURPLE },

  /* section header */
  sectionHeader: {
    fontSize: 12, fontFamily: "Inter_700Bold", color: "#8888AA",
    textTransform: "uppercase", letterSpacing: 0.8,
    marginTop: 22, marginBottom: 8, marginLeft: 2,
  },

  /* card */
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(123,94,167,0.10)",
    overflow: "hidden",
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  divider: { height: 1, backgroundColor: "rgba(123,94,167,0.08)", marginLeft: 52 },

  /* field */
  fieldRow:      { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  fieldIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: `${PURPLE}15`, alignItems: "center", justifyContent: "center", marginTop: 16 },
  fieldLabel:    { fontSize: 11, fontFamily: "Inter_500Medium", color: "#AAAACC", marginBottom: 2 },
  fieldInputRow: { flexDirection: "row", alignItems: "center" },
  prefix:        { fontSize: 15, fontFamily: "Inter_400Regular", color: "#888899", marginRight: 1 },
  fieldInput:    { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: PURPLE_DARK, paddingVertical: 0 },
  fieldInputDisabled: { color: "#AAAACC" },
  bioInput:      { minHeight: 72, lineHeight: 22 },
  charCount:     { fontSize: 11, fontFamily: "Inter_400Regular", color: "#ABABCC", textAlign: "right", marginTop: 4 },
  hint:          { fontSize: 11, fontFamily: "Inter_400Regular", color: "#ABABCC", marginTop: 2 },

  /* settings rows */
  settingsRow:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  settingsIconWrap:{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${PURPLE}15`, alignItems: "center", justifyContent: "center" },
  settingsLabel:   { fontSize: 14, fontFamily: "Inter_500Medium", color: PURPLE_DARK, flex: 1 },
  settingsSub:     { fontSize: 11, fontFamily: "Inter_400Regular", color: "#AAAACC", marginTop: 2 },

  /* save button */
  bigSaveBtn:      { marginTop: 28, borderRadius: 16, overflow: "hidden" },
  bigSaveGradient: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  bigSaveBtnText:  { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
});
