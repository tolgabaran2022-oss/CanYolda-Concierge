import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { TURKEY_PROVINCES, type Province } from "@/constants/turkeyLocations";

/* ── Tokens ─────────────────────────────────────────────── */
const C = {
  purple:      "#7B5EA7",
  purpleDark:  "#4A2D8F",
  purpleLight: "#9478D8",
  bg:          "#F8F5FF",
  card:        "#FFFFFF",
  inputBg:     "#FAFAFA",
  border:      "#E5E7EB",
  borderFocus: "#7B5EA7",
  label:       "#1A0A3C",
  placeholder: "#9CA3AF",
  sub:         "#7C6F9A",
  muted:       "#6B7280",
  error:       "#E53E3E",
  errorBg:     "#FFF5F5",
};

/* ── Static data ─────────────────────────────────────────── */
const PET_TYPES = [
  { label: "Kedi",   emoji: "🐱" },
  { label: "Köpek",  emoji: "🐶" },
  { label: "Kuş",    emoji: "🐦" },
  { label: "Tavşan", emoji: "🐰" },
  { label: "Diğer",  emoji: "🐾" },
];

const AGE_OPTIONS = [
  { label: "0–3 Ay",   value: "0-3 ay" },
  { label: "3–6 Ay",   value: "3-6 ay" },
  { label: "6–12 Ay",  value: "6-12 ay" },
  { label: "1 Yaş",    value: "1 yaş" },
  { label: "2 Yaş+",   value: "2 yaş+" },
  { label: "3 Yaş+",   value: "3 yaş+" },
];

