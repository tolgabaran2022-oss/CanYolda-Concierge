import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Pressable, RefreshControl, ScrollView, StyleSheet, Switch,
  Text, TextInput, View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import {
  apiGetPetReminders, apiCreatePetReminder, apiUpdatePetReminder,
  apiDeletePetReminder, type ApiPetReminder,
} from "@/lib/petManagementApi";

const SHADOW = {
  shadowColor: "#7B5EA7", shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
};

const REMINDER_TYPE_KEYS = ["vaccination", "appointment", "medication", "nutrition", "general", "custom"] as const;
const REMINDER_TYPE_META: Record<string, { icon: string; color: string }> = {
  vaccination: { icon: "shield-checkmark-outline", color: "#FF9500" },
  appointment: { icon: "calendar-outline",         color: "#7B5EA7" },
  medication:  { icon: "medical-outline",          color: "#E55D6F" },
  nutrition:   { icon: "nutrition-outline",        color: "#34C759" },
  general:     { icon: "alarm-outline",            color: "#5856D6" },
  custom:      { icon: "star-outline",             color: "#FF9500" },
};

const REPEAT_RULE_KEYS = ["never", "daily", "weekly", "monthly"] as const;

type FormState = {
  title: string; reminderType: ApiPetReminder["reminderType"];
  date: string; time: string; repeatRule: string; notes: string; isEnabled: boolean;
};

const EMPTY_FORM: FormState = {
  title: "", reminderType: "general",
  date: new Date().toISOString().split("T")[0] ?? "",
  time: "", repeatRule: "never", notes: "", isEnabled: true,
};

function formatDate(s: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return s; }
}

