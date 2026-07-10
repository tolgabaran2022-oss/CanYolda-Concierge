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
import { useTheme } from "@/hooks/useTheme";
import { TURKEY_PROVINCES, type Province } from "@/constants/turkeyLocations";
import { apiSaveListingContact } from "@/lib/contactApi";

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
          <Ionicons name="alert-circle" size={13} color={C.error} />
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
            <Ionicons name="close" size={24} color={T.purple} />
          </Pressable>
        </View>

        {searchable && (
          <View style={[PM.searchWrap, { backgroundColor: T.input, borderColor: T.border }]}>
            <Ionicons name="search-outline" size={18} color={T.textMuted} style={{ marginRight: 8 }} />
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
                {active && <Ionicons name="checkmark" size={18} color={C.purple} />}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

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
  const [photo,             setPhoto]             = useState<string | undefined>();
  const [province,          setProvince]          = useState("");
  const [district,          setDistrict]          = useState("");
  const [description,       setDescription]       = useState("");
  const [phone,             setPhone]             = useState("");
  const [email,             setEmail]             = useState("");
  const [allowPhoneContact, setAllowPhoneContact] = useState(true);
  const [allowMessages,     setAllowMessages]     = useState(true);
  const [isSaving,          setIsSaving]          = useState(false);
  const [errors,            setErrors]            = useState<Record<string, string>>({});

  const [showProvince, setShowProvince] = useState(false);
  const [showDistrict, setShowDistrict] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const topPad    = Platform.OS === "web" ? 16 : insets.top;
  const btmPad    = Platform.OS === "web" ? 34 : insets.bottom;

  const selectedProvince: Province | undefined = TURKEY_PROVINCES.find((p) => p.value === province);
  const districts = selectedProvince?.districts ?? [];

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

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
    if (errors.phone) setErrors((e) => ({ ...e, phone: "" }));
  };

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

  const handleSave = async () => {
    if (!validate() || !user) return;
    setIsSaving(true);
    try {
      const newId = await addListing({
        petName:          petName.trim(),
        petType,
        petAge,
        photo,
        location:         `${district}, ${province}`,
        description:      description.trim(),
        userId:           user.id,
        userName:         user.name,
        contactInfo:      `📞 +90 ${formatPhoneDisplay(phone)} | ✉️ ${email.trim()}`,
        allowPhoneContact,
        allowMessages,
      });
      apiSaveListingContact(user.id, newId, `+90${phone}`, allowPhoneContact, allowMessages).catch(() => {});
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
            <Ionicons name="chevron-back" size={22} color={T.purple} />
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
                <Ionicons name="alert-circle" size={18} color={C.error} />
                <Text style={S.errorBannerTxt}>
                  {errorCount} alan eksik veya hatalı. Lütfen kontrol edin.
                </Text>
              </View>
            )}

            {/* Form card */}
            <View style={[S.card, { backgroundColor: T.card }]}>

              {/* Photo */}
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
                    <View style={[
                      S.photoBox,
                      { backgroundColor: T.input, borderColor: T.border },
                      errors.photo ? S.photoBoxError : {},
                    ]}>
                      <View style={[S.cameraRing, { backgroundColor: T.purple + "18" }]}>
                        <Ionicons name="camera-outline" size={28} color={C.purple} />
                      </View>
                      <Text style={[S.photoLabel, { color: C.purple }]}>Fotoğraf Ekle</Text>
                      <Text style={[S.photoSub, { color: T.textMuted }]}>JPG, PNG · Maks 10 MB</Text>
                    </View>
                  )}
                </Pressable>
              </FieldWrap>

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
                            <Text style={S.chipEmoji}>{emoji}</Text>
                            <Text style={S.chipTxtActive}>{label}</Text>
                          </LinearGradient>
                        ) : (
                          <View style={S.chipInner}>
                            <Text style={S.chipEmoji}>{emoji}</Text>
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
                    <Ionicons
                      name="location-outline" size={18}
                      color={province ? C.purple : T.placeholder}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[S.selectTxt, { color: province ? T.text : T.placeholder }]}>
                      {province || "İl seçin"}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={T.textMuted} />
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
                    <Ionicons
                      name="navigate-outline" size={18}
                      color={district ? C.purple : T.placeholder}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[S.selectTxt, { color: district ? T.text : T.placeholder }]}>
                      {district || (province ? "İlçe seçin" : "Önce il seçin")}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={T.textMuted} />
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

              {/* İletişim başlığı */}
              <View style={S.sectionHeader}>
                <Ionicons name="call-outline" size={18} color={C.purple} />
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
                    <Text style={S.phonePrefixFlag}>🇹🇷</Text>
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
                    <Ionicons name="checkmark-circle" size={20} color="#38A169" style={{ marginRight: 12 }} />
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
                  <Ionicons name="mail-outline" size={18} color={T.textMuted} style={{ marginLeft: 14, marginRight: 8 }} />
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
                    <Ionicons name="checkmark-circle" size={20} color="#38A169" style={{ marginRight: 12 }} />
                  )}
                </View>
              </FieldWrap>

              <View style={[S.divider, { backgroundColor: T.border }]} />

              {/* İletişim Tercihleri */}
              <View>
                <View style={S.sectionHeader}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={C.purpleDark} />
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
                      <Ionicons name="call-outline" size={18} color={allowPhoneContact ? "#FFF" : T.textMuted} />
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
                      <Ionicons name="chatbubble-outline" size={18} color={allowMessages ? "#FFF" : T.textMuted} />
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
                  <Ionicons name="heart" size={20} color="#FFF" />
                  <Text style={S.ctaTxt}>İlanı Yayınla</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>

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
    borderWidth: 2, borderStyle: "dashed",
  },
  photoBoxError: { borderColor: C.error, backgroundColor: C.errorBg },
  cameraRing: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center", marginBottom: 2,
  },
  photoLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  photoSub:   { fontSize: 12, fontFamily: "Inter_400Regular" },

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
