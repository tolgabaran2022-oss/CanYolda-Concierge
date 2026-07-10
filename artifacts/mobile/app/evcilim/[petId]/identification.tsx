import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { usePets } from "@/contexts/PetsContext";
import { apiGetIdentification, apiUpsertIdentification, type ApiIdentification } from "@/lib/petManagementApi";

const P     = "#7B5EA7";
const P2    = "#9E78CC";
const DARK  = "#191330";
const BODY  = "#8F8A9D";
const BG    = "#F6F1FF";
const WHITE = "#FFFFFF";
const BORDER= "#EEE8F5";

function Field({ label, icon, value, onChangeText, placeholder, keyboardType }: {
  label: string; icon: keyof typeof Ionicons.glyphMap; value: string;
  onChangeText: (v: string) => void; placeholder?: string; keyboardType?: "default" | "phone-pad";
}) {
  return (
    <View style={fi.wrap}>
      <View style={fi.labelRow}>
        <Ionicons name={icon} size={14} color={P} />
        <Text style={fi.label}>{label}</Text>
      </View>
      <TextInput
        style={fi.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? ""}
        placeholderTextColor={BODY}
        keyboardType={keyboardType ?? "default"}
      />
    </View>
  );
}
const fi = StyleSheet.create({
  wrap:     { gap: 5 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  label:    { fontSize: 12, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: 0.2 },
  input:    { backgroundColor: BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: DARK, borderWidth: 1.5, borderColor: `${P}22` },
});

function SectionTitle({ title, icon }: { title: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: `${P}18`, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={14} color={P} />
      </View>
      <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: P }}>{title}</Text>
    </View>
  );
}

export default function IdentificationScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { user } = useAuth();
  const { getPet } = usePets();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pet = getPet(petId ?? "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [microchipNumber, setMicrochip]         = useState("");
  const [passportNumber, setPassport]           = useState("");
  const [healthBookNumber, setHealthBook]       = useState("");
  const [registrationNumber, setRegistration]   = useState("");
  const [insuranceInfo, setInsurance]           = useState("");
  const [veterinarianName, setVetName]          = useState("");
  const [veterinarianPhone, setVetPhone]        = useState("");
  const [emergencyContactName, setEmerName]     = useState("");
  const [emergencyContactPhone, setEmerPhone]   = useState("");

  const load = useCallback(async () => {
    if (!petId || !user) return;
    setLoading(true);
    try {
      const data = await apiGetIdentification(petId, user.id);
      if (data) {
        setMicrochip(data.microchipNumber);
        setPassport(data.passportNumber);
        setHealthBook(data.healthBookNumber);
        setRegistration(data.registrationNumber);
        setInsurance(data.insuranceInfo);
        setVetName(data.veterinarianName);
        setVetPhone(data.veterinarianPhone);
        setEmerName(data.emergencyContactName);
        setEmerPhone(data.emergencyContactPhone);
      }
    } finally { setLoading(false); }
  }, [petId, user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!petId || !user) return;
    setSaving(true);
    try {
      await apiUpsertIdentification(petId, user.id, {
        microchipNumber, passportNumber, healthBookNumber, registrationNumber,
        insuranceInfo, veterinarianName, veterinarianPhone, emergencyContactName, emergencyContactPhone,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Kaydedildi", "Kimlik bilgileri güncellendi.");
    } catch {
      Alert.alert("Hata", "Kaydedilemedi.");
    } finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[st.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={st.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={DARK} />
        </Pressable>
        <View>
          <Text style={st.headerTitle}>Kimlik Bilgileri</Text>
          {pet ? <Text style={st.headerSub}>{pet.name}</Text> : null}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={P} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[st.form, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
          <SectionTitle title="Kimlik Numaraları" icon="barcode-outline" />
          <Field label="Mikroçip No" icon="radio-button-on-outline" value={microchipNumber} onChangeText={setMicrochip} placeholder="985141000000000" />
          <Field label="Pasaport No" icon="document-text-outline" value={passportNumber} onChangeText={setPassport} placeholder="TR123456789" />
          <Field label="Sağlık Karnesi No" icon="clipboard-outline" value={healthBookNumber} onChangeText={setHealthBook} placeholder="SK-2024-001234" />
          <Field label="Kayıt No (Belediye)" icon="business-outline" value={registrationNumber} onChangeText={setRegistration} placeholder="34-12345" />
          <Field label="Sigorta Bilgisi" icon="shield-outline" value={insuranceInfo} onChangeText={setInsurance} placeholder="Allianz Pet Plus - TR12345" />

          <SectionTitle title="Veteriner Bilgileri" icon="medkit-outline" />
          <Field label="Veteriner Adı" icon="person-outline" value={veterinarianName} onChangeText={setVetName} placeholder="Dr. Ayşe Kaya" />
          <Field label="Veteriner Telefon" icon="call-outline" value={veterinarianPhone} onChangeText={setVetPhone} placeholder="+90 212 555 0000" keyboardType="phone-pad" />

          <SectionTitle title="Acil Durum İletişim" icon="warning-outline" />
          <Field label="Ad Soyad" icon="person-add-outline" value={emergencyContactName} onChangeText={setEmerName} placeholder="Mehmet Yılmaz" />
          <Field label="Telefon" icon="call-outline" value={emergencyContactPhone} onChangeText={setEmerPhone} placeholder="+90 532 000 0000" keyboardType="phone-pad" />

          <Pressable
            style={({ pressed }) => [st.saveBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <LinearGradient colors={[P2, P]} style={st.saveGrad}>
              <Ionicons name={saving ? "hourglass-outline" : "checkmark-circle-outline"} size={20} color={WHITE} />
              <Text style={st.saveTxt}>{saving ? "Kaydediliyor..." : "Bilgileri Kaydet"}</Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: WHITE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: DARK },
  headerSub:   { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY },
  form:        { paddingHorizontal: 20, paddingTop: 8, gap: 14 },
  saveBtn:     { borderRadius: 16, overflow: "hidden", marginTop: 16 },
  saveGrad:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  saveTxt:     { fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE },
});
