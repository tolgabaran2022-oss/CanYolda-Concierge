import { Icon } from "@/components/Icon";
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
import { apiGetNutrition, apiUpsertNutrition, type ApiNutrition } from "@/lib/petManagementApi";

const P     = "#7B5EA7";
const P2    = "#9E78CC";
const DARK  = "#191330";
const BODY  = "#8F8A9D";
const BG    = "#F6F1FF";
const WHITE = "#FFFFFF";
const BORDER= "#EEE8F5";
const GREEN = "#34C759";
const ORANGE= "#FF9500";
const RED   = "#FF3B30";

const FOOD_TYPES = ["kuru", "yaş", "karışık", "ev yemeği", "diğer"] as const;

function Field({ label, value, onChangeText, placeholder, keyboardType }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; keyboardType?: "default" | "decimal-pad" | "number-pad";
}) {
  return (
    <View style={fi.wrap}>
      <Text style={fi.label}>{label}</Text>
      <TextInput style={fi.input} value={value} onChangeText={onChangeText} placeholder={placeholder ?? ""} placeholderTextColor={BODY} keyboardType={keyboardType ?? "default"} />
    </View>
  );
}
const fi = StyleSheet.create({
  wrap:  { gap: 5 },
  label: { fontSize: 12, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: 0.2 },
  input: { backgroundColor: BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: DARK, borderWidth: 1.5, borderColor: `${P}22` },
});

