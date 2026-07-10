import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
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

const P     = "#7B5EA7";
const P2    = "#9E78CC";
const DARK  = "#191330";
const BODY  = "#8F8A9D";
const BG    = "#F6F1FF";
const WHITE = "#FFFFFF";
const BORDER= "#EEE8F5";
const GREEN = "#34C759";
const RED   = "#FF3B30";

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
    <View style={fi.wrap}>
      <Text style={fi.label}>{label}</Text>
      <TextInput
        style={[fi.input, multiline && fi.multiline]}
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
const fi = StyleSheet.create({
  wrap:      { gap: 5 },
  label:     { fontSize: 12, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: 0.2 },
  input:     { backgroundColor: BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: DARK, borderWidth: 1.5, borderColor: `${P}22` },
  multiline: { minHeight: 90, textAlignVertical: "top" },
});

type ManageGridItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
};

export default function PetDetailScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { getPet, updatePet, deletePet } = usePets();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pet = getPet(petId ?? "");

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pet?.name ?? "");
  const [type, setType] = useState<PetType>((pet?.type as PetType) ?? "Kedi");
  const [breed, setBreed] = useState(pet?.breed ?? "");
  const [age, setAge] = useState(pet?.age ?? "");
  const [weight, setWeight] = useState("");
  const [color, setColor] = useState("");
  const [gender, setGender] = useState<"Erkek" | "Dişi" | "">("");
  const [bio, setBio] = useState("");
  const [isNeutered, setIsNeutered] = useState(false);
  const [image, setImage] = useState<string | undefined>(pet?.image);
  const [isSaving, setIsSaving] = useState(false);

  const MANAGE_GRID: ManageGridItem[] = [
    { key: "vaccinations",   label: "Aşılar",    icon: "shield-checkmark-outline", color: "#FF9500",  route: `/evcilim/${petId}/vaccinations` },
    { key: "appointments",   label: "Randevular", icon: "calendar-outline",         color: P,          route: `/evcilim/${petId}/appointments` },
    { key: "identification", label: "Kimlik",     icon: "id-card-outline",          color: "#5856D6",  route: `/evcilim/${petId}/identification` },
    { key: "nutrition",      label: "Beslenme",   icon: "bag-handle-outline",       color: GREEN,      route: `/evcilim/${petId}/nutrition` },
    { key: "notes",          label: "Notlar",     icon: "pencil-outline",           color: "#AF52DE",  route: `/evcilim/${petId}/notes` },
  ];

  if (!pet) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG }}>
        <Text style={{ color: BODY, fontSize: 16 }}>Hayvan bulunamadı</Text>
        <Pressable style={{ marginTop: 16 }} onPress={() => router.back()}>
          <Text style={{ color: P, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setImage(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Hata", "İsim giriniz."); return; }
    setIsSaving(true);
    try {
      await updatePet(petId!, { name: name.trim(), type, breed: breed.trim(), age: age.trim(), image });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(false);
    } catch {
      Alert.alert("Hata", "Kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Hayvanı Sil", `${pet.name} kalıcı olarak silinecek. Emin misin?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try { await deletePet(petId!); router.back(); } catch { Alert.alert("Hata", "Silinemedi."); }
        },
      },
    ]);
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
        <Text style={st.headerTitle} numberOfLines={1}>{pet.name}</Text>
        <Pressable
          style={st.editBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (editing) handleSave();
            else setEditing(true);
          }}
        >
          <LinearGradient colors={[P2, P]} style={st.editGrad}>
            <Ionicons name={editing ? "checkmark" : "pencil"} size={16} color={WHITE} />
          </LinearGradient>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[st.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <Pressable style={st.avatarWrap} onPress={editing ? pickImage : undefined}>
          {(image ?? pet.image) ? (
            <Image source={{ uri: image ?? pet.image }} style={st.avatar} contentFit="cover" />
          ) : (
            <LinearGradient colors={[`${P2}40`, `${P}20`]} style={st.avatarPlaceholder}>
              <Text style={{ fontSize: 52 }}>{petEmoji(pet.type)}</Text>
            </LinearGradient>
          )}
          {editing && (
            <View style={st.cameraBtn}>
              <LinearGradient colors={[P2, P]} style={st.cameraGrad}>
                <Ionicons name="camera" size={14} color={WHITE} />
              </LinearGradient>
            </View>
          )}
        </Pressable>

        {/* Pet info */}
        {editing ? (
          <View style={st.form}>
            {/* Type selector */}
            <View style={fi.wrap}>
              <Text style={fi.label}>Hayvan Türü</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {PET_TYPES.map((t) => (
                    <Pressable
                      key={t}
                      style={[st.typePill, type === t && st.typePillActive]}
                      onPress={() => setType(t)}
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
            <Field label="Yaş" value={age} onChangeText={setAge} placeholder="Örn. 2 yaş" />
            <Field label="Ağırlık (kg)" value={weight} onChangeText={setWeight} placeholder="Örn. 4.5" keyboardType="decimal-pad" />
            <Field label="Renk / Desen" value={color} onChangeText={setColor} placeholder="Örn. Gri benekli" />
            <View style={st.toggleRow}>
              <View>
                <Text style={st.toggleLabel}>Kısırlaştırıldı mı?</Text>
                <Text style={st.toggleSub}>Sağlık takibi için önemli</Text>
              </View>
              <Switch value={isNeutered} onValueChange={setIsNeutered} trackColor={{ false: "#E0D8F0", true: P }} thumbColor={WHITE} />
            </View>
            <Field label="Açıklama / Karakter" value={bio} onChangeText={setBio} placeholder="Karakteri hakkında kısa bilgi..." multiline />

            <Pressable style={st.deleteBtn} onPress={handleDelete}>
              <Text style={st.deleteTxt}>Hayvanı Sil</Text>
            </Pressable>
          </View>
        ) : (
          <View style={st.infoCard}>
            <View style={st.infoRow}>
              <View style={st.infoItem}>
                <Text style={st.infoLabel}>Tür</Text>
                <Text style={st.infoValue}>{pet.type}</Text>
              </View>
              {pet.breed ? (
                <View style={st.infoItem}>
                  <Text style={st.infoLabel}>Irk</Text>
                  <Text style={st.infoValue}>{pet.breed}</Text>
                </View>
              ) : null}
              {pet.age ? (
                <View style={st.infoItem}>
                  <Text style={st.infoLabel}>Yaş</Text>
                  <Text style={st.infoValue}>{pet.age}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Management grid */}
        {!editing && (
          <>
            <Text style={st.sectionTitle}>Yönetim</Text>
            <View style={st.grid}>
              {MANAGE_GRID.map((item) => (
                <Pressable
                  key={item.key}
                  style={({ pressed }) => [st.gridCell, pressed && { opacity: 0.75 }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(item.route as Parameters<typeof router.push>[0]);
                  }}
                >
                  <View style={[st.gridIcon, { backgroundColor: `${item.color}18` }]}>
                    <Ionicons name={item.icon} size={26} color={item.color} />
                  </View>
                  <Text style={st.gridLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: WHITE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: DARK, textAlign: "center", marginHorizontal: 8 },
  editBtn:     { borderRadius: 19, overflow: "hidden" },
  editGrad:    { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  scroll:      { paddingHorizontal: 20, paddingTop: 8, gap: 16 },
  avatarWrap:  { alignSelf: "center", marginBottom: 4 },
  avatar:      { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: WHITE },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center" },
  cameraBtn:   { position: "absolute", bottom: 4, right: 4 },
  cameraGrad:  { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: WHITE },
  form:        { gap: 14 },
  infoCard:    { backgroundColor: WHITE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },
  infoRow:     { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  infoItem:    { gap: 4 },
  infoLabel:   { fontSize: 11, fontFamily: "Inter_600SemiBold", color: BODY, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue:   { fontSize: 15, fontFamily: "Inter_600SemiBold", color: DARK },
  sectionTitle:{ fontSize: 16, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.3 },
  grid:        { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridCell:    { flex: 1, minWidth: "28%", alignItems: "center", justifyContent: "center", backgroundColor: WHITE, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: BORDER, aspectRatio: 1 },
  gridIcon:    { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  gridLabel:   { fontSize: 12, fontFamily: "Inter_500Medium", color: DARK, textAlign: "center" },
  typePill:    { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50, backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER },
  typePillActive: { borderColor: P, backgroundColor: `${P}10` },
  typeLabel:   { fontSize: 13, fontFamily: "Inter_500Medium", color: BODY },
  typeLabelActive: { color: P, fontFamily: "Inter_700Bold" },
  toggleRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: WHITE, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER },
  toggleLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: DARK },
  toggleSub:   { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, marginTop: 2 },
  deleteBtn:   { paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: RED, alignItems: "center", marginTop: 8 },
  deleteTxt:   { fontSize: 14, fontFamily: "Inter_600SemiBold", color: RED },
});
