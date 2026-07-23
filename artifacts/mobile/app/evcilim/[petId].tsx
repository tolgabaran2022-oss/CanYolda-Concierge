import AsyncStorage from "@react-native-async-storage/async-storage";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Dimensions,
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

/* Grid layout: 4 columns, 20px side padding, 10px gap between columns */
const SCR_W    = Dimensions.get("window").width;
const GRID_GAP = 10;
const CARD_W   = Math.floor((SCR_W - 40 - GRID_GAP * 3) / 4);
const CARD_H   = 125;

const PET_TYPES = ["Kedi", "Köpek", "Kuş", "Tavşan", "Balık", "Diğer"] as const;
type PetType = typeof PET_TYPES[number];

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";
const TOKEN_KEY = "@canyoldasi:jwt";

async function uploadImage(localUri: string): Promise<string> {
  const filename = localUri.split("/").pop() ?? "photo.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const mimeType = match ? `image/${match[1].toLowerCase().replace("jpg", "jpeg")}` : "image/jpeg";
  const formData = new FormData();
  if (Platform.OS === "web") {
    const blob = await fetch(localUri).then((r) => r.blob());
    formData.append("image", blob, filename);
  } else {
    formData.append("image", { uri: localUri, name: filename, type: mimeType } as unknown as Blob);
  }
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData, headers });
  if (!res.ok) {
    console.error("[uploadImage] HTTP", res.status, await res.text().catch(() => ""));
    throw new Error("Fotoğraf yüklenemedi");
  }
  const data = await res.json() as { url: string };
  return data.url;
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
  icon: string;
  color: string;
  route: string;
};

