import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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
import { useTranslation } from "react-i18next";
import { useAdoption } from "@/contexts/AdoptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { TURKEY_PROVINCES, type Province } from "@/constants/turkeyLocations";
import { apiSaveListingContact } from "@/lib/contactApi";
import { PET_DETAIL_OPTIONS, type DetailOption } from "@/lib/petDetailOptions";

/* ── Tokens ─────────────────────────────────────────────── */
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
  error:       "#E53E3E",
  errorBg:     "#FFF5F5",
};

const MAX_PHOTOS = 10;
const _RAW_WIN_W = Dimensions.get("window").width;
const WIN_W      = Math.min(_RAW_WIN_W, 430);
const GRID_GAP   = 6;
const GRID_PAD   = 20;
const PHOTO_W    = (WIN_W - GRID_PAD * 2 - GRID_GAP * 2) / 3;
const PHOTO_H    = PHOTO_W * 1.15;

/* ── Static data ─────────────────────────────────────────── */
const PET_TYPES = [
  { label: "Kedi"   },
  { label: "Köpek"  },
  { label: "Kuş"    },
  { label: "Tavşan" },
  { label: "Diğer"  },
];

const AGE_OPTIONS = [
  { label: "0–3 Ay",  value: "0-3 ay" },
  { label: "3–6 Ay",  value: "3-6 ay" },
  { label: "6–12 Ay", value: "6-12 ay" },
  { label: "1 Yaş",   value: "1 yaş" },
  { label: "2 Yaş+",  value: "2 yaş+" },
  { label: "3 Yaş+",  value: "3 yaş+" },
];

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

async function uploadPhoto(localUri: string): Promise<string> {
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
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });
  if (!res.ok) throw new Error("Fotoğraf yüklenemedi");
  const data = await res.json() as { url: string };
  return data.url;
}

function isLocalUri(uri: string) {
  return uri.startsWith("file://") || uri.startsWith("content://") || uri.startsWith("ph://");
}

