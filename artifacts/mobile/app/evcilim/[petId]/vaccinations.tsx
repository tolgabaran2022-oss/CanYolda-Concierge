import { Ionicons } from "@expo/vector-icons";
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

const STATUS_LABELS: Record<ApiVaccination["status"], string> = {
  current:   "Güncel",
  upcoming:  "Yaklaşıyor",
  overdue:   "Gecikmiş",
  scheduled: "Planlandı",
};
const STATUS_COLORS: Record<ApiVaccination["status"], string> = {
  current:   GREEN,
  upcoming:  ORANGE,
  overdue:   RED,
  scheduled: "#007AFF",
};

type FilterKey = "all" | "current" | "upcoming" | "overdue";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",      label: "Tümü" },
  { key: "current",  label: "Güncel" },
  { key: "upcoming", label: "Yaklaşıyor" },
  { key: "overdue",  label: "Gecikmiş" },
];

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

/* ── Info Banner ──────────────────────────────────────── */
function InfoBanner() {
  return (
    <View style={ib.card}>
      <View style={ib.text}>
        <Text style={ib.title}>Aşı Takibi</Text>
        <Text style={ib.desc}>
          Aşı takvimini düzenli olarak takip ederek dostunuzun sağlığını koruyabilirsiniz.
        </Text>
      </View>
      <View style={ib.iconWrap}>
        <Ionicons name="shield-checkmark" size={28} color={P} />
      </View>
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

/* ── Filter Chips ─────────────────────────────────────── */
function FilterChips({ active, onSelect }: { active: FilterKey; onSelect: (k: FilterKey) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {FILTERS.map((f) => {
          const isActive = f.key === active;
          return (
            <Pressable
              key={f.key}
              style={[fc.chip, isActive && fc.chipActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(f.key); }}
            >
              <Text style={[fc.chipTxt, isActive && fc.chipTxtActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
const fc = StyleSheet.create({
  chip:        { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50, backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER },
  chipActive:  { backgroundColor: P, borderColor: P },
  chipTxt:     { fontSize: 13, fontFamily: "Inter_500Medium", color: BODY },
  chipTxtActive:{ color: WHITE, fontFamily: "Inter_700Bold" },
});

/* ── Vaccination Card ─────────────────────────────────── */
function VaccCard({
  vacc,
  onEdit,
  onDelete,
}: {
  vacc: ApiVaccination;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusColor = STATUS_COLORS[vacc.status] ?? BODY;
  const days = vacc.nextDueDate ? daysUntil(vacc.nextDueDate) : null;

  return (
    <Pressable
      style={({ pressed }) => [vc.card, pressed && { opacity: 0.88 }]}
      onPress={onEdit}
    >
      {/* Top row: icon + name + status badge */}
      <View style={vc.top}>
        <View style={[vc.iconWrap, { backgroundColor: `${statusColor}18` }]}>
          <Ionicons name="medkit-outline" size={20} color={statusColor} />
        </View>
        <View style={vc.nameWrap}>
          <Text style={vc.name} numberOfLines={1}>{vacc.vaccineName}</Text>
          {vacc.vaccineType ? <Text style={vc.type}>{vacc.vaccineType}</Text> : null}
        </View>
        <View style={[vc.statusBadge, { backgroundColor: `${statusColor}15` }]}>
          <Text style={[vc.statusTxt, { color: statusColor }]}>{STATUS_LABELS[vacc.status]}</Text>
        </View>
      </View>

      {/* Two-column date section */}
      <View style={vc.dateRow}>
        <View style={vc.dateCol}>
          <Text style={vc.dateLabel}>Yapılma Tarihi</Text>
          <Text style={vc.dateValue}>{formatDate(vacc.administeredDate)}</Text>
        </View>
        <View style={vc.divider} />
        <View style={vc.dateCol}>
          <Text style={vc.dateLabel}>Sonraki Tarih</Text>
          <Text style={[vc.dateValue, days !== null && days < 0 && { color: RED }]}>
            {vacc.nextDueDate ? formatDate(vacc.nextDueDate) : "—"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={BODY} style={{ alignSelf: "center" }} />
      </View>

      {/* Delete */}
      <Pressable style={vc.deleteBtn} onPress={onDelete} hitSlop={10}>
        <Ionicons name="trash-outline" size={15} color={RED} />
      </Pressable>
    </Pressable>
  );
}
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

/* ── Add/Edit Sheet ────────────────────────────────────── */
const STATUSES: ApiVaccination["status"][] = ["current", "upcoming", "overdue", "scheduled"];

function AddEditSheet({
  visible,
  initial,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial: Partial<ApiVaccination> | null;
  onClose: () => void;
  onSave: (data: Omit<ApiVaccination, "id" | "petId" | "userId" | "createdAt" | "updatedAt">) => Promise<void>;
}) {
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
    if (!vaccineName.trim()) { Alert.alert("Hata", "Aşı adını giriniz."); return; }
    if (!administeredDate.trim()) { Alert.alert("Hata", "Uygulanma tarihini giriniz."); return; }
    setSaving(true);
    try {
      await onSave({ vaccineName, vaccineType, administeredDate, nextDueDate, veterinarianName, clinicName, serialNumber, description, status });
      onClose();
    } catch { Alert.alert("Hata", "Kaydedilemedi."); }
    finally { setSaving(false); }
  };

  const fld = { backgroundColor: BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 as const, fontFamily: "Inter_400Regular" as const, color: DARK, borderWidth: 1.5 as const, borderColor: `${P}22` };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: WHITE }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[sh.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={24} color={DARK} /></Pressable>
          <Text style={sh.title}>{initial?.id ? "Aşıyı Düzenle" : "Aşı Ekle"}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sh.form} keyboardShouldPersistTaps="handled">
          <View style={sh.field}><Text style={sh.label}>Aşı Adı *</Text><TextInput style={fld} value={vaccineName} onChangeText={setVaccineName} placeholder="Örn. Kuduz aşısı" placeholderTextColor={BODY} /></View>
          <View style={sh.field}><Text style={sh.label}>Aşı Türü</Text><TextInput style={fld} value={vaccineType} onChangeText={setVaccineType} placeholder="Örn. Canlı, Ölü, Kombine" placeholderTextColor={BODY} /></View>
          <View style={sh.field}><Text style={sh.label}>Uygulanma Tarihi * (YYYY-AA-GG)</Text><TextInput style={fld} value={administeredDate} onChangeText={setAdmin} placeholder="2026-05-12" placeholderTextColor={BODY} /></View>
          <View style={sh.field}><Text style={sh.label}>Sonraki Tarih (YYYY-AA-GG)</Text><TextInput style={fld} value={nextDueDate} onChangeText={setNextDue} placeholder="2027-05-12" placeholderTextColor={BODY} /></View>
          <View style={sh.field}><Text style={sh.label}>Veteriner</Text><TextInput style={fld} value={veterinarianName} onChangeText={setVetName} placeholder="Dr. Ahmet Yılmaz" placeholderTextColor={BODY} /></View>
          <View style={sh.field}><Text style={sh.label}>Klinik</Text><TextInput style={fld} value={clinicName} onChangeText={setClinicName} placeholder="İstanbul Pet Kliniği" placeholderTextColor={BODY} /></View>
          <View style={sh.field}><Text style={sh.label}>Seri No</Text><TextInput style={fld} value={serialNumber} onChangeText={setSerial} placeholder="Aşı seri numarası" placeholderTextColor={BODY} /></View>
          <View style={sh.field}>
            <Text style={sh.label}>Durum</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {STATUSES.map((s) => (
                <Pressable key={s} style={[sh.statusPill, status === s && sh.statusPillActive]} onPress={() => setStatus(s)}>
                  <Text style={[sh.statusTxt, status === s && { color: P, fontFamily: "Inter_700Bold" }]}>{STATUS_LABELS[s]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={sh.field}><Text style={sh.label}>Notlar</Text><TextInput style={[fld, { minHeight: 80, textAlignVertical: "top" }]} value={description} onChangeText={setDescription} placeholder="Ek notlar..." placeholderTextColor={BODY} multiline /></View>
          <Pressable style={sh.saveBtn} onPress={handleSave} disabled={saving}>
            <LinearGradient colors={[P2, P]} style={sh.saveGrad}>
              <Ionicons name={saving ? "hourglass-outline" : "checkmark-circle-outline"} size={20} color={WHITE} />
              <Text style={sh.saveTxt}>{saving ? "Kaydediliyor..." : "Kaydet"}</Text>
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

/* ── Footer Note ──────────────────────────────────────── */
function FooterNote() {
  return (
    <View style={fn.wrap}>
      <Ionicons name="time-outline" size={14} color={BODY} />
      <Text style={fn.txt}>Aşı zamanları yaklaştığında size bildirim göndereceğiz.</Text>
    </View>
  );
}
const fn = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 16 },
  txt:  { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, flex: 1, lineHeight: 18 },
});

/* ── Main Screen ───────────────────────────────────────── */
export default function VaccinationsScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
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

  const load = useCallback(async () => {
    if (!petId || !user) return;
    setLoading(true);
    try { setVaccinations(await apiGetVaccinations(petId, user.id)); }
    finally { setLoading(false); }
  }, [petId, user?.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "all" ? vaccinations : vaccinations.filter((v) => v.status === filter);

  const handleSave = async (data: Omit<ApiVaccination, "id" | "petId" | "userId" | "createdAt" | "updatedAt">) => {
    if (!petId || !user) return;
    if (editing) {
      const updated = await apiUpdateVaccination(petId, editing.id, user.id, data);
      setVaccinations((prev) => prev.map((v) => v.id === editing.id ? updated : v));
    } else {
      const created = await apiCreateVaccination(petId, user.id, data);
      setVaccinations((prev) => [created, ...prev]);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = (vacc: ApiVaccination) => {
    Alert.alert("Sil", `"${vacc.vaccineName}" silinecek?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil", style: "destructive",
        onPress: async () => {
          if (!petId || !user) return;
          await apiDeleteVaccination(petId, vacc.id, user.id);
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
          <Ionicons name="chevron-back" size={22} color={DARK} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={ms.headerTitle}>Aşılar</Text>
          {pet ? <Text style={ms.headerSub}>{pet.name}</Text> : null}
        </View>
        <Pressable
          style={ms.addBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditing(null); setSheetVisible(true); }}
        >
          <LinearGradient colors={[P2, P]} style={ms.addGrad}>
            <Ionicons name="add" size={20} color={WHITE} />
            <Text style={ms.addTxt}>Ekle</Text>
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
              <InfoBanner />
              <FilterChips active={filter} onSelect={setFilter} />
            </>
          }
          ListEmptyComponent={
            <View style={ms.empty}>
              <LinearGradient colors={[`${P2}20`, `${P}10`]} style={ms.emptyCircle}>
                <Ionicons name="shield-checkmark-outline" size={36} color={P} />
              </LinearGradient>
              <Text style={ms.emptyTitle}>
                {filter === "all" ? "Aşı Kaydı Yok" : `${FILTERS.find(f => f.key === filter)?.label} aşı yok`}
              </Text>
              <Text style={ms.emptySub}>
                {filter === "all" ? "İlk aşı kaydını eklemek için + Ekle butonuna dokun" : "Farklı bir filtre deneyin"}
              </Text>
            </View>
          }
          ListFooterComponent={vaccinations.length > 0 ? <FooterNote /> : null}
          renderItem={({ item }) => (
            <VaccCard
              vacc={item}
              onEdit={() => { setEditing(item); setSheetVisible(true); }}
              onDelete={() => handleDelete(item)}
            />
          )}
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