/* ── Progress Bar ────────────────────────────────────── */
function ProgressBar({ current, total, color }: { current: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <View style={pb.wrap}>
      <View style={pb.track}>
        <View style={[pb.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[pb.label, { color }]}>{pct}%</Text>
    </View>
  );
}
const pb = StyleSheet.create({
  wrap:  { flexDirection: "row", alignItems: "center", gap: 10 },
  track: { flex: 1, height: 10, backgroundColor: `${BODY}20`, borderRadius: 5, overflow: "hidden" },
  fill:  { height: 10, borderRadius: 5 },
  label: { fontSize: 13, fontFamily: "Inter_700Bold", width: 36, textAlign: "right" },
});

export default function NutritionScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { user } = useAuth();
  const { getPet } = usePets();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pet = getPet(petId ?? "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [foodBrand, setFoodBrand]                   = useState("");
  const [foodName, setFoodName]                     = useState("");
  const [foodType, setFoodType]                     = useState<string>("kuru");
  const [dailyAmountGrams, setDailyAmount]          = useState("");
  const [mealsPerDay, setMealsPerDay]               = useState("2");
  const [mealTimes, setMealTimes]                   = useState("");
  const [packageAmountGrams, setPackageAmount]      = useState("");
  const [remainingAmountGrams, setRemainingAmount]  = useState("");
  const [openedAt, setOpenedAt]                     = useState("");
  const [allergies, setAllergies]                   = useState("");
  const [veterinarianNotes, setVetNotes]            = useState("");

  const load = useCallback(async () => {
    if (!petId || !user) return;
    setLoading(true);
    try {
      const data = await apiGetNutrition(petId, user.id);
      if (data) {
        setFoodBrand(data.foodBrand); setFoodName(data.foodName); setFoodType(data.foodType);
        setDailyAmount(String(data.dailyAmountGrams || "")); setMealsPerDay(String(data.mealsPerDay || "2"));
        setMealTimes(data.mealTimes); setPackageAmount(String(data.packageAmountGrams || ""));
        setRemainingAmount(String(data.remainingAmountGrams || "")); setOpenedAt(data.openedAt);
        setAllergies(data.allergies); setVetNotes(data.veterinarianNotes);
      }
    } finally { setLoading(false); }
  }, [petId, user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!petId || !user) return;
    setSaving(true);
    try {
      await apiUpsertNutrition(petId, user.id, {
        foodBrand, foodName, foodType,
        dailyAmountGrams: parseInt(dailyAmountGrams) || 0,
        mealsPerDay: parseInt(mealsPerDay) || 2,
        mealTimes,
        packageAmountGrams: parseInt(packageAmountGrams) || 0,
        remainingAmountGrams: parseInt(remainingAmountGrams) || 0,
        openedAt, allergies, veterinarianNotes,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Kaydedildi", "Beslenme bilgileri güncellendi.");
    } catch { Alert.alert("Hata", "Kaydedilemedi."); }
    finally { setSaving(false); }
  };

  const remGrams = parseInt(remainingAmountGrams) || 0;
  const pkgGrams = parseInt(packageAmountGrams) || 0;
  const dayGrams = parseInt(dailyAmountGrams) || 0;
  const daysLeft = dayGrams > 0 && remGrams > 0 ? Math.floor(remGrams / dayGrams) : null;
  const stockColor = daysLeft === null ? BODY : daysLeft <= 3 ? RED : daysLeft <= 10 ? ORANGE : GREEN;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[st.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={st.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Icon name="chevron-back" size={22} color={DARK} />
        </Pressable>
        <View>
          <Text style={st.headerTitle}>Beslenme</Text>
          {pet ? <Text style={st.headerSub}>{pet.name}</Text> : null}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={P} size="large" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[st.form, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
          {/* Stock status card */}
          {pkgGrams > 0 && (
            <View style={st.stockCard}>
              <View style={st.stockTop}>
                <View style={[st.stockIcon, { backgroundColor: `${stockColor}18` }]}>
                  <Icon name="bag-handle-outline" size={22} color={stockColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.stockTitle}>Stok Durumu</Text>
                  <Text style={[st.stockSub, { color: stockColor }]}>
                    {daysLeft === null ? "Hesaplanamadı" : daysLeft <= 0 ? "Mama bitti!" : `${daysLeft} gün kaldı`}
                  </Text>
                </View>
                <Text style={[st.stockGrams, { color: stockColor }]}>{remGrams}g</Text>
              </View>
              <ProgressBar current={remGrams} total={pkgGrams} color={stockColor} />
            </View>
          )}

          {/* Food info */}
          <Text style={st.sectionTitle}>Mama Bilgisi</Text>
          <Field label="Mama Markası" value={foodBrand} onChangeText={setFoodBrand} placeholder="Örn. Royal Canin" />
          <Field label="Mama Adı" value={foodName} onChangeText={setFoodName} placeholder="Örn. Indoor Adult" />

          {/* Food type */}
          <View style={{ gap: 6 }}>
            <Text style={fi.label}>Mama Türü</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {FOOD_TYPES.map((t) => (
                  <Pressable key={t} style={[st.typePill, foodType === t && st.typePillActive]} onPress={() => setFoodType(t)}>
                    <Text style={[st.typeTxt, foodType === t && { color: P, fontFamily: "Inter_700Bold" }]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          <Text style={st.sectionTitle}>Porsiyon</Text>
          <Field label="Günlük Miktar (gram)" value={dailyAmountGrams} onChangeText={setDailyAmount} placeholder="200" keyboardType="number-pad" />
          <Field label="Günlük Öğün Sayısı" value={mealsPerDay} onChangeText={setMealsPerDay} placeholder="2" keyboardType="number-pad" />
          <Field label="Öğün Saatleri" value={mealTimes} onChangeText={setMealTimes} placeholder="08:00, 18:00" />

          <Text style={st.sectionTitle}>Stok Takibi</Text>
          <Field label="Paket Ağırlığı (gram)" value={packageAmountGrams} onChangeText={setPackageAmount} placeholder="2000" keyboardType="number-pad" />
          <Field label="Kalan Miktar (gram)" value={remainingAmountGrams} onChangeText={setRemainingAmount} placeholder="1500" keyboardType="number-pad" />
          <Field label="Açılış Tarihi" value={openedAt} onChangeText={setOpenedAt} placeholder="YYYY-AA-GG" />

          <Text style={st.sectionTitle}>Sağlık Notları</Text>
          <Field label="Alerji / İntolerans" value={allergies} onChangeText={setAllergies} placeholder="Örn. Tahıl intoleransı, tavuk alerjisi" />
          <Field label="Veteriner Önerisi" value={veterinarianNotes} onChangeText={setVetNotes} placeholder="Veteriner önerileri..." />

          <Pressable
            style={({ pressed }) => [st.saveBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <LinearGradient colors={[P2, P]} style={st.saveGrad}>
              <Icon name={saving ? "hourglass-outline" : "checkmark-circle-outline"} size={20} color={WHITE} />
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
  sectionTitle:{ fontSize: 14, fontFamily: "Inter_700Bold", color: P, marginTop: 8, marginBottom: -4 },
  stockCard:   { backgroundColor: WHITE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER, gap: 12, ...Platform.select({ ios: { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 }, android: { elevation: 2 } }) },
  stockTop:    { flexDirection: "row", alignItems: "center", gap: 12 },
  stockIcon:   { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  stockTitle:  { fontSize: 14, fontFamily: "Inter_600SemiBold", color: DARK },
  stockSub:    { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  stockGrams:  { fontSize: 16, fontFamily: "Inter_700Bold" },
  typePill:    { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50, backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER },
  typePillActive: { borderColor: P, backgroundColor: `${P}10` },
  typeTxt:     { fontSize: 13, fontFamily: "Inter_500Medium", color: BODY },
  saveBtn:     { borderRadius: 16, overflow: "hidden", marginTop: 16 },
  saveGrad:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  saveTxt:     { fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE },
});
