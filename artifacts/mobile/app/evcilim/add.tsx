import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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
import { usePets } from "@/contexts/PetsContext";

/* ── Palette ──────────────────────────────────────────────── */
const P     = "#7B5EA7";
const P2    = "#9E78CC";
const DARK  = "#191330";
const BODY  = "#8F8A9D";
const BG    = "#F6F1FF";
const WHITE = "#FFFFFF";
const BORDER= "#EEE8F5";

const PET_TYPES = ["Kedi", "Köpek", "Kuş", "Tavşan", "Balık", "Diğer"] as const;
type PetType = typeof PET_TYPES[number];

function petEmoji(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("kedi") || t.includes("cat")) return "🐱";
  if (t.includes("köpek") || t.includes("dog")) return "🐶";
  if (t.includes("kuş") || t.includes("bird")) return "🦜";
  if (t.includes("tavşan") || t.includes("rabbit")) return "🐰";
  if (t.includes("balık") || t.includes("fish")) return "🐟";
  return "🐾";
}

/* ── Field Component ────────────────────────────────────────── */
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "decimal-pad";
  multiline?: boolean;
}) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={[f.input, multiline && f.multiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? ""}
        placeholderTextColor={BODY}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}
const f = StyleSheet.create({
  wrap:      { gap: 5 },
  label:     { fontSize: 12, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: 0.2 },
  input:     { backgroundColor: BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: DARK, borderWidth: 1.5, borderColor: `${P}22` },
  multiline: { minHeight: 90, textAlignVertical: "top" },
});

/* ── Section Label ─────────────────────────────────────────── */
function SectionLabel({ title }: { title: string }) {
  return <Text style={sl.txt}>{title}</Text>;
}
const sl = StyleSheet.create({
  txt: { fontSize: 14, fontFamily: "Inter_700Bold", color: P, marginTop: 8, marginBottom: -4 },
});

export default function AddPetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addPet } = usePets();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [type, setType] = useState<PetType>("Kedi");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState<"Erkek" | "Dişi" | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [color, setColor] = useState("");
  const [isNeutered, setIsNeutered] = useState(false);
  const [bio, setBio] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Hata", "Hayvanın adını giriniz.");
      return;
    }
    if (!user) return;
    setIsSaving(true);
    try {
      await addPet({
        name: name.trim(),
        type,
        breed: breed.trim(),
        age: age.trim() || birthDate.trim(),
        image,
        vaccinationInfo: "",
        feedingNotes: bio.trim(),
        userId: user.id,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert("Hata", "Hayvan kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[st.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={st.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={DARK} />
        </Pressable>
        <Text style={st.headerTitle}>Evcil Hayvan Ekle</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[st.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar picker */}
        <Pressable style={st.avatarWrap} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={st.avatar} contentFit="cover" />
          ) : (
            <LinearGradient colors={[`${P2}40`, `${P}20`]} style={st.avatarPlaceholder}>
              <Text style={{ fontSize: 44 }}>{petEmoji(type)}</Text>
            </LinearGradient>
          )}
          <View style={st.cameraBtn}>
            <LinearGradient colors={[P2, P]} style={st.cameraGrad}>
              <Ionicons name="camera" size={14} color={WHITE} />
            </LinearGradient>
          </View>
        </Pressable>

        <View style={st.form}>
          {/* Type selector */}
          <View style={st.fieldWrap}>
            <Text style={f.label}>Hayvan Türü</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {PET_TYPES.map((t) => (
                  <Pressable
                    key={t}
                    style={[st.typePill, type === t && st.typePillActive]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setType(t); }}
                  >
                    <Text style={{ fontSize: 16 }}>{petEmoji(t)}</Text>
                    <Text style={[st.typeLabel, type === t && st.typeLabelActive]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          <Field label="İsim *" value={name} onChangeText={setName} placeholder="Örn. Pamuk" />
          <Field label="Irk / Cins" value={breed} onChangeText={setBreed} placeholder="Örn. British Shorthair" />

          {/* Gender selector */}
          <View style={st.fieldWrap}>
            <Text style={f.label}>Cinsiyet</Text>
            <View style={st.genderRow}>
              {(["Erkek", "Dişi"] as const).map((g) => (
                <Pressable
                  key={g}
                  style={[st.genderPill, gender === g && st.genderPillActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGender(g); }}
                >
                  <Text style={[st.genderLabel, gender === g && st.genderLabelActive]}>
                    {g === "Erkek" ? "Erkek" : "Dişi"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <SectionLabel title="Temel Bilgiler" />
          <Field label="Doğum Tarihi" value={birthDate} onChangeText={setBirthDate} placeholder="YYYY-AA-GG" />
          <Field label="Yaş (metin)" value={age} onChangeText={setAge} placeholder="Örn. 2 yaş 3 ay" />
          <Field label="Ağırlık (kg)" value={weight} onChangeText={setWeight} placeholder="Örn. 4.5" keyboardType="decimal-pad" />
          <Field label="Renk / Desen" value={color} onChangeText={setColor} placeholder="Örn. Gri benekli" />

          {/* Neutered toggle */}
          <View style={st.toggleRow}>
            <View>
              <Text style={st.toggleLabel}>Kısırlaştırıldı mı?</Text>
              <Text style={st.toggleSub}>Sağlık takibi için önemli</Text>
            </View>
            <Switch
              value={isNeutered}
              onValueChange={setIsNeutered}
              trackColor={{ false: "#E0D8F0", true: P }}
              thumbColor={WHITE}
            />
          </View>

          <SectionLabel title="Hakkında" />
          <Field label="Açıklama / Karakter" value={bio} onChangeText={setBio} placeholder="Hayvanın karakteri hakkında kısa bilgi..." multiline />
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={[st.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={({ pressed }) => [st.saveBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <LinearGradient colors={[P2, P]} style={st.saveGrad}>
            <Ionicons name={isSaving ? "hourglass-outline" : "checkmark-circle-outline"} size={20} color={WHITE} />
            <Text style={st.saveTxt}>{isSaving ? "Kaydediliyor..." : "Kaydet"}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: WHITE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK },
  scroll:      { paddingHorizontal: 20, paddingTop: 8, gap: 14 },
  avatarWrap:  { alignSelf: "center", marginBottom: 8 },
  avatar:      { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: WHITE },
  avatarPlaceholder:{ width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center" },
  cameraBtn:   { position: "absolute", bottom: 4, right: 4 },
  cameraGrad:  { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: WHITE },
  form:        { gap: 14 },
  fieldWrap:   { gap: 5 },
  typePill:    { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50, backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER },
  typePillActive:{ borderColor: P, backgroundColor: `${P}10` },
  typeLabel:   { fontSize: 13, fontFamily: "Inter_500Medium", color: BODY },
  typeLabelActive:{ color: P, fontFamily: "Inter_700Bold" },
  genderRow:   { flexDirection: "row", gap: 10, marginTop: 6 },
  genderPill:  { flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER, alignItems: "center" },
  genderPillActive:{ borderColor: P, backgroundColor: `${P}10` },
  genderLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: BODY },
  genderLabelActive:{ color: P, fontFamily: "Inter_700Bold" },
  toggleRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: WHITE, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER },
  toggleLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: DARK },
  toggleSub:   { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, marginTop: 2 },
  footer:      { paddingHorizontal: 20, paddingTop: 12, backgroundColor: BG },
  saveBtn:     { borderRadius: 16, overflow: "hidden" },
  saveGrad:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  saveTxt:     { fontSize: 16, fontFamily: "Inter_700Bold", color: WHITE },
});
