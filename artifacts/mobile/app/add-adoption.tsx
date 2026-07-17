import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  InteractionManager,
  KeyboardAvoidingView,
  Modal,
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
import { useTheme } from "@/hooks/useTheme";
import { TURKEY_PROVINCES, type Province } from "@/constants/turkeyLocations";
import { apiSaveListingContact } from "@/lib/contactApi";
import { PET_DETAIL_OPTIONS, type DetailOption } from "@/lib/petDetailOptions";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

async function uploadPhoto(localUri: string): Promise<string> {
  const filename = localUri.split("/").pop() ?? "photo.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1].toLowerCase().replace("jpg", "jpeg")}` : "image/jpeg";

  const formData = new FormData();
  if (Platform.OS === "web") {
    const response = await fetch(localUri);
    const blob = await response.blob();
    formData.append("image", blob, filename);
  } else {
    formData.append("image", { uri: localUri, name: filename, type } as unknown as Blob);
  }

  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });
  if (!res.ok) throw new Error("Fotoğraf yüklenemedi");
  const data = await res.json() as { url: string };
  return data.url;
}

/* ── Static tokens (structural only — no bg/text colors) ── */
const C = {
  purple:      "#7B5EA7",
  purpleDark:  "#4A2D8F",
  purpleLight: "#9478D8",
  error:       "#E53E3E",
  errorBg:     "#FFF5F5",
};

/* ── Static data ── */
const PET_TYPES = [
  { label: "Kedi"   },
  { label: "Köpek"  },
  { label: "Kuş"    },
  { label: "Tavşan" },
  { label: "Diğer"  },
];

const AGE_OPTIONS = [
  { label: "0–3 Ay",   value: "0-3 ay" },
  { label: "3–6 Ay",   value: "3-6 ay" },
  { label: "6–12 Ay",  value: "6-12 ay" },
  { label: "1 Yaş",    value: "1 yaş" },
  { label: "2 Yaş+",   value: "2 yaş+" },
  { label: "3 Yaş+",   value: "3 yaş+" },
];

function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length <= 3)  return d;
  if (d.length <= 6)  return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 8)  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

function validatePhone(digits: string): string | null {
  const d = digits.replace(/\D/g, "");
  if (d.length === 0) return "Telefon numarası zorunludur";
  if (!d.startsWith("5")) return "Numara 5 ile başlamalıdır (GSM)";
  if (d.length !== 10) return "10 haneli numara giriniz";
  return null;
}

function validateEmail(email: string): string | null {
  if (!email.trim()) return "E-posta adresi zorunludur";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(email.trim())) return "Geçerli bir e-posta adresi giriniz";
  return null;
}

