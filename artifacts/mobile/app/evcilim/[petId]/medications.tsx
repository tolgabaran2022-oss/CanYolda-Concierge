import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Pressable, RefreshControl, ScrollView, StyleSheet, Text,
  TextInput, View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import {
  apiGetMedications, apiCreateMedication, apiUpdateMedication,
  apiDeleteMedication, type ApiMedication,
} from "@/lib/petManagementApi";
import { usePetPremium } from "@/contexts/PetPremiumContext";

const SHADOW = {
  shadowColor: "#7B5EA7", shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
};

const RECURRENCE = ["daily","weekly","monthly","as_needed"] as const;
const RECURRENCE_LABELS: Record<string, string> = {
  daily: "Her Gün", weekly: "Haftalık", monthly: "Aylık", as_needed: "Gerektiğinde",
};

type FormState = {
  name: string; dosage: string; instructions: string;
  startDate: string; endDate: string; recurrenceRule: string;
  reminderEnabled: boolean;
};

const EMPTY_FORM: FormState = {
  name: "", dosage: "", instructions: "",
  startDate: "", endDate: "", recurrenceRule: "daily",
  reminderEnabled: true,
};

export default function MedicationsScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const C = useColors();
  const router = useRouter();
  const { isPremium } = usePetPremium();

  const [medications, setMedications] = useState<ApiMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!petId) return;
    try { setMedications(await apiGetMedications(petId)); }
    catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [petId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    if (!isPremium) { router.push("/evcilim-premium"); return; }
    setEditingId(null); setForm(EMPTY_FORM); setShowForm(true);
  };

  const openEdit = (m: ApiMedication) => {
    setEditingId(m.id);
    setForm({
      name: m.name, dosage: m.dosage, instructions: m.instructions,
      startDate: m.startDate, endDate: m.endDate,
      recurrenceRule: m.recurrenceRule || "daily",
      reminderEnabled: m.reminderEnabled,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!petId || !form.name.trim()) {
      Alert.alert("Uyarı", "İlaç adı zorunludur."); return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const updated = await apiUpdateMedication(petId, editingId, form);
        setMedications(prev => prev.map(m => m.id === editingId ? updated : m));
      } else {
        const created = await apiCreateMedication(petId, { ...form, isActive: true, scheduleTimes: [] });
        setMedications(prev => [created, ...prev]);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowForm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "premium_required") { router.push("/evcilim-premium"); return; }
      Alert.alert("Hata", "İlaç kaydedilemedi.");
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (m: ApiMedication) => {
    if (!petId) return;
    try {
      const updated = await apiUpdateMedication(petId, m.id, { isActive: !m.isActive });
      setMedications(prev => prev.map(x => x.id === m.id ? updated : x));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { Alert.alert("Hata", "Durum güncellenemedi."); }
  };

  const handleDelete = (m: ApiMedication) => {
    Alert.alert(
      "İlaç Sil", `"${m.name}" ilaç kaydı silinsin mi?`,
      [
        { text: "İptal", style: "cancel" },
        { text: "Sil", style: "destructive", onPress: async () => {
          if (!petId) return;
          setDeletingId(m.id);
          try {
            await apiDeleteMedication(petId, m.id);
            setMedications(prev => prev.filter(x => x.id !== m.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch { Alert.alert("Hata", "İlaç silinemedi."); }
          finally { setDeletingId(null); }
        }},
      ]
    );
  };

  const S = makeStyles(C);

  if (loading) {
    return (
      <SafeAreaView style={S.flex} edges={["bottom"]}>
        <Stack.Screen options={{ title: "İlaçlar", headerBackTitle: "Geri" }} />
        <View style={S.center}><ActivityIndicator color={C.purple} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!isPremium && medications.length === 0) {
    return (
      <SafeAreaView style={S.flex} edges={["bottom"]}>
        <Stack.Screen options={{ title: "İlaçlar", headerBackTitle: "Geri" }} />
        <View style={S.center}>
          <View style={S.lockIcon}><Icon name="lock-closed-outline" size={36} color={C.purple} /></View>
          <Text style={S.lockTitle}>Premium Özellik</Text>
          <Text style={S.lockSub}>İlaç takibi Evcilim Premium üyelerine özeldir.</Text>
          <Pressable style={S.premiumBtn} onPress={() => router.push("/evcilim-premium")}>
            <Text style={S.premiumBtnTxt}>Premium'a Geç</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.flex} edges={["bottom"]}>
      <Stack.Screen options={{ title: "İlaçlar", headerBackTitle: "Geri",
        headerRight: () => (
          <Pressable hitSlop={12} onPress={openAdd} style={S.addBtn}>
            <Icon name="add-outline" size={22} color={C.purple} />
          </Pressable>
        ),
      }} />

      {!isPremium && medications.length > 0 && (
        <Pressable style={S.premiumBanner} onPress={() => router.push("/evcilim-premium")}>
          <Icon name="diamond-outline" size={16} color={C.purple} />
          <Text style={S.premiumBannerTxt}>Yeni ilaç eklemek için Premium'a geç.</Text>
          <Icon name="chevron-forward-outline" size={14} color={C.purple} />
        </Pressable>
      )}

      <ScrollView
        contentContainerStyle={S.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.purple} />}
      >
        {medications.length === 0 && (
          <View style={S.empty}>
            <Icon name="medical-outline" size={42} color={C.purple} />
            <Text style={S.emptyTitle}>İlaç kaydı yok</Text>
            <Text style={S.emptySub}>Evcil hayvanınızın ilaçlarını buradan takip edin.</Text>
            <Pressable style={S.premiumBtn} onPress={openAdd}>
              <Text style={S.premiumBtnTxt}>İlaç Ekle</Text>
            </Pressable>
          </View>
        )}

        {medications.map((m) => (
          <Pressable key={m.id} style={S.card} onPress={() => openEdit(m)}>
            <View style={[S.cardIcon, { backgroundColor: m.isActive ? `${C.purple}14` : `${C.textMuted}14` }]}>
              <Icon name="medical-outline" size={22} color={m.isActive ? C.purple : C.textMuted} />
            </View>
            <View style={S.cardBody}>
              <View style={S.cardRow}>
                <Text style={[S.cardName, !m.isActive && S.inactive]}>{m.name}</Text>
                <View style={[S.badge, { backgroundColor: m.isActive ? `${"#43B96C"}18` : `${C.textMuted}18` }]}>
                  <Text style={[S.badgeTxt, { color: m.isActive ? "#43B96C" : C.textMuted }]}>
                    {m.isActive ? "Aktif" : "Pasif"}
                  </Text>
                </View>
              </View>
              {!!m.dosage && <Text style={S.cardSub}>Doz: {m.dosage}</Text>}
              {!!m.recurrenceRule && (
                <Text style={S.cardMeta}>{RECURRENCE_LABELS[m.recurrenceRule] ?? m.recurrenceRule}</Text>
              )}
              {!!m.startDate && (
                <Text style={S.cardMeta}>{m.startDate}{m.endDate ? ` → ${m.endDate}` : ""}</Text>
              )}
            </View>
            <View style={S.cardActions}>
              <Pressable
                hitSlop={10}
                onPress={() => handleToggleActive(m)}
                style={S.actionBtn}
                accessibilityLabel={m.isActive ? "Pasife al" : "Aktife al"}
              >
                <Icon name={m.isActive ? "pause-circle-outline" : "play-circle-outline"} size={22} color={C.textMuted} />
              </Pressable>
              <Pressable
                hitSlop={10}
                onPress={() => handleDelete(m)}
                style={S.actionBtn}
                disabled={deletingId === m.id}
              >
                {deletingId === m.id
                  ? <ActivityIndicator size="small" color={"#E55D6F"} />
                  : <Icon name="trash-outline" size={20} color={"#E55D6F"} />
                }
              </Pressable>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {showForm && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={S.sheet}
        >
          <View style={S.sheetHandle} />
          <Text style={S.sheetTitle}>{editingId ? "İlaç Düzenle" : "İlaç Ekle"}</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={S.label}>İlaç Adı *</Text>
            <TextInput
              style={S.input}
              placeholder="ör. Antibiyotik, vitamin..."
              value={form.name}
              onChangeText={t => setForm(f => ({ ...f, name: t }))}
              placeholderTextColor={C.textMuted}
            />

            <Text style={S.label}>Doz</Text>
            <TextInput
              style={S.input}
              placeholder="ör. 1 tablet, 5 mg/kg"
              value={form.dosage}
              onChangeText={t => setForm(f => ({ ...f, dosage: t }))}
              placeholderTextColor={C.textMuted}
            />

            <Text style={S.label}>Kullanım Talimatı</Text>
            <TextInput
              style={[S.input, S.textarea]}
              placeholder="Açlık/tokluk, özel notlar..."
              value={form.instructions}
              onChangeText={t => setForm(f => ({ ...f, instructions: t }))}
              placeholderTextColor={C.textMuted}
              multiline numberOfLines={3}
            />

            <Text style={S.label}>Başlangıç Tarihi</Text>
            <TextInput
              style={S.input}
              placeholder="YYYY-AA-GG"
              value={form.startDate}
              onChangeText={t => setForm(f => ({ ...f, startDate: t }))}
              placeholderTextColor={C.textMuted}
            />

            <Text style={S.label}>Bitiş Tarihi</Text>
            <TextInput
              style={S.input}
              placeholder="YYYY-AA-GG"
              value={form.endDate}
              onChangeText={t => setForm(f => ({ ...f, endDate: t }))}
              placeholderTextColor={C.textMuted}
            />

            <Text style={S.label}>Sıklık</Text>
            <View style={S.chips}>
              {RECURRENCE.map(r => (
                <Pressable
                  key={r}
                  style={[S.chip, form.recurrenceRule === r && S.chipActive]}
                  onPress={() => setForm(f => ({ ...f, recurrenceRule: r }))}
                >
                  <Text style={[S.chipTxt, form.recurrenceRule === r && S.chipTxtActive]}>
                    {RECURRENCE_LABELS[r]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={S.formActions}>
              <Pressable style={S.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={S.cancelTxt}>İptal</Text>
              </Pressable>
              <Pressable style={[S.saveBtn, saving && S.savingBtn]} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={S.saveTxt}>Kaydet</Text>
                }
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function makeStyles(C: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    flex:          { flex: 1, backgroundColor: C.bg },
    center:        { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
    list:          { padding: 16, gap: 12 },
    addBtn:        { width: 34, height: 34, borderRadius: 12, backgroundColor: `${C.purple}14`, alignItems: "center", justifyContent: "center" },
    premiumBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: `${C.purple}10`, borderBottomWidth: 1, borderColor: `${C.purple}20` },
    premiumBannerTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: C.purple },
    lockIcon:      { width: 72, height: 72, borderRadius: 36, backgroundColor: `${C.purple}14`, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    lockTitle:     { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text },
    lockSub:       { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textMuted, textAlign: "center", lineHeight: 20 },
    premiumBtn:    { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: C.purple, borderRadius: 14 },
    premiumBtnTxt: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
    empty:         { alignItems: "center", gap: 10, paddingTop: 60, paddingHorizontal: 32 },
    emptyTitle:    { fontSize: 17, fontFamily: "Inter_600SemiBold", color: C.text },
    emptySub:      { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textMuted, textAlign: "center", lineHeight: 20 },
    card:          { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: C.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: C.border, ...SHADOW },
    cardIcon:      { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    cardBody:      { flex: 1 },
    cardRow:       { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    cardName:      { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text, flex: 1 },
    inactive:      { color: C.textMuted, textDecorationLine: "line-through" },
    cardSub:       { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted, marginTop: 2 },
    cardMeta:      { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textMuted, marginTop: 2 },
    badge:         { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    badgeTxt:      { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    cardActions:   { flexDirection: "column", gap: 6 },
    actionBtn:     { width: 34, height: 34, borderRadius: 10, backgroundColor: `${C.border}60`, alignItems: "center", justifyContent: "center" },
    sheet:         { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12, borderTopWidth: 1, borderColor: C.border, maxHeight: "90%" },
    sheetHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 16 },
    sheetTitle:    { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 16 },
    label:         { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.textMuted, marginBottom: 6, marginTop: 12 },
    input:         { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: "Inter_400Regular", color: C.text },
    textarea:      { minHeight: 72, textAlignVertical: "top" },
    chips:         { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
    chipActive:    { backgroundColor: C.purple, borderColor: C.purple },
    chipTxt:       { fontSize: 13, fontFamily: "Inter_500Medium", color: C.textMuted },
    chipTxtActive: { color: "#fff" },
    formActions:   { flexDirection: "row", gap: 10, marginTop: 20 },
    cancelBtn:     { flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: "center" },
    cancelTxt:     { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.textMuted },
    saveBtn:       { flex: 2, paddingVertical: 13, borderRadius: 14, backgroundColor: C.purple, alignItems: "center" },
    savingBtn:     { opacity: 0.7 },
    saveTxt:       { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  });
}
