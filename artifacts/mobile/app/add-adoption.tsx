import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from "@/contexts/AuthContext";

/* ── Design tokens ──────────────────────────────────────── */
const C = {
  purple:      "#7B5EA7",
  purpleDark:  "#4A2D8F",
  purpleLight: "#9478D8",
  bg:          "#F8F5FF",
  card:        "#FFFFFF",
  inputBg:     "#FAFAFA",
  border:      "#E5E7EB",
  label:       "#1A0A3C",
  placeholder: "#9CA3AF",
  sub:         "#7C6F9A",
  muted:       "#6B7280",
};

const PET_TYPES: { label: string; emoji: string }[] = [
  { label: "Kedi",    emoji: "🐱" },
  { label: "Köpek",   emoji: "🐶" },
  { label: "Kuş",     emoji: "🐦" },
  { label: "Tavşan",  emoji: "🐰" },
  { label: "Diğer",   emoji: "🐾" },
];

/* ── Reusable input ─────────────────────────────────────── */
function Field({
  label,
  required,
  containerStyle,
  multiline,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  required?: boolean;
  containerStyle?: object;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[S.field, containerStyle]}>
      <Text style={S.label}>
        {label}
        {required && <Text style={S.req}> *</Text>}
      </Text>
      <TextInput
        {...props}
        multiline={multiline}
        style={[
          multiline ? S.textArea : S.input,
          focused && (multiline ? S.textAreaFocused : S.inputFocused),
        ]}
        placeholderTextColor={C.placeholder}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e)  => { setFocused(false); props.onBlur?.(e); }}
      />
    </View>
  );
}

