import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { usePets, type Pet } from "@/contexts/PetsContext";
import {
  apiGetVaccinations,
  apiGetAppointments,
  apiGetNutrition,
  buildReminders,
  type ApiVaccination,
  type ApiAppointment,
  type ApiNutrition,
  type ApiReminder,
} from "@/lib/petManagementApi";

/* ── Palette ──────────────────────────────────────────────── */
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

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 14 },
  android: { elevation: 3 },
  default: {},
});

/* ── Type emoji map ──────────────────────────────────────── */
function petEmoji(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("kedi") || t.includes("cat")) return "🐱";
  if (t.includes("köpek") || t.includes("dog")) return "🐶";
  if (t.includes("kuş") || t.includes("bird")) return "🦜";
  if (t.includes("tavşan") || t.includes("rabbit")) return "🐰";
  if (t.includes("balık") || t.includes("fish")) return "🐟";
  return "🐾";
}

/* ── Formatters ──────────────────────────────────────────── */
function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  } catch { return dateStr; }
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return 999;
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

/* ══════════════════════════════════════════════════════════
   PET SELECTOR PILL ROW
══════════════════════════════════════════════════════════ */
function PetSelectorRow({
  pets,
  selectedId,
  onSelect,
  onAdd,
}: {
  pets: Pet[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={sel.row}
    >
      {pets.map((p) => {
        const active = p.id === selectedId;
        return (
          <Pressable
            key={p.id}
            style={[sel.pill, active && sel.pillActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(p.id); }}
          >
            {p.image ? (
              <Image source={{ uri: p.image }} style={sel.avatar} contentFit="cover" />
            ) : (
              <View style={[sel.avatarFallback, active && sel.avatarFallbackActive]}>
                <Text style={sel.avatarEmoji}>{petEmoji(p.type)}</Text>
              </View>
            )}
            <Text style={[sel.pillName, active && sel.pillNameActive]} numberOfLines={1}>
              {p.name}
            </Text>
          </Pressable>
        );
      })}
      <Pressable style={sel.addPill} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAdd(); }}>
        <LinearGradient colors={[P2, P]} style={sel.addGrad}>
          <Ionicons name="add" size={18} color={WHITE} />
        </LinearGradient>
        <Text style={sel.addTxt}>Ekle</Text>
      </Pressable>
    </ScrollView>
  );
}
const sel = StyleSheet.create({
  row:              { paddingHorizontal: 20, gap: 10, paddingVertical: 4 },
  pill:             { alignItems: "center", gap: 5, padding: 8, borderRadius: 16, backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER, minWidth: 64, ...CARD_SHADOW },
  pillActive:       { borderColor: P, backgroundColor: `${P}0C` },
  avatar:           { width: 42, height: 42, borderRadius: 21 },
  avatarFallback:   { width: 42, height: 42, borderRadius: 21, backgroundColor: `${P}18`, alignItems: "center", justifyContent: "center" },
  avatarFallbackActive: { backgroundColor: `${P}28` },
  avatarEmoji:      { fontSize: 22 },
  pillName:         { fontSize: 11, fontFamily: "Inter_500Medium", color: BODY, maxWidth: 60 },
  pillNameActive:   { color: P, fontFamily: "Inter_700Bold" },
  addPill:          { alignItems: "center", gap: 5, padding: 8, borderRadius: 16, minWidth: 64 },
  addGrad:          { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  addTxt:           { fontSize: 11, fontFamily: "Inter_500Medium", color: P },
});

/* ══════════════════════════════════════════════════════════
   PET PROFILE HERO CARD
══════════════════════════════════════════════════════════ */
function PetProfileCard({ pet, onEdit }: { pet: Pet; onEdit: () => void }) {
  return (
    <View style={[pc.card, CARD_SHADOW]}>
      <LinearGradient colors={[`${P2}20`, `${P}08`]} style={pc.grad} />
      <View style={pc.row}>
        <View style={pc.avatarWrap}>
          {pet.image ? (
            <Image source={{ uri: pet.image }} style={pc.avatar} contentFit="cover" />
          ) : (
            <LinearGradient colors={[P2, P]} style={pc.avatarFallback}>
              <Text style={pc.avatarEmoji}>{petEmoji(pet.type)}</Text>
            </LinearGradient>
          )}
          <View style={pc.statusDot} />
        </View>

        <View style={pc.info}>
          <Text style={pc.name}>{pet.name}</Text>
          <View style={pc.metaRow}>
            <Text style={pc.meta}>{pet.type}</Text>
            {pet.breed ? <><Text style={pc.dot}>·</Text><Text style={pc.meta}>{pet.breed}</Text></> : null}
          </View>
          {pet.age ? (
            <View style={pc.agePill}>
              <Ionicons name="calendar-outline" size={11} color={P} />
              <Text style={pc.ageTxt}>{pet.age}</Text>
            </View>
          ) : null}
        </View>

        <Pressable style={pc.editBtn} onPress={onEdit} hitSlop={8}>
          <LinearGradient colors={[P2, P]} style={pc.editGrad}>
            <Ionicons name="pencil" size={14} color={WHITE} />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}
const pc = StyleSheet.create({
  card:          { marginHorizontal: 20, marginTop: 14, borderRadius: 20, backgroundColor: WHITE, overflow: "hidden", borderWidth: 1, borderColor: BORDER, ...CARD_SHADOW },
  grad:          { ...StyleSheet.absoluteFillObject },
  row:           { flexDirection: "row", alignItems: "center", padding: 18, gap: 14 },
  avatarWrap:    { position: "relative" },
  avatar:        { width: 70, height: 70, borderRadius: 35, borderWidth: 2.5, borderColor: WHITE },
  avatarFallback:{ width: 70, height: 70, borderRadius: 35, alignItems: "center", justifyContent: "center" },
  avatarEmoji:   { fontSize: 34 },
  statusDot:     { position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: GREEN, borderWidth: 2, borderColor: WHITE },
  info:          { flex: 1, gap: 4 },
  name:          { fontSize: 20, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.4 },
  metaRow:       { flexDirection: "row", alignItems: "center", gap: 4 },
  meta:          { fontSize: 13, fontFamily: "Inter_400Regular", color: BODY },
  dot:           { fontSize: 13, color: BODY },
  agePill:       { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${P}10`, borderRadius: 50, paddingHorizontal: 9, paddingVertical: 3, alignSelf: "flex-start", marginTop: 2 },
  ageTxt:        { fontSize: 11, fontFamily: "Inter_600SemiBold", color: P },
  editBtn:       { borderRadius: 12, overflow: "hidden" },
  editGrad:      { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
});

/* ══════════════════════════════════════════════════════════
   QUICK STATUS CARDS
══════════════════════════════════════════════════════════ */
function QuickStatusCards({
  vaccinations,
  appointments,
  nutrition,
}: {
  vaccinations: ApiVaccination[];
  appointments: ApiAppointment[];
  nutrition: ApiNutrition | null;
}) {
  const nextVacc = vaccinations
    .filter((v) => v.nextDueDate)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))[0];

  const nextAppt = appointments
    .filter((a) => a.status === "upcoming")
    .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate))[0];

  const vaccDays = nextVacc ? daysUntil(nextVacc.nextDueDate) : null;
  const apptDays = nextAppt ? daysUntil(nextAppt.appointmentDate) : null;
  const vaccColor = vaccDays !== null ? (vaccDays < 0 ? RED : vaccDays <= 14 ? ORANGE : GREEN) : BODY;
  const apptColor = apptDays !== null ? (apptDays < 0 ? RED : apptDays <= 7 ? ORANGE : P) : BODY;

  let nutritionPct = 0;
  if (nutrition && nutrition.packageAmountGrams > 0) {
    nutritionPct = Math.min(100, Math.round((nutrition.remainingAmountGrams / nutrition.packageAmountGrams) * 100));
  }
  const nutritionColor = nutritionPct === 0 ? BODY : nutritionPct <= 20 ? RED : nutritionPct <= 40 ? ORANGE : GREEN;

  return (
    <View style={qs.row}>
      {/* Vaccination */}
      <View style={[qs.card, CARD_SHADOW]}>
        <View style={[qs.iconWrap, { backgroundColor: `${vaccColor}18` }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color={vaccColor} />
        </View>
        <Text style={qs.label}>Aşı</Text>
        <Text style={[qs.value, { color: vaccColor }]} numberOfLines={1}>
          {vaccDays === null ? "Kayıt yok" : vaccDays < 0 ? "Gecikti!" : vaccDays === 0 ? "Bugün" : `${vaccDays}g`}
        </Text>
        <Text style={qs.sub} numberOfLines={1}>
          {nextVacc ? nextVacc.vaccineName : "Aşı ekle"}
        </Text>
      </View>

      {/* Appointment */}
      <View style={[qs.card, CARD_SHADOW]}>
        <View style={[qs.iconWrap, { backgroundColor: `${apptColor}18` }]}>
          <Ionicons name="calendar-outline" size={20} color={apptColor} />
        </View>
        <Text style={qs.label}>Randevu</Text>
        <Text style={[qs.value, { color: apptColor }]} numberOfLines={1}>
          {apptDays === null ? "Yok" : apptDays < 0 ? "Gecikti!" : apptDays === 0 ? "Bugün" : `${apptDays}g`}
        </Text>
        <Text style={qs.sub} numberOfLines={1}>
          {nextAppt ? nextAppt.title : "Randevu ekle"}
        </Text>
      </View>

      {/* Nutrition */}
      <View style={[qs.card, CARD_SHADOW]}>
        <View style={[qs.iconWrap, { backgroundColor: `${nutritionColor}18` }]}>
          <Ionicons name="bag-handle-outline" size={20} color={nutritionColor} />
        </View>
        <Text style={qs.label}>Mama</Text>
        <Text style={[qs.value, { color: nutritionColor }]} numberOfLines={1}>
          {nutrition ? `%${nutritionPct}` : "Kayıt yok"}
        </Text>
        <Text style={qs.sub} numberOfLines={1}>
          {nutrition?.foodBrand ? `${nutrition.foodBrand}` : "Mama ekle"}
        </Text>
      </View>
    </View>
  );
}
const qs = StyleSheet.create({
  row:     { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginTop: 14 },
  card:    { flex: 1, backgroundColor: WHITE, borderRadius: 16, padding: 12, gap: 6, alignItems: "center", borderWidth: 1, borderColor: BORDER },
  iconWrap:{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  label:   { fontSize: 10, fontFamily: "Inter_600SemiBold", color: BODY, textTransform: "uppercase", letterSpacing: 0.5 },
  value:   { fontSize: 15, fontFamily: "Inter_700Bold", color: DARK },
  sub:     { fontSize: 10, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center" },
});

/* ══════════════════════════════════════════════════════════
   MANAGEMENT GRID
══════════════════════════════════════════════════════════ */
type GridItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
  badge?: number;
};

function ManagementGrid({
  petId,
  vaccinations,
  appointments,
}: {
  petId: string;
  vaccinations: ApiVaccination[];
  appointments: ApiAppointment[];
}) {
  const router = useRouter();
  const overdueVacc = vaccinations.filter((v) => v.status === "overdue").length;
  const upcomingAppt = appointments.filter((a) => a.status === "upcoming").length;

  const GRID: GridItem[] = [
    { key: "id",           label: "Kimlik",     icon: "id-card-outline",        color: "#5856D6", route: `/evcilim/${petId}/identification` },
    { key: "health",       label: "Sağlık",     icon: "heart-outline",          color: "#FF2D55", route: `/evcilim/${petId}/vaccinations`    },
    { key: "vaccinations", label: "Aşılar",     icon: "shield-checkmark-outline",color: ORANGE,   route: `/evcilim/${petId}/vaccinations`, badge: overdueVacc || undefined },
    { key: "appointments", label: "Randevular",  icon: "calendar-outline",       color: P,        route: `/evcilim/${petId}/appointments`, badge: upcomingAppt || undefined },
    { key: "nutrition",    label: "Beslenme",   icon: "bag-handle-outline",     color: GREEN,    route: `/evcilim/${petId}/nutrition`       },
    { key: "documents",    label: "Belgeler",   icon: "document-text-outline",  color: "#007AFF", route: `/evcilim/${petId}/notes`          },
    { key: "medications",  label: "İlaçlar",    icon: "medical-outline",        color: "#FF6B6B", route: `/evcilim/${petId}/notes`          },
    { key: "notes",        label: "Notlar",     icon: "pencil-outline",         color: "#AF52DE", route: `/evcilim/${petId}/notes`          },
  ];

  return (
    <View style={mg.section}>
      <Text style={mg.sectionTitle}>Yönetim</Text>
      <View style={mg.grid}>
        {GRID.map((item) => (
          <Pressable
            key={item.key}
            style={({ pressed }) => [mg.cell, pressed && { opacity: 0.75 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(item.route as Parameters<typeof router.push>[0]);
            }}
          >
            <View style={[mg.iconBox, { backgroundColor: `${item.color}18` }]}>
              <Ionicons name={item.icon} size={24} color={item.color} />
              {item.badge !== undefined && item.badge > 0 && (
                <View style={mg.badge}>
                  <Text style={mg.badgeTxt}>{item.badge}</Text>
                </View>
              )}
            </View>
            <Text style={mg.cellLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const mg = StyleSheet.create({
  section:      { marginHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: DARK, marginBottom: 12, letterSpacing: -0.3 },
  grid:         { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cell:         { width: "22%", aspectRatio: 0.9, alignItems: "center", justifyContent: "center", backgroundColor: WHITE, borderRadius: 16, gap: 8, borderWidth: 1, borderColor: BORDER, flex: 1, ...CARD_SHADOW },
  iconBox:      { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", position: "relative" },
  badge:        { position: "absolute", top: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: RED, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: WHITE },
  badgeTxt:     { fontSize: 10, fontFamily: "Inter_700Bold", color: WHITE },
  cellLabel:    { fontSize: 11, fontFamily: "Inter_500Medium", color: DARK, textAlign: "center" },
});

/* ══════════════════════════════════════════════════════════
   UPCOMING REMINDERS
══════════════════════════════════════════════════════════ */
function UpcomingReminders({ reminders }: { reminders: ApiReminder[] }) {
  if (reminders.length === 0) {
    return (
      <View style={ur.section}>
        <Text style={ur.sectionTitle}>Yaklaşan Hatırlatmalar</Text>
        <View style={ur.empty}>
          <Ionicons name="checkmark-circle-outline" size={32} color={`${GREEN}`} />
          <Text style={ur.emptyTxt}>Yaklaşan hatırlatma yok</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={ur.section}>
      <Text style={ur.sectionTitle}>Yaklaşan Hatırlatmalar</Text>
      <View style={ur.list}>
        {reminders.slice(0, 5).map((r) => {
          const days = daysUntil(r.date);
          return (
            <View key={r.id} style={[ur.item, CARD_SHADOW]}>
              <View style={[ur.iconWrap, { backgroundColor: `${r.color}18` }]}>
                <Ionicons name={r.icon as keyof typeof Ionicons.glyphMap} size={18} color={r.color} />
              </View>
              <View style={ur.itemInfo}>
                <Text style={ur.itemTitle} numberOfLines={1}>{r.title}</Text>
                <Text style={ur.itemDate}>{formatDate(r.date)}{r.time ? ` · ${r.time}` : ""}</Text>
              </View>
              <View style={[ur.dayBadge, { backgroundColor: `${r.color}18` }]}>
                <Text style={[ur.dayTxt, { color: r.color }]}>
                  {days < 0 ? "Gecikti" : days === 0 ? "Bugün" : `${days}g`}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
const ur = StyleSheet.create({
  section:      { marginHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: DARK, marginBottom: 12, letterSpacing: -0.3 },
  empty:        { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: WHITE, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: BORDER },
  emptyTxt:     { fontSize: 14, fontFamily: "Inter_400Regular", color: BODY },
  list:         { gap: 10 },
  item:         { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: WHITE, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BORDER },
  iconWrap:     { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  itemInfo:     { flex: 1 },
  itemTitle:    { fontSize: 14, fontFamily: "Inter_600SemiBold", color: DARK },
  itemDate:     { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, marginTop: 2 },
  dayBadge:     { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 5 },
  dayTxt:       { fontSize: 12, fontFamily: "Inter_700Bold" },
});

/* ══════════════════════════════════════════════════════════
   EMPTY STATE
══════════════════════════════════════════════════════════ */
function EmptyPetsState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={em.root}>
      <LinearGradient colors={[`${P2}20`, `${P}10`]} style={em.circle}>
        <Text style={{ fontSize: 56 }}>🐾</Text>
      </LinearGradient>
      <Text style={em.title}>Evcil Hayvanın Yok</Text>
      <Text style={em.sub}>
        İlk evcil hayvanını ekleyerek{"\n"}sağlık ve bakım takibine başla
      </Text>
      <Pressable
        style={({ pressed }) => [em.btn, { opacity: pressed ? 0.85 : 1 }]}
        onPress={onAdd}
      >
        <LinearGradient colors={[P2, P]} style={em.btnGrad}>
          <Ionicons name="add-circle-outline" size={18} color={WHITE} />
          <Text style={em.btnTxt}>Evcil Hayvan Ekle</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
const em = StyleSheet.create({
  root:   { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 16, paddingBottom: 80 },
  circle: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  title:  { fontSize: 22, fontFamily: "Inter_700Bold", color: DARK, textAlign: "center", letterSpacing: -0.4 },
  sub:    { fontSize: 14, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center", lineHeight: 22 },
  btn:    { borderRadius: 50, overflow: "hidden", marginTop: 8 },
  btnGrad:{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 28 },
  btnTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE },
});

/* ══════════════════════════════════════════════════════════
   MAIN EVCILIM TAB
══════════════════════════════════════════════════════════ */
export function EvcilimTab({ botPad }: { botPad: number }) {
  const { pets } = usePets();
  const { user } = useAuth();
  const router = useRouter();

  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [vaccinations, setVaccinations] = useState<ApiVaccination[]>([]);
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [nutrition, setNutrition] = useState<ApiNutrition | null>(null);
  const [loading, setLoading] = useState(false);

  const effectivePetId = selectedPetId ?? pets[0]?.id ?? null;
  const selectedPet = pets.find((p) => p.id === effectivePetId) ?? pets[0] ?? null;

  const loadData = useCallback(async (petId: string, userId: string) => {
    setLoading(true);
    try {
      const [v, a, n] = await Promise.all([
        apiGetVaccinations(petId, userId),
        apiGetAppointments(petId, userId),
        apiGetNutrition(petId, userId),
      ]);
      setVaccinations(v);
      setAppointments(a);
      setNutrition(n);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPet && user) {
      loadData(selectedPet.id, user.id);
    }
  }, [selectedPet?.id, user?.id, loadData]);

  if (pets.length === 0) {
    return (
      <EmptyPetsState onAdd={() => router.push("/evcilim/add" as Parameters<typeof router.push>[0])} />
    );
  }

  const reminders = buildReminders(vaccinations, appointments, nutrition);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 4, paddingBottom: botPad + 24 }}
    >
      {/* Pet Selector */}
      <PetSelectorRow
        pets={pets}
        selectedId={effectivePetId}
        onSelect={(id) => setSelectedPetId(id)}
        onAdd={() => router.push("/evcilim/add" as Parameters<typeof router.push>[0])}
      />

      {selectedPet && (
        <>
          {/* Profile card */}
          <PetProfileCard
            pet={selectedPet}
            onEdit={() => router.push(`/evcilim/${selectedPet.id}` as Parameters<typeof router.push>[0])}
          />

          {loading ? (
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <ActivityIndicator color={P} size="large" />
            </View>
          ) : (
            <>
              {/* Quick status cards */}
              <QuickStatusCards
                vaccinations={vaccinations}
                appointments={appointments}
                nutrition={nutrition}
              />

              {/* Management grid */}
              <ManagementGrid
                petId={selectedPet.id}
                vaccinations={vaccinations}
                appointments={appointments}
              />

              {/* Upcoming reminders */}
              <UpcomingReminders reminders={reminders} />
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}
