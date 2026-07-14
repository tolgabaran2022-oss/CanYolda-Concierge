import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useAdoption } from "@/contexts/AdoptionContext";
import { apiSendAdoptionRequest } from "@/lib/adoptionRequestsApi";

const P     = "#7C4DCC";
const P2    = "#A480D8";
const DARK  = "#4B267D";
const BODY  = "#6E6290";
const BG    = "#F8F4FF";
const WHITE = "#FFFFFF";
const BORDER = "rgba(124,77,204,0.12)";
const RED    = "#E53E3E";

const IOS_SHADOW = Platform.select({
  ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  android: { elevation: 3 },
  default: {},
});

type OptionBtnProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};
function OptionBtn({ label, selected, onPress }: OptionBtnProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        S.optionBtn,
        selected && S.optionBtnSelected,
        { opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
    >
      {selected && (
        <View style={S.optionCheck}>
          <Icon name="checkmark" size={11} color={WHITE} />
        </View>
      )}
      <Text style={[S.optionTxt, selected && S.optionTxtSelected]}>{label}</Text>
    </Pressable>
  );
}

type FieldGroupProps = {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
};
function FieldGroup({ label, required, error, children }: FieldGroupProps) {
  return (
    <View style={S.fieldGroup}>
      <Text style={S.fieldLabel}>
        {label}
        {required && <Text style={{ color: RED }}> *</Text>}
      </Text>
      {children}
      {error ? <Text style={S.fieldError}>{error}</Text> : null}
    </View>
  );
}

