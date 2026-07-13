import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import {
  apiGetAppointment,
  apiUpdateAppointment,
  apiDeleteAppointment,
  type ApiAppointment,
} from "@/lib/petManagementApi";

const P      = "#7B5EA7";
const P2     = "#9E78CC";
const DARK   = "#191330";
const BODY   = "#8F8A9D";
const BG     = "#F6F1FF";
const WHITE  = "#FFFFFF";
const BORDER = "#EEE8F5";
const GREEN  = "#34C759";
const ORANGE = "#FF9500";
const RED    = "#FF3B30";

const SHADOW = Platform.select({
  ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 },
  android: { elevation: 2 },
  default: {},
});

const STATUS_LABEL: Record<string, string> = { upcoming: "Yaklaşıyor", completed: "Tamamlandı", cancelled: "İptal" };
const STATUS_COLOR: Record<string, string>  = { upcoming: P, completed: GREEN, cancelled: RED };

const RECURRENCE_LABELS: Record<string, string> = {
  never: "Yok",
  "1m":  "Her Ay",
  "3m":  "Her 3 Ayda Bir",
  "6m":  "Her 6 Ayda Bir",
  "12m": "Her Yıl",
};
const RECURRENCE_OPTIONS = ["never", "1m", "3m", "6m", "12m"] as const;

const APPT_TYPES = ["veteriner", "kuaför", "kontrol", "aşı", "diş", "diğer"] as const;

function formatDateLong(s: string): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("tr-TR", {
      day: "numeric", month: "long", year: "numeric", weekday: "long",
    });
  } catch { return s; }
}

function formatDate(s: string): string {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return s; }
}

