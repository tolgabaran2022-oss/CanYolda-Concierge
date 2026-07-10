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

function formatDate(s: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return s; }
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return 999;
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

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
      style={({ pressed }) => [vc.card, pressed && { opacity: 0.85 }]}
      onPress={onEdit}
    >
      <View style={vc.top}>
        <View style={[vc.iconWrap, { backgroundColor: `${statusColor}18` }]}>
          <Ionicons name="shield-checkmark-outline" size={22} color={statusColor} />
        </View>
        <View style={vc.info}>
          <Text style={vc.name}>{vacc.vaccineName}</Text>
          {vacc.vaccineType ? <Text style={vc.type}>{vacc.vaccineType}</Text> : null}
        </View>
        <View style={[vc.statusBadge, { backgroundColor: `${statusColor}18` }]}>
          <Text style={[vc.statusTxt, { color: statusColor }]}>{STATUS_LABELS[vacc.status]}</Text>
        </View>
      </View>

      <View style={vc.details}>
        <View style={vc.detailItem}>
          <Ionicons name="calendar-outline" size={13} color={BODY} />
          <Text style={vc.detailLabel}>Yapıldı</Text>
          <Text style={vc.detailValue}>{formatDate(vacc.administeredDate)}</Text>
        </View>
        {vacc.nextDueDate ? (
          <View style={vc.detailItem}>
            <Ionicons name="arrow-forward-circle-outline" size={13} color={days !== null && days < 0 ? RED : BODY} />
            <Text style={vc.detailLabel}>Sonraki</Text>
            <Text style={[vc.detailValue, days !== null && days < 0 && { color: RED }]}>
              {formatDate(vacc.nextDueDate)}
              {days !== null ? (days < 0 ? ` (${Math.abs(days)}g geçti)` : days === 0 ? " (Bugün)" : ` (${days}g)`) : ""}
            </Text>
          </View>
        ) : null}
        {vacc.clinicName ? (
          <View style={vc.detailItem}>
            <Ionicons name="business-outline" size={13} color={BODY} />
            <Text style={vc.detailLabel}>Klinik</Text>
            <Text style={vc.detailValue}>{vacc.clinicName}</Text>
          </View>
        ) : null}
      </View>

      <Pressable style={vc.deleteBtn} onPress={onDelete} hitSlop={8}>
        <Ionicons name="trash-outline" size={16} color={RED} />
      </Pressable>
    </Pressable>
  );
}
const vc = StyleSheet.create({
  card:        { backgroundColor: WHITE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 10, position: "relative", ...Platform.select({ ios: { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 }, android: { elevation: 2 } }) },
  top:         { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  iconWrap:    { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  info:        { flex: 1 },
  name:        { fontSize: 15, fontFamily: "Inter_700Bold", color: DARK },
  type:        { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, marginTop: 2 },
  statusBadge: { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  statusTxt:   { fontSize: 11, fontFamily: "Inter_700Bold" },
  details:     { gap: 6 },
  detailItem:  { flexDirection: "row", alignItems: "center", gap: 6 },
  detailLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, width: 56 },
  detailValue: { fontSize: 12, fontFamily: "Inter_500Medium", color: DARK, flex: 1 },
  deleteBtn:   { position: "absolute", top: 12, right: 12, padding: 6 },
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
  const [vaccineName, setVaccineName]       = useState(initial?.vaccineName ?? "");
  const [vaccineType, setVaccineType]       = useState(initial?.vaccineType ?? "");
  const [administeredDate, setAdmin]        = useState(initial?.administeredDate ?? "");
  const [nextDueDate, setNextDue]           = useState(initial?.nextDueDate ?? "");
  const [veterinarianName, setVetName]      = useState(initial?.veterinarianName ?? "");
  const [clinicName, setClinicName]         = useState(initial?.clinicName ?? "");
  const [serialNumber, setSerial]           = useState(initial?.serialNumber ?? "");
  const [description, setDescription]      = useState(initial?.description ?? "");
  const [status, setStatus]                 = useState<ApiVaccination["status"]>(initial?.status ?? "current");
  const [saving, setSaving]                 = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible && initial) {
      setVaccineName(initial.vaccineName ?? "");
      setVaccineType(initial.vaccineType ?? "");
      setAdmin(initial.administeredDate ?? "");
      setNextDue(initial.nextDueDate ?? "");
      setVetName(initial.veterinarianName ?? "");
      setClinicName(initial.clinicName ?? "");
      setSerial(initial.serialNumber ?? "");
      setDescription(initial.description ?? "");
      setStatus(initial.status ?? "current");
    } else if (visible && !initial) {
      setVaccineName(""); setVaccineType(""); setAdmin(""); setNextDue(""); setVetName(""); setClinicName(""); setSerial(""); setDescription(""); setStatus("current");
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

  const fldStyle = {
    backgroundColor: "#F6F1FF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14 as const, fontFamily: "Inter_400Regular" as const, color: DARK, borderWidth: 1.5, borderColor: `${P}22`,
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: WHITE }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[sh.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={DARK} />
          </Pressable>
          <Text style={sh.title}>{initial?.id ? "Aşıyı Düzenle" : "Aşı Ekle"}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sh.form} keyboardShouldPersistTaps="handled">
          <View style={sh.field}><Text style={sh.label}>Aşı Adı *</Text><TextInput style={fldStyle} value={vaccineName} onChangeText={setVaccineName} placeholder="Örn. Kuduz aşısı" placeholderTextColor={BODY} /></View>
          <View style={sh.field}><Text style={sh.label}>Aşı Türü</Text><TextInput style={fldStyle} value={vaccineType} onChangeText={setVaccineType} placeholder="Örn. Canlı, Ölü, Kombine" placeholderTextColor={BODY} /></View>
          <View style={sh.field}><Text style={sh.label}>Uygulanma Tarihi *</Text><TextInput style={fldStyle} value={administeredDate} onChangeText={setAdmin} placeholder="YYYY-AA-GG" placeholderTextColor={BODY} /></View>
          <View style={sh.field}><Text style={sh.label}>Sonraki Tarih</Text><TextInput style={fldStyle} value={nextDueDate} onChangeText={setNextDue} placeholder="YYYY-AA-GG" placeholderTextColor={BODY} /></View>
          <View style={sh.field}><Text style={sh.label}>Veteriner</Text><TextInput style={fldStyle} value={veterinarianName} onChangeText={setVetName} placeholder="Dr. Ahmet Yılmaz" placeholderTextColor={BODY} /></View>
          <View style={sh.field}><Text style={sh.label}>Klinik</Text><TextInput style={fldStyle} value={clinicName} onChangeText={setClinicName} placeholder="İstanbul Pet Kliniği" placeholderTextColor={BODY} /></View>
          <View style={sh.field}><Text style={sh.label}>Seri No</Text><TextInput style={fldStyle} value={serialNumber} onChangeText={setSerial} placeholder="Aşı seri numarası" placeholderTextColor={BODY} /></View>
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
          <View style={sh.field}><Text style={sh.label}>Notlar</Text><TextInput style={[fldStyle, { minHeight: 80, textAlignVertical: "top" }]} value={description} onChangeText={setDescription} placeholder="Aşı hakkında ek notlar..." placeholderTextColor={BODY} multiline /></View>

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
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14 },
  title:       { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK },
  form:        { paddingHorizontal: 20, gap: 14, paddingBottom: 40 },
  field:       { gap: 6 },
  label:       { fontSize: 12, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: 0.2 },
  statusPill:  { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER },
  statusPillActive: { borderColor: P, backgroundColor: `${P}10` },
  statusTxt:   { fontSize: 12, fontFamily: "Inter_500Medium", color: BODY },
  saveBtn:     { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  saveGrad:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  saveTxt:     { fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE },
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
  const [loading, setLoading] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editing, setEditing] = useState<ApiVaccination | null>(null);

  const load = useCallback(async () => {
    if (!petId || !user) return;
    setLoading(true);
    try { setVaccinations(await apiGetVaccinations(petId, user.id)); }
    finally { setLoading(false); }
  }, [petId, user?.id]);

  useEffect(() => { load(); }, [load]);

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
        text: "Sil",
        style: "destructive",
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
        <View>
          <Text style={ms.headerTitle}>Aşılar</Text>
          {pet ? <Text style={ms.headerSub}>{pet.name}</Text> : null}
        </View>
        <Pressable
          style={ms.addBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditing(null); setSheetVisible(true); }}
        >
          <LinearGradient colors={[P2, P]} style={ms.addGrad}>
            <Ionicons name="add" size={22} color={WHITE} />
          </LinearGradient>
        </Pressable>
      </View>

      {loading ? (
        <View style={ms.center}><ActivityIndicator color={P} size="large" /></View>
      ) : vaccinations.length === 0 ? (
        <View style={ms.empty}>
          <LinearGradient colors={[`${P2}20`, `${P}10`]} style={ms.emptyCircle}>
            <Ionicons name="shield-checkmark-outline" size={40} color={P} />
          </LinearGradient>
          <Text style={ms.emptyTitle}>Aşı Kaydı Yok</Text>
          <Text style={ms.emptySub}>İlk aşı kaydını eklemek için + butonuna dokun</Text>
        </View>
      ) : (
        <FlatList
          data={vaccinations}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
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
  header:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14 },
  backBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: WHITE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },
  headerTitle:{ fontSize: 18, fontFamily: "Inter_700Bold", color: DARK },
  headerSub:  { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY },
  addBtn:     { borderRadius: 19, overflow: "hidden" },
  addGrad:    { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  center:     { flex: 1, alignItems: "center", justifyContent: "center" },
  empty:      { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 40 },
  emptyCircle:{ width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: DARK },
  emptySub:   { fontSize: 14, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center", lineHeight: 22 },
});
