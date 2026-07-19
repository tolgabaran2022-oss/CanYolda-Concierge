import AsyncStorage from "@react-native-async-storage/async-storage";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { usePets } from "@/contexts/PetsContext";

/* ── Design tokens ─────────────────────────────────────── */
const PURPLE   = "#7C45D9";
const PURPLE2  = "#9B6EE8";
const DARK     = "#1D1733";
const BODY     = "#8C8699";
const BG       = "#F5F0FD";
const WHITE    = "#FFFFFF";
const BORDER   = "#E5D8F5";
const LAVENDER = "#F0EAFB";

/* ── API helpers ───────────────────────────────────────── */
const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";
const TOKEN_KEY = "@canyoldasi:jwt";

async function uploadImage(localUri: string): Promise<string> {
  const filename = localUri.split("/").pop() ?? "photo.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const mimeType = match
    ? `image/${match[1].toLowerCase().replace("jpg", "jpeg")}`
    : "image/jpeg";
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
  if (!res.ok) throw new Error("Fotoğraf yüklenemedi");
  const data = (await res.json()) as { url: string };
  return data.url;
}

/* ── Constants ─────────────────────────────────────────── */
const PET_TYPES = [
  { key: "Kedi",   icon: "cat"  },
  { key: "Köpek",  icon: "dog"  },
  { key: "Kuş",    icon: "bird" },
  { key: "Tavşan", icon: "paw"  },
] as const;
type PetType = typeof PET_TYPES[number]["key"];

const GENDERS  = ["Erkek", "Dişi", "Bilinmiyor"] as const;
type Gender    = typeof GENDERS[number];

const MONTHS   = [
  "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
  "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık",
];