export default function PetDetailScreen() {
  const { t } = useTranslation();
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
    { key: "identification", label: t("pets.detail.identification"), icon: "id-card-outline",          color: "#5856D6",  route: `/evcilim/${petId}/identification` },
    { key: "vaccinations",   label: t("pets.detail.vaccinations"),   icon: "shield-checkmark-outline", color: "#FF9500",  route: `/evcilim/${petId}/vaccinations` },
    { key: "appointments",   label: t("pets.detail.appointments"),   icon: "calendar-outline",         color: P,          route: `/evcilim/${petId}/appointments` },
    { key: "nutrition",      label: t("pets.detail.nutrition"),      icon: "bag-handle-outline",       color: GREEN,      route: `/evcilim/${petId}/nutrition` },
    { key: "documents",      label: t("pets.detail.documents"),      icon: "document-text-outline",    color: "#FF9500",  route: `/evcilim/${petId}/documents` },
    { key: "medications",    label: t("pets.detail.medications"),    icon: "medical-outline",           color: "#E55D6F",  route: `/evcilim/${petId}/medications` },
    { key: "notes",          label: t("pets.detail.notes"),          icon: "pencil-outline",           color: "#AF52DE",  route: `/evcilim/${petId}/notes` },
  ];

  /* Split into rows of 4 for consistent left-aligned grid */
  const GRID_ROWS: ManageGridItem[][] = [];
  for (let i = 0; i < MANAGE_GRID.length; i += 4) {
    GRID_ROWS.push(MANAGE_GRID.slice(i, i + 4));
  }

  if (!pet) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG }}>
        <Text style={{ color: BODY, fontSize: 16 }}>{t("pets.detail.notFound")}</Text>
        <Pressable style={{ marginTop: 16 }} onPress={() => router.back()}>
          <Text style={{ color: P, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>{t("common.goBack")}</Text>
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
    if (!name.trim()) { Alert.alert(t("common.error"), t("pets.detail.nameRequired")); return; }
    setIsSaving(true);
    try {
      let remoteImage: string | undefined = image;
      if (image && (image.startsWith("file://") || image.startsWith("content://") || image.startsWith("ph://") || image.startsWith("blob:"))) {
        try {
          remoteImage = await uploadImage(image);
        } catch {
          Alert.alert(t("pets.add.uploadFailed"), t("pets.detail.uploadFailedKept"));
          remoteImage = pet.image;
        }
      }
      await updatePet(petId!, { name: name.trim(), type, breed: breed.trim(), age: age.trim(), image: remoteImage });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(false);
    } catch {
      Alert.alert(t("common.error"), t("pets.detail.saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(t("pets.detail.deleteConfirmTitle"), t("pets.detail.deleteConfirmMsg", { name: pet.name }), [
      { text: t("pets.detail.cancelDelete"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try { await deletePet(petId!); router.back(); } catch { Alert.alert(t("common.error"), t("pets.detail.deleteError")); }
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
          <Icon name="chevron-back" size={22} color={DARK} />
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
            <Icon name={editing ? "checkmark" : "pencil"} size={16} color={WHITE} />
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
              <Icon name="paw" size={52} color={P} />
            </LinearGradient>
          )}
          {editing && (
            <View style={st.cameraBtn}>
              <LinearGradient colors={[P2, P]} style={st.cameraGrad}>
                <Icon name="camera" size={14} color={WHITE} />
              </LinearGradient>
            </View>
          )}
        </Pressable>

        {/* Pet info */}
        {editing ? (
          <View style={st.form}>
            {/* Type selector */}
            <View style={fi.wrap}>
              <Text style={fi.label}>{t("pets.detail.animalType")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {PET_TYPES.map((pt) => (
                    <Pressable
                      key={pt}
                      style={[st.typePill, type === pt && st.typePillActive]}
                      onPress={() => setType(pt)}
                    >
                      <Icon name="paw" size={16} color={type === pt ? WHITE : P} />
                      <Text style={[st.typeLabel, type === pt && st.typeLabelActive]}>{t(`pets.add.types.${pt}`)}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
            <Field label={t("pets.detail.nameLabel")} value={name} onChangeText={setName} placeholder={t("pets.detail.namePlaceholder")} />
            <Field label={t("pets.detail.breedField")} value={breed} onChangeText={setBreed} placeholder={t("pets.detail.breedPlaceholder")} />
            <Field label={t("pets.detail.ageField")} value={age} onChangeText={setAge} placeholder={t("pets.detail.agePlaceholder")} />
            <Field label={t("pets.detail.weightLabel")} value={weight} onChangeText={setWeight} placeholder={t("pets.detail.weightPlaceholder")} keyboardType="decimal-pad" />
            <Field label={t("pets.detail.colorLabel")} value={color} onChangeText={setColor} placeholder={t("pets.detail.colorPlaceholder")} />
            <View style={st.toggleRow}>
              <View>
                <Text style={st.toggleLabel}>{t("pets.detail.neuteredLabel")}</Text>
                <Text style={st.toggleSub}>{t("pets.detail.neuteredSub")}</Text>
              </View>
              <Switch value={isNeutered} onValueChange={setIsNeutered} trackColor={{ false: "#E0D8F0", true: P }} thumbColor={WHITE} />
            </View>
            <Field label={t("pets.detail.bioLabel")} value={bio} onChangeText={setBio} placeholder={t("pets.detail.bioPlaceholder")} multiline />

            <Pressable style={st.deleteBtn} onPress={handleDelete}>
              <Text style={st.deleteTxt}>{t("pets.detail.deletePet")}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={st.infoCard}>
            <View style={st.infoRow}>
              <View style={st.infoItem}>
                <Text style={st.infoLabel}>{t("pets.detail.typeLabel")}</Text>
                <Text style={st.infoValue}>{t(`pets.add.types.${pet.type}`, { defaultValue: pet.type })}</Text>
              </View>
              {pet.breed ? (
                <View style={st.infoItem}>
                  <Text style={st.infoLabel}>{t("pets.detail.breedLabel")}</Text>
                  <Text style={st.infoValue}>{pet.breed}</Text>
                </View>
              ) : null}
              {pet.age ? (
                <View style={st.infoItem}>
                  <Text style={st.infoLabel}>{t("pets.detail.ageLabel")}</Text>
                  <Text style={st.infoValue}>{pet.age}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Management grid */}
        {!editing && (
          <>
            <Text style={st.sectionTitle}>{t("pets.detail.management")}</Text>
            <View style={st.grid}>
              {GRID_ROWS.map((row, rowIdx) => (
                <View key={rowIdx} style={st.gridRow}>
                  {row.map((item) => (
                    <Pressable
                      key={item.key}
                      style={({ pressed }) => [st.gridCell, pressed && { opacity: 0.75 }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(item.route as Parameters<typeof router.push>[0]);
                      }}
                    >
                      <View style={[st.gridIcon, { backgroundColor: `${item.color}18` }]}>
                        <Icon name={item.icon} size={26} color={item.color} />
                      </View>
                      <Text style={st.gridLabel}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>
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
  infoRow:     { flexDirection: "row", gap: 16 },
  infoItem:    { flex: 1, minWidth: 0, gap: 4 },
  infoLabel:   { fontSize: 11, fontFamily: "Inter_600SemiBold", color: BODY, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue:   { fontSize: 15, fontFamily: "Inter_600SemiBold", color: DARK },
  sectionTitle:{ fontSize: 16, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.3 },
  grid:        { gap: GRID_GAP },
  gridRow:     { flexDirection: "row", gap: GRID_GAP },
  gridCell:    { width: CARD_W, height: CARD_H, alignItems: "center", justifyContent: "center", backgroundColor: WHITE, borderRadius: 16, padding: 12, gap: 8, borderWidth: 1, borderColor: BORDER },
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
