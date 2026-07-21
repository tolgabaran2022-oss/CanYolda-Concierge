import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { usePets } from "@/contexts/PetsContext";
import {
  apiGetVaccinations,
  apiCreateVaccination,
  apiUpdateVaccination,
  apiDeleteVaccination,
  type ApiVaccination,
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

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 },
  android: { elevation: 2 },
  default: {},
});

const STATUS_COLORS: Record<ApiVaccination["status"], string> = {
  current:   GREEN,
  upcoming:  ORANGE,
  overdue:   RED,
  scheduled: "#007AFF",
};

type FilterKey = "all" | "current" | "upcoming" | "overdue";
const FILTER_KEYS: FilterKey[] = ["all", "current", "upcoming", "overdue"];

const STATUSES: ApiVaccination["status"][] = ["current", "upcoming", "overdue", "scheduled"];

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

/* ── Add/Edit Sheet ────────────────────────────────────── */
function AddEditSheet({
  visible, initial, onClose, onSave,
}: {
  visible: boolean;
  initial: Partial<ApiVaccination> | null;
  onClose: () => void;
  onSave: (data: Omit<ApiVaccination, "id" | "petId" | "userId" | "createdAt" | "updatedAt">) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [vaccineName, setVaccineName] = useState(initial?.vaccineName ?? "");
  const [vaccineType, setVaccineType] = useState(initial?.vaccineType ?? "");
  const [administeredDate, setAdmin]  = useState(initial?.administeredDate ?? "");
  const [nextDueDate, setNextDue]     = useState(initial?.nextDueDate ?? "");
  const [veterinarianName, setVetName]= useState(initial?.veterinarianName ?? "");
  const [clinicName, setClinicName]   = useState(initial?.clinicName ?? "");
  const [serialNumber, setSerial]     = useState(initial?.serialNumber ?? "");
  const [description, setDescription]= useState(initial?.description ?? "");
  const [status, setStatus]           = useState<ApiVaccination["status"]>(initial?.status ?? "current");
  const [saving, setSaving]           = useState(false);
  const insets = useSafeAreaInsets();

  const statusLabels: Record<ApiVaccination["status"], string> = {
    current:   t("pets.vaccinations.statusLabels.current"),
    upcoming:  t("pets.vaccinations.statusLabels.upcoming"),
    overdue:   t("pets.vaccinations.statusLabels.overdue"),
    scheduled: t("pets.vaccinations.statusLabels.scheduled"),
  };

  useEffect(() => {
    if (visible && initial) {
      setVaccineName(initial.vaccineName ?? ""); setVaccineType(initial.vaccineType ?? "");
      setAdmin(initial.administeredDate ?? ""); setNextDue(initial.nextDueDate ?? "");
      setVetName(initial.veterinarianName ?? ""); setClinicName(initial.clinicName ?? "");
      setSerial(initial.serialNumber ?? ""); setDescription(initial.description ?? "");
      setStatus(initial.status ?? "current");
    } else if (visible && !initial) {
      setVaccineName(""); setVaccineType(""); setAdmin(""); setNextDue("");
      setVetName(""); setClinicName(""); setSerial(""); setDescription(""); setStatus("current");
    }
  }, [visible, initial]);

  const handleSave = async () => {
    if (!vaccineName.trim()) { Alert.alert(t("common.error"), t("pets.vaccinations.errNameRequired")); return; }
    if (!administeredDate.trim()) { Alert.alert(t("common.error"), t("pets.vaccinations.errDateRequired")); return; }
    setSaving(true);
    try {
      await onSave({ vaccineName, vaccineType, administeredDate, nextDueDate, veterinarianName, clinicName, serialNumber, description, status });
      onClose();
    } catch { Alert.alert(t("common.error"), t("pets.vaccinations.errSave")); }
    finally { setSaving(false); }
  };

  const fld = { backgroundColor: BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 as const, fontFamily: "Inter_400Regular" as const, color: DARK, borderWidth: 1.5 as const, borderColor: `${P}22` };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: WHITE }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[sh.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={onClose} hitSlop={8}><Icon name="close" size={24} color={DARK} /></Pressable>
          <Text style={sh.title}>{initial?.id ? t("pets.vaccinations.editTitle") : t("pets.vaccinations.addTitle")}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sh.form} keyboardShouldPersistTaps="handled">
          <View style={sh.field}><Text style={sh.label}>{t("pets.vaccinations.nameLabel")}</Text><TextInput style={fld} value={vaccineName} onChangeText={setVaccineName} placeholder={t("pets.vaccinations.namePlaceholder")} placeholderTextColor={BODY} /></View>
          <View style={sh.field}><Text style={sh.label}>{t("pets.vaccinations.typeLabel")}</Text><TextInput style={fld} value={vaccineType} onChangeText={setVaccineType} placeholder={t("pets.vaccinations.typePlaceholder")} placeholderTextColor={BODY} /></View>
          <View style={sh.field}><Text style={sh.label}>{t("pets.vaccinations.adminDateLabel")}</Text><TextInput style={fld} value={administeredDate} onChangeText={setAdmin} placeholder="2026-05-12" placeholderTextColor={BODY} /></View>
          <View style={sh.field}><Text style={sh.label}>{t("pets.vaccinations.nextDateLabel")}</Text><TextInput style={fld} value={nextDueDate} onChangeText={setNextDue} placeholder="2027-05-12" placeholderTextColor={BODY} /></View>
          <View style={sh.field}><Text style={sh.label}>{t("pets.vaccinations.vetLabel")}</Text><TextInput style={fld} value={veterinarianName} onChangeText={setVetName} placeholder="Dr. Ahmet Yılmaz" placeholderTextColor={BODY} /></View>
          <View style={sh.field}><Text style={sh.label}>{t("pets.vaccinations.clinicLabel")}</Text><TextInput style={fld} value={clinicName} onChangeText={setClinicName} placeholder="İstanbul Pet Kliniği" placeholderTextColor={BODY} /></View>
          <View style={sh.field}><Text style={sh.label}>{t("pets.vaccinations.serialLabel")}</Text><TextInput style={fld} value={serialNumber} onChangeText={setSerial} placeholder={t("pets.vaccinations.serialPlaceholder")} placeholderTextColor={BODY} /></View>
          <View style={sh.field}>
            <Text style={sh.label}>{t("pets.vaccinations.statusLabel")}</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {STATUSES.map((s) => (
                <Pressable key={s} style={[sh.statusPill, status === s && sh.statusPillActive]} onPress={() => setStatus(s)}>
                  <Text style={[sh.statusTxt, status === s && { color: P, fontFamily: "Inter_700Bold" }]}>{statusLabels[s]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={sh.field}><Text style={sh.label}>{t("pets.vaccinations.notesLabel")}</Text><TextInput style={[fld, { minHeight: 80, textAlignVertical: "top" }]} value={description} onChangeText={setDescription} placeholder="Ek notlar..." placeholderTextColor={BODY} multiline /></View>
          <Pressable style={sh.saveBtn} onPress={handleSave} disabled={saving}>
            <LinearGradient colors={[P2, P]} style={sh.saveGrad}>
              <Icon name={saving ? "hourglass-outline" : "checkmark-circle-outline"} size={20} color={WHITE} />
              <Text style={sh.saveTxt}>{saving ? t("common.saving") : t("common.save")}</Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const sh = StyleSheet.create({
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14 },
  title:        { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK },
  form:         { paddingHorizontal: 20, gap: 14, paddingBottom: 40 },
  field:        { gap: 6 },
  label:        { fontSize: 12, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: 0.2 },
  statusPill:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER },
  statusPillActive: { borderColor: P, backgroundColor: `${P}10` },
  statusTxt:    { fontSize: 12, fontFamily: "Inter_500Medium", color: BODY },
  saveBtn:      { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  saveGrad:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  saveTxt:      { fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE },
});

/* ── Main Screen ───────────────────────────────────────── */
export default function VaccinationsScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getPet } = usePets();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pet = getPet(petId ?? "");
  const [vaccinations, setVaccinations] = useState<ApiVaccination[]>([]);
  const [loading, setLoading]           = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editing, setEditing]           = useState<ApiVaccination | null>(null);
  const [filter, setFilter]             = useState<FilterKey>("all");

  const filterLabels: Record<FilterKey, string> = {
    all:      t("pets.vaccinations.filterLabels.all"),
    current:  t("pets.vaccinations.filterLabels.current"),
    upcoming: t("pets.vaccinations.filterLabels.upcoming"),
    overdue:  t("pets.vaccinations.filterLabels.overdue"),
  };

  const statusLabels: Record<ApiVaccination["status"], string> = {
    current:   t("pets.vaccinations.statusLabels.current"),
    upcoming:  t("pets.vaccinations.statusLabels.upcoming"),
    overdue:   t("pets.vaccinations.statusLabels.overdue"),
    scheduled: t("pets.vaccinations.statusLabels.scheduled"),
  };

  const load = useCallback(async () => {
    if (!petId || !user) return;
    setLoading(true);
    try { setVaccinations(await apiGetVaccinations(petId)); }
    finally { setLoading(false); }
  }, [petId, user?.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "all" ? vaccinations : vaccinations.filter((v) => v.status === filter);

  const handleSave = async (data: Omit<ApiVaccination, "id" | "petId" | "userId" | "createdAt" | "updatedAt">) => {
    if (!petId || !user) return;
    if (editing) {
      const updated = await apiUpdateVaccination(petId, editing.id, data);
      setVaccinations((prev) => prev.map((v) => v.id === editing.id ? updated : v));
    } else {
      const created = await apiCreateVaccination(petId, data);
      setVaccinations((prev) => [created, ...prev]);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = (vacc: ApiVaccination) => {
    Alert.alert(t("common.delete"), `"${vacc.vaccineName}" ${t("pets.vaccinations.deleteConfirmSuffix")}`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"), style: "destructive",
        onPress: async () => {
          if (!petId || !user) return;
          await apiDeleteVaccination(petId, vacc.id);
          setVaccinations((prev) => prev.filter((v) => v.id !== vacc.id));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <View style={[ms.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={ms.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Icon name="chevron-back" size={22} color={DARK} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={ms.headerTitle}>{t("pets.vaccinations.title")}</Text>
          {pet ? <Text style={ms.headerSub}>{pet.name}</Text> : null}
        </View>
        <Pressable
          style={ms.addBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditing(null); setSheetVisible(true); }}
        >
          <LinearGradient colors={[P2, P]} style={ms.addGrad}>
            <Icon name="add" size={20} color={WHITE} />
            <Text style={ms.addTxt}>{t("pets.vaccinations.add")}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {loading ? (
        <View style={ms.center}><ActivityIndicator color={P} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(v) => v.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={
            <>
              {/* Info banner */}
              <View style={ib.card}>
                <View style={ib.text}>
                  <Text style={ib.title}>{t("pets.vaccinations.bannerTitle")}</Text>
                  <Text style={ib.desc}>{t("pets.vaccinations.bannerDesc")}</Text>
                </View>
                <View style={ib.iconWrap}>
                  <Icon name="shield-checkmark" size={28} color={P} />
                </View>
              </View>
              {/* Filter chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {FILTER_KEYS.map((fk) => {
                    const isActive = fk === filter;
                    return (
                      <Pressable
                        key={fk}
                        style={[fc.chip, isActive && fc.chipActive]}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter(fk); }}
                      >
                        <Text style={[fc.chipTxt, isActive && fc.chipTxtActive]}>{filterLabels[fk]}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          }
          ListEmptyComponent={
            <View style={ms.empty}>
              <LinearGradient colors={[`${P2}20`, `${P}10`]} style={ms.emptyCircle}>
                <Icon name="shield-checkmark-outline" size={36} color={P} />
              </LinearGradient>
              <Text style={ms.emptyTitle}>
                {filter === "all" ? t("pets.vaccinations.emptyTitle") : `${filterLabels[filter]} ${t("pets.vaccinations.tryOtherFilter")}`}
              </Text>
              <Text style={ms.emptySub}>
                {filter === "all" ? t("pets.vaccinations.emptySub") : t("pets.vaccinations.tryOtherFilter")}
              </Text>
            </View>
          }
          ListFooterComponent={vaccinations.length > 0 ? (
            <View style={fn.wrap}>
              <Icon name="time-outline" size={14} color={BODY} />
              <Text style={fn.txt}>{t("pets.vaccinations.notification")}</Text>
            </View>
          ) : null}
          renderItem={({ item }) => {
            const statusColor = STATUS_COLORS[item.status] ?? BODY;
            const days = item.nextDueDate ? daysUntil(item.nextDueDate) : null;
            return (
              <Pressable
                style={({ pressed }) => [vc.card, pressed && { opacity: 0.88 }]}
                onPress={() => { setEditing(item); setSheetVisible(true); }}
              >
                <View style={vc.top}>
                  <View style={[vc.iconWrap, { backgroundColor: `${statusColor}18` }]}>
                    <Icon name="medkit-outline" size={20} color={statusColor} />
                  </View>
                  <View style={vc.nameWrap}>
                    <Text style={vc.name} numberOfLines={1}>{item.vaccineName}</Text>
                    {item.vaccineType ? <Text style={vc.type}>{item.vaccineType}</Text> : null}
                  </View>
                  <View style={[vc.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                    <Text style={[vc.statusTxt, { color: statusColor }]}>{statusLabels[item.status]}</Text>
                  </View>
                </View>
                <View style={vc.dateRow}>
                  <View style={vc.dateCol}>
                    <Text style={vc.dateLabel}>{t("pets.vaccinations.administeredDate")}</Text>
                    <Text style={vc.dateValue}>{formatDate(item.administeredDate)}</Text>
                  </View>
                  <View style={vc.divider} />
                  <View style={vc.dateCol}>
                    <Text style={vc.dateLabel}>{t("pets.vaccinations.nextDate")}</Text>
                    <Text style={[vc.dateValue, days !== null && days < 0 && { color: RED }]}>
                      {item.nextDueDate ? formatDate(item.nextDueDate) : "—"}
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={16} color={BODY} style={{ alignSelf: "center" }} />
                </View>
                <Pressable style={vc.deleteBtn} onPress={() => handleDelete(item)} hitSlop={10}>
                  <Icon name="trash-outline" size={15} color={RED} />
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}

      <AddEditSheet
        visible={sheetVisible}
        initial={editing}
        onClose={() => { setSheetVisible(false); setEditing(null); }}
        onSave={handleSave}
      />
    </View>
  );
}

const ib = StyleSheet.create({
  card:    { flexDirection: "row", alignItems: "center", backgroundColor: `${P}0C`, borderRadius: 16, padding: 16, gap: 12, marginBottom: 16, borderWidth: 1, borderColor: `${P}20` },
  text:    { flex: 1, gap: 4 },
  title:   { fontSize: 14, fontFamily: "Inter_700Bold", color: DARK },
  desc:    { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, lineHeight: 18 },
  iconWrap:{ width: 48, height: 48, borderRadius: 24, backgroundColor: `${P}18`, alignItems: "center", justifyContent: "center" },
});
const fc = StyleSheet.create({
  chip:        { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50, backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER },
  chipActive:  { backgroundColor: P, borderColor: P },
  chipTxt:     { fontSize: 13, fontFamily: "Inter_500Medium", color: BODY },
  chipTxtActive:{ color: WHITE, fontFamily: "Inter_700Bold" },
});
const vc = StyleSheet.create({
  card:        { backgroundColor: WHITE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 10, position: "relative", ...CARD_SHADOW },
  top:         { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  iconWrap:    { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  nameWrap:    { flex: 1 },
  name:        { fontSize: 15, fontFamily: "Inter_700Bold", color: DARK },
  type:        { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, marginTop: 2 },
  statusBadge: { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  statusTxt:   { fontSize: 11, fontFamily: "Inter_700Bold" },
  dateRow:     { flexDirection: "row", alignItems: "center", backgroundColor: BG, borderRadius: 12, padding: 12 },
  dateCol:     { flex: 1, gap: 4 },
  divider:     { width: 1, height: 32, backgroundColor: BORDER, marginHorizontal: 12 },
  dateLabel:   { fontSize: 10, fontFamily: "Inter_600SemiBold", color: BODY, textTransform: "uppercase", letterSpacing: 0.4 },
  dateValue:   { fontSize: 13, fontFamily: "Inter_600SemiBold", color: DARK },
  deleteBtn:   { position: "absolute", top: 14, right: 14, padding: 4 },
});
const fn = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 16 },
  txt:  { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, flex: 1, lineHeight: 18 },
});
const ms = StyleSheet.create({
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: WHITE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: DARK },
  headerSub:   { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY },
  addBtn:      { borderRadius: 20, overflow: "hidden" },
  addGrad:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 9 },
  addTxt:      { fontSize: 13, fontFamily: "Inter_700Bold", color: WHITE },
  center:      { flex: 1, alignItems: "center", justifyContent: "center" },
  empty:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40, paddingTop: 40 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle:  { fontSize: 18, fontFamily: "Inter_700Bold", color: DARK, textAlign: "center" },
  emptySub:    { fontSize: 13, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center", lineHeight: 20 },
});