/* ── Date picker modal ─────────────────────────────────── */
function DatePickerModal({
  visible,
  value,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  value: Date | null;
  onConfirm: (d: Date) => void;
  onCancel: () => void;
}) {
  const now    = new Date();
  const [year,  setYear]  = useState(value ? value.getFullYear()  : now.getFullYear() - 3);
  const [month, setMonth] = useState(value ? value.getMonth()      : 0);
  const [day,   setDay]   = useState(value ? value.getDate()       : 1);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const safeDay     = Math.min(day, daysInMonth);
  const years       = Array.from({ length: 30 }, (_, i) => now.getFullYear() - i);
  const days        = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={dp.overlay} />
      </TouchableWithoutFeedback>
      <View style={dp.sheet}>
        <View style={dp.handle} />
        <Text style={dp.title}>Doğum Tarihi Seç</Text>
        <View style={dp.cols}>
          <ScrollView style={dp.col} showsVerticalScrollIndicator={false}>
            {days.map((d) => (
              <Pressable key={d} style={[dp.item, safeDay === d && dp.itemSel]} onPress={() => setDay(d)}>
                <Text style={[dp.itemTxt, safeDay === d && dp.itemTxtSel]}>{String(d).padStart(2, "0")}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView style={dp.col} showsVerticalScrollIndicator={false}>
            {MONTHS.map((m, i) => (
              <Pressable key={m} style={[dp.item, month === i && dp.itemSel]} onPress={() => setMonth(i)}>
                <Text style={[dp.itemTxt, month === i && dp.itemTxtSel]}>{m}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView style={dp.col} showsVerticalScrollIndicator={false}>
            {years.map((y) => (
              <Pressable key={y} style={[dp.item, year === y && dp.itemSel]} onPress={() => setYear(y)}>
                <Text style={[dp.itemTxt, year === y && dp.itemTxtSel]}>{y}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <View style={dp.btns}>
          <Pressable style={dp.cancelBtn} onPress={onCancel}>
            <Text style={dp.cancelTxt}>İptal</Text>
          </Pressable>
          <Pressable
            style={dp.confirmBtn}
            onPress={() => {
              const d = new Date(year, month, safeDay);
              if (d > now) { Alert.alert("Geçersiz Tarih", "İleri bir tarih seçilemez."); return; }
              onConfirm(d);
            }}
          >
            <LinearGradient colors={[PURPLE2, PURPLE]} style={dp.confirmGrad}>
              <Text style={dp.confirmTxt}>Tamam</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const dp = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet:       { backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12, position: "absolute", bottom: 0, left: 0, right: 0 },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E0D8F0", alignSelf: "center", marginBottom: 14 },
  title:       { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK, textAlign: "center", marginBottom: 16 },
  cols:        { flexDirection: "row", gap: 4, height: 210 },
  col:         { flex: 1 },
  item:        { paddingVertical: 11, paddingHorizontal: 6, borderRadius: 10, alignItems: "center" },
  itemSel:     { backgroundColor: LAVENDER },
  itemTxt:     { fontSize: 14, fontFamily: "Inter_400Regular", color: BODY },
  itemTxtSel:  { fontFamily: "Inter_700Bold", color: PURPLE },
  btns:        { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn:   { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: LAVENDER, alignItems: "center" },
  cancelTxt:   { fontSize: 15, fontFamily: "Inter_600SemiBold", color: PURPLE },
  confirmBtn:  { flex: 1, borderRadius: 14, overflow: "hidden" },
  confirmGrad: { paddingVertical: 14, alignItems: "center" },
  confirmTxt:  { fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE },
});

/* ── Main screen ────────────────────────────────────────── */
const FOOTER_H = 78; // approximate footer height for scroll padding

export default function AddPetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addPet } = usePets();
  const { user }   = useAuth();

  const [petType,     setPetType]     = useState<PetType>("Kedi");
  const [name,        setName]        = useState("");
  const [nameError,   setNameError]   = useState("");
  const [breed,       setBreed]       = useState("");
  const [gender,      setGender]      = useState<Gender | "">("");
  const [birthDate,   setBirthDate]   = useState<Date | null>(null);
  const [noBirthDate, setNoBirthDate] = useState(false);
  const [pickerOpen,  setPickerOpen]  = useState(false);
  const [image,       setImage]       = useState<string | undefined>();
  const [uploading,   setUploading]   = useState(false);
  const [isSaving,    setIsSaving]    = useState(false);
  const isSavingRef = useRef(false);

  /* ── Photo ── */
  const handlePickImage = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Fotoğraf Çek", "Galeriden Seç", "İptal"], cancelButtonIndex: 2 },
        async (i) => {
          if (i === 0) await openCamera();
          else if (i === 1) await openGallery();
        },
      );
    } else {
      Alert.alert("Fotoğraf Ekle", "Nasıl eklemek istersiniz?", [
        { text: "Fotoğraf Çek",  onPress: openCamera  },
        { text: "Galeriden Seç", onPress: openGallery },
        { text: "İptal", style: "cancel" },
      ]);
    }
  };

  const openCamera = async () => {
    if (Platform.OS === "web") { Alert.alert("Kamera", "Web'de kamera desteklenmiyor. Galeriden seçin."); return; }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Kamera İzni Gerekli", "Ayarlardan kamera iznini etkinleştirin."); return; }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!res.canceled && res.assets[0]) setImage(res.assets[0].uri);
  };

  const openGallery = async () => {
    const perm = Platform.OS !== "web" ? await ImagePicker.requestMediaLibraryPermissionsAsync() : null;
    if (perm && !perm.granted) { Alert.alert("Galeri İzni Gerekli", "Ayarlardan fotoğraf iznini etkinleştirin."); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!res.canceled && res.assets[0]) setImage(res.assets[0].uri);
  };

  function formatDate(d: Date) {
    return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  const canSave = name.trim().length > 0 && !isSaving;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError("İsim zorunludur."); return; }
    if (!user || isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      let remoteImageUrl: string | undefined;
      if (image) {
        setUploading(true);
        try { remoteImageUrl = await uploadImage(image); }
        catch { Alert.alert("Fotoğraf Yüklenemedi", "Hayvan fotoğrafsız kaydedilecek."); }
        finally { setUploading(false); }
      }
      const birthDateStr = noBirthDate ? undefined : (birthDate ? birthDate.toISOString().split("T")[0] : undefined);
      await addPet({
        name:            trimmed,
        type:            petType,
        breed:           breed.trim(),
        gender:          gender || undefined,
        age:             birthDateStr ?? "",
        birthDate:       birthDateStr,
        image:           remoteImageUrl,
        vaccinationInfo: "",
        feedingNotes:    "",
        userId:          user.id,
      } as Parameters<typeof addPet>[0]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert("Hata", "Hayvan kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };

  // Header height: compact, no safe-area top (SafeAreaView handles it)
  const HEADER_H = 56;

  return (
    /* SafeAreaView handles top+bottom insets */
    <SafeAreaView style={s.root} edges={["top"]}>
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={HEADER_H}
      >
        {/* ── Fixed header ── */}
        <View style={[s.header, { height: HEADER_H }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Geri dön"
            style={({ pressed }) => [s.backBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <Icon name="chevron-back" size={20} color={DARK} />
          </Pressable>
          <Text style={s.headerTitle}>Evcil Hayvan Ekle</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Scrollable form ── */}
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[
            s.scrollContent,
            { paddingBottom: FOOTER_H + insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Photo */}
          <View style={s.photoSection}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fotoğraf ekle veya değiştir"
              style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}
              onPress={handlePickImage}
            >
              <View style={s.photoRing}>
                {image ? (
                  <Image source={{ uri: image }} style={s.photoImg} contentFit="cover" />
                ) : (
                  <View style={s.photoPlaceholder}>
                    <Icon name="paw" size={36} color={PURPLE} />
                  </View>
                )}
                {uploading && (
                  <View style={s.photoOverlay}>
                    <Text style={s.photoOverlayTxt}>Yükleniyor…</Text>
                  </View>
                )}
                <View style={s.cameraBadge}>
                  <LinearGradient colors={[PURPLE2, PURPLE]} style={s.cameraGrad}>
                    <Icon name="camera" size={12} color={WHITE} />
                  </LinearGradient>
                </View>
              </View>
            </Pressable>
            <Text style={s.photoLabel}>Fotoğraf Ekle</Text>
            <Text style={s.photoSub}>Kamera veya galeriden seç</Text>
          </View>

          {/* Animal type */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Hayvan Türü *</Text>
            <View style={s.typeGrid}>
              {PET_TYPES.map(({ key, icon }) => {
                const active = petType === key;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={key}
                    style={({ pressed }) => [s.typeCard, active && s.typeCardActive, { opacity: pressed ? 0.86 : 1 }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPetType(key); }}
                  >
                    {active && (
                      <View style={s.typeCheckBadge}>
                        <Icon name="checkmark-circle" size={17} color={PURPLE} />
                      </View>
                    )}
                    <Icon name={icon} size={28} color={active ? PURPLE : BODY} />
                    <Text style={[s.typeLabel, active && s.typeLabelActive]}>{key}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Kimlik Bilgileri */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Kimlik Bilgileri</Text>

            {/* Name */}
            <View style={s.inputWrap}>
              <View style={s.inputRow}>
                <Icon name="person-outline" size={17} color={BODY} />
                <TextInput
                  style={s.textInput}
                  value={name}
                  onChangeText={(v) => { setName(v); if (v.trim()) setNameError(""); }}
                  placeholder="İsim *   Örn. Pamuk"
                  placeholderTextColor={BODY}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
              {nameError ? <Text style={s.inputError}>{nameError}</Text> : null}
            </View>

            <View style={s.rowDivider} />

            {/* Breed */}
            <View style={s.inputWrap}>
              <View style={s.inputRow}>
                <Icon name="paw" size={17} color={BODY} />
                <TextInput
                  style={s.textInput}
                  value={breed}
                  onChangeText={setBreed}
                  placeholder="Irk / Cins   Örn. British Shorthair"
                  placeholderTextColor={BODY}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>
            </View>

            <View style={s.rowDivider} />

            {/* Gender */}
            <View style={s.genderSection}>
              <Text style={s.fieldLabel}>Cinsiyet</Text>
              <View style={s.genderRow}>
                {GENDERS.map((g) => {
                  const active = gender === g;
                  return (
                    <Pressable
                      key={g}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[s.genderBtn, active && s.genderBtnActive]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGender(g); }}
                    >
                      {active && <Icon name="checkmark-circle" size={13} color={PURPLE} />}
                      <Text style={[s.genderTxt, active && s.genderTxtActive]}>{g}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Temel Bilgiler */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Temel Bilgiler</Text>
            <Text style={s.fieldLabel}>Doğum Tarihi</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Doğum tarihi seç"
              style={[s.dateBtn, noBirthDate && s.dateBtnDisabled]}
              onPress={() => { if (!noBirthDate) { Keyboard.dismiss(); setPickerOpen(true); } }}
              disabled={noBirthDate}
            >
              <Icon name="calendar" size={17} color={noBirthDate ? BODY : PURPLE} />
              <Text style={[s.dateTxt, !birthDate && s.datePlaceholder, noBirthDate && { color: BODY }]}>
                {birthDate ? formatDate(birthDate) : "Doğum tarihini seç"}
              </Text>
              <Icon name="calendar-outline" size={15} color={noBirthDate ? "#ccc" : BORDER} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={[s.unknownBtn, noBirthDate && s.unknownBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setNoBirthDate((v) => { if (!v) setBirthDate(null); return !v; });
              }}
            >
              <Icon name="calendar-outline" size={15} color={noBirthDate ? PURPLE : BODY} />
              <Text style={[s.unknownTxt, noBirthDate && { color: PURPLE }]}>
                Doğum tarihini bilmiyorum
              </Text>
            </Pressable>
          </View>

          {/* Reassurance */}
          <View style={s.reassurance}>
            <Icon name="heart" size={13} color={PURPLE} />
            <Text style={s.reassuranceTxt}>İlk dostunu ekliyorsun</Text>
          </View>
        </ScrollView>

        {/* ── Fixed footer ── */}
        <View style={[s.footer, { paddingBottom: insets.bottom + 10 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isSaving ? "Kaydediliyor" : "Kaydet"}
            accessibilityState={{ disabled: !canSave }}
            style={({ pressed }) => [s.saveBtn, { opacity: !canSave ? 0.5 : pressed ? 0.88 : 1 }]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <LinearGradient
              colors={canSave ? [PURPLE2, PURPLE] : ["#C4B3E0", "#B09ACC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.saveGrad}
            >
              <Icon name={isSaving ? "hourglass-outline" : "checkmark-circle"} size={21} color={WHITE} />
              <Text style={s.saveTxt}>{isSaving ? "Kaydediliyor…" : "Kaydet"}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={pickerOpen}
        value={birthDate}
        onConfirm={(d) => { setBirthDate(d); setPickerOpen(false); }}
        onCancel={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

/* ── Platform shadow helpers ───────────────────────────── */
const shadowSm = Platform.select({
  ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.09, shadowRadius: 8 },
  android: { elevation: 2 },
  default: {},
});
const shadowMd = Platform.select({
  ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 14 },
  android: { elevation: 5 },
  default: {},
});

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  kav: {
    flex: 1,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    backgroundColor: BG,
    borderBottomWidth: 0,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: WHITE, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: BORDER,
    ...shadowSm,
  },
  headerTitle: {
    fontSize: 17, fontFamily: "Inter_700Bold", color: DARK,
  },

  /* Scroll */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 14,
  },

  /* Photo */
  photoSection: {
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
  },
  photoRing: {
    position: "relative",
    width: 108, height: 108,
  },
  photoImg: {
    width: 108, height: 108, borderRadius: 54,
    borderWidth: 3, borderColor: WHITE,
  },
  photoPlaceholder: {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: LAVENDER,
    alignItems: "center", justifyContent: "center",
  },
  photoOverlay: {
    position: "absolute", inset: 0, borderRadius: 54,
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center", justifyContent: "center",
  },
  photoOverlayTxt: {
    color: WHITE, fontSize: 12, fontFamily: "Inter_600SemiBold",
  },
  cameraBadge: {
    position: "absolute", bottom: 2, right: 2,
  },
  cameraGrad: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: WHITE,
  },
  photoLabel: {
    fontSize: 15, fontFamily: "Inter_700Bold", color: DARK, marginTop: 3,
  },
  photoSub: {
    fontSize: 12, fontFamily: "Inter_400Regular", color: BODY,
  },

  /* Type grid */
  section: { gap: 9 },
  sectionLabel: {
    fontSize: 14, fontFamily: "Inter_700Bold", color: DARK,
  },
  typeGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10,
  },
  typeCard: {
    width: "47%", height: 76,
    backgroundColor: WHITE,
    borderRadius: 16, borderWidth: 1.5, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
    gap: 6, position: "relative",
    ...shadowSm,
  },
  typeCardActive: {
    borderColor: PURPLE, backgroundColor: LAVENDER,
  },
  typeCheckBadge: {
    position: "absolute", top: 7, right: 7,
  },
  typeLabel: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", color: BODY,
  },
  typeLabelActive: {
    color: PURPLE,
  },

  /* Cards */
  card: {
    backgroundColor: WHITE,
    borderRadius: 20, padding: 16, gap: 12,
    borderWidth: 1, borderColor: BORDER,
    ...shadowSm,
  },
  cardTitle: {
    fontSize: 15, fontFamily: "Inter_700Bold", color: DARK,
  },

  /* Input rows */
  inputWrap: { gap: 3 },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    minHeight: 44,
  },
  textInput: {
    flex: 1, fontSize: 14,
    fontFamily: "Inter_400Regular", color: DARK,
    paddingVertical: 6,
  },
  inputError: {
    fontSize: 12, fontFamily: "Inter_400Regular", color: "#D63B3B",
    marginLeft: 27,
  },
  rowDivider: {
    height: 1, backgroundColor: BORDER, marginHorizontal: -4,
  },
  fieldLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: BODY,
  },

  /* Gender */
  genderSection: { gap: 7 },
  genderRow: {
    flexDirection: "row", gap: 7,
  },
  genderBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: WHITE, minHeight: 44,
  },
  genderBtnActive: {
    borderColor: PURPLE, backgroundColor: LAVENDER,
  },
  genderTxt: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", color: BODY,
  },
  genderTxtActive: { color: PURPLE },

  /* Date */
  dateBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: LAVENDER, borderRadius: 14, padding: 13,
    borderWidth: 1, borderColor: BORDER, minHeight: 48,
  },
  dateBtnDisabled: { opacity: 0.38 },
  dateTxt: {
    flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: DARK,
  },
  datePlaceholder: {
    fontFamily: "Inter_400Regular", color: BODY,
  },
  unknownBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1.5,
    borderColor: BORDER, borderStyle: "dashed",
    minHeight: 48,
  },
  unknownBtnActive: {
    borderColor: PURPLE, backgroundColor: LAVENDER,
  },
  unknownTxt: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", color: BODY,
  },

  /* Reassurance */
  reassurance: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6,
  },
  reassuranceTxt: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: BODY,
  },

  /* Footer */
  footer: {
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: BG,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  saveBtn: {
    borderRadius: 16, overflow: "hidden",
    ...shadowMd,
    height: 54,
  },
  saveGrad: {
    flex: 1,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9,
  },
  saveTxt: {
    fontSize: 16, fontFamily: "Inter_700Bold", color: WHITE,
  },
});