/* ── Phone helpers ───────────────────────────────────────── */
function formatPhone(digits: string) {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)} ${d.slice(3)}`;
  if (d.length <= 8) return `${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6)}`;
  return `${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6,8)} ${d.slice(8)}`;
}

function parsePhoneFromContact(ci: string): string {
  const m = ci.match(/\+90\s*([\d\s]{10,14})/);
  if (m) return m[1].replace(/\s/g, "").slice(0, 10);
  const plain = ci.replace(/\D/g, "");
  if (plain.startsWith("90") && plain.length === 12) return plain.slice(2);
  if (plain.length === 10) return plain;
  return "";
}
function parseEmailFromContact(ci: string): string {
  const m = ci.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : "";
}

function validatePhone(d: string) {
  if (!d) return "Telefon zorunludur";
  if (!d.startsWith("5")) return "5 ile başlamalıdır";
  if (d.length !== 10) return "10 hane giriniz";
  return null;
}
function validateEmail(e: string) {
  if (!e.trim()) return "E-posta zorunludur";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim())) return "Geçerli e-posta giriniz";
  return null;
}

/* ── Reusable field wrapper ──────────────────────────────── */
function FieldWrap({ label, required, error, children }: {
  label: string; required?: boolean; error?: string | null; children: React.ReactNode;
}) {
  return (
    <View style={F.wrap}>
      <Text style={F.label}>{label}{required && <Text style={{ color: C.purple }}> *</Text>}</Text>
      {children}
      {error ? (
        <View style={F.errRow}><Icon name="alert-circle" size={13} color={C.error} /><Text style={F.errTxt}>{error}</Text></View>
      ) : null}
    </View>
  );
}
const F = StyleSheet.create({
  wrap:   { gap: 8 },
  label:  { fontSize: 11, fontFamily: "Inter_700Bold", color: C.label, letterSpacing: 0.8, textTransform: "uppercase" },
  errRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  errTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.error },
});

/* ── Province picker modal ───────────────────────────────── */
function PickerModal({ visible, title, items, selected, onSelect, onClose }: {
  visible: boolean; title: string; items: { label: string; value: string }[];
  selected: string; onSelect: (v: string) => void; onClose: () => void;
}) {
  const T      = useTheme();
  const { t }  = useTranslation();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const filtered = q ? items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())) : items;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[PM.root, { paddingTop: insets.top + 8, backgroundColor: T.bg }]}>
        <View style={PM.header}>
          <View style={{ width: 36 }} />
          <Text style={PM.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}><Icon name="close" size={24} color={C.purpleDark} /></Pressable>
        </View>
        <View style={PM.search}>
          <Icon name="search-outline" size={18} color={C.sub} style={{ marginRight: 8 }} />
          <TextInput style={PM.searchInput} placeholder={t("addAdoption.searchPlaceholder")} placeholderTextColor={C.placeholder} value={q} onChangeText={setQ} autoCorrect={false} />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.value}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => {
            const active = item.value === selected;
            return (
              <Pressable style={[PM.row, active && PM.rowActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(item.value); onClose(); }}>
                <Text style={[PM.rowTxt, active && PM.rowTxtActive]}>{item.label}</Text>
                {active && <Icon name="checkmark" size={18} color={C.purple} />}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}
const PM = StyleSheet.create({
  root:       { flex: 1, backgroundColor: "#FFF" },
  header:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(123,94,167,0.12)" },
  title:      { fontSize: 16, fontFamily: "Inter_700Bold", color: C.purpleDark },
  search:     { flexDirection: "row", alignItems: "center", margin: 12, paddingHorizontal: 14, height: 44, borderRadius: 12, backgroundColor: "#F5F2FF", borderWidth: 1, borderColor: "rgba(123,94,167,0.12)" },
  searchInput:{ flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: C.label },
  row:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F0EDF8" },
  rowActive:  { backgroundColor: "rgba(123,94,167,0.05)" },
  rowTxt:     { fontSize: 15, fontFamily: "Inter_400Regular", color: C.label },
  rowTxtActive: { fontFamily: "Inter_700Bold", color: C.purple },
});

/* ── Photo action bottom sheet ───────────────────────────── */
type PhotoAction = "cover" | "moveLeft" | "moveRight" | "delete" | "close";
function PhotoActionSheet({ visible, isFirst, isLast, isCover, onAction }: {
  visible: boolean; isFirst: boolean; isLast: boolean; isCover: boolean;
  onAction: (a: PhotoAction) => void;
}) {
  const T      = useTheme();
  const { t }  = useTranslation();
  const insets = useSafeAreaInsets();
  type Btn = { label: string; icon: string; action: PhotoAction; color?: string };
  const btns: Btn[] = [
    ...(!isCover ? [{ label: t("addAdoption.makeCover"), icon: "star", action: "cover" as PhotoAction, color: C.purple }] : []),
    ...(!isFirst ? [{ label: t("addAdoption.moveForward"),            icon: "arrow-back", action: "moveLeft" as PhotoAction }] : []),
    ...(!isLast  ? [{ label: t("addAdoption.moveBack"),          icon: "arrow-forward", action: "moveRight" as PhotoAction }] : []),
    { label: t("addAdoption.deletePhoto"), icon: "trash-outline", action: "delete" as PhotoAction, color: C.error },
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => onAction("close")}>
      <Pressable style={AS.overlay} onPress={() => onAction("close")} />
      <View style={[AS.sheet, { paddingBottom: insets.bottom + 8, backgroundColor: T.card }]}>
        <View style={[AS.handle, { backgroundColor: T.divider }]} />
        {btns.map((b) => (
          <Pressable key={b.action} style={({ pressed }) => [AS.row, { opacity: pressed ? 0.7 : 1 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAction(b.action); }}>
            <View style={[AS.iconWrap, b.color === C.error && AS.iconWrapRed]}>
              <Icon name={b.icon as any} size={18} color={b.color ?? C.purpleDark} />
            </View>
            <Text style={[AS.rowTxt, b.color === C.error && AS.rowTxtRed]}>{b.label}</Text>
          </Pressable>
        ))}
        <Pressable style={({ pressed }) => [AS.cancelRow, { opacity: pressed ? 0.7 : 1 }]} onPress={() => onAction("close")}>
          <Text style={AS.cancelTxt}>Vazgeç</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
const AS = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:      { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, gap: 2 },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E0D9F0", alignSelf: "center", marginBottom: 16 },
  row:        { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F0EDF8" },
  iconWrap:   { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(123,94,167,0.08)", alignItems: "center", justifyContent: "center" },
  iconWrapRed:{ backgroundColor: "rgba(229,62,62,0.08)" },
  rowTxt:     { fontSize: 15, fontFamily: "Inter_500Medium", color: C.label },
  rowTxtRed:  { color: C.error },
  cancelRow:  { paddingVertical: 16, alignItems: "center" },
  cancelTxt:  { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.sub },
});

/* ── Add photo source sheet ──────────────────────────────── */
function AddPhotoSheet({ visible, onCamera, onGallery, onClose }: {
  visible: boolean; onCamera: () => void; onGallery: () => void; onClose: () => void;
}) {
  const T          = useTheme();
  const { t }      = useTranslation();
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

  /* iOS: onDismiss fires after the native slide-out animation is fully done */
  const handleDismiss = () => {
    if (pendingRef.current) {
      const action = pendingRef.current;
      pendingRef.current = null;
      action();
    }
  };

  const scheduleAction = (action: () => void) => {
    pendingRef.current = action;
    onClose(); /* starts closing → triggers onDismiss (iOS) or useEffect (Android/Web) */
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onDismiss={handleDismiss}>
      <Pressable style={AS.overlay} onPress={onClose} />
      <View style={[AS.sheet, { paddingBottom: insets.bottom + 8, backgroundColor: T.card }]}>
        <View style={[AS.handle, { backgroundColor: T.divider }]} />
        <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: C.label, paddingVertical: 10, textAlign: "center" }}>{t("addAdoption.addPhoto")}</Text>
        <Pressable style={({ pressed }) => [AS.row, { opacity: pressed ? 0.7 : 1 }]} onPress={() => scheduleAction(onCamera)}>
          <View style={AS.iconWrap}><Icon name="camera-outline" size={20} color={C.purpleDark} /></View>
          <Text style={AS.rowTxt}>Kameradan Çek</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [AS.row, { opacity: pressed ? 0.7 : 1 }]} onPress={() => scheduleAction(onGallery)}>
          <View style={AS.iconWrap}><Icon name="images-outline" size={20} color={C.purpleDark} /></View>
          <Text style={AS.rowTxt}>Galeriden Seç</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [AS.cancelRow, { opacity: pressed ? 0.7 : 1 }]} onPress={onClose}>
          <Text style={AS.cancelTxt}>Vazgeç</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

/* ── Main screen ─────────────────────────────────────────── */
export default function EditAdoptionScreen() {
  const T               = useTheme();
  const { t }           = useTranslation();
  const { id }          = useLocalSearchParams<{ id: string }>();
  const insets          = useSafeAreaInsets();
  const router          = useRouter();
  const { getListing, updateListing } = useAdoption();
  const { user }        = useAuth();

  const listing = getListing(id ?? "");

  /* ── Form state ── */
  const [images,             setImages]             = useState<string[]>([]);
  const [petName,            setPetName]            = useState("");
  const [petType,            setPetType]            = useState("Kedi");
  const [petAge,             setPetAge]             = useState("");
  const [province,           setProvince]           = useState("");
  const [district,           setDistrict]           = useState("");
  const [description,        setDescription]        = useState("");
  const [phone,              setPhone]              = useState("");
  const [email,              setEmail]              = useState("");
  const [allowPhoneContact,  setAllowPhoneContact]  = useState(true);
  const [allowMessages,      setAllowMessages]      = useState(true);
  const [healthStatus,       setHealthStatus]       = useState("");
  const [vaccinationStatus,  setVaccinationStatus]  = useState("");
  const [environmentType,    setEnvironmentType]    = useState("");
  const [childCompatibility, setChildCompatibility] = useState("");
  const [catCompatibility,   setCatCompatibility]   = useState("");
  const [dogCompatibility,   setDogCompatibility]   = useState("");
  const [toiletTraining,     setToiletTraining]     = useState("");
  const [isSaving,           setIsSaving]           = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  /* ── Modal state ── */
  const [selectedIdx,    setSelectedIdx]    = useState<number | null>(null);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [showAddSheet,   setShowAddSheet]   = useState(false);
  const [showProvince,   setShowProvince]   = useState(false);
  const [showDistrict,   setShowDistrict]   = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  /* ── Province data ── */
  const selProv: Province | undefined = TURKEY_PROVINCES.find((p) => p.value === province);
  const districts = selProv?.districts ?? [];

  /* ── Seed from listing ── */
  useEffect(() => {
    if (!listing) return;
    const imgs = listing.images?.length
      ? listing.images
      : listing.photo ? [listing.photo] : [];
    setImages(imgs);
    setPetName(listing.petName ?? "");
    setPetType(listing.petType ?? "Kedi");
    setPetAge(listing.petAge ?? "");
    const parts = listing.location.split(",").map((s) => s.trim());
    setDistrict(parts[0] ?? "");
    setProvince(parts[1] ?? "");
    setDescription(listing.description ?? "");
    setPhone(parsePhoneFromContact(listing.contactInfo));
    setEmail(parseEmailFromContact(listing.contactInfo));
    setAllowPhoneContact(listing.allowPhoneContact ?? true);
    setAllowMessages(listing.allowMessages ?? true);
    setHealthStatus(listing.healthStatus ?? "");
    setVaccinationStatus(listing.vaccinationStatus ?? "");
    setEnvironmentType(listing.environmentType ?? "");
    setChildCompatibility(listing.childCompatibility ?? "");
    setCatCompatibility(listing.catCompatibility ?? "");
    setDogCompatibility(listing.dogCompatibility ?? "");
    setToiletTraining(listing.toiletTraining ?? "");
  }, [listing?.id]);

  if (!listing || listing.userId !== user?.id) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Icon name="lock-closed-outline" size={44} color={`${C.purple}60`} />
        <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: C.label }}>Yetkisiz Erişim</Text>
        <Pressable style={{ backgroundColor: C.purple, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28 }} onPress={() => router.back()}>
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" }}>{t("animalDetail.goBack")}</Text>
        </Pressable>
      </View>
    );
  }

  /* ── Photo actions ── */
  const openCamera = async () => {
    if (images.length >= MAX_PHOTOS) {
      Alert.alert(t("addAdoption.photoLimitTitle"), t("addAdoption.photoLimitMsg", { count: MAX_PHOTOS }));
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert(t("addAnimal.cameraPermTitle"), t("addAnimal.openSettings")); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setImages((prev) => [...prev, result.assets[0].uri].slice(0, MAX_PHOTOS));
      setErrors((e) => ({ ...e, images: "" }));
    }
  };

  const openGallery = async () => {
    if (images.length >= MAX_PHOTOS) {
      Alert.alert(t("addAdoption.photoLimitTitle"), t("addAdoption.photoLimitMsg", { count: MAX_PHOTOS }));
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
      setErrors((e) => ({ ...e, images: "" }));
    }
  };

  const handlePhotoAction = (action: PhotoAction) => {
    setShowPhotoSheet(false);
    if (selectedIdx === null) return;
    const idx = selectedIdx;

    if (action === "cover") {
      setImages((prev) => {
        const arr = [...prev];
        const [item] = arr.splice(idx, 1);
        return [item, ...arr];
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (action === "moveLeft" && idx > 0) {
      setImages((prev) => {
        const arr = [...prev];
        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
        return arr;
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (action === "moveRight" && idx < images.length - 1) {
      setImages((prev) => {
        const arr = [...prev];
        [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
        return arr;
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (action === "delete") {
      Alert.alert(t("adoption.detail.deletePhotoTitle"), t("adoption.detail.deletePhotoMsg"), [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil", style: "destructive",
          onPress: () => {
            setImages((prev) => prev.filter((_, i) => i !== idx));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]);
    }
    setSelectedIdx(null);
  };

  /* ── Validation ── */
  const validate = () => {
    const errs: Record<string, string> = {};
    if (images.length === 0)           errs.images     = t("addAdoption.photoRequired");
    if (!petName.trim())               errs.petName    = t("addAdoption.nameRequired");
    if (!petAge)                       errs.petAge     = t("addAdoption.ageRequired");
    if (!province)                     errs.province   = t("addAdoption.cityRequired");
    if (!district)                     errs.district   = t("addAdoption.districtRequired");
    if (description.trim().length < 30) errs.description = t("addAdoption.descriptionMinLength");
    if (!healthStatus)       errs.healthStatus       = "Lütfen detay bilgilerini tamamla.";
    if (!vaccinationStatus)  errs.vaccinationStatus  = "Lütfen detay bilgilerini tamamla.";
    if (!environmentType)    errs.environmentType    = "Lütfen detay bilgilerini tamamla.";
    if (!childCompatibility) errs.childCompatibility = "Lütfen detay bilgilerini tamamla.";
    if (!catCompatibility)   errs.catCompatibility   = "Lütfen detay bilgilerini tamamla.";
    if (!dogCompatibility)   errs.dogCompatibility   = "Lütfen detay bilgilerini tamamla.";
    if (!toiletTraining)     errs.toiletTraining     = "Lütfen detay bilgilerini tamamla.";
    const pe = validatePhone(phone); if (pe) errs.phone = pe;
    const ee = validateEmail(email); if (ee) errs.email = ee;
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
      return false;
    }
    return true;
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!validate() || !user) return;
    setIsSaving(true);
    try {
      /* Upload any newly picked local URIs — keep already-remote URLs as-is */
      const remoteImages = await Promise.all(
        images.map((uri) =>
          isLocalUri(uri) ? uploadPhoto(uri).catch(() => uri) : Promise.resolve(uri)
        )
      );
      await updateListing(listing.id, {
        images:            remoteImages,
        photo:             remoteImages[0],
        petName:           petName.trim(),
        petType,
        petAge,
        location:          `${district}, ${province}`,
        description:       description.trim(),
        contactInfo:       `Tel: +90 ${formatPhone(phone)} | E-posta: ${email.trim()}`,
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
      /* Sync phone + prefs to backend */
      apiSaveListingContact(
        listing.id,
        `+90${phone.replace(/\D/g, "")}`,
        allowPhoneContact,
        allowMessages
      ).catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert("Hata", "Değişiklikler kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  const topPad = Platform.OS === "web" ? 16 : insets.top;
  const btmPad = Platform.OS === "web" ? 34 : insets.bottom;
  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[S.root, { backgroundColor: T.bg }]}>

        {/* Header */}
        <View style={[S.header, { paddingTop: topPad + 10 }]}>
          <Pressable style={S.headerBtn} onPress={() => router.back()} hitSlop={8}>
            <Icon name="close" size={22} color={C.label} />
          </Pressable>
          <Text style={S.headerTitle}>İlanı Düzenle</Text>
          <Pressable
            style={[S.headerBtn, S.saveHeaderBtn]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleSave(); }}
            disabled={isSaving}
          >
            {isSaving
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={S.saveHeaderTxt}>Kaydet</Text>}
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView
            ref={scrollRef}
            style={S.scroll}
            contentContainerStyle={[S.scrollContent, { paddingBottom: btmPad + 80 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* Error banner */}
            {errorCount > 0 && (
              <View style={S.errorBanner}>
                <Icon name="alert-circle" size={18} color={C.error} />
                <Text style={S.errorBannerTxt}>{errorCount} alan eksik veya hatalı.</Text>
              </View>
            )}

            {/* ═══════════════════════════════════════════════
                PHOTOS SECTION
            ═══════════════════════════════════════════════ */}
            <View style={S.sectionCard}>
              <View style={S.sectionTitleRow}>
                <Icon name="images-outline" size={18} color={C.purple} />
                <Text style={S.sectionTitle}>Fotoğraflar</Text>
                <Text style={S.sectionSub}>{images.length}/{MAX_PHOTOS}</Text>
              </View>

              {errors.images ? (
                <View style={S.photoError}>
                  <Icon name="alert-circle" size={14} color={C.error} />
                  <Text style={S.photoErrorTxt}>{errors.images}</Text>
                </View>
              ) : (
                <Text style={S.photoHint}>
                  İlk fotoğraf kapak olarak gösterilir. Uzun basarak sırayı değiştirebilirsiniz.
                </Text>
              )}

              {/* Photo grid */}
              <View style={S.photoGrid}>
                {images.map((uri, idx) => (
                  <Pressable
                    key={`${uri}-${idx}`}
                    style={({ pressed }) => [S.photoCell, { opacity: pressed ? 0.85 : 1 }]}
                    onLongPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setSelectedIdx(idx);
                      setShowPhotoSheet(true);
                    }}
                    delayLongPress={350}
                  >
                    <Image source={{ uri }} style={S.photoImg} contentFit="cover" />

                    {/* Cover badge */}
                    {idx === 0 && (
                      <View style={S.coverBadge}>
                        <Icon name="star" size={9} color="#FFF" />
                        <Text style={S.coverBadgeTxt}>KAPAK</Text>
                      </View>
                    )}

                    {/* Index number */}
                    {idx > 0 && (
                      <View style={S.indexBadge}>
                        <Text style={S.indexBadgeTxt}>{idx + 1}</Text>
                      </View>
                    )}

                    {/* Delete button */}
                    <Pressable
                      style={S.deletePhotoBtn}
                      hitSlop={6}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        Alert.alert(t("adoption.detail.deletePhotoTitle"), t("adoption.detail.deletePhotoMsg"), [
                          { text: "İptal", style: "cancel" },
                          { text: "Sil", style: "destructive", onPress: () => setImages((prev) => prev.filter((_, i) => i !== idx)) },
                        ]);
                      }}
                    >
                      <Icon name="close-circle" size={20} color="#FFF" />
                    </Pressable>
                  </Pressable>
                ))}

                {/* Add button */}
                {images.length < MAX_PHOTOS && (
                  <Pressable
                    style={({ pressed }) => [S.addPhotoBtn, { opacity: pressed ? 0.75 : 1 }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddSheet(true); }}
                  >
                    <View style={S.addIconRing}>
                      <Icon name="add" size={28} color={C.purple} />
                    </View>
                    <Text style={S.addPhotoTxt}>Fotoğraf{"\n"}Ekle</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* ═══════════════════════════════════════════════
                DETAIL FIELDS
            ═══════════════════════════════════════════════ */}
            <View style={S.sectionCard}>
              <View style={S.sectionTitleRow}>
                <Icon name="paw-outline" size={18} color={C.purple} />
                <Text style={S.sectionTitle}>Hayvan Bilgileri</Text>
              </View>

              {/* Pet name */}
              <FieldWrap label="Hayvanın Adı" required error={errors.petName}>
                <TextInput
                  style={[S.input, errors.petName ? S.inputErr : {}]}
                  placeholder="Örn: Pamuk"
                  placeholderTextColor={C.placeholder}
                  value={petName}
                  onChangeText={(t) => { setPetName(t); setErrors((e) => ({ ...e, petName: "" })); }}
                />
              </FieldWrap>

              {/* Pet type */}
              <View style={F.wrap}>
                <Text style={F.label}>Tür <Text style={{ color: C.purple }}>*</Text></Text>
                <View style={S.chipRow}>
                  {PET_TYPES.map(({ label }) => {
                    const active = petType === label;
                    return (
                      <Pressable key={label} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPetType(label); }}
                        style={({ pressed }) => [S.chip, active && S.chipActive, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
                        {active ? (
                          <LinearGradient colors={[C.purpleLight, C.purpleDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.chipInner}>
                            <Text style={S.chipTxtA}>{label}</Text>
                          </LinearGradient>
                        ) : (
                          <View style={S.chipInner}><Text style={S.chipTxt}>{label}</Text></View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Age */}
              <FieldWrap label="Yaş" required error={errors.petAge}>
                <View style={S.ageGrid}>
                  {AGE_OPTIONS.map((opt) => {
                    const active = petAge === opt.value;
                    return (
                      <Pressable key={opt.value}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPetAge(opt.value); setErrors((e) => ({ ...e, petAge: "" })); }}
                        style={({ pressed }) => [S.ageCard, active && S.ageCardA, errors.petAge && !active && S.ageCardErr, { opacity: pressed ? 0.8 : 1 }]}>
                        <Text style={[S.ageCardTxt, active && S.ageCardTxtA]}>{opt.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </FieldWrap>

              {/* Location */}
              <FieldWrap label="Konum" required error={errors.province || errors.district}>
                <View style={{ gap: 10 }}>
                  <Pressable style={[S.selectRow, errors.province ? S.inputErr : {}]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowProvince(true); }}>
                    <Icon name="location-outline" size={18} color={province ? C.purple : C.placeholder} style={{ marginRight: 8 }} />
                    <Text style={[S.selectTxt, !province && S.selectPh]}>{province || "İl seçin"}</Text>
                    <Icon name="chevron-down" size={18} color={C.sub} />
                  </Pressable>
                  <Pressable style={[S.selectRow, !province && S.selectDisabled, errors.district ? S.inputErr : {}]}
                    onPress={() => { if (!province) return; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowDistrict(true); }}>
                    <Icon name="navigate-outline" size={18} color={district ? C.purple : C.placeholder} style={{ marginRight: 8 }} />
                    <Text style={[S.selectTxt, !district && S.selectPh]}>{district || (province ? "İlçe seçin" : "Önce il seçin")}</Text>
                    <Icon name="chevron-down" size={18} color={C.sub} />
                  </Pressable>
                </View>
              </FieldWrap>

              {/* Description */}
              <FieldWrap label="Açıklama" required error={errors.description}>
                <View>
                  <TextInput
                    style={[S.textArea, errors.description ? S.inputErr : {}]}
                    placeholder="Hayvanın karakteri, sağlık durumu, sahiplenme koşulları..."
                    placeholderTextColor={C.placeholder}
                    value={description}
                    onChangeText={(t) => { setDescription(t); if (t.trim().length >= 30) setErrors((e) => ({ ...e, description: "" })); }}
                    multiline textAlignVertical="top"
                  />
                  <Text style={[S.charCount, description.trim().length < 30 && S.charCountWarn]}>
                    {description.trim().length} / min 30 karakter
                  </Text>
                </View>
              </FieldWrap>
            </View>

            {/* ═══════════════════════════════════════════════
                DETAIL INFO
            ═══════════════════════════════════════════════ */}
            <View style={S.sectionCard}>
              <View style={S.sectionTitleRow}>
                <Icon name="list-outline" size={18} color={C.purple} />
                <Text style={S.sectionTitle}>Detay Bilgiler</Text>
              </View>
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: C.sub, marginTop: -8, lineHeight: 17 }}>
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
                { key: "healthStatus"       as const, label: "Sağlık Durumu",   iconName: "medkit-outline"           as const, opts: PET_DETAIL_OPTIONS.healthStatus,       state: healthStatus,       setter: setHealthStatus },
                { key: "vaccinationStatus"  as const, label: "Aşı",             iconName: "shield-checkmark-outline" as const, opts: PET_DETAIL_OPTIONS.vaccinationStatus,  state: vaccinationStatus,  setter: setVaccinationStatus },
                { key: "environmentType"    as const, label: "İç/Dış Mekan",    iconName: "home-outline"             as const, opts: PET_DETAIL_OPTIONS.environmentType,    state: environmentType,    setter: setEnvironmentType },
                { key: "childCompatibility" as const, label: "Çocuk Uyumu",     iconName: "people-outline"           as const, opts: PET_DETAIL_OPTIONS.childCompatibility, state: childCompatibility, setter: setChildCompatibility },
                { key: "catCompatibility"   as const, label: "Kedi Uyumu",      iconName: "paw"                      as const, opts: PET_DETAIL_OPTIONS.catCompatibility,   state: catCompatibility,   setter: setCatCompatibility },
                { key: "dogCompatibility"   as const, label: "Köpek Uyumu",     iconName: "paw"                      as const, opts: PET_DETAIL_OPTIONS.dogCompatibility,   state: dogCompatibility,   setter: setDogCompatibility },
                { key: "toiletTraining"     as const, label: "Tuvalet Eğitimi", iconName: "checkmark-circle-outline" as const, opts: PET_DETAIL_OPTIONS.toiletTraining,     state: toiletTraining,     setter: setToiletTraining },
              ] as const).map(({ key, label, iconName, opts, state, setter }) => (
                <View key={key} style={S.detailFieldWrap}>
                  <View style={S.detailFieldHeader}>
                    <Icon name={iconName} size={15} color={C.purpleDark} />
                    <Text style={[S.detailFieldLabel, !!errors[key] && { color: C.error }]}>{label}</Text>
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
                            { borderColor: active ? C.purple : C.border, backgroundColor: active ? C.purple + "14" : C.inputBg },
                            { opacity: pressed ? 0.8 : 1 },
                          ]}
                        >
                          {active && <Icon name="checkmark" size={12} color={C.purple} />}
                          <Text style={[S.detailChipTxt, { color: active ? C.purple : C.muted }, active && { fontFamily: "Inter_700Bold" }]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>

            {/* ═══════════════════════════════════════════════
                CONTACT
            ═══════════════════════════════════════════════ */}
            <View style={S.sectionCard}>
              <View style={S.sectionTitleRow}>
                <Icon name="call-outline" size={18} color={C.purple} />
                <Text style={S.sectionTitle}>İletişim Bilgileri</Text>
              </View>

              {/* Phone */}
              <FieldWrap label="Telefon Numarası" required error={errors.phone}>
                <View style={[S.phoneWrap, errors.phone ? S.inputErr : {}]}>
                  <View style={S.phonePrefix}>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#7B5CBF" }}>TR</Text>
                    <Text style={S.phonePrefixTxt}>+90</Text>
                    <View style={S.phoneSep} />
                  </View>
                  <TextInput
                    style={S.phoneInput}
                    placeholder="5XX XXX XX XX"
                    placeholderTextColor={C.placeholder}
                    value={formatPhone(phone)}
                    onChangeText={(t) => { setPhone(t.replace(/\D/g, "").slice(0, 10)); setErrors((e) => ({ ...e, phone: "" })); }}
                    keyboardType="number-pad"
                    maxLength={13}
                  />
                  {phone.length === 10 && !validatePhone(phone) && (
                    <Icon name="checkmark-circle" size={20} color="#38A169" style={{ marginRight: 12 }} />
                  )}
                </View>
              </FieldWrap>

              {/* Email */}
              <FieldWrap label="E-Posta Adresi" required error={errors.email}>
                <View style={[S.emailWrap, errors.email ? S.inputErr : {}]}>
                  <Icon name="mail-outline" size={18} color={C.sub} style={{ marginLeft: 14, marginRight: 8 }} />
                  <TextInput
                    style={S.emailInput}
                    placeholder="ornek@email.com"
                    placeholderTextColor={C.placeholder}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: "" })); }}
                    keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                  />
                  {email && !validateEmail(email) && (
                    <Icon name="checkmark-circle" size={20} color="#38A169" style={{ marginRight: 12 }} />
                  )}
                </View>
              </FieldWrap>

              <View style={S.divider} />

              {/* ── İletişim Tercihleri ── */}
              <View>
                <View style={S.sectionTitleRow}>
                  <Icon name="shield-checkmark-outline" size={18} color={C.purpleDark} />
                  <Text style={S.sectionTitle}>İletişim Tercihleri</Text>
                </View>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: C.sub, marginTop: 4, marginBottom: 14, lineHeight: 17 }}>
                  Diğer kullanıcıların seninle hangi yollarla iletişim kurabileceğini seç.
                </Text>

                <Pressable
                  style={S.toggleRow}
                  onPress={() => { setAllowPhoneContact((v) => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <View style={S.toggleLeft}>
                    <View style={[S.toggleIcon, allowPhoneContact && S.toggleIconActive]}>
                      <Icon name="call-outline" size={18} color={allowPhoneContact ? "#FFF" : C.sub} />
                    </View>
                    <View>
                      <Text style={S.toggleLabel}>Telefon ile iletişime izin ver</Text>
                      <Text style={S.toggleSub}>Numaranız talep üzerine gösterilir</Text>
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
                      <Icon name="chatbubble-outline" size={18} color={allowMessages ? "#FFF" : C.sub} />
                    </View>
                    <View>
                      <Text style={S.toggleLabel}>Mesaj almaya izin ver</Text>
                      <Text style={S.toggleSub}>Uygulama içi DM</Text>
                    </View>
                  </View>
                  <View style={[S.toggle, allowMessages && S.toggleOn]}>
                    <View style={[S.toggleThumb, allowMessages && S.toggleThumbOn]} />
                  </View>
                </Pressable>
              </View>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>

        {/* Bottom save bar */}
        <View style={[S.ctaWrap, { paddingBottom: btmPad + 12 }]}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleSave(); }}
            disabled={isSaving}
            style={({ pressed }) => [{ opacity: pressed || isSaving ? 0.86 : 1 }]}
          >
            <LinearGradient colors={[C.purpleLight, C.purpleDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.cta}>
              {isSaving ? <ActivityIndicator color="#FFF" /> : (
                <><Icon name="checkmark-circle" size={20} color="#FFF" /><Text style={S.ctaTxt}>Değişiklikleri Kaydet</Text></>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {/* Modals */}
      <PhotoActionSheet
        visible={showPhotoSheet}
        isFirst={selectedIdx === 0}
        isLast={selectedIdx === images.length - 1}
        isCover={selectedIdx === 0}
        onAction={handlePhotoAction}
      />
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
        onSelect={(v) => { setProvince(v); setDistrict(""); setErrors((e) => ({ ...e, province: "", district: "" })); }}
        onClose={() => setShowProvince(false)}
      />
      <PickerModal
        visible={showDistrict}
        title={province ? `${province} — İlçe Seçin` : "İlçe Seçin"}
        items={districts}
        selected={district}
        onSelect={(v) => { setDistrict(v); setErrors((e) => ({ ...e, district: "" })); }}
        onClose={() => setShowDistrict(false)}
      />
    </>
  );
}

/* ── Styles ─────────────────────────────────────────────── */
const S = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },

  /* Header */
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: C.bg,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(123,94,167,0.1)",
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(123,94,167,0.08)",
  },
  saveHeaderBtn: { backgroundColor: C.purpleDark, paddingHorizontal: 16, width: "auto", borderRadius: 12 },
  saveHeaderTxt: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: C.label, letterSpacing: -0.3, flex: 1, textAlign: "center" },

  /* Error banner */
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.errorBg, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "rgba(229,62,62,0.25)",
  },
  errorBannerTxt: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.error, flex: 1 },

  /* Section cards */
  sectionCard: {
    backgroundColor: C.card, borderRadius: 24, padding: 20, gap: 20,
    ...Platform.select({
      ios:     { shadowColor: "#7B5EA7", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 16 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle:    { fontSize: 15, fontFamily: "Inter_700Bold", color: C.purpleDark, flex: 1 },
  sectionSub:      { fontSize: 12, fontFamily: "Inter_500Medium", color: C.sub },

  /* Toggle rows */
  toggleRow:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleLeft:       { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  toggleIcon:       { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(123,94,167,0.1)", alignItems: "center", justifyContent: "center" },
  toggleIconActive: { backgroundColor: C.purple },
  toggleLabel:      { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.label },
  toggleSub:        { fontSize: 11, fontFamily: "Inter_400Regular", color: C.sub, marginTop: 1 },
  toggle:           { width: 48, height: 28, borderRadius: 14, backgroundColor: "#D1D5DB", padding: 2, justifyContent: "center" },
  toggleOn:         { backgroundColor: C.purple },
  toggleThumb: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFF", alignSelf: "flex-start",
    ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 }, android: { elevation: 2 }, default: {} }),
  },
  toggleThumbOn:    { alignSelf: "flex-end" },

  /* Divider */
  divider: { height: 1, backgroundColor: "#F0EDF8", marginHorizontal: -4 },

  /* Photo hints */
  photoHint:    { fontSize: 12, fontFamily: "Inter_400Regular", color: C.sub, lineHeight: 18 },
  photoError:   { flexDirection: "row", alignItems: "center", gap: 6 },
  photoErrorTxt:{ fontSize: 12, fontFamily: "Inter_400Regular", color: C.error },

  /* Photo grid */
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP },
  photoCell: {
    width: PHOTO_W, height: PHOTO_H, borderRadius: 14, overflow: "hidden",
    backgroundColor: "#EDE8F8",
    ...Platform.select({
      ios:     { shadowColor: "#7B5EA7", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  photoImg:   { width: "100%", height: "100%" },

  /* Cover badge */
  coverBadge: {
    position: "absolute", top: 7, left: 7,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: C.purple,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  coverBadgeTxt: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#FFF", letterSpacing: 0.5 },

  /* Index badge */
  indexBadge: {
    position: "absolute", top: 7, left: 7,
    backgroundColor: "rgba(0,0,0,0.45)",
    width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  indexBadgeTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#FFF" },

  /* Delete button on photo */
  deletePhotoBtn: {
    position: "absolute", top: 5, right: 5,
    backgroundColor: "rgba(0,0,0,0.50)", borderRadius: 12,
  },

  /* Add photo button */
  addPhotoBtn: {
    width: PHOTO_W, height: PHOTO_H, borderRadius: 14,
    borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(123,94,167,0.3)",
    backgroundColor: "rgba(123,94,167,0.04)",
    alignItems: "center", justifyContent: "center", gap: 6,
  },
  addIconRing: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "rgba(123,94,167,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  addPhotoTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.purple, textAlign: "center", lineHeight: 16 },

  /* Text input */
  input: {
    height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.inputBg, paddingHorizontal: 16,
    fontSize: 15, fontFamily: "Inter_400Regular", color: C.label,
  },
  inputErr: { borderColor: C.error, backgroundColor: C.errorBg },

  textArea: {
    borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.inputBg, padding: 16,
    fontSize: 15, fontFamily: "Inter_400Regular", color: C.label,
    minHeight: 120, lineHeight: 22,
  },
  charCount:     { fontSize: 11, fontFamily: "Inter_400Regular", color: C.sub, textAlign: "right", marginTop: 4 },
  charCountWarn: { color: C.error },

  /* Type chips */
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 99, borderWidth: 1.5, borderColor: C.border, overflow: "hidden", backgroundColor: "#FAFAFA" },
  chipActive: {
    borderColor: "transparent",
    ...Platform.select({ ios: { shadowColor: C.purple, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 6 }, android: { elevation: 3 }, default: {} }),
  },
  chipInner:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 9, gap: 5, minHeight: 40 },
  chipEmoji:  { fontSize: 14, lineHeight: 18 },
  chipTxt:    { fontSize: 13, fontFamily: "Inter_500Medium", color: C.muted },
  chipTxtA:   { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFF" },

  /* Age cards */
  ageGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ageCard:     { paddingVertical: 11, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.inputBg, minWidth: "30%" },
  ageCardA:    {
    borderColor: C.purple, backgroundColor: "rgba(123,94,167,0.08)",
    ...Platform.select({ ios: { shadowColor: C.purple, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 }, android: { elevation: 2 }, default: {} }),
  },
  ageCardErr:  { borderColor: "rgba(229,62,62,0.35)" },
  ageCardTxt:  { fontSize: 13, fontFamily: "Inter_500Medium", color: C.muted, textAlign: "center" },
  ageCardTxtA: { fontFamily: "Inter_700Bold", color: C.purple },

  /* Location select */
  selectRow:     { height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.inputBg, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 },
  selectDisabled:{ opacity: 0.5 },
  selectTxt:     { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: C.label },
  selectPh:      { color: C.placeholder },

  /* Phone */
  phoneWrap:      { flexDirection: "row", alignItems: "center", height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.inputBg, overflow: "hidden" },
  phonePrefix:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 6 },
  phonePrefixTxt: { fontSize: 14, fontFamily: "Inter_700Bold", color: C.label },
  phoneSep:       { width: 1, height: 24, backgroundColor: C.border, marginLeft: 8 },
  phoneInput:     { flex: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: C.label, height: "100%" },

  /* Email */
  emailWrap:  { flexDirection: "row", alignItems: "center", height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.inputBg, overflow: "hidden" },
  emailInput: { flex: 1, paddingRight: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: C.label, height: "100%" },

  /* Detail info chips */
  detailErrorBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.errorBg, borderRadius: 10, padding: 12 },
  detailErrorTxt:    { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: C.error },
  detailFieldWrap:   { marginBottom: 4 },
  detailFieldHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  detailFieldLabel:  { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.label, flex: 1 },
  detailChipRow:     { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  detailChip:        { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1.5, borderRadius: 50, paddingVertical: 7, paddingHorizontal: 13 },
  detailChipTxt:     { fontSize: 13, fontFamily: "Inter_500Medium" },

  /* CTA */
  ctaWrap: {
    paddingHorizontal: 20, paddingTop: 12, backgroundColor: C.bg,
    borderTopWidth: 1, borderTopColor: "rgba(123,94,167,0.08)",
    ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.04, shadowRadius: 8 }, android: { elevation: 8 }, default: {} }),
  },
  cta: {
    height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 18,
    ...Platform.select({ ios: { shadowColor: C.purpleDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 16 }, android: { elevation: 6 }, default: {} }),
  },
  ctaTxt: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF", letterSpacing: 0.2 },
});