/* ── FieldWrap ── */
type FieldProps = {
  label: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
};
function FieldWrap({ label, required, error, children }: FieldProps) {
  const T = useTheme();
  return (
    <View style={S.fieldWrap}>
      <Text style={[S.fieldLabel, { color: T.textMuted }]}>
        {label}
        {required && <Text style={{ color: C.purple }}> *</Text>}
      </Text>
      {children}
      {error ? (
        <View style={S.errorRow}>
          <Icon name="alert-circle" size={13} color={C.error} />
          <Text style={S.errorTxt}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ── PickerModal ── */
type PickerModalProps = {
  visible: boolean;
  title: string;
  items: { label: string; value: string }[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  searchable?: boolean;
};
function PickerModal({ visible, title, items, selected, onSelect, onClose, searchable }: PickerModalProps) {
  const T      = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const filtered = searchable && query
    ? items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : items;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[PM.root, { paddingTop: insets.top + 8, backgroundColor: T.bg }]}>
        <View style={[PM.header, { borderBottomColor: T.border }]}>
          <View style={{ width: 36 }} />
          <Text style={[PM.title, { color: T.text }]}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Icon name="close" size={24} color={T.purple} />
          </Pressable>
        </View>

        {searchable && (
          <View style={[PM.searchWrap, { backgroundColor: T.input, borderColor: T.border }]}>
            <Icon name="search-outline" size={18} color={T.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[PM.searchInput, { color: T.text }]}
              placeholder="Ara..."
              placeholderTextColor={T.placeholder}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
          </View>
        )}

        <FlatList
          data={filtered}
          keyExtractor={(i) => i.value}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => {
            const active = item.value === selected;
            return (
              <Pressable
                style={[
                  PM.row,
                  { borderBottomColor: T.border },
                  active && { backgroundColor: T.purple + "11" },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text style={[PM.rowTxt, { color: active ? C.purple : T.text },
                  active && { fontFamily: "Inter_700Bold" }]}>{item.label}</Text>
                {active && <Icon name="checkmark" size={18} color={C.purple} />}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

/* ── Photo grid constants ── */
const MAX_PHOTOS = 10;
const _WIN_W  = Dimensions.get("window").width;
const WIN_W   = Math.min(_WIN_W, 430);
const GRID_GAP = 6;
const GRID_PAD = 20;
const PHOTO_W = (WIN_W - GRID_PAD * 2 - GRID_GAP * 2) / 3;
const PHOTO_H = PHOTO_W * 1.15;

/* ── AddPhotoSheet ── */
function AddPhotoSheet({ visible, onCamera, onGallery, onClose }: {
  visible: boolean; onCamera: () => void; onGallery: () => void; onClose: () => void;
}) {
  const T          = useTheme();
  const insets     = useSafeAreaInsets();
  const pendingRef = useRef<null | (() => void)>(null);

  /* Android / Web: visible true→false triggers runAfterInteractions */
  const prevVisibleRef = useRef(visible);
  useEffect(() => {
    if (prevVisibleRef.current && !visible && pendingRef.current) {
      const action = pendingRef.current;
      pendingRef.current = null;
      InteractionManager.runAfterInteractions(() => action());
    }
    prevVisibleRef.current = visible;
  }, [visible]);

  /* iOS: onDismiss fires after native slide-out animation is fully done */
  const handleDismiss = () => {
    if (pendingRef.current) {
      const action = pendingRef.current;
      pendingRef.current = null;
      action();
    }
  };

  const scheduleAction = (action: () => void) => {
    pendingRef.current = action;
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} onDismiss={handleDismiss}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} onPress={onClose} />
      <View style={[APS.sheet, { backgroundColor: T.card, paddingBottom: insets.bottom + 16 }]}>
        <View style={APS.handle} />
        <Text style={[APS.title, { color: T.text }]}>Fotoğraf Ekle</Text>
        <Pressable style={[APS.row, { borderBottomColor: T.border }]} onPress={() => scheduleAction(onCamera)}>
          <Icon name="camera-outline" size={20} color={C.purple} />
          <Text style={[APS.rowTxt, { color: T.text }]}>Kamera</Text>
        </Pressable>
        <Pressable style={APS.row} onPress={() => scheduleAction(onGallery)}>
          <Icon name="images-outline" size={20} color={C.purple} />
          <Text style={[APS.rowTxt, { color: T.text }]}>Galeri</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
const APS = StyleSheet.create({
  sheet:  { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB", alignSelf: "center", marginBottom: 16 },
  title:  { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 16 },
  row:    { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTxt: { fontSize: 16, fontFamily: "Inter_500Medium" },
});

/* ── Main screen ── */
export default function AddAdoptionScreen() {
  const T              = useTheme();
  const insets         = useSafeAreaInsets();
  const router         = useRouter();
  const { addListing } = useAdoption();
  const { user }       = useAuth();

  const [petName,           setPetName]           = useState("");
  const [petType,           setPetType]           = useState("Kedi");
  const [petAge,            setPetAge]            = useState("");
  const [images,            setImages]            = useState<string[]>([]);
  const [showAddSheet,      setShowAddSheet]      = useState(false);
  const [province,          setProvince]          = useState("");
  const [district,          setDistrict]          = useState("");
  const [description,       setDescription]       = useState("");
  const [phone,             setPhone]             = useState("");
  const [email,             setEmail]             = useState("");
  const [allowPhoneContact,  setAllowPhoneContact]  = useState(true);
  const [allowMessages,      setAllowMessages]      = useState(true);
  const [isSaving,           setIsSaving]           = useState(false);
  const [errors,             setErrors]             = useState<Record<string, string>>({});
  const [healthStatus,       setHealthStatus]       = useState("");
  const [vaccinationStatus,  setVaccinationStatus]  = useState("");
  const [environmentType,    setEnvironmentType]    = useState("");
  const [childCompatibility, setChildCompatibility] = useState("");
  const [catCompatibility,   setCatCompatibility]   = useState("");
  const [dogCompatibility,   setDogCompatibility]   = useState("");
  const [toiletTraining,     setToiletTraining]     = useState("");

  const [showProvince, setShowProvince] = useState(false);
  const [showDistrict, setShowDistrict] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const topPad    = Platform.OS === "web" ? 16 : insets.top;
  const btmPad    = Platform.OS === "web" ? 34 : insets.bottom;

  const selectedProvince: Province | undefined = TURKEY_PROVINCES.find((p) => p.value === province);
  const districts = selectedProvince?.districts ?? [];

  const openCamera = async () => {
    if (images.length >= MAX_PHOTOS) {
      Alert.alert("Limit Aşıldı", `En fazla ${MAX_PHOTOS} fotoğraf ekleyebilirsiniz.`);
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Kamera İzni Gerekli", "Ayarlar'dan kamera iznini etkinleştirin."); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setImages((prev) => [...prev, result.assets[0].uri].slice(0, MAX_PHOTOS));
      setErrors((e) => ({ ...e, photo: "" }));
    }
  };

  const openGallery = async () => {
    if (images.length >= MAX_PHOTOS) {
      Alert.alert("Limit Aşıldı", `En fazla ${MAX_PHOTOS} fotoğraf ekleyebilirsiniz.`);
      return;
    }
    const remaining = MAX_PHOTOS - images.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      allowsEditing: images.length === 0,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, MAX_PHOTOS));
      setErrors((e) => ({ ...e, photo: "" }));
    }
  };

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
    if (errors.phone) setErrors((e) => ({ ...e, phone: "" }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (images.length === 0)  errs.photo              = "Fotoğraf eklenmesi zorunludur";
    if (!petName.trim())      errs.petName            = "Hayvan adı zorunludur";
    if (!petAge)              errs.petAge             = "Yaş seçimi zorunludur";
    if (!province)            errs.province           = "İl seçimi zorunludur";
    if (!district)            errs.district           = "İlçe seçimi zorunludur";
    if (description.trim().length < 30)
                              errs.description        = "Açıklama en az 30 karakter olmalıdır";
    if (!healthStatus)        errs.healthStatus       = "Lütfen detay bilgilerini tamamla.";
    if (!vaccinationStatus)   errs.vaccinationStatus  = "Lütfen detay bilgilerini tamamla.";
    if (!environmentType)     errs.environmentType    = "Lütfen detay bilgilerini tamamla.";
    if (!childCompatibility)  errs.childCompatibility = "Lütfen detay bilgilerini tamamla.";
    if (!catCompatibility)    errs.catCompatibility   = "Lütfen detay bilgilerini tamamla.";
    if (!dogCompatibility)    errs.dogCompatibility   = "Lütfen detay bilgilerini tamamla.";
    if (!toiletTraining)      errs.toiletTraining     = "Lütfen detay bilgilerini tamamla.";
    const phoneErr = validatePhone(phone);
    if (phoneErr)             errs.phone              = phoneErr;
    const emailErr = validateEmail(email);
    if (emailErr)             errs.email              = emailErr;

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate() || !user) return;
    setIsSaving(true);
    try {
      let remoteImages: string[];
      try {
        remoteImages = await Promise.all(
          images.map((uri) =>
            (uri.startsWith("file://") || uri.startsWith("content://") || uri.startsWith("ph://"))
              ? uploadPhoto(uri)
              : Promise.resolve(uri)
          )
        );
      } catch {
        Alert.alert("Fotoğraf Yüklenemedi", "Fotoğraflardan biri yüklenemedi. Lütfen tekrar deneyin.");
        setIsSaving(false);
        return;
      }

      const newId = await addListing({
        petName:            petName.trim(),
        petType,
        petAge,
        images:             remoteImages,
        photo:              remoteImages[0],
        location:           `${district}, ${province}`,
        description:        description.trim(),
        userId:             user.id,
        userName:           user.name,
        contactInfo:        `Tel: +90 ${formatPhoneDisplay(phone)} | E-posta: ${email.trim()}`,
        allowPhoneContact,
        allowMessages,
        healthStatus,
        vaccinationStatus,
        environmentType,
        childCompatibility,
        catCompatibility,
        dogCompatibility,
        toiletTraining,
      });
      apiSaveListingContact(newId, `+90${phone}`, allowPhoneContact, allowMessages).catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      setErrors({ _global: "İlan oluşturulamadı. Lütfen tekrar deneyin." });
    } finally {
      setIsSaving(false);
    }
  };

  const errorCount = Object.values(errors).filter(Boolean).length;

  /* Reusable themed input style */
  const inputStyle = [
    S.input,
    { backgroundColor: T.input, borderColor: T.inputBorder, color: T.text },
  ] as const;

  return (
    <>
      <View style={[S.root, { backgroundColor: T.bg }]}>

        {/* Header */}
        <View style={[S.header, { paddingTop: topPad + 10, backgroundColor: T.bg }]}>
          <Pressable style={S.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Icon name="chevron-back" size={22} color={T.purple} />
          </Pressable>
          <Text style={[S.headerTitle, { color: T.text }]}>Sahiplendirme İlanı</Text>
          {/* Spacer to centre title */}
          <View style={S.backBtn} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            ref={scrollRef}
            style={S.scroll}
            contentContainerStyle={[S.scrollContent, { paddingBottom: btmPad + 120 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Intro */}
            <View style={S.intro}>
              <Text style={[S.introTitle, { color: T.text }]}>Yeni İlan Oluştur</Text>
              <Text style={[S.introSub, { color: T.textMuted }]}>
                Yeni bir dost için sahiplendirme ilanı oluştur
              </Text>
            </View>

            {/* Error banner */}
            {errorCount > 0 && (
              <View style={S.errorBanner}>
                <Icon name="alert-circle" size={18} color={C.error} />
                <Text style={S.errorBannerTxt}>
                  {errorCount} alan eksik veya hatalı. Lütfen kontrol edin.
                </Text>
              </View>
            )}

            {/* Form card */}
            <View style={[S.card, { backgroundColor: T.card }]}>

              {/* Photos — multi-image grid */}
              <View style={S.photosWrap}>
                <View style={S.photosTitleRow}>
                  <Text style={[S.fieldLabel, { color: T.textMuted }]}>
                    FOTOĞRAFLAR <Text style={{ color: C.purple }}>*</Text>
                  </Text>
                  <Text style={[S.photosCount, { color: T.textMuted }]}>{images.length}/{MAX_PHOTOS}</Text>
                </View>
                {errors.photo ? (
                  <View style={S.errorRow}>
                    <Icon name="alert-circle" size={13} color={C.error} />
                    <Text style={S.errorTxt}>{errors.photo}</Text>
                  </View>
                ) : (
                  <Text style={[S.photosHint, { color: T.textMuted }]}>
                    İlk fotoğraf kapak olarak gösterilir.
                  </Text>
                )}
                <View style={S.photoGrid}>
                  {images.map((uri, idx) => (
                    <View key={`${uri}-${idx}`} style={S.photoCell}>
                      <Image source={{ uri }} style={S.photoImg} contentFit="cover" />
                      {idx === 0 && (
                        <View style={S.coverBadge}>
                          <Icon name="star" size={9} color="#FFF" />
                          <Text style={S.coverBadgeTxt}>KAPAK</Text>
                        </View>
                      )}
                      <Pressable
                        style={S.deletePhotoBtn}
                        hitSlop={6}
                        onPress={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Icon name="close-circle" size={20} color="#FFF" />
                      </Pressable>
                    </View>
                  ))}
                  {images.length < MAX_PHOTOS && (
                    <Pressable
                      style={({ pressed }) => [
                        S.addPhotoBtn,
                        { opacity: pressed ? 0.75 : 1, borderColor: errors.photo ? C.error : T.border },
                      ]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddSheet(true); }}
                    >
                      <View style={[S.addIconRing, { backgroundColor: T.purple + "18" }]}>
                        <Icon name="add" size={28} color={C.purple} />
                      </View>
                      <Text style={[S.addPhotoTxt, { color: C.purple }]}>Fotoğraf{"\n"}Ekle</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              <View style={[S.divider, { backgroundColor: T.border }]} />

              {/* Hayvan adı */}
              <FieldWrap label="Hayvanın Adı" required error={errors.petName}>
                <TextInput
                  style={[inputStyle, errors.petName ? S.inputError : {}]}
                  placeholder="Örn: Pamuk"
                  placeholderTextColor={T.placeholder}
                  value={petName}
                  onChangeText={(t) => { setPetName(t); setErrors((e) => ({ ...e, petName: "" })); }}
                  returnKeyType="next"
                />
              </FieldWrap>

              {/* Tür */}
              <View style={S.fieldWrap}>
                <Text style={[S.fieldLabel, { color: T.textMuted }]}>
                  Tür <Text style={{ color: C.purple }}>*</Text>
                </Text>
                <View style={S.chipRow}>
                  {PET_TYPES.map(({ label }) => {
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
                          { borderColor: active ? "transparent" : T.border },
                          !active && { backgroundColor: T.input },
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
                            <Text style={S.chipTxtActive}>{label}</Text>
                          </LinearGradient>
                        ) : (
                          <View style={S.chipInner}>
                            <Text style={[S.chipTxt, { color: T.textMuted }]}>{label}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Yaş */}
              <FieldWrap label="Yaş" required error={errors.petAge}>
                <View style={S.ageGrid}>
                  {AGE_OPTIONS.map((opt) => {
                    const active = petAge === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setPetAge(opt.value);
                          setErrors((e) => ({ ...e, petAge: "" }));
                        }}
                        style={({ pressed }) => [
                          S.ageCard,
                          {
                            backgroundColor: active ? T.purple + "14" : T.input,
                            borderColor: active ? C.purple : T.inputBorder,
                          },
                          errors.petAge && !active && S.ageCardError,
                          { opacity: pressed ? 0.8 : 1 },
                        ]}
                      >
                        <Text style={[
                          S.ageCardTxt,
                          { color: active ? C.purple : T.textMuted },
                          active && { fontFamily: "Inter_700Bold" },
                        ]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </FieldWrap>

              {/* Konum */}
              <FieldWrap label="Konum" required error={errors.province || errors.district}>
                <View style={{ gap: 10 }}>
                  <Pressable
                    style={[
                      S.selectRow,
                      { backgroundColor: T.input, borderColor: T.inputBorder },
                      errors.province ? S.inputError : {},
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowProvince(true);
                    }}
                  >
                    <Icon
                      name="location-outline" size={18}
                      color={province ? C.purple : T.placeholder}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[S.selectTxt, { color: province ? T.text : T.placeholder }]}>
                      {province || "İl seçin"}
                    </Text>
                    <Icon name="chevron-down" size={18} color={T.textMuted} />
                  </Pressable>

                  <Pressable
                    style={[
                      S.selectRow,
                      { backgroundColor: T.input, borderColor: T.inputBorder },
                      !province && S.selectDisabled,
                      errors.district ? S.inputError : {},
                    ]}
                    onPress={() => {
                      if (!province) return;
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowDistrict(true);
                    }}
                  >
                    <Icon
                      name="navigate-outline" size={18}
                      color={district ? C.purple : T.placeholder}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[S.selectTxt, { color: district ? T.text : T.placeholder }]}>
                      {district || (province ? "İlçe seçin" : "Önce il seçin")}
                    </Text>
                    <Icon name="chevron-down" size={18} color={T.textMuted} />
                  </Pressable>
                </View>
              </FieldWrap>

              {/* Açıklama */}
              <FieldWrap label="Açıklama" required error={errors.description}>
                <View>
                  <TextInput
                    style={[
                      S.textArea,
                      { backgroundColor: T.input, borderColor: T.inputBorder, color: T.text },
                      errors.description ? S.inputError : {},
                    ]}
                    placeholder="Hayvanın karakteri, sağlık durumu, aşı durumu, sahiplenme koşulları... (en az 30 karakter)"
                    placeholderTextColor={T.placeholder}
                    value={description}
                    onChangeText={(t) => {
                      setDescription(t);
                      if (t.trim().length >= 30) setErrors((e) => ({ ...e, description: "" }));
                    }}
                    multiline
                    textAlignVertical="top"
                  />
                  <Text style={[S.charCount, { color: T.textMuted }, description.length < 30 && S.charCountWarn]}>
                    {description.trim().length} / min 30 karakter
                  </Text>
                </View>
              </FieldWrap>

              <View style={[S.divider, { backgroundColor: T.border }]} />

              {/* Detay Bilgiler */}
              <View style={S.sectionHeader}>
                <Icon name="list-outline" size={18} color={C.purple} />
                <Text style={[S.sectionTitle, { color: T.text }]}>Detay Bilgiler</Text>
              </View>
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: T.textMuted, marginTop: 2, marginBottom: 16, lineHeight: 17 }}>
                Patili dostun hakkında temel bilgileri seç
              </Text>

              {(errors.healthStatus || errors.vaccinationStatus || errors.environmentType ||
                errors.childCompatibility || errors.catCompatibility || errors.dogCompatibility || errors.toiletTraining) ? (
                <View style={S.detailErrorBanner}>
                  <Icon name="alert-circle" size={14} color={C.error} />
                  <Text style={S.detailErrorTxt}>Lütfen detay bilgilerini tamamla.</Text>
                </View>
              ) : null}

              {([
                { key: "healthStatus"       as const, label: "Sağlık Durumu",   iconName: "medkit-outline"            as const, opts: PET_DETAIL_OPTIONS.healthStatus,       state: healthStatus,       setter: setHealthStatus },
                { key: "vaccinationStatus"  as const, label: "Aşı",             iconName: "shield-checkmark-outline"  as const, opts: PET_DETAIL_OPTIONS.vaccinationStatus,  state: vaccinationStatus,  setter: setVaccinationStatus },
                { key: "environmentType"    as const, label: "İç/Dış Mekan",    iconName: "home-outline"              as const, opts: PET_DETAIL_OPTIONS.environmentType,    state: environmentType,    setter: setEnvironmentType },
                { key: "childCompatibility" as const, label: "Çocuk Uyumu",     iconName: "people-outline"            as const, opts: PET_DETAIL_OPTIONS.childCompatibility, state: childCompatibility, setter: setChildCompatibility },
                { key: "catCompatibility"   as const, label: "Kedi Uyumu",      iconName: "paw"                       as const, opts: PET_DETAIL_OPTIONS.catCompatibility,   state: catCompatibility,   setter: setCatCompatibility },
                { key: "dogCompatibility"   as const, label: "Köpek Uyumu",     iconName: "paw"                       as const, opts: PET_DETAIL_OPTIONS.dogCompatibility,   state: dogCompatibility,   setter: setDogCompatibility },
                { key: "toiletTraining"     as const, label: "Tuvalet Eğitimi", iconName: "checkmark-circle-outline"  as const, opts: PET_DETAIL_OPTIONS.toiletTraining,     state: toiletTraining,     setter: setToiletTraining },
              ] as const).map(({ key, label, iconName, opts, state, setter }) => (
                <View key={key} style={S.detailFieldWrap}>
                  <View style={S.detailFieldHeader}>
                    <Icon name={iconName} size={15} color={C.purpleDark} />
                    <Text style={[S.detailFieldLabel, { color: T.text, flex: 1 }, !!errors[key] && { color: C.error }]}>{label}</Text>
                    {!!errors[key] && <Icon name="alert-circle" size={13} color={C.error} />}
                  </View>
                  <View style={S.detailChipRow}>
                    {(opts as readonly DetailOption[]).map((opt) => {
                      const active = state === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setter(opt.value);
                            setErrors((e) => ({ ...e, [key]: "" }));
                          }}
                          style={({ pressed }) => [
                            S.detailChip,
                            { borderColor: active ? C.purple : T.inputBorder, backgroundColor: active ? C.purple + "14" : T.input },
                            { opacity: pressed ? 0.8 : 1 },
                          ]}
                        >
                          {active && <Icon name="checkmark" size={12} color={C.purple} />}
                          <Text style={[S.detailChipTxt, { color: active ? C.purple : T.textMuted }, active && { fontFamily: "Inter_700Bold" }]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              <View style={[S.divider, { backgroundColor: T.border }]} />

              {/* İletişim başlığı */}
              <View style={S.sectionHeader}>
                <Icon name="call-outline" size={18} color={C.purple} />
                <Text style={[S.sectionTitle, { color: T.text }]}>İletişim Bilgileri</Text>
              </View>

              {/* Telefon */}
              <FieldWrap label="Telefon Numarası" required error={errors.phone}>
                <View style={[
                  S.phoneWrap,
                  { backgroundColor: T.input, borderColor: T.inputBorder },
                  errors.phone ? S.inputError : {},
                ]}>
                  <View style={[S.phonePrefix, { borderRightColor: T.border }]}>
                    <Text style={S.phonePrefixFlag}>TR</Text>
                    <Text style={[S.phonePrefixTxt, { color: T.text }]}>+90</Text>
                    <View style={[S.phoneDivider, { backgroundColor: T.border }]} />
                  </View>
                  <TextInput
                    style={[S.phoneInput, { color: T.text }]}
                    placeholder="5XX XXX XX XX"
                    placeholderTextColor={T.placeholder}
                    value={formatPhoneDisplay(phone)}
                    onChangeText={handlePhoneChange}
                    keyboardType="number-pad"
                    maxLength={13}
                    returnKeyType="next"
                  />
                  {phone.length === 10 && !validatePhone(phone) && (
                    <Icon name="checkmark-circle" size={20} color="#38A169" style={{ marginRight: 12 }} />
                  )}
                </View>
                <Text style={[S.phoneHint, { color: T.textMuted }]}>
                  Sadece cep telefonu numarası (10 hane)
                </Text>
              </FieldWrap>

              {/* Email */}
              <FieldWrap label="E-Posta Adresi" required error={errors.email}>
                <View style={[
                  S.emailWrap,
                  { backgroundColor: T.input, borderColor: T.inputBorder },
                  errors.email ? S.inputError : {},
                ]}>
                  <Icon name="mail-outline" size={18} color={T.textMuted} style={{ marginLeft: 14, marginRight: 8 }} />
                  <TextInput
                    style={[S.emailInput, { color: T.text }]}
                    placeholder="ornek@email.com"
                    placeholderTextColor={T.placeholder}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: "" })); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                  {email && !validateEmail(email) && (
                    <Icon name="checkmark-circle" size={20} color="#38A169" style={{ marginRight: 12 }} />
                  )}
                </View>
              </FieldWrap>

              <View style={[S.divider, { backgroundColor: T.border }]} />

              {/* İletişim Tercihleri */}
              <View>
                <View style={S.sectionHeader}>
                  <Icon name="shield-checkmark-outline" size={18} color={C.purpleDark} />
                  <Text style={[S.sectionTitle, { color: T.text }]}>İletişim Tercihleri</Text>
                </View>
                <Text style={{
                  fontSize: 12, fontFamily: "Inter_400Regular", color: T.textMuted,
                  marginTop: 4, marginBottom: 14, lineHeight: 17,
                }}>
                  Diğer kullanıcıların seninle hangi yollarla iletişim kurabileceğini seç.
                </Text>

                <Pressable
                  style={S.toggleRow}
                  onPress={() => { setAllowPhoneContact((v) => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <View style={S.toggleLeft}>
                    <View style={[S.toggleIcon, allowPhoneContact && S.toggleIconActive]}>
                      <Icon name="call-outline" size={18} color={allowPhoneContact ? "#FFF" : T.textMuted} />
                    </View>
                    <View>
                      <Text style={[S.toggleLabel, { color: T.text }]}>Telefon ile iletişime izin ver</Text>
                      <Text style={[S.toggleSub, { color: T.textMuted }]}>Numaranız talep üzerine gösterilir</Text>
                    </View>
                  </View>
                  <View style={[S.toggle, allowPhoneContact && S.toggleOn]}>
                    <View style={[S.toggleThumb, allowPhoneContact && S.toggleThumbOn]} />
                  </View>
                </Pressable>

                <Pressable
                  style={[S.toggleRow, { marginTop: 10 }]}
                  onPress={() => { setAllowMessages((v) => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <View style={S.toggleLeft}>
                    <View style={[S.toggleIcon, allowMessages && S.toggleIconActive]}>
                      <Icon name="chatbubble-outline" size={18} color={allowMessages ? "#FFF" : T.textMuted} />
                    </View>
                    <View>
                      <Text style={[S.toggleLabel, { color: T.text }]}>Mesaj almaya izin ver</Text>
                      <Text style={[S.toggleSub, { color: T.textMuted }]}>Uygulama içi DM</Text>
                    </View>
                  </View>
                  <View style={[S.toggle, allowMessages && S.toggleOn]}>
                    <View style={[S.toggleThumb, allowMessages && S.toggleThumbOn]} />
                  </View>
                </Pressable>
              </View>

            </View>
            {/* End card */}

          </ScrollView>
        </KeyboardAvoidingView>

        {/* Fixed CTA */}
        <View style={[S.ctaWrap, { paddingBottom: btmPad + 12, backgroundColor: T.bg, borderTopColor: T.border }]}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleSave(); }}
            disabled={isSaving}
            style={({ pressed }) => [{ opacity: pressed || isSaving ? 0.86 : 1 }]}
          >
            <LinearGradient
              colors={[C.purpleLight, C.purpleDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={S.cta}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Icon name="heart" size={20} color="#FFF" />
                  <Text style={S.ctaTxt}>İlanı Yayınla</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      <AddPhotoSheet
        visible={showAddSheet}
        onCamera={openCamera}
        onGallery={openGallery}
        onClose={() => setShowAddSheet(false)}
      />

      <PickerModal
        visible={showProvince}
        title="İl Seçin"
        items={TURKEY_PROVINCES}
        selected={province}
        searchable
        onSelect={(v) => {
          setProvince(v);
          setDistrict("");
          setErrors((e) => ({ ...e, province: "", district: "" }));
        }}
        onClose={() => setShowProvince(false)}
      />

      <PickerModal
        visible={showDistrict}
        title={province ? `${province} — İlçe Seçin` : "İlçe Seçin"}
        items={districts}
        selected={district}
        searchable
        onSelect={(v) => { setDistrict(v); setErrors((e) => ({ ...e, district: "" })); }}
        onClose={() => setShowDistrict(false)}
      />
    </>
  );
}

/* ── Styles ── */
const S = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4, gap: 16 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17, fontFamily: "Inter_700Bold",
    letterSpacing: -0.3, flex: 1, textAlign: "center",
  },

  intro: { paddingTop: 4, paddingBottom: 4, gap: 4 },
  introTitle: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  introSub:   { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },

  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.errorBg,
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "rgba(229,62,62,0.25)",
  },
  errorBannerTxt: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.error, flex: 1 },

  card: {
    borderRadius: 24, padding: 20, gap: 22,
    ...Platform.select({
      ios:     { shadowColor: "#7B5EA7", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 20 },
      android: { elevation: 4 },
      default: {},
    }),
  },

  divider: { height: 1, marginHorizontal: -4 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle:  { fontSize: 15, fontFamily: "Inter_700Bold" },

  fieldWrap:  { gap: 8 },
  fieldLabel: {
    fontSize: 11, fontFamily: "Inter_700Bold",
    letterSpacing: 0.8, textTransform: "uppercase",
  },

  errorRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  errorTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.error },

  input: {
    height: 54, borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 15, fontFamily: "Inter_400Regular",
  },
  inputError: { borderColor: C.error, backgroundColor: C.errorBg },

  textArea: {
    borderRadius: 14, borderWidth: 1.5,
    padding: 16,
    fontSize: 15, fontFamily: "Inter_400Regular",
    minHeight: 120, lineHeight: 22, textAlignVertical: "top",
  },
  charCount:     { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 4 },
  charCountWarn: { color: C.error },

  detailErrorBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.errorBg, borderRadius: 10, padding: 12, marginBottom: 12 },
  detailErrorTxt:    { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: C.error },
  detailFieldWrap:   { marginBottom: 16 },
  detailFieldHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  detailFieldLabel:  { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  detailChipRow:     { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  detailChip:        { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1.5, borderRadius: 50, paddingVertical: 7, paddingHorizontal: 13 },
  detailChipTxt:     { fontSize: 13, fontFamily: "Inter_500Medium" },

  toggleRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleLeft:   { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  toggleIcon:   { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(123,94,167,0.1)", alignItems: "center", justifyContent: "center" },
  toggleIconActive: { backgroundColor: C.purple },
  toggleLabel:  { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  toggleSub:    { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  toggle:       { width: 48, height: 28, borderRadius: 14, backgroundColor: "#D1D5DB", padding: 2, justifyContent: "center" },
  toggleOn:     { backgroundColor: C.purple },
  toggleThumb:  {
    width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFF", alignSelf: "flex-start",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  toggleThumbOn: { alignSelf: "flex-end" },

  /* multi-photo grid */
  photosWrap:     { gap: 8 },
  photosTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  photosCount:    { fontSize: 11, fontFamily: "Inter_500Medium" },
  photosHint:     { fontSize: 11, fontFamily: "Inter_400Regular" },
  photoGrid:      { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP },
  photoCell:      { width: PHOTO_W, height: PHOTO_H, borderRadius: 12, overflow: "hidden" },
  photoImg:       { width: "100%", height: "100%" },
  coverBadge:     {
    position: "absolute", top: 6, left: 6,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  coverBadgeTxt: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#FFF" },
  deletePhotoBtn: { position: "absolute", top: 4, right: 4 },
  addPhotoBtn:    {
    width: PHOTO_W, height: PHOTO_H, borderRadius: 12,
    borderWidth: 1.5, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 6,
  },
  addIconRing:    { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  addPhotoTxt:    { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },

  chipRow:   { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip:      { borderRadius: 99, borderWidth: 1.5, overflow: "hidden" },
  chipActive: {
    borderColor: "transparent",
    ...Platform.select({
      ios:     { shadowColor: C.purple, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 6 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  chipInner:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 9, gap: 5, minHeight: 40 },
  chipEmoji:     { fontSize: 14, lineHeight: 18 },
  chipTxt:       { fontSize: 13, fontFamily: "Inter_500Medium" },
  chipTxtActive: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFF" },

  ageGrid:       { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ageCard:       {
    paddingVertical: 11, paddingHorizontal: 16, borderRadius: 12,
    borderWidth: 1.5, minWidth: "30%",
  },
  ageCardError:  { borderColor: "rgba(229,62,62,0.35)" },
  ageCardTxt:    { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },

  selectRow: {
    height: 54, borderRadius: 14, borderWidth: 1.5,
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14,
  },
  selectDisabled: { opacity: 0.5 },
  selectTxt:      { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },

  phoneWrap: {
    flexDirection: "row", alignItems: "center",
    height: 54, borderRadius: 14, borderWidth: 1.5, overflow: "hidden",
  },
  phonePrefix:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 6 },
  phonePrefixFlag:{ fontSize: 18 },
  phonePrefixTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
  phoneDivider:   { width: 1, height: 24, marginLeft: 8 },
  phoneInput:     { flex: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: "Inter_400Regular", height: "100%" },
  phoneHint:      { fontSize: 11, fontFamily: "Inter_400Regular" },

  emailWrap: {
    flexDirection: "row", alignItems: "center",
    height: 54, borderRadius: 14, borderWidth: 1.5, overflow: "hidden",
  },
  emailInput: { flex: 1, paddingRight: 12, fontSize: 15, fontFamily: "Inter_400Regular", height: "100%" },

  ctaWrap: {
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  cta: {
    height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    borderRadius: 18,
    ...Platform.select({
      ios:     { shadowColor: C.purpleDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 16 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  ctaTxt: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF", letterSpacing: 0.2 },
});

const PM = StyleSheet.create({
  root:   { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },

  searchWrap: {
    flexDirection: "row", alignItems: "center",
    margin: 12, paddingHorizontal: 14, height: 44,
    borderRadius: 12, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },

  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTxt: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