export default function RemindersScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { t } = useTranslation();
  const C = useColors();

  const [reminders, setReminders] = useState<ApiPetReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const typeLabels: Record<string, string> = {
    vaccination: t("pets.reminders.types.vaccination"),
    appointment: t("pets.reminders.types.appointment"),
    medication:  t("pets.reminders.types.medication"),
    nutrition:   t("pets.reminders.types.nutrition"),
    general:     t("pets.reminders.types.general"),
    custom:      t("pets.reminders.types.custom"),
  };

  const repeatLabels: Record<string, string> = {
    never:   t("pets.reminders.repeat.never"),
    daily:   t("pets.reminders.repeat.daily"),
    weekly:  t("pets.reminders.repeat.weekly"),
    monthly: t("pets.reminders.repeat.monthly"),
  };

  const load = useCallback(async () => {
    if (!petId) return;
    try { setReminders(await apiGetPetReminders(petId)); }
    catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [petId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); };

  const openEdit = (r: ApiPetReminder) => {
    setEditingId(r.id);
    setForm({
      title: r.title, reminderType: r.reminderType, date: r.date,
      time: r.time, repeatRule: r.repeatRule, notes: r.notes, isEnabled: r.isEnabled,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!petId || !form.title.trim()) { Alert.alert(t("common.error"), t("pets.reminders.errTitleRequired")); return; }
    setSaving(true);
    try {
      if (editingId) {
        const updated = await apiUpdatePetReminder(petId, editingId, form);
        setReminders(prev => prev.map(r => r.id === editingId ? updated : r));
      } else {
        const created = await apiCreatePetReminder(petId, { ...form, relatedId: "" });
        setReminders(prev => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowForm(false);
    } catch { Alert.alert(t("common.error"), t("pets.reminders.errSave")); }
    finally { setSaving(false); }
  };

  const handleToggle = async (r: ApiPetReminder) => {
    if (!petId) return;
    setTogglingId(r.id);
    try {
      const updated = await apiUpdatePetReminder(petId, r.id, { isEnabled: !r.isEnabled });
      setReminders(prev => prev.map(x => x.id === r.id ? updated : x));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { Alert.alert(t("common.error"), t("pets.reminders.errStatusUpdate")); }
    finally { setTogglingId(null); }
  };

  const handleDelete = (r: ApiPetReminder) => {
    Alert.alert(t("pets.reminders.deleteTitle"), `"${r.title}" ${t("pets.reminders.deleteConfirmSuffix")}`, [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: async () => {
        if (!petId) return;
        try {
          await apiDeletePetReminder(petId, r.id);
          setReminders(prev => prev.filter(x => x.id !== r.id));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch { Alert.alert(t("common.error"), t("pets.reminders.errDelete")); }
      }},
    ]);
  };

  const S = makeStyles(C);

  if (loading) {
    return (
      <SafeAreaView style={S.flex} edges={["bottom"]}>
        <Stack.Screen options={{ title: t("pets.reminders.title"), headerBackTitle: t("pets.reminders.backTitle") }} />
        <View style={S.center}><ActivityIndicator color={C.purple} size="large" /></View>
      </SafeAreaView>
    );
  }

  const upcoming = reminders.filter(r => r.isEnabled && new Date(r.date) >= new Date(new Date().setHours(0,0,0,0)));
  const past = reminders.filter(r => !r.isEnabled || new Date(r.date) < new Date(new Date().setHours(0,0,0,0)));

  return (
    <SafeAreaView style={S.flex} edges={["bottom"]}>
      <Stack.Screen options={{ title: t("pets.reminders.title"), headerBackTitle: t("pets.reminders.backTitle"),
        headerRight: () => (
          <Pressable hitSlop={12} onPress={openAdd} style={S.addBtn}>
            <Icon name="add" size={22} color={C.purple} />
          </Pressable>
        ),
      }} />

      <ScrollView
        contentContainerStyle={S.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.purple} />}
      >
        {reminders.length === 0 && (
          <View style={S.empty}>
            <View style={S.emptyIcon}><Icon name="alarm-outline" size={38} color={C.purple} /></View>
            <Text style={S.emptyTitle}>{t("pets.reminders.emptyTitle")}</Text>
            <Text style={S.emptySub}>{t("pets.reminders.emptySub")}</Text>
            <Pressable style={S.addEmptyBtn} onPress={openAdd}>
              <Text style={S.addEmptyTxt}>{t("pets.reminders.addBtn")}</Text>
            </Pressable>
          </View>
        )}

        {upcoming.length > 0 && (
          <>
            <Text style={S.sectionTitle}>{t("pets.reminders.sectionUpcoming")}</Text>
            {upcoming.map(r => (
              <ReminderCard
                key={r.id} r={r} C={C} S={S}
                typeLabels={typeLabels} repeatLabels={repeatLabels}
                onEdit={() => openEdit(r)} onDelete={() => handleDelete(r)}
                onToggle={() => handleToggle(r)} toggling={togglingId === r.id}
              />
            ))}
          </>
        )}

        {past.length > 0 && (
          <>
            <Text style={[S.sectionTitle, { marginTop: 16 }]}>{t("pets.reminders.sectionPast")}</Text>
            {past.map(r => (
              <ReminderCard
                key={r.id} r={r} C={C} S={S}
                typeLabels={typeLabels} repeatLabels={repeatLabels}
                onEdit={() => openEdit(r)} onDelete={() => handleDelete(r)}
                onToggle={() => handleToggle(r)} toggling={togglingId === r.id}
              />
            ))}
          </>
        )}
      </ScrollView>

      {showForm && (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={S.sheet}>
          <View style={S.sheetHandle} />
          <Text style={S.sheetTitle}>{editingId ? t("pets.reminders.editTitle") : t("pets.reminders.addTitle")}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={S.label}>{t("pets.reminders.titleLabel")}</Text>
            <TextInput style={S.input} placeholder={t("pets.reminders.titlePlaceholder")} value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))} placeholderTextColor={C.textMuted} />

            <Text style={S.label}>{t("pets.reminders.typeLabel")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.typeRow}>
              {REMINDER_TYPE_KEYS.map(tk => {
                const meta = REMINDER_TYPE_META[tk]!;
                return (
                  <Pressable key={tk} style={[S.typeChip, form.reminderType === tk && { backgroundColor: meta.color, borderColor: meta.color }]} onPress={() => setForm(f => ({ ...f, reminderType: tk }))}>
                    <Icon name={meta.icon} size={14} color={form.reminderType === tk ? "#fff" : C.textMuted} />
                    <Text style={[S.typeChipTxt, form.reminderType === tk && S.typeChipTxtActive]}>{typeLabels[tk]}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={S.label}>{t("pets.reminders.dateLabel")}</Text>
            <TextInput style={S.input} placeholder="YYYY-AA-GG" value={form.date} onChangeText={v => setForm(f => ({ ...f, date: v }))} placeholderTextColor={C.textMuted} />

            <Text style={S.label}>{t("pets.reminders.timeLabel")}</Text>
            <TextInput style={S.input} placeholder={t("pets.reminders.timePlaceholder")} value={form.time} onChangeText={v => setForm(f => ({ ...f, time: v }))} placeholderTextColor={C.textMuted} />

            <Text style={S.label}>{t("pets.reminders.repeatLabel")}</Text>
            <View style={S.repeatRow}>
              {REPEAT_RULE_KEYS.map(rk => (
                <Pressable key={rk} style={[S.repeatChip, form.repeatRule === rk && S.repeatChipActive]} onPress={() => setForm(f => ({ ...f, repeatRule: rk }))}>
                  <Text style={[S.repeatChipTxt, form.repeatRule === rk && S.repeatChipTxtActive]}>{repeatLabels[rk]}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={S.label}>{t("pets.reminders.notesLabel")}</Text>
            <TextInput style={[S.input, S.textarea]} placeholder={t("pets.reminders.notesPlaceholder")} value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} placeholderTextColor={C.textMuted} multiline numberOfLines={3} />

            <View style={S.formActions}>
              <Pressable style={S.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={S.cancelTxt}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable style={[S.saveBtn, saving && S.savingBtn]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={S.saveTxt}>{t("common.save")}</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function ReminderCard({ r, C, S, typeLabels, repeatLabels, onEdit, onDelete, onToggle, toggling }: {
  r: ApiPetReminder; C: ReturnType<typeof useColors>;
  S: ReturnType<typeof makeStyles>;
  typeLabels: Record<string, string>;
  repeatLabels: Record<string, string>;
  onEdit: () => void; onDelete: () => void; onToggle: () => void; toggling: boolean;
}) {
  const meta = REMINDER_TYPE_META[r.reminderType] ?? REMINDER_TYPE_META["general"]!;
  return (
    <Pressable style={[S.card, !r.isEnabled && S.cardDisabled]} onPress={onEdit}>
      <View style={[S.cardIcon, { backgroundColor: `${meta.color}18` }]}>
        <Icon name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={S.cardBody}>
        <Text style={[S.cardTitle, !r.isEnabled && S.dimmed]}>{r.title}</Text>
        <Text style={S.cardDate}>{formatDate(r.date)}{r.time ? ` · ${r.time}` : ""}</Text>
        <View style={S.cardMeta}>
          <View style={[S.typePill, { backgroundColor: `${meta.color}14` }]}>
            <Text style={[S.typePillTxt, { color: meta.color }]}>{typeLabels[r.reminderType] ?? r.reminderType}</Text>
          </View>
          {r.repeatRule !== "never" && (
            <View style={S.repeatPill}>
              <Text style={S.repeatPillTxt}>{repeatLabels[r.repeatRule] ?? r.repeatRule}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={S.cardActions}>
        {toggling
          ? <ActivityIndicator size="small" color={C.purple} />
          : <Switch value={r.isEnabled} onValueChange={onToggle} trackColor={{ true: C.purple, false: C.border }} thumbColor="#fff" style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} />
        }
        <Pressable hitSlop={10} onPress={onDelete}>
          <Icon name="trash-outline" size={18} color={"#E55D6F"} />
        </Pressable>
      </View>
    </Pressable>
  );
}

function makeStyles(C: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    flex:           { flex: 1, backgroundColor: C.bg },
    center:         { flex: 1, alignItems: "center", justifyContent: "center" },
    list:           { padding: 16, paddingBottom: 40 },
    addBtn:         { width: 34, height: 34, borderRadius: 12, backgroundColor: `${C.purple}14`, alignItems: "center", justifyContent: "center" },
    empty:          { alignItems: "center", gap: 10, paddingTop: 60, paddingHorizontal: 32 },
    emptyIcon:      { width: 72, height: 72, borderRadius: 36, backgroundColor: `${C.purple}12`, alignItems: "center", justifyContent: "center" },
    emptyTitle:     { fontSize: 17, fontFamily: "Inter_600SemiBold", color: C.text },
    emptySub:       { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textMuted, textAlign: "center", lineHeight: 20 },
    addEmptyBtn:    { marginTop: 4, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: C.purple, borderRadius: 14 },
    addEmptyTxt:    { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
    sectionTitle:   { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.textMuted, marginBottom: 8, letterSpacing: 0.3 },
    card:           { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: C.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 10, ...SHADOW },
    cardDisabled:   { opacity: 0.55 },
    cardIcon:       { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    cardBody:       { flex: 1 },
    cardTitle:      { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text, marginBottom: 2 },
    dimmed:         { color: C.textMuted },
    cardDate:       { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textMuted, marginBottom: 6 },
    cardMeta:       { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    typePill:       { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    typePillTxt:    { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    repeatPill:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: `${C.textMuted}14` },
    repeatPillTxt:  { fontSize: 11, fontFamily: "Inter_400Regular", color: C.textMuted },
    cardActions:    { alignItems: "center", gap: 8, justifyContent: "flex-start", paddingTop: 2 },
    sheet:          { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12, borderTopWidth: 1, borderColor: C.border, maxHeight: "92%" },
    sheetHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 16 },
    sheetTitle:     { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 12 },
    label:          { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.textMuted, marginBottom: 6, marginTop: 12 },
    input:          { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: "Inter_400Regular", color: C.text },
    textarea:       { minHeight: 72, textAlignVertical: "top" },
    typeRow:        { flexDirection: "row", gap: 8, paddingBottom: 4 },
    typeChip:       { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
    typeChipTxt:    { fontSize: 12, fontFamily: "Inter_500Medium", color: C.textMuted },
    typeChipTxtActive: { color: "#fff" },
    repeatRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    repeatChip:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
    repeatChipActive:{ backgroundColor: C.purple, borderColor: C.purple },
    repeatChipTxt:  { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted },
    repeatChipTxtActive: { color: "#fff", fontFamily: "Inter_600SemiBold" },
    formActions:    { flexDirection: "row", gap: 10, marginTop: 20 },
    cancelBtn:      { flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: "center" },
    cancelTxt:      { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.textMuted },
    saveBtn:        { flex: 2, paddingVertical: 13, borderRadius: 14, backgroundColor: C.purple, alignItems: "center" },
    savingBtn:      { opacity: 0.7 },
    saveTxt:        { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  });
}