/* ── Main screen ────────────────────────────────────────── */
export default function AddAdoptionScreen() {
  const insets          = useSafeAreaInsets();
  const router          = useRouter();
  const { addListing }  = useAdoption();
  const { user }        = useAuth();

  const [petName,     setPetName]     = useState("");
  const [petType,     setPetType]     = useState("Kedi");
  const [petAge,      setPetAge]      = useState("");
  const [photo,       setPhoto]       = useState<string | undefined>();
  const [location,    setLocation]    = useState("");
  const [description, setDescription] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [isSaving,    setIsSaving]    = useState(false);

  const pickPhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (
      !petName.trim() ||
      !location.trim() ||
      !description.trim() ||
      !contactInfo.trim()
    ) {
      Alert.alert("Eksik Bilgi", "Lütfen zorunlu alanları doldurun.");
      return;
    }
    if (!user) return;
    setIsSaving(true);
    try {
      await addListing({
        petName:     petName.trim(),
        petType,
        petAge:      petAge.trim() || undefined,
        photo,
        location:    location.trim(),
        description: description.trim(),
        userId:      user.id,
        userName:    user.name,
        contactInfo: contactInfo.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert("Hata", "İlan oluşturulamadı.");
    } finally {
      setIsSaving(false);
    }
  };

  const topPad    = Platform.OS === "web" ? 16 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const CTA_H     = 56;
  const CTA_AREA  = CTA_H + bottomPad + 24;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[S.root, { backgroundColor: C.bg }]}>

        {/* ── Custom header ──────────────────────────────── */}
        <View style={[S.header, { paddingTop: topPad + 10 }]}>
          <Pressable style={S.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={C.label} />
          </Pressable>
          <Text style={S.headerTitle} numberOfLines={1}>
            Sahiplendirme İlanı
          </Text>
          <View style={S.backBtn} />
        </View>

        {/* ── Scrollable form ─────────────────────────────── */}
        <ScrollView
          style={S.scroll}
          contentContainerStyle={[
            S.scrollContent,
            { paddingBottom: CTA_AREA + 8 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Section intro */}
          <View style={S.intro}>
            <Text style={S.introTitle}>Yeni İlan Oluştur</Text>
            <Text style={S.introSub}>
              Yeni bir dost için sahiplendirme ilanı oluştur
            </Text>
          </View>

          {/* ── Form card ───────────────────────────────── */}
          <View style={S.card}>

            {/* Photo upload */}
            <Pressable
              onPress={pickPhoto}
              style={({ pressed }) => [{ opacity: pressed ? 0.86 : 1 }]}
            >
              {photo ? (
                <View style={S.photoWrap}>
                  <Image
                    source={{ uri: photo }}
                    style={S.photo}
                    contentFit="cover"
                  />
                  <View style={S.photoEditBadge}>
                    <Ionicons name="camera" size={13} color="#FFF" />
                    <Text style={S.photoEditText}>Değiştir</Text>
                  </View>
                </View>
              ) : (
                <View style={S.photoBox}>
                  <View style={S.cameraRing}>
                    <Ionicons name="camera-outline" size={30} color={C.purple} />
                  </View>
                  <Text style={S.photoLabel}>Fotoğraf ekle</Text>
                  <Text style={S.photoSub}>JPG, PNG · Maks 10 MB</Text>
                </View>
              )}
            </Pressable>

            <View style={S.divider} />

            {/* Pet name */}
            <Field
              label="Hayvanın Adı"
              required
              placeholder="Örn: Pamuk"
              value={petName}
              onChangeText={setPetName}
            />

            {/* Pet type chips */}
            <View style={S.field}>
              <Text style={S.label}>Tür</Text>
              <View style={S.chipRow}>
                {PET_TYPES.map(({ label, emoji }) => {
                  const active = petType === label;
                  return (
                    <Pressable
                      key={label}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setPetType(label);
                      }}
                      style={({ pressed }) => [
                        S.chip,
                        active && S.chipActive,
                        { transform: [{ scale: pressed ? 0.95 : 1 }] },
                      ]}
                    >
                      {active ? (
                        <LinearGradient
                          colors={[C.purpleLight, C.purpleDark]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={S.chipInner}
                        >
                          <Text style={S.chipEmoji}>{emoji}</Text>
                          <Text style={S.chipTextActive}>{label}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={S.chipInner}>
                          <Text style={S.chipEmoji}>{emoji}</Text>
                          <Text style={S.chipText}>{label}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Age + Location */}
            <View style={S.row2}>
              <Field
                label="Yaş"
                placeholder="1 yaş"
                value={petAge}
                onChangeText={setPetAge}
                containerStyle={{ flex: 1 }}
              />
              <Field
                label="Konum"
                required
                placeholder="İlçe, Şehir"
                value={location}
                onChangeText={setLocation}
                containerStyle={{ flex: 2 }}
              />
            </View>

            {/* Description */}
            <Field
              label="Açıklama"
              required
              placeholder="Hayvanın karakteri, sağlık durumu, sahip olma koşulları..."
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />

            {/* Contact info */}
            <Field
              label="İletişim Bilgisi"
              required
              placeholder="Telefon veya e-posta"
              value={contactInfo}
              onChangeText={setContactInfo}
              keyboardType="email-address"
              autoCapitalize="none"
            />

          </View>
        </ScrollView>

        {/* ── Fixed bottom CTA ────────────────────────────── */}
        <View style={[S.ctaWrap, { paddingBottom: bottomPad + 12 }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleSave();
            }}
            disabled={isSaving}
            style={({ pressed }) => [{ opacity: pressed || isSaving ? 0.86 : 1 }]}
          >
            <LinearGradient
              colors={[C.purpleLight, C.purpleDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[S.cta, { height: CTA_H }]}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="heart" size={20} color="#FFF" />
                  <Text style={S.ctaText}>İlanı Yayınla</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>

      </View>
    </>
  );
}

/* ── Styles ─────────────────────────────────────────────── */
const S = StyleSheet.create({
  root:  { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 16,
  },

  /* ── Custom header ── */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(123,94,167,0.08)",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: C.label,
    letterSpacing: -0.3,
    flex: 1,
    textAlign: "center",
  },

  /* ── Intro ── */
  intro: { paddingTop: 4, paddingBottom: 4, gap: 4 },
  introTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: C.label,
    letterSpacing: -0.4,
  },
  introSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.sub,
    lineHeight: 20,
  },

  /* ── Form card ── */
  card: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 20,
    gap: 20,
    shadowColor: "#7B5EA7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },

  /* ── Photo ── */
  photoWrap: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
  },
  photo: { width: "100%", height: "100%" },
  photoEditBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.52)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  photoEditText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
  photoBox: {
    width: "100%",
    height: 150,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: `rgba(123,94,167,0.22)`,
    borderStyle: "dashed",
    backgroundColor: `rgba(123,94,167,0.04)`,
  },
  cameraRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `rgba(123,94,167,0.10)`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  photoLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.purple,
  },
  photoSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.muted,
  },

  divider: {
    height: 1,
    backgroundColor: "#F0EDF8",
    marginHorizontal: -4,
  },

  /* ── Fields ── */
  field: { gap: 8 },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.label,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  req: { color: C.purple },

  input: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.inputBg,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.label,
  },
  inputFocused: {
    borderColor: C.purple,
    backgroundColor: "#FFF",
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },

  textArea: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.inputBg,
    padding: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.label,
    minHeight: 120,
    lineHeight: 22,
  },
  textAreaFocused: {
    borderColor: C.purple,
    backgroundColor: "#FFF",
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },

  /* ── Chips ── */
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: C.border,
    overflow: "hidden",
    backgroundColor: "#FAFAFA",
  },
  chipActive: {
    borderColor: "transparent",
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  chipInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 5,
    minHeight: 40,
  },
  chipEmoji: {
    fontSize: 14,
    lineHeight: 18,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.muted,
  },
  chipTextActive: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },

  /* ── Age + Location row ── */
  row2: { flexDirection: "row", gap: 12 },

  /* ── Fixed bottom CTA ── */
  ctaWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: "rgba(123,94,167,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 18,
    shadowColor: C.purpleDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    letterSpacing: 0.2,
  },
});