/* ── Phone format helpers ────────────────────────────────── */
function formatPhoneDisplay(digits: string): string {
  /* digits = max 10 chars, no prefix */
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

/* ── Subcomponents ───────────────────────────────────────── */

type FieldProps = {
  label: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
};
function FieldWrap({ label, required, error, children }: FieldProps) {
  return (
    <View style={S.fieldWrap}>
      <Text style={S.fieldLabel}>
        {label}
        {required && <Text style={{ color: C.purple }}> *</Text>}
      </Text>
      {children}
      {error ? (
        <View style={S.errorRow}>
          <Ionicons name="alert-circle" size={13} color={C.error} />
          <Text style={S.errorTxt}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

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
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const filtered = searchable && query
    ? items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : items;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[PM.root, { paddingTop: insets.top + 8 }]}>
        <View style={PM.header}>
          <View style={{ width: 36 }} />
          <Text style={PM.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={C.purpleDark} />
          </Pressable>
        </View>

        {searchable && (
          <View style={PM.searchWrap}>
            <Ionicons name="search-outline" size={18} color={C.sub} style={{ marginRight: 8 }} />
            <TextInput
              style={PM.searchInput}
              placeholder="Ara..."
              placeholderTextColor={C.placeholder}
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
                style={[PM.row, active && PM.rowActive]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(item.value); onClose(); }}
              >
                <Text style={[PM.rowTxt, active && PM.rowTxtActive]}>{item.label}</Text>
                {active && <Ionicons name="checkmark" size={18} color={C.purple} />}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

/* ── Main screen ─────────────────────────────────────────── */
export default function AddAdoptionScreen() {
  const insets         = useSafeAreaInsets();
  const router         = useRouter();
  const { addListing } = useAdoption();
  const { user }       = useAuth();

  /* Form state */
  const [petName,     setPetName]     = useState("");
  const [petType,     setPetType]     = useState("Kedi");
  const [petAge,      setPetAge]      = useState("");
  const [photo,       setPhoto]       = useState<string | undefined>();
  const [province,    setProvince]    = useState("");
  const [district,    setDistrict]    = useState("");
  const [description, setDescription] = useState("");
  const [phone,       setPhone]       = useState("");   /* raw 10-digit string */
  const [email,       setEmail]       = useState("");
  const [isSaving,    setIsSaving]    = useState(false);

  /* Errors */
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* Picker modals */
  const [showProvince, setShowProvince] = useState(false);
  const [showDistrict, setShowDistrict] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const topPad    = Platform.OS === "web" ? 16 : insets.top;
  const btmPad    = Platform.OS === "web" ? 34 : insets.bottom;

  /* ── Province data ── */
  const selectedProvince: Province | undefined = TURKEY_PROVINCES.find((p) => p.value === province);
  const districts = selectedProvince?.districts ?? [];

  /* ── Photo picker ── */
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
      setErrors((e) => ({ ...e, photo: "" }));
    }
  };

  /* ── Phone input handler ── */
  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
    if (errors.phone) setErrors((e) => ({ ...e, phone: "" }));
  };

  /* ── Validation ── */
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!photo)               errs.photo       = "Fotoğraf eklenmesi zorunludur";
    if (!petName.trim())      errs.petName     = "Hayvan adı zorunludur";
    if (!petAge)              errs.petAge      = "Yaş seçimi zorunludur";
    if (!province)            errs.province    = "İl seçimi zorunludur";
    if (!district)            errs.district    = "İlçe seçimi zorunludur";
    if (description.trim().length < 30)
                              errs.description = "Açıklama en az 30 karakter olmalıdır";

    const phoneErr = validatePhone(phone);
    if (phoneErr)             errs.phone       = phoneErr;

    const emailErr = validateEmail(email);
    if (emailErr)             errs.email       = emailErr;

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
      return false;
    }
    return true;
  };

  /* ── Submit ── */
  const handleSave = async () => {
    if (!validate() || !user) return;
    setIsSaving(true);
    try {
      await addListing({
        petName:     petName.trim(),
        petType,
        petAge,
        photo,
        location:    `${district}, ${province}`,
        description: description.trim(),
        userId:      user.id,
        userName:    user.name,
        contactInfo: `📞 +90 ${formatPhoneDisplay(phone)} | ✉️ ${email.trim()}`,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      setErrors({ _global: "İlan oluşturulamadı. Lütfen tekrar deneyin." });
    } finally {
      setIsSaving(false);
    }
  };

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <>
      <View style={[S.root, { backgroundColor: C.bg }]}>

        {/* Header */}
        <View style={[S.header, { paddingTop: topPad + 10 }]}>
          <Pressable style={S.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={C.label} />
          </Pressable>
          <Text style={S.headerTitle}>Sahiplendirme İlanı</Text>
          <View style={S.backBtn} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            ref={scrollRef}
            style={S.scroll}
            contentContainerStyle={[S.scrollContent, { paddingBottom: btmPad + 100 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Intro */}
            <View style={S.intro}>
              <Text style={S.introTitle}>Yeni İlan Oluştur</Text>
              <Text style={S.introSub}>Yeni bir dost için sahiplendirme ilanı oluştur</Text>
            </View>

            {/* Global error banner */}
            {errorCount > 0 && (
              <View style={S.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={C.error} />
                <Text style={S.errorBannerTxt}>
                  {errorCount} alan eksik veya hatalı. Lütfen kontrol edin.
                </Text>
              </View>
            )}

            {/* ── Form card ── */}
            <View style={S.card}>

              {/* ── Photo ── */}
              <FieldWrap label="Fotoğraf" required error={errors.photo}>
                <Pressable
                  onPress={pickPhoto}
                  style={({ pressed }) => [{ opacity: pressed ? 0.86 : 1 }]}
                >
                  {photo ? (
                    <View style={[S.photoWrap, errors.photo ? S.photoWrapError : {}]}>
                      <Image source={{ uri: photo }} style={S.photo} contentFit="cover" />
                      <View style={S.photoEditBadge}>
                        <Ionicons name="camera" size={13} color="#FFF" />
                        <Text style={S.photoEditText}>Değiştir</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={[S.photoBox, errors.photo ? S.photoBoxError : {}]}>
                      <View style={S.cameraRing}>
                        <Ionicons name="camera-outline" size={28} color={C.purple} />
                      </View>
                      <Text style={S.photoLabel}>Fotoğraf Ekle</Text>
                      <Text style={S.photoSub}>JPG, PNG · Maks 10 MB</Text>
                    </View>
                  )}
                </Pressable>
              </FieldWrap>

              <View style={S.divider} />

              {/* ── Hayvan adı ── */}
              <FieldWrap label="Hayvanın Adı" required error={errors.petName}>
                <TextInput
                  style={[S.input, errors.petName ? S.inputError : {}]}
                  placeholder="Örn: Pamuk"
                  placeholderTextColor={C.placeholder}
                  value={petName}
                  onChangeText={(t) => { setPetName(t); setErrors((e) => ({ ...e, petName: "" })); }}
                  returnKeyType="next"
                />
              </FieldWrap>

              {/* ── Tür ── */}
              <View style={S.fieldWrap}>
                <Text style={S.fieldLabel}>Tür <Text style={{ color: C.purple }}>*</Text></Text>
                <View style={S.chipRow}>
                  {PET_TYPES.map(({ label, emoji }) => {
                    const active = petType === label;
                    return (
                      <Pressable
                        key={label}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPetType(label); }}
                        style={({ pressed }) => [S.chip, active && S.chipActive, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
                      >
                        {active ? (
                          <LinearGradient colors={[C.purpleLight, C.purpleDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.chipInner}>
                            <Text style={S.chipEmoji}>{emoji}</Text>
                            <Text style={S.chipTxtActive}>{label}</Text>
                          </LinearGradient>
                        ) : (
                          <View style={S.chipInner}>
                            <Text style={S.chipEmoji}>{emoji}</Text>
                            <Text style={S.chipTxt}>{label}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* ── Yaş seçimi ── */}
              <FieldWrap label="Yaş" required error={errors.petAge}>
                <View style={S.ageGrid}>
                  {AGE_OPTIONS.map((opt) => {
                    const active = petAge === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPetAge(opt.value); setErrors((e) => ({ ...e, petAge: "" })); }}
                        style={({ pressed }) => [
                          S.ageCard,
                          active && S.ageCardActive,
                          errors.petAge && !active && S.ageCardError,
                          { opacity: pressed ? 0.8 : 1 },
                        ]}
                      >
                        <Text style={[S.ageCardTxt, active && S.ageCardTxtActive]}>{opt.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </FieldWrap>

              {/* ── Konum ── */}
              <FieldWrap label="Konum" required error={errors.province || errors.district}>
                <View style={{ gap: 10 }}>
                  {/* İl */}
                  <Pressable
                    style={[S.selectRow, errors.province ? S.inputError : {}]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowProvince(true); }}
                  >
                    <Ionicons name="location-outline" size={18} color={province ? C.purple : C.placeholder} style={{ marginRight: 8 }} />
                    <Text style={[S.selectTxt, !province && S.selectPlaceholder]}>
                      {province || "İl seçin"}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={C.sub} />
                  </Pressable>

                  {/* İlçe */}
                  <Pressable
                    style={[S.selectRow, !province && S.selectDisabled, errors.district ? S.inputError : {}]}
                    onPress={() => {
                      if (!province) return;
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowDistrict(true);
                    }}
                  >
                    <Ionicons name="navigate-outline" size={18} color={district ? C.purple : C.placeholder} style={{ marginRight: 8 }} />
                    <Text style={[S.selectTxt, !district && S.selectPlaceholder]}>
                      {district || (province ? "İlçe seçin" : "Önce il seçin")}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={C.sub} />
                  </Pressable>
                </View>
              </FieldWrap>

              {/* ── Açıklama ── */}
              <FieldWrap label="Açıklama" required error={errors.description}>
                <View>
                  <TextInput
                    style={[S.textArea, errors.description ? S.inputError : {}]}
                    placeholder="Hayvanın karakteri, sağlık durumu, aşı durumu, sahiplenme koşulları... (en az 30 karakter)"
                    placeholderTextColor={C.placeholder}
                    value={description}
                    onChangeText={(t) => { setDescription(t); if (t.trim().length >= 30) setErrors((e) => ({ ...e, description: "" })); }}
                    multiline
                    textAlignVertical="top"
                  />
                  <Text style={[S.charCount, description.length < 30 && S.charCountWarn]}>
                    {description.trim().length} / min 30 karakter
                  </Text>
                </View>
              </FieldWrap>

              <View style={S.divider} />

              {/* ── İletişim başlığı ── */}
              <View style={S.sectionHeader}>
                <Ionicons name="call-outline" size={18} color={C.purple} />
                <Text style={S.sectionTitle}>İletişim Bilgileri</Text>
              </View>

              {/* ── Telefon ── */}
              <FieldWrap label="Telefon Numarası" required error={errors.phone}>
                <View style={[S.phoneWrap, errors.phone ? S.inputError : {}]}>
                  <View style={S.phonePrefix}>
                    <Text style={S.phonePrefixFlag}>🇹🇷</Text>
                    <Text style={S.phonePrefixTxt}>+90</Text>
                    <View style={S.phoneDivider} />
                  </View>
                  <TextInput
                    style={S.phoneInput}
                    placeholder="5XX XXX XX XX"
                    placeholderTextColor={C.placeholder}
                    value={formatPhoneDisplay(phone)}
                    onChangeText={handlePhoneChange}
                    keyboardType="number-pad"
                    maxLength={13}    /* formatted: 3+1+3+1+2+1+2 */
                    returnKeyType="next"
                  />
                  {phone.length === 10 && !validatePhone(phone) && (
                    <Ionicons name="checkmark-circle" size={20} color="#38A169" style={{ marginRight: 12 }} />
                  )}
                </View>
                <Text style={S.phoneHint}>Sadece cep telefonu numarası (10 hane)</Text>
              </FieldWrap>

              {/* ── Email ── */}
              <FieldWrap label="E-Posta Adresi" required error={errors.email}>
                <View style={[S.emailWrap, errors.email ? S.inputError : {}]}>
                  <Ionicons name="mail-outline" size={18} color={C.sub} style={{ marginLeft: 14, marginRight: 8 }} />
                  <TextInput
                    style={S.emailInput}
                    placeholder="ornek@email.com"
                    placeholderTextColor={C.placeholder}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: "" })); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                  {email && !validateEmail(email) && (
                    <Ionicons name="checkmark-circle" size={20} color="#38A169" style={{ marginRight: 12 }} />
                  )}
                </View>
              </FieldWrap>

            </View>
            {/* End card */}

          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── Fixed CTA ── */}
        <View style={[S.ctaWrap, { paddingBottom: btmPad + 12 }]}>
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
                  <Ionicons name="heart" size={20} color="#FFF" />
                  <Text style={S.ctaTxt}>İlanı Yayınla</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {/* ── İl Picker ── */}
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

      {/* ── İlçe Picker ── */}
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

/* ── Styles ─────────────────────────────────────────────── */
const S = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4, gap: 16 },

  /* Header */
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 10, backgroundColor: C.bg,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(123,94,167,0.08)",
  },
  headerTitle: {
    fontSize: 17, fontFamily: "Inter_700Bold", color: C.label,
    letterSpacing: -0.3, flex: 1, textAlign: "center",
  },

  /* Intro */
  intro: { paddingTop: 4, paddingBottom: 4, gap: 4 },
  introTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: C.label, letterSpacing: -0.4 },
  introSub:   { fontSize: 14, fontFamily: "Inter_400Regular", color: C.sub, lineHeight: 20 },

  /* Error banner */
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.errorBg,
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "rgba(229,62,62,0.25)",
  },
  errorBannerTxt: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.error, flex: 1 },

  /* Card */
  card: {
    backgroundColor: C.card, borderRadius: 24, padding: 20, gap: 22,
    ...Platform.select({
      ios:     { shadowColor: "#7B5EA7", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 20 },
      android: { elevation: 4 },
      default: {},
    }),
  },

  divider: { height: 1, backgroundColor: "#F0EDF8", marginHorizontal: -4 },

  /* Section header */
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle:  { fontSize: 15, fontFamily: "Inter_700Bold", color: C.purpleDark },

  /* Field wrapper */
  fieldWrap: { gap: 8 },
  fieldLabel: {
    fontSize: 11, fontFamily: "Inter_700Bold", color: C.label,
    letterSpacing: 0.8, textTransform: "uppercase",
  },

  /* Error */
  errorRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  errorTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.error },

  /* Text input */
  input: {
    height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.inputBg, paddingHorizontal: 16,
    fontSize: 15, fontFamily: "Inter_400Regular", color: C.label,
  },
  inputError: { borderColor: C.error, backgroundColor: C.errorBg },

  /* Textarea */
  textArea: {
    borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.inputBg, padding: 16,
    fontSize: 15, fontFamily: "Inter_400Regular", color: C.label,
    minHeight: 120, lineHeight: 22, textAlignVertical: "top",
  },
  charCount:     { fontSize: 11, fontFamily: "Inter_400Regular", color: C.sub, textAlign: "right", marginTop: 4 },
  charCountWarn: { color: C.error },

  /* Photo */
  photoWrap:      { width: "100%", height: 180, borderRadius: 14, overflow: "hidden" },
  photoWrapError: { borderWidth: 2, borderColor: C.error },
  photo:          { width: "100%", height: "100%" },
  photoEditBadge: {
    position: "absolute", bottom: 10, right: 10,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,0,0,0.52)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  photoEditText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  photoBox: {
    width: "100%", height: 140, borderRadius: 14,
    alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 2, borderColor: "rgba(123,94,167,0.22)", borderStyle: "dashed",
    backgroundColor: "rgba(123,94,167,0.04)",
  },
  photoBoxError: { borderColor: C.error, backgroundColor: C.errorBg },
  cameraRing: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "rgba(123,94,167,0.10)",
    alignItems: "center", justifyContent: "center", marginBottom: 2,
  },
  photoLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.purple },
  photoSub:   { fontSize: 12, fontFamily: "Inter_400Regular", color: C.muted },

  /* Type chips */
  chipRow:  { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip:     { borderRadius: 99, borderWidth: 1.5, borderColor: C.border, overflow: "hidden", backgroundColor: "#FAFAFA" },
  chipActive: {
    borderColor: "transparent",
    ...Platform.select({
      ios:     { shadowColor: C.purple, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 6 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  chipInner:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 9, gap: 5, minHeight: 40 },
  chipEmoji:    { fontSize: 14, lineHeight: 18 },
  chipTxt:      { fontSize: 13, fontFamily: "Inter_500Medium", color: C.muted },
  chipTxtActive:{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFF" },

  /* Age cards */
  ageGrid:          { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ageCard:          {
    paddingVertical: 11, paddingHorizontal: 16, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.inputBg,
    minWidth: "30%",
  },
  ageCardActive:    {
    borderColor: C.purple, backgroundColor: "rgba(123,94,167,0.08)",
    ...Platform.select({
      ios:     { shadowColor: C.purple, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  ageCardError:     { borderColor: "rgba(229,62,62,0.35)" },
  ageCardTxt:       { fontSize: 13, fontFamily: "Inter_500Medium", color: C.muted, textAlign: "center" },
  ageCardTxtActive: { fontFamily: "Inter_700Bold", color: C.purple },

  /* Location select */
  selectRow: {
    height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.inputBg, flexDirection: "row", alignItems: "center", paddingHorizontal: 14,
  },
  selectDisabled: { opacity: 0.5 },
  selectTxt:      { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: C.label },
  selectPlaceholder: { color: C.placeholder },

  /* Phone */
  phoneWrap: {
    flexDirection: "row", alignItems: "center",
    height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.inputBg, overflow: "hidden",
  },
  phonePrefix:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 6 },
  phonePrefixFlag:{ fontSize: 18 },
  phonePrefixTxt: { fontSize: 14, fontFamily: "Inter_700Bold", color: C.label },
  phoneDivider:   { width: 1, height: 24, backgroundColor: C.border, marginLeft: 8 },
  phoneInput:     { flex: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: C.label, height: "100%" },
  phoneHint:      { fontSize: 11, fontFamily: "Inter_400Regular", color: C.sub },

  /* Email */
  emailWrap: {
    flexDirection: "row", alignItems: "center",
    height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.inputBg, overflow: "hidden",
  },
  emailInput: { flex: 1, paddingRight: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: C.label, height: "100%" },

  /* CTA */
  ctaWrap: {
    paddingHorizontal: 20, paddingTop: 12, backgroundColor: C.bg,
    borderTopWidth: 1, borderTopColor: "rgba(123,94,167,0.08)",
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

/* ── Picker Modal styles ─────────────────────────────────── */
const PM = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(123,94,167,0.12)",
  },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", color: C.purpleDark },

  searchWrap: {
    flexDirection: "row", alignItems: "center",
    margin: 12, paddingHorizontal: 14, height: 44,
    borderRadius: 12, backgroundColor: "#F5F2FF",
    borderWidth: 1, borderColor: "rgba(123,94,167,0.12)",
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: C.label },

  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F0EDF8",
  },
  rowActive: { backgroundColor: "rgba(123,94,167,0.05)" },
  rowTxt:       { fontSize: 15, fontFamily: "Inter_400Regular", color: C.label },
  rowTxtActive: { fontFamily: "Inter_700Bold", color: C.purple },
});
