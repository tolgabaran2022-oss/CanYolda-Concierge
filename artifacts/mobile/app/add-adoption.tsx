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

/* ── Design tokens ─────────────────────────────────────── */
const C = {
  purple:      "#7B5EA7",
  purpleDark:  "#4A2D8F",
  purpleLight: "#9478D8",
  purpleGlow:  "rgba(124,92,255,0.12)",
  bg:          "#F6F4FF",
  card:        "#FFFFFF",
  inputBg:     "#FAFAFA",
  border:      "#EAEAEA",
  label:       "#2D2040",
  placeholder: "#ABABBB",
  sub:         "#9B8FBB",
};

const PET_TYPES = ["Kedi", "Köpek", "Kuş", "Tavşan", "Diğer"];

/* ── Reusable premium input ────────────────────────────── */
function PremiumInput({
  label,
  required,
  containerStyle,
  inputStyle,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  required?: boolean;
  containerStyle?: object;
  inputStyle?: object;
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
        style={[
          S.input,
          focused && S.inputFocused,
          inputStyle,
        ]}
        placeholderTextColor={C.placeholder}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      />
      {focused && <View style={S.focusGlow} />}
    </View>
  );
}

/* ── Main screen ───────────────────────────────────────── */
export default function AddAdoptionScreen() {
  const insets     = useSafeAreaInsets();
  const router     = useRouter();
  const { addListing } = useAdoption();
  const { user }   = useAuth();

  const [petName,      setPetName]      = useState("");
  const [petType,      setPetType]      = useState("Kedi");
  const [petAge,       setPetAge]       = useState("");
  const [photo,        setPhoto]        = useState<string | undefined>();
  const [location,     setLocation]     = useState("");
  const [description,  setDescription]  = useState("");
  const [contactInfo,  setContactInfo]  = useState("");
  const [isSaving,     setIsSaving]     = useState(false);

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
    if (!petName.trim() || !location.trim() || !description.trim() || !contactInfo.trim()) {
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

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={S.root}>
      <ScrollView
        style={S.scroll}
        contentContainerStyle={[S.scrollContent, { paddingBottom: bottomPad + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Header ──────────────────────────────── */}
        <View style={S.header}>
          <Text style={S.title}>Sahiplendirme İlanı</Text>
          <Text style={S.subtitle}>Yeni bir dost için ilan oluştur</Text>
        </View>

        {/* ── Premium card ────────────────────────── */}
        <View style={S.card}>

          {/* Photo upload */}
          <Pressable onPress={pickPhoto} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}>
            {photo ? (
              <View style={S.photoWrap}>
                <Image source={{ uri: photo }} style={S.photo} contentFit="cover" />
                <View style={S.photoEditBadge}>
                  <Ionicons name="camera" size={14} color="#FFF" />
                  <Text style={S.photoEditText}>Değiştir</Text>
                </View>
              </View>
            ) : (
              <LinearGradient
                colors={["rgba(164,140,220,0.10)", "rgba(124,92,255,0.06)"]}
                style={S.photoBox}
              >
                <View style={S.cameraCircle}>
                  <Ionicons name="camera-outline" size={26} color={C.purple} />
                </View>
                <Text style={S.photoLabel}>Fotoğraf ekle</Text>
                <Text style={S.photoSub}>JPG, PNG · Maks 10 MB</Text>
              </LinearGradient>
            )}
          </Pressable>

          <View style={S.divider} />

          {/* Pet name */}
          <PremiumInput
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
              {PET_TYPES.map((t) => {
                const active = petType === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPetType(t);
                    }}
                    style={({ pressed }) => [
                      S.chip,
                      active && S.chipActive,
                      { transform: [{ scale: pressed ? 0.96 : 1 }] },
                    ]}
                  >
                    {active ? (
                      <LinearGradient
                        colors={[C.purpleLight, C.purpleDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={S.chipGradient}
                      >
                        <Text style={S.chipTextActive}>{t}</Text>
                      </LinearGradient>
                    ) : (
                      <Text style={S.chipText}>{t}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Age + Location row */}
          <View style={S.row2}>
            <PremiumInput
              label="Yaş"
              placeholder="1 yaş"
              value={petAge}
              onChangeText={setPetAge}
              containerStyle={{ flex: 1 }}
            />
            <PremiumInput
              label="Konum"
              required
              placeholder="İlçe, Şehir"
              value={location}
              onChangeText={setLocation}
              containerStyle={{ flex: 2 }}
            />
          </View>

          {/* Description */}
          <View style={S.field}>
            <Text style={S.label}>
              Açıklama <Text style={S.req}>*</Text>
            </Text>
            <TextInput
              style={S.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Hayvanın karakteri, sağlık durumu, sahip olma koşulları..."
              placeholderTextColor={C.placeholder}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Contact info */}
          <PremiumInput
            label="İletişim Bilgisi"
            required
            placeholder="Telefon veya e-posta"
            value={contactInfo}
            onChangeText={setContactInfo}
            keyboardType="email-address"
            autoCapitalize="none"
          />

        </View>

        {/* ── CTA button ──────────────────────────── */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleSave(); }}
          disabled={isSaving}
          style={({ pressed }) => [{ opacity: pressed || isSaving ? 0.88 : 1 }]}
        >
          <LinearGradient
            colors={[C.purpleLight, C.purpleDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={S.cta}
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

      </ScrollView>
    </View>
  );
}

/* ── Styles ────────────────────────────────────────────── */
const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },

  /* Header */
  header: { alignItems: "center", paddingVertical: 8 },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: C.label,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.sub,
    marginTop: 4,
  },

  /* Card */
  card: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 20,
    gap: 18,
    shadowColor: "#7B5EA7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 24,
    elevation: 5,
  },

  /* Photo */
  photoWrap: {
    width: "100%",
    height: 192,
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
    backgroundColor: "rgba(0,0,0,0.55)",
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
    height: 148,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "rgba(124,92,255,0.18)",
    borderStyle: "dashed",
  },
  cameraCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(124,92,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  photoLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.purple,
  },
  photoSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.sub,
  },

  divider: {
    height: 1,
    backgroundColor: "#F0EDF8",
    marginHorizontal: -4,
  },

  /* Fields */
  field: { gap: 7 },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.label,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  req: { color: C.purple },

  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
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
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2,
  },
  focusGlow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: C.purple,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    opacity: 0.4,
  },

  textArea: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.inputBg,
    padding: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.label,
    minHeight: 110,
  },

  /* Chips */
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 50,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  chipActive: {
    borderColor: "transparent",
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  chipGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.sub,
  },
  chipTextActive: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },

  /* Row 2 */
  row2: { flexDirection: "row", gap: 12 },

  /* CTA */
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 54,
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