type SuccessViewProps = {
  petName: string;
  onViewRequest: () => void;
  onBack: () => void;
};
function SuccessView({ petName, onViewRequest, onBack }: SuccessViewProps) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 180 }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);
  return (
    <Animated.View style={[S.successWrap, { opacity }]}>
      <Animated.View style={[S.successIllo, { transform: [{ scale }] }]}>
        <LinearGradient colors={[P2, P, DARK]} style={S.successCircle}>
          <Icon name="checkmark" size={44} color={WHITE} />
        </LinearGradient>
      </Animated.View>
      <Text style={S.successTitle}>Talebin gönderildi 🐾</Text>
      <Text style={S.successSub}>
        {petName} için gönderilen talebinizi ilan sahibi inceleyecek ve sizinle iletişime geçebilecek.
      </Text>
      <View style={S.successBtns}>
        <Pressable
          style={({ pressed }) => [S.successPrimary, { opacity: pressed ? 0.85 : 1 }]}
          onPress={onViewRequest}
        >
          <LinearGradient colors={[P2, P, DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.successPrimaryInner}>
            <Icon name="document-text-outline" size={18} color={WHITE} />
            <Text style={S.successPrimaryTxt}>Talebimi Gör</Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          style={({ pressed }) => [S.successSecondary, { opacity: pressed ? 0.75 : 1 }]}
          onPress={onBack}
        >
          <Text style={S.successSecondaryTxt}>Tüm İlanlara Dön</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function AdoptionRequestScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getListing } = useAdoption();

  const listing = getListing(listingId ?? "");
  const topPad = Platform.OS === "web" ? 20 : insets.top + 4;
  const botPad = Platform.OS === "web" ? 24 : insets.bottom + 16;

  /* Form state */
  const [reason,        setReason]        = useState("");
  const [hadPet,        setHadPet]        = useState<boolean | null>(null);
  const [livingSpace,   setLivingSpace]   = useState("");
  const [hasOtherPets,  setHasOtherPets]  = useState<boolean | null>(null);
  const [aloneDuration, setAloneDuration] = useState("");
  const [note,          setNote]          = useState("");

  /* UI state */
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [errors,     setErrors]     = useState<Record<string, string>>({});

  const LIVING_OPTIONS = ["Apartman dairesi", "Müstakil ev", "Bahçeli ev", "Diğer"];
  const ALONE_OPTIONS  = ["Hayır", "1–3 saat", "3–6 saat", "6 saatten fazla"];

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (reason.trim().length < 20) e.reason = "En az 20 karakter giriniz";
    if (reason.trim().length > 500) e.reason = "En fazla 500 karakter";
    if (hadPet === null)       e.hadPet       = "Bu alan zorunlu";
    if (!livingSpace)          e.livingSpace  = "Bu alan zorunlu";
    if (hasOtherPets === null) e.hasOtherPets = "Bu alan zorunlu";
    if (!aloneDuration)        e.aloneDuration = "Bu alan zorunlu";
    if (note.length > 300)     e.note = "En fazla 300 karakter";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSubmitting(true);
    try {
      await apiSendAdoptionRequest({
        listingId:       listingId!,
        userId:          user.id,
        requesterName:   user.name ?? user.email ?? "",
        requesterAvatar: user.avatar ?? "",
        reason:          reason.trim(),
        hadPetBefore:    hadPet!,
        livingSpace,
        hasOtherPets:    hasOtherPets!,
        aloneDuration,
        note:            note.trim(),
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Talep gönderilemedi";
      setErrors({ submit: msg });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!listing) {
    return (
      <View style={[S.root, { paddingTop: topPad, alignItems: "center", justifyContent: "center" }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={S.fieldLabel}>İlan bulunamadı</Text>
        <Pressable style={S.backBtn} onPress={() => router.back()}>
          <Text style={{ color: P, fontFamily: "Inter_600SemiBold" }}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  if (success) {
    return (
      <View style={[S.root, { paddingTop: topPad }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <SuccessView
          petName={listing.petName}
          onViewRequest={() => router.replace("/(tabs)/pets" as any)}
          onBack={() => router.replace("/(tabs)/pets" as any)}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={S.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={topPad}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[S.header, { paddingTop: topPad }]}>
        <Pressable style={S.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Icon name="chevron-back" size={22} color={DARK} />
        </Pressable>
        <Text style={S.headerTitle}>Sahiplendirme Talebi</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[S.scroll, { paddingBottom: botPad + 80 }]}
        keyboardDismissMode="on-drag"
      >
        {/* Listing summary card */}
        <View style={S.listingCard}>
          {listing.photo ? (
            <Image source={{ uri: listing.photo }} style={S.listingPhoto} contentFit="cover" />
          ) : (
            <LinearGradient colors={[`${P2}60`, `${P}40`]} style={S.listingPhoto}>
              <Icon name="paw" size={24} color={`${WHITE}80`} />
            </LinearGradient>
          )}
          <View style={S.listingInfo}>
            <Text style={S.listingName}>{listing.petName}</Text>
            {listing.breed ? (
              <Text style={S.listingBreed}>{listing.breed}</Text>
            ) : null}
            {listing.petAge ? (
              <Text style={S.listingAge}>{listing.petAge}</Text>
            ) : null}
            <View style={S.listingLocRow}>
              <Icon name="location-outline" size={12} color={BODY} />
              <Text style={S.listingLoc}>{listing.location}</Text>
            </View>
          </View>
          <View style={S.listingBadge}>
            <Icon name="paw" size={11} color={P} />
            <Text style={S.listingBadgeTxt}>{listing.petType}</Text>
          </View>
        </View>

        <View style={S.divider} />

        {/* Field 1 — reason */}
        <FieldGroup label="Neden sahiplenmek istiyorsun?" required error={errors.reason}>
          <View style={[S.textareaWrap, errors.reason ? S.inputError : null]}>
            <TextInput
              style={S.textarea}
              placeholder="Lütfen en az 20 karakter yazınız..."
              placeholderTextColor={`${BODY}80`}
              multiline
              numberOfLines={4}
              value={reason}
              onChangeText={setReason}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={S.charCount}>{reason.length}/500</Text>
          </View>
        </FieldGroup>

        {/* Field 2 — had pet before */}
        <FieldGroup label="Daha önce evcil hayvan baktın mı?" required error={errors.hadPet}>
          <View style={S.optionRow}>
            <OptionBtn label="Evet" selected={hadPet === true}  onPress={() => setHadPet(true)} />
            <OptionBtn label="Hayır" selected={hadPet === false} onPress={() => setHadPet(false)} />
          </View>
        </FieldGroup>

        {/* Field 3 — living space */}
        <FieldGroup label="Yaşam alanın" required error={errors.livingSpace}>
          <View style={S.optionGrid}>
            {LIVING_OPTIONS.map((opt) => (
              <OptionBtn key={opt} label={opt} selected={livingSpace === opt} onPress={() => setLivingSpace(opt)} />
            ))}
          </View>
        </FieldGroup>

        {/* Field 4 — other pets */}
        <FieldGroup label="Evde başka hayvan var mı?" required error={errors.hasOtherPets}>
          <View style={S.optionRow}>
            <OptionBtn label="Evet"  selected={hasOtherPets === true}  onPress={() => setHasOtherPets(true)} />
            <OptionBtn label="Hayır" selected={hasOtherPets === false} onPress={() => setHasOtherPets(false)} />
          </View>
        </FieldGroup>

        {/* Field 5 — alone duration */}
        <FieldGroup label="Gün içinde hayvan yalnız kalacak mı?" required error={errors.aloneDuration}>
          <View style={S.optionGrid}>
            {ALONE_OPTIONS.map((opt) => (
              <OptionBtn key={opt} label={opt} selected={aloneDuration === opt} onPress={() => setAloneDuration(opt)} />
            ))}
          </View>
        </FieldGroup>

        {/* Field 6 — note (optional) */}
        <FieldGroup label="İlan sahibine not" error={errors.note}>
          <View style={[S.textareaWrap, errors.note ? S.inputError : null]}>
            <TextInput
              style={[S.textarea, { minHeight: 80 }]}
              placeholder="İsteğe bağlı ek bir not ekleyebilirsin..."
              placeholderTextColor={`${BODY}80`}
              multiline
              numberOfLines={3}
              value={note}
              onChangeText={setNote}
              maxLength={300}
              textAlignVertical="top"
            />
            <Text style={S.charCount}>{note.length}/300</Text>
          </View>
        </FieldGroup>

        {errors.submit ? (
          <View style={S.submitErrorWrap}>
            <Icon name="alert-circle" size={16} color={RED} />
            <Text style={S.submitErrorTxt}>{errors.submit}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky bottom buttons */}
      <View style={[S.stickyBottom, { paddingBottom: botPad }]}>
        <Pressable
          style={({ pressed }) => [S.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
        >
          <Text style={S.cancelBtnTxt}>Vazgeç</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [S.submitBtnOuter, { opacity: pressed || submitting ? 0.85 : 1, flex: 1 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <LinearGradient colors={[P2, P, DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.submitBtn}>
            {submitting ? (
              <ActivityIndicator color={WHITE} size="small" />
            ) : (
              <>
                <Icon name="send" size={17} color={WHITE} />
                <Text style={S.submitBtnTxt}>Talebi Gönder</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  root:  { flex: 1, backgroundColor: BG },
  scroll:{ paddingHorizontal: 18, paddingTop: 8, gap: 20 },

  header:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: `${P}10`, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: DARK, textAlign: "center", letterSpacing: -0.2 },

  // Listing summary
  listingCard:   { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: WHITE, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 14, ...IOS_SHADOW },
  listingPhoto:  { width: 70, height: 70, borderRadius: 16, overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  listingInfo:   { flex: 1, gap: 2 },
  listingName:   { fontSize: 16, fontFamily: "Inter_700Bold", color: DARK },
  listingBreed:  { fontSize: 12, fontFamily: "Inter_500Medium", color: P },
  listingAge:    { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY },
  listingLocRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  listingLoc:    { fontSize: 11, fontFamily: "Inter_400Regular", color: BODY },
  listingBadge:  { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${P}14`, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, alignSelf: "flex-start" },
  listingBadgeTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: P },

  divider: { height: 1, backgroundColor: BORDER },

  // Field groups
  fieldGroup: { gap: 10 },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: DARK },
  fieldError: { fontSize: 12, fontFamily: "Inter_400Regular", color: RED, marginTop: -4 },

  // Textarea
  textareaWrap: { backgroundColor: WHITE, borderRadius: 16, borderWidth: 1.5, borderColor: BORDER, padding: 14 },
  textarea:     { fontSize: 14, fontFamily: "Inter_400Regular", color: DARK, minHeight: 110, lineHeight: 22 },
  charCount:    { fontSize: 11, fontFamily: "Inter_400Regular", color: `${BODY}80`, textAlign: "right", marginTop: 4 },
  inputError:   { borderColor: `${RED}60` },

  // Options
  optionRow:  { flexDirection: "row", gap: 10 },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  optionBtn:  {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: WHITE, borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER,
    ...IOS_SHADOW,
  },
  optionBtnSelected: { borderColor: P, backgroundColor: `${P}10` },
  optionCheck:       { width: 18, height: 18, borderRadius: 9, backgroundColor: P, alignItems: "center", justifyContent: "center" },
  optionTxt:         { fontSize: 13, fontFamily: "Inter_500Medium", color: BODY },
  optionTxtSelected: { color: P, fontFamily: "Inter_700Bold" },

  // Submit error
  submitErrorWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF0F0", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#FFD5D5" },
  submitErrorTxt:  { fontSize: 13, fontFamily: "Inter_500Medium", color: RED, flex: 1 },

  // Sticky bottom
  stickyBottom:  {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 18, paddingTop: 14,
    backgroundColor: BG,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  cancelBtn:      { paddingHorizontal: 18, paddingVertical: 17, borderRadius: 16, borderWidth: 1.5, borderColor: BORDER, backgroundColor: WHITE },
  cancelBtnTxt:   { fontSize: 14, fontFamily: "Inter_600SemiBold", color: BODY },
  submitBtnOuter: { borderRadius: 16, overflow: "hidden" },
  submitBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 54, borderRadius: 16 },
  submitBtnTxt:   { fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE },

  // Success
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 20 },
  successIllo: { marginBottom: 8 },
  successCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: DARK, textAlign: "center", letterSpacing: -0.5 },
  successSub:   { fontSize: 15, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center", lineHeight: 24 },
  successBtns:  { width: "100%", gap: 12, marginTop: 8 },
  successPrimary:      { borderRadius: 18, overflow: "hidden" },
  successPrimaryInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 56, borderRadius: 18 },
  successPrimaryTxt:   { fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE },
  successSecondary:    { alignItems: "center", paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderColor: BORDER, backgroundColor: WHITE },
  successSecondaryTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: BODY },
});
