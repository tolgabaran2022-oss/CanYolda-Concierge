import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Modal, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { usePets } from "@/contexts/PetsContext";
import { apiGetAppointments, apiCreateAppointment, type ApiAppointment } from "@/lib/petManagementApi";

const P      = "#7B5EA7";
const P2     = "#9E78CC";
const DARK   = "#191330";
const BODY   = "#8F8A9D";
const BG     = "#F6F1FF";
const WHITE  = "#FFFFFF";
const BORDER = "#EEE8F5";
const GREEN  = "#34C759";
const RED    = "#FF3B30";

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 },
  android: { elevation: 2 },
  default: {},
});

const APPT_TYPES = ["veteriner", "kuaför", "kontrol", "aşı", "diş", "diğer"] as const;
const STATUS_COLOR: Record<string, string> = { upcoming: P, completed: GREEN, cancelled: RED };

function formatDate(s: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return s; }
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return 999;
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

/* ── Appointment Card ─────────────────────────────────── */
function ApptCard({ appt, onPress, statusLabels, t }: {
  appt: ApiAppointment; onPress: () => void;
  statusLabels: Record<string, string>;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const sc   = STATUS_COLOR[appt.status] ?? BODY;
  const days = appt.status === "upcoming" ? daysUntil(appt.appointmentDate) : null;

  let remainTxt = "";
  if (days !== null) {
    if (days < 0) remainTxt = t("pets.appointments.daysAgo", { count: Math.abs(days) });
    else if (days === 0) remainTxt = t("pets.appointments.today");
    else remainTxt = t("pets.appointments.daysLeft", { count: days });
  }

  return (
    <Pressable style={({ pressed }) => [ac.card, pressed && { opacity: 0.85 }]} onPress={onPress}>
      <View style={ac.top}>
        <View style={[ac.iconWrap, { backgroundColor: `${sc}18` }]}>
          <Icon name="calendar-outline" size={22} color={sc} />
        </View>
        <View style={ac.info}>
          <Text style={ac.title}>{appt.title}</Text>
          <View style={ac.metaRow}>
            <Text style={ac.type}>{appt.appointmentType}</Text>
            {appt.clinicName ? <><Text style={ac.dot}>·</Text><Text style={ac.type}>{appt.clinicName}</Text></> : null}
          </View>
        </View>
        <View style={[ac.badge, { backgroundColor: `${sc}18` }]}>
          <Text style={[ac.badgeTxt, { color: sc }]}>{statusLabels[appt.status] ?? appt.status}</Text>
        </View>
      </View>
      <View style={ac.details}>
        <View style={ac.row}>
          <Icon name="calendar-outline" size={13} color={BODY} />
          <Text style={ac.rowLabel}>{t("pets.appointments.dateLabel")}</Text>
          <Text style={ac.rowValue}>{formatDate(appt.appointmentDate)}{appt.appointmentTime ? ` · ${appt.appointmentTime}` : ""}</Text>
        </View>
        {days !== null && (
          <View style={ac.row}>
            <Icon name="time-outline" size={13} color={days < 0 ? RED : BODY} />
            <Text style={ac.rowLabel}>{t("pets.appointments.remainingLabel")}</Text>
            <Text style={[ac.rowValue, days < 0 && { color: RED }]}>{remainTxt}</Text>
          </View>
        )}
        {appt.location ? (
          <View style={ac.row}>
            <Icon name="location-outline" size={13} color={BODY} />
            <Text style={ac.rowLabel}>{t("pets.appointments.locationLabel")}</Text>
            <Text style={ac.rowValue}>{appt.location}</Text>
          </View>
        ) : null}
      </View>
      <Icon name="chevron-forward" size={16} color={BODY} style={{ position: "absolute", right: 14, bottom: 14 }} />
    </Pressable>
  );
}
const ac = StyleSheet.create({
  card:     { backgroundColor: WHITE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 10, position: "relative", ...CARD_SHADOW },
  top:      { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  info:     { flex: 1 },
  title:    { fontSize: 15, fontFamily: "Inter_700Bold", color: DARK },
  metaRow:  { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  type:     { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY },
  dot:      { color: BODY, fontSize: 12 },
  badge:    { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt: { fontSize: 11, fontFamily: "Inter_700Bold" },
  details:  { gap: 6 },
  row:      { flexDirection: "row", alignItems: "center", gap: 6 },
  rowLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, width: 56 },
  rowValue: { fontSize: 12, fontFamily: "Inter_500Medium", color: DARK, flex: 1 },
});

/* ── Add Sheet ────────────────────────────────────────── */
type ApptStatus = ApiAppointment["status"];

function AddSheet({ visible, onClose, onSave }: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: Omit<ApiAppointment, "id" | "petId" | "userId" | "createdAt" | "updatedAt">) => Promise<void>;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [title, setTitle]           = useState("");
  const [appointmentType, setType]  = useState("veteriner");
  const [appointmentDate, setDate]  = useState("");
  const [appointmentTime, setTime]  = useState("");
  const [location, setLocation]     = useState("");
  const [clinicName, setClinic]     = useState("");
  const [veterinarianName, setVet]  = useState("");
  const [description, setDesc]      = useState("");
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(""); setType("veteriner"); setDate(""); setTime("");
      setLocation(""); setClinic(""); setVet(""); setDesc("");
    }
  }, [visible]);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert(t("common.error"), t("pets.appointments.errTitleRequired")); return; }
    if (!appointmentDate.trim()) { Alert.alert(t("common.error"), t("pets.appointments.errDateRequired")); return; }
    setSaving(true);
    try {
      await onSave({ title, appointmentType, appointmentDate, appointmentTime, location, clinicName, veterinarianName, description, status: "upcoming" as ApptStatus, reminderAt: "", recurrenceRule: "never" });
      onClose();
    } catch { Alert.alert(t("common.error"), t("pets.appointments.errSave")); }
    finally { setSaving(false); }
  };

  const fld = { backgroundColor: BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 as const, fontFamily: "Inter_400Regular" as const, color: DARK, borderWidth: 1.5 as const, borderColor: `${P}22` };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: WHITE }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[ash.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={onClose} hitSlop={8}><Icon name="close" size={24} color={DARK} /></Pressable>
          <Text style={ash.title}>{t("pets.appointments.addTitle")}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ash.form} keyboardShouldPersistTaps="handled">
          <View style={ash.field}>
            <Text style={ash.label}>{t("pets.appointments.apptTypeLabel")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {APPT_TYPES.map((at) => (
                  <Pressable key={at} style={[ash.typePill, appointmentType === at && ash.typePillActive]} onPress={() => setType(at)}>
                    <Text style={[ash.typeTxt, appointmentType === at && { color: P, fontFamily: "Inter_700Bold" }]}>{at.charAt(0).toUpperCase() + at.slice(1)}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={ash.field}><Text style={ash.label}>{t("pets.appointments.titleLabel")}</Text><TextInput style={fld} value={title} onChangeText={setTitle} placeholder={t("pets.appointments.titlePlaceholder")} placeholderTextColor={BODY} /></View>
          <View style={ash.field}><Text style={ash.label}>{t("pets.appointments.dateFieldLabel")}</Text><TextInput style={fld} value={appointmentDate} onChangeText={setDate} placeholder="2026-08-15" placeholderTextColor={BODY} /></View>
          <View style={ash.field}><Text style={ash.label}>{t("pets.appointments.timeLabel")}</Text><TextInput style={fld} value={appointmentTime} onChangeText={setTime} placeholder="14:30" placeholderTextColor={BODY} /></View>
          <View style={ash.field}><Text style={ash.label}>{t("pets.appointments.clinicLabel")}</Text><TextInput style={fld} value={clinicName} onChangeText={setClinic} placeholder={t("pets.appointments.clinicPlaceholder")} placeholderTextColor={BODY} /></View>
          <View style={ash.field}><Text style={ash.label}>{t("pets.appointments.vetLabel")}</Text><TextInput style={fld} value={veterinarianName} onChangeText={setVet} placeholder={t("pets.appointments.vetPlaceholder")} placeholderTextColor={BODY} /></View>
          <View style={ash.field}><Text style={ash.label}>{t("pets.appointments.locationFieldLabel")}</Text><TextInput style={fld} value={location} onChangeText={setLocation} placeholder={t("pets.appointments.locationPlaceholder")} placeholderTextColor={BODY} /></View>
          <View style={ash.field}><Text style={ash.label}>{t("pets.appointments.notesLabel")}</Text><TextInput style={[fld, { minHeight: 80, textAlignVertical: "top" }]} value={description} onChangeText={setDesc} placeholder={t("pets.apptDetail.notesPlaceholder")} placeholderTextColor={BODY} multiline /></View>
          <Pressable style={ash.saveBtn} onPress={handleSave} disabled={saving}>
            <LinearGradient colors={[P2, P]} style={ash.saveGrad}>
              <Icon name={saving ? "hourglass-outline" : "checkmark-circle-outline"} size={20} color={WHITE} />
              <Text style={ash.saveTxt}>{saving ? t("pets.appointments.saving") : t("pets.appointments.save")}</Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const ash = StyleSheet.create({
  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14 },
  title:         { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK },
  form:          { paddingHorizontal: 20, gap: 14, paddingBottom: 40 },
  field:         { gap: 6 },
  label:         { fontSize: 12, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: 0.2 },
  typePill:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER },
  typePillActive:{ borderColor: P, backgroundColor: `${P}10` },
  typeTxt:       { fontSize: 12, fontFamily: "Inter_500Medium", color: BODY },
  saveBtn:       { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  saveGrad:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  saveTxt:       { fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE },
});

/* ── Main Screen ─────────────────────────────────────── */
export default function AppointmentsScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getPet } = usePets();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pet = getPet(petId ?? "");
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [addVisible, setAddVisible]     = useState(false);

  const statusLabels: Record<string, string> = {
    upcoming:  t("pets.appointments.statusLabels.upcoming"),
    completed: t("pets.appointments.statusLabels.completed"),
    cancelled: t("pets.appointments.statusLabels.cancelled"),
  };

  const load = useCallback(async () => {
    if (!petId || !user) return;
    setLoading(true);
    try { setAppointments(await apiGetAppointments(petId)); }
    finally { setLoading(false); }
  }, [petId, user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (data: Omit<ApiAppointment, "id" | "petId" | "userId" | "createdAt" | "updatedAt">) => {
    if (!petId || !user) return;
    const created = await apiCreateAppointment(petId, data);
    setAppointments((prev) => [created, ...prev]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={[ms.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={ms.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Icon name="chevron-back" size={22} color={DARK} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={ms.headerTitle}>{t("pets.appointments.title")}</Text>
          {pet ? <Text style={ms.headerSub}>{pet.name}</Text> : null}
        </View>
        <Pressable style={ms.addBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAddVisible(true); }}>
          <LinearGradient colors={[P2, P]} style={ms.addGrad}>
            <Icon name="add" size={20} color={WHITE} />
            <Text style={ms.addTxt}>{t("pets.appointments.add")}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {loading ? (
        <View style={ms.center}><ActivityIndicator color={P} size="large" /></View>
      ) : appointments.length === 0 ? (
        <View style={ms.empty}>
          <LinearGradient colors={[`${P2}20`, `${P}10`]} style={ms.emptyCircle}>
            <Icon name="calendar-outline" size={40} color={P} />
          </LinearGradient>
          <Text style={ms.emptyTitle}>{t("pets.appointments.emptyTitle")}</Text>
          <Text style={ms.emptySub}>{t("pets.appointments.emptySub")}</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ApptCard
              appt={item}
              statusLabels={statusLabels}
              t={t}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/evcilim/${petId}/appointments/${item.id}` as Parameters<typeof router.push>[0]);
              }}
            />
          )}
        />
      )}

      <AddSheet
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSave={handleAdd}
      />
    </View>
  );
}
const ms = StyleSheet.create({
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: WHITE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: DARK },
  headerSub:   { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY },
  addBtn:      { borderRadius: 20, overflow: "hidden" },
  addGrad:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 9 },
  addTxt:      { fontSize: 13, fontFamily: "Inter_700Bold", color: WHITE },
  center:      { flex: 1, alignItems: "center", justifyContent: "center" },
  empty:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 40 },
  emptyCircle: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  emptyTitle:  { fontSize: 20, fontFamily: "Inter_700Bold", color: DARK },
  emptySub:    { fontSize: 14, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center", lineHeight: 22 },
});