/* ── Edit Sheet ──────────────────────────────────────── */
function EditSheet({
  visible,
  appt,
  onClose,
  onSave,
}: {
  visible: boolean;
  appt: ApiAppointment | null;
  onClose: () => void;
  onSave: (data: Partial<Omit<ApiAppointment, "id" | "petId" | "userId" | "createdAt" | "updatedAt">>) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [title, setTitle]             = useState(appt?.title ?? "");
  const [apptType, setApptType]       = useState(appt?.appointmentType ?? "veteriner");
  const [apptDate, setApptDate]       = useState(appt?.appointmentDate ?? "");
  const [apptTime, setApptTime]       = useState(appt?.appointmentTime ?? "");
  const [location, setLocation]       = useState(appt?.location ?? "");
  const [clinicName, setClinic]       = useState(appt?.clinicName ?? "");
  const [vetName, setVet]             = useState(appt?.veterinarianName ?? "");
  const [description, setDesc]        = useState(appt?.description ?? "");
  const [recurrence, setRecurrence]   = useState(appt?.recurrenceRule ?? "never");
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    if (visible && appt) {
      setTitle(appt.title); setApptType(appt.appointmentType);
      setApptDate(appt.appointmentDate); setApptTime(appt.appointmentTime);
      setLocation(appt.location); setClinic(appt.clinicName);
      setVet(appt.veterinarianName); setDesc(appt.description);
      setRecurrence(appt.recurrenceRule);
    }
  }, [visible, appt]);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert("Hata", "Başlık giriniz."); return; }
    setSaving(true);
    try {
      await onSave({ title, appointmentType: apptType, appointmentDate: apptDate, appointmentTime: apptTime, location, clinicName, veterinarianName: vetName, description, recurrenceRule: recurrence });
      onClose();
    } catch { Alert.alert("Hata", "Kaydedilemedi."); }
    finally { setSaving(false); }
  };

  const fld = { backgroundColor: BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 as const, fontFamily: "Inter_400Regular" as const, color: DARK, borderWidth: 1.5 as const, borderColor: `${P}22` };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: WHITE }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[es.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={onClose} hitSlop={8}><Icon name="close" size={24} color={DARK} /></Pressable>
          <Text style={es.title}>Randevuyu Düzenle</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={es.form} keyboardShouldPersistTaps="handled">
          <View style={es.field}>
            <Text style={es.label}>Randevu Türü</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {APPT_TYPES.map((t) => (
                  <Pressable key={t} style={[es.pill, apptType === t && es.pillActive]} onPress={() => setApptType(t)}>
                    <Text style={[es.pillTxt, apptType === t && { color: P, fontFamily: "Inter_700Bold" }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={es.field}><Text style={es.label}>Başlık *</Text><TextInput style={fld} value={title} onChangeText={setTitle} placeholderTextColor={BODY} /></View>
          <View style={es.field}><Text style={es.label}>Tarih (YYYY-AA-GG)</Text><TextInput style={fld} value={apptDate} onChangeText={setApptDate} placeholder="2026-08-15" placeholderTextColor={BODY} /></View>
          <View style={es.field}><Text style={es.label}>Saat</Text><TextInput style={fld} value={apptTime} onChangeText={setApptTime} placeholder="14:30" placeholderTextColor={BODY} /></View>
          <View style={es.field}><Text style={es.label}>Klinik / Salon</Text><TextInput style={fld} value={clinicName} onChangeText={setClinic} placeholderTextColor={BODY} /></View>
          <View style={es.field}><Text style={es.label}>Veteriner / Uzman</Text><TextInput style={fld} value={vetName} onChangeText={setVet} placeholderTextColor={BODY} /></View>
          <View style={es.field}><Text style={es.label}>Konum</Text><TextInput style={fld} value={location} onChangeText={setLocation} placeholderTextColor={BODY} /></View>
          <View style={es.field}>
            <Text style={es.label}>Tekrarlama</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              {RECURRENCE_OPTIONS.map((r) => (
                <Pressable key={r} style={[es.pill, recurrence === r && es.pillActive]} onPress={() => setRecurrence(r)}>
                  <Text style={[es.pillTxt, recurrence === r && { color: P, fontFamily: "Inter_700Bold" }]}>{RECURRENCE_LABELS[r]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={es.field}><Text style={es.label}>Notlar</Text><TextInput style={[fld, { minHeight: 80, textAlignVertical: "top" }]} value={description} onChangeText={setDesc} placeholder="Ek notlar..." placeholderTextColor={BODY} multiline /></View>
          <Pressable style={es.saveBtn} onPress={handleSave} disabled={saving}>
            <LinearGradient colors={[P2, P]} style={es.saveGrad}>
              <Icon name={saving ? "hourglass-outline" : "checkmark-circle-outline"} size={20} color={WHITE} />
              <Text style={es.saveTxt}>{saving ? "Kaydediliyor..." : "Kaydet"}</Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const es = StyleSheet.create({
  header:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14 },
  title:    { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK },
  form:     { paddingHorizontal: 20, gap: 14, paddingBottom: 40 },
  field:    { gap: 6 },
  label:    { fontSize: 12, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: 0.2 },
  pill:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER },
  pillActive:{ borderColor: P, backgroundColor: `${P}10` },
  pillTxt:  { fontSize: 12, fontFamily: "Inter_500Medium", color: BODY },
  saveBtn:  { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  saveGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  saveTxt:  { fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE },
});

/* ── Detail Row ──────────────────────────────────────── */
function DetailRow({
  icon,
  iconColor,
  text,
  right,
}: {
  icon: string;
  iconColor?: string;
  text: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={dr.row}>
      <View style={[dr.iconWrap, { backgroundColor: `${iconColor ?? BODY}14` }]}>
        <Icon name={icon} size={18} color={iconColor ?? BODY} />
      </View>
      <Text style={dr.text} numberOfLines={2}>{text}</Text>
      {right}
    </View>
  );
}
const dr = StyleSheet.create({
  row:     { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  iconWrap:{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  text:    { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: DARK },
});

/* ── Recurrence Picker ─────────────────────────────── */
function RecurrencePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable style={rp.row} onPress={() => setOpen(true)}>
        <View style={[rp.iconWrap, { backgroundColor: `${BODY}14` }]}>
          <Icon name="repeat-outline" size={18} color={BODY} />
        </View>
        <Text style={rp.label}>Tekrarlama</Text>
        <View style={rp.right}>
          <Text style={rp.value}>{RECURRENCE_LABELS[value] ?? "Yok"}</Text>
          <Icon name="chevron-forward" size={16} color={BODY} />
        </View>
      </Pressable>

      <Modal visible={open} animationType="fade" transparent>
        <Pressable style={rp.overlay} onPress={() => setOpen(false)}>
          <View style={rp.menu}>
            {RECURRENCE_OPTIONS.map((r) => (
              <Pressable
                key={r}
                style={[rp.option, value === r && rp.optionActive]}
                onPress={() => { onChange(r); setOpen(false); }}
              >
                <Text style={[rp.optionTxt, value === r && { color: P, fontFamily: "Inter_700Bold" }]}>{RECURRENCE_LABELS[r]}</Text>
                {value === r && <Icon name="checkmark" size={16} color={P} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
const rp = StyleSheet.create({
  row:        { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  iconWrap:   { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  label:      { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: DARK },
  right:      { flexDirection: "row", alignItems: "center", gap: 6 },
  value:      { fontSize: 14, fontFamily: "Inter_400Regular", color: BODY },
  overlay:    { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#00000040" },
  menu:       { backgroundColor: WHITE, borderRadius: 16, paddingVertical: 8, width: 240, ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 20 }, android: { elevation: 8 } }) },
  option:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  optionActive:{ backgroundColor: `${P}08` },
  optionTxt:  { fontSize: 15, fontFamily: "Inter_400Regular", color: DARK },
});

/* ── Main Screen ─────────────────────────────────────── */
export default function AppointmentDetailScreen() {
  const { petId, apptId } = useLocalSearchParams<{ petId: string; apptId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [appt, setAppt]         = useState<ApiAppointment | null>(null);
  const [loading, setLoading]   = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    if (!petId || !apptId || !user) return;
    setLoading(true);
    try { setAppt(await apiGetAppointment(petId, apptId, user.id)); }
    finally { setLoading(false); }
  }, [petId, apptId, user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async (data: Partial<Omit<ApiAppointment, "id" | "petId" | "userId" | "createdAt" | "updatedAt">>) => {
    if (!petId || !apptId || !user) return;
    const updated = await apiUpdateAppointment(petId, apptId, user.id, data);
    setAppt(updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleReminderToggle = async (val: boolean) => {
    if (!appt) return;
    const reminderAt = val
      ? new Date(Date.now() - 86400000).toISOString()
      : "";
    await handleUpdate({ reminderAt });
  };

  const handleCancel = () => {
    Alert.alert(
      "Randevuyu İptal Et",
      "Bu randevuyu iptal etmek istediğinizden emin misiniz?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "İptal Et",
          style: "destructive",
          onPress: async () => {
            if (!petId || !apptId || !user) return;
            try {
              await apiDeleteAppointment(petId, apptId, user.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch {
              Alert.alert("Hata", "İptal edilemedi.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={P} size="large" />
      </View>
    );
  }

  if (!appt) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <View style={[ms.header, { paddingTop: insets.top + 12 }]}>
          <Pressable style={ms.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Icon name="chevron-back" size={22} color={DARK} />
          </Pressable>
          <Text style={ms.headerTitle}>Randevu Detayı</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 16, color: BODY }}>Randevu bulunamadı.</Text>
        </View>
      </View>
    );
  }

  const sc = STATUS_COLOR[appt.status] ?? BODY;
  const reminderEnabled = Boolean(appt.reminderAt);
  const reminderDate = appt.reminderAt ? formatDate(appt.reminderAt) : "—";

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <View style={[ms.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={ms.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Icon name="chevron-back" size={22} color={DARK} />
        </Pressable>
        <Text style={ms.headerTitle}>Randevu Detayı</Text>
        <Pressable
          style={ms.editBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditOpen(true); }}
          hitSlop={8}
        >
          <Icon name="pencil-outline" size={20} color={P} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100, paddingTop: 8 }}
      >
        {/* Main info card */}
        <View style={[det.card, SHADOW]}>
          {/* Title row */}
          <View style={det.titleRow}>
            <View style={[det.bigIcon, { backgroundColor: `${sc}15` }]}>
              <Icon name="calendar" size={28} color={sc} />
            </View>
            <View style={det.titleInfo}>
              <Text style={det.title}>{appt.title}</Text>
              <View style={[det.badge, { backgroundColor: `${sc}15` }]}>
                <Text style={[det.badgeTxt, { color: sc }]}>{STATUS_LABEL[appt.status]}</Text>
              </View>
            </View>
          </View>

          <View style={det.separator} />

          {/* Detail rows */}
          <DetailRow
            icon="calendar-outline"
            iconColor={sc}
            text={appt.appointmentDate ? formatDateLong(appt.appointmentDate) : "—"}
          />
          {appt.appointmentTime ? (
            <DetailRow icon="time-outline" iconColor={BODY} text={appt.appointmentTime} />
          ) : null}
          {(appt.clinicName || appt.location) ? (
            <DetailRow
              icon="location-outline"
              iconColor={BODY}
              text={[appt.clinicName, appt.location].filter(Boolean).join(" — ")}
            />
          ) : null}
          {appt.veterinarianName ? (
            <DetailRow
              icon="person-circle-outline"
              iconColor={BODY}
              text={`Veteriner Hekim — ${appt.veterinarianName}`}
            />
          ) : null}

          {/* Reminder toggle */}
          <View style={det.separator} />
          <View style={det.reminderRow}>
            <View style={[det.reminderIcon, { backgroundColor: `${P}14` }]}>
              <Icon name="notifications-outline" size={18} color={P} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={det.reminderLabel}>Hatırlatma</Text>
              {reminderEnabled && <Text style={det.reminderDate}>{reminderDate}</Text>}
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={handleReminderToggle}
              trackColor={{ false: BORDER, true: `${P}60` }}
              thumbColor={reminderEnabled ? P : WHITE}
            />
          </View>
        </View>

        {/* Notes card */}
        {appt.description ? (
          <View style={[det.notesCard, SHADOW]}>
            <Text style={det.notesTitle}>Notlar</Text>
            <Text style={det.notesText}>{appt.description}</Text>
          </View>
        ) : null}

        {/* Recurrence */}
        <View style={[det.card, SHADOW]}>
          <RecurrencePicker
            value={appt.recurrenceRule ?? "never"}
            onChange={(v) => handleUpdate({ recurrenceRule: v })}
          />
        </View>

        {/* Cancel button */}
        <Pressable
          style={({ pressed }) => [det.cancelBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={handleCancel}
        >
          <Icon name="close-circle-outline" size={20} color={WHITE} />
          <Text style={det.cancelTxt}>Randevuyu İptal Et</Text>
        </Pressable>
      </ScrollView>

      <EditSheet
        visible={editOpen}
        appt={appt}
        onClose={() => setEditOpen(false)}
        onSave={handleUpdate}
      />
    </View>
  );
}

const ms = StyleSheet.create({
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: WHITE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: DARK },
  editBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: WHITE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },
});

const det = StyleSheet.create({
  card:         { backgroundColor: WHITE, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: BORDER, marginBottom: 12 },
  titleRow:     { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  bigIcon:      { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  titleInfo:    { flex: 1, gap: 6 },
  title:        { fontSize: 18, fontFamily: "Inter_700Bold", color: DARK, lineHeight: 24 },
  badge:        { borderRadius: 50, paddingHorizontal: 12, paddingVertical: 4, alignSelf: "flex-start" },
  badgeTxt:     { fontSize: 12, fontFamily: "Inter_700Bold" },
  separator:    { height: 1, backgroundColor: BORDER, marginVertical: 8 },
  reminderRow:  { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  reminderIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  reminderLabel:{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: DARK },
  reminderDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, marginTop: 2 },
  notesCard:    { backgroundColor: WHITE, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: BORDER, marginBottom: 12, gap: 8 },
  notesTitle:   { fontSize: 14, fontFamily: "Inter_700Bold", color: DARK },
  notesText:    { fontSize: 14, fontFamily: "Inter_400Regular", color: BODY, lineHeight: 22 },
  cancelBtn:    { backgroundColor: RED, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, marginTop: 8 },
  cancelTxt:    { fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE },
});
