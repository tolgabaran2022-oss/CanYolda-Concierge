import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 14 },
  android: { elevation: 3 },
  default: {},
});

function petEmoji(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("kedi") || t.includes("cat"))     return "🐱";
  if (t.includes("köpek") || t.includes("dog"))    return "🐶";
  if (t.includes("kuş") || t.includes("bird"))     return "🦜";
  if (t.includes("tavşan") || t.includes("rabbit"))return "🐰";
  if (t.includes("balık") || t.includes("fish"))   return "🐟";
  return "🐾";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch { return dateStr; }
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "numeric", month: "short",
    });
  } catch { return dateStr; }
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return 999;
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

/* ══════════════════════════════════════════════════════════
   PROFILE CAROUSEL
══════════════════════════════════════════════════════════ */
function ProfileCarousel({
  pets,
  selectedIndex,
  onSelectIndex,
  onAdd,
  onEdit,
}: {
  pets: Pet[];
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  onAdd: () => void;
  onEdit: () => void;
}) {
  const pet = pets[selectedIndex]!;

  return (
    <View style={car.wrap}>
      {/* Main profile card */}
      <Pressable style={[car.card, SHADOW]} onPress={onEdit}>
        <View style={car.row}>
          {/* Avatar with purple ring */}
          <View style={car.avatarRing}>
            {pet.image ? (
              <Image source={{ uri: pet.image }} style={car.avatar} contentFit="cover" />
            ) : (
              <LinearGradient colors={[P2, P]} style={car.avatarFallback}>
                <Text style={car.avatarEmoji}>{petEmoji(pet.type)}</Text>
              </LinearGradient>
            )}
          </View>

          {/* Info */}
          <View style={car.info}>
            <View style={car.nameRow}>
              <Text style={car.name} numberOfLines={1}>{pet.name}</Text>
              <Ionicons name="checkmark-circle" size={18} color="#5856D6" />
            </View>
            <Text style={car.breed} numberOfLines={1}>
              {pet.breed ? pet.breed : pet.type}
            </Text>
            {pet.age ? (
              <View style={car.pill}>
                <Text style={car.pillTxt}>{pet.age}</Text>
              </View>
            ) : null}
          </View>

          {/* Chevron */}
          <Ionicons name="chevron-down" size={20} color={BODY} />
        </View>
      </Pressable>

      {/* Dot indicators */}
      <View style={car.dots}>
        {pets.map((_, i) => (
          <Pressable
            key={i}
            hitSlop={8}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelectIndex(i); }}
          >
            <View style={[car.dot, i === selectedIndex && car.dotActive]} />
          </Pressable>
        ))}
      </View>

      {/* Add pet button */}
      <Pressable
        style={({ pressed }) => [car.addBtn, { opacity: pressed ? 0.75 : 1 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAdd(); }}
      >
        <Ionicons name="add-circle-outline" size={18} color={P} />
        <Text style={car.addTxt}>Evcil Hayvan Ekle</Text>
      </Pressable>
    </View>
  );
}
const car = StyleSheet.create({
  wrap:          { marginHorizontal: 20, marginTop: 14 },
  card:          {
    backgroundColor: WHITE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.10)",
    ...Platform.select({
      ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  row:           { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  avatarRing:    {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 2.5, borderColor: P,
    alignItems: "center", justifyContent: "center",
    padding: 2,
  },
  avatar:        { width: 67, height: 67, borderRadius: 34 },
  avatarFallback:{ width: 67, height: 67, borderRadius: 34, alignItems: "center", justifyContent: "center" },
  avatarEmoji:   { fontSize: 32 },
  info:          { flex: 1, gap: 5 },
  nameRow:       { flexDirection: "row", alignItems: "center", gap: 6 },
  name:          { fontSize: 20, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.4, flex: 1 },
  breed:         { fontSize: 13, fontFamily: "Inter_400Regular", color: BODY },
  pill:          { backgroundColor: `${P}12`, borderRadius: 50, paddingHorizontal: 12, paddingVertical: 4, alignSelf: "flex-start" },
  pillTxt:       { fontSize: 12, fontFamily: "Inter_600SemiBold", color: P },
  dots:          { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 },
  dot:           { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#D8D0E8" },
  dotActive:     { width: 20, borderRadius: 4, backgroundColor: P },
  addBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: `${P}40`, backgroundColor: `${P}05` },
  addTxt:        { fontSize: 14, fontFamily: "Inter_600SemiBold", color: P },
});

/* ══════════════════════════════════════════════════════════
   QUICK STATUS CARDS
══════════════════════════════════════════════════════════ */
function QuickStatusCards({
  vaccinations,
  appointments,
  nutrition,
  petId,
  onNav,
}: {
  vaccinations: ApiVaccination[];
  appointments: ApiAppointment[];
  nutrition: ApiNutrition | null;
  petId: string;
  onNav: (route: string) => void;
}) {
  const nextVacc = vaccinations
    .filter((v) => v.nextDueDate)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))[0];

  const nextAppt = appointments
    .filter((a) => a.status === "upcoming")
    .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate))[0];

  let daysLeft: number | null = null;
  let stockKg = "";
  if (nutrition && nutrition.dailyAmountGrams > 0) {
    daysLeft = Math.floor(nutrition.remainingAmountGrams / nutrition.dailyAmountGrams);
    stockKg = `${(nutrition.remainingAmountGrams / 1000).toFixed(1)} kg`;
  }

  const cards = [
    {
      label: "Sonraki Aşı",
      title: nextVacc?.vaccineName ?? "Kayıt yok",
      date: nextVacc ? formatDateShort(nextVacc.nextDueDate) : "—",
      icon: "calendar-outline" as const,
      color: ORANGE,
      bg: "#FFF7ED",
      route: `/evcilim/${petId}/vaccinations`,
    },
    {
      label: "Yaklaşan Randevu",
      title: nextAppt?.title ?? "Randevu yok",
      date: nextAppt ? formatDateShort(nextAppt.appointmentDate) : "—",
      icon: "calendar-outline" as const,
      color: P,
      bg: "#F5F0FF",
      route: `/evcilim/${petId}/appointments`,
    },
    {
      label: "Mama Durumu",
      title: daysLeft !== null ? `${daysLeft} gün kaldı` : "Kayıt yok",
      date: stockKg || "—",
      icon: "nutrition-outline" as const,
      color: GREEN,
      bg: "#EDFFF4",
      route: `/evcilim/${petId}/nutrition`,
    },
  ];

  return (
    <View style={qs.section}>
      <Text style={qs.sectionTitle}>Hızlı Durum</Text>
      <View style={qs.row}>
        {cards.map((c) => (
          <Pressable
            key={c.label}
            style={({ pressed }) => [qs.card, { backgroundColor: c.bg }, pressed && { opacity: 0.85 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNav(c.route); }}
          >
            <Text style={[qs.label, { color: c.color }]} numberOfLines={2}>{c.label}</Text>
            <Text style={qs.title} numberOfLines={2}>{c.title}</Text>
            <View style={qs.bottom}>
              <Ionicons name={c.icon} size={12} color={c.color} />
              <Text style={[qs.date, { color: c.color }]} numberOfLines={1}>{c.date}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const qs = StyleSheet.create({
  section:      { marginHorizontal: 20, marginTop: 22 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK, marginBottom: 14, letterSpacing: -0.3 },
  row:          { flexDirection: "row", gap: 10 },
  card:         { flex: 1, borderRadius: 16, padding: 13, gap: 6 },
  label:        { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
  title:        { fontSize: 13, fontFamily: "Inter_700Bold", color: DARK, lineHeight: 18 },
  bottom:       { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  date:         { fontSize: 10, fontFamily: "Inter_500Medium", flex: 1 },
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
  onNav,
}: {
  petId: string;
  vaccinations: ApiVaccination[];
  appointments: ApiAppointment[];
  onNav: (route: string) => void;
}) {
  const overdueVacc  = vaccinations.filter((v) => v.status === "overdue").length;
  const upcomingAppt = appointments.filter((a) => a.status === "upcoming").length;

  const GRID: GridItem[] = [
    { key: "id",           label: "Kimlik",    icon: "id-card-outline",          color: "#5856D6", route: `/evcilim/${petId}/identification` },
    { key: "health",       label: "Sağlık",    icon: "heart-outline",            color: "#FF2D55", route: `/evcilim/${petId}/vaccinations` },
    { key: "vaccinations", label: "Aşılar",    icon: "shield-checkmark-outline", color: ORANGE,    route: `/evcilim/${petId}/vaccinations`, badge: overdueVacc || undefined },
    { key: "appointments", label: "Randevular", icon: "calendar-outline",         color: P,         route: `/evcilim/${petId}/appointments`, badge: upcomingAppt || undefined },
    { key: "nutrition",    label: "Beslenme",   icon: "nutrition-outline",        color: GREEN,     route: `/evcilim/${petId}/nutrition` },
    { key: "documents",    label: "Belgeler",   icon: "document-text-outline",    color: "#007AFF", route: `/evcilim/${petId}/notes` },
    { key: "medications",  label: "İlaçlar",    icon: "medical-outline",          color: "#FF6B6B", route: `/evcilim/${petId}/notes` },
    { key: "notes",        label: "Notlar",     icon: "pencil-outline",           color: "#AF52DE", route: `/evcilim/${petId}/notes` },
  ];

  return (
    <View style={mg.section}>
      <Text style={mg.sectionTitle}>Yönetim</Text>
      <View style={mg.grid}>
        {GRID.map((item) => (
          <Pressable
            key={item.key}
            style={({ pressed }) => [mg.cell, pressed && { opacity: 0.75 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNav(item.route); }}
          >
            <View style={[mg.iconBox, { backgroundColor: `${item.color}18` }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
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
  section:      { marginHorizontal: 20, marginTop: 22 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK, marginBottom: 14, letterSpacing: -0.3 },
  grid:         { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cell:         {
    width: "22%", flex: 1, aspectRatio: 0.9,
    alignItems: "center", justifyContent: "center",
    backgroundColor: WHITE, borderRadius: 18, gap: 8,
    borderWidth: 1, borderColor: "rgba(123,94,167,0.08)",
    ...Platform.select({
      ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  iconBox:      { width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center", position: "relative" },
  badge:        { position: "absolute", top: -3, right: -3, width: 16, height: 16, borderRadius: 8, backgroundColor: RED, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: WHITE },
  badgeTxt:     { fontSize: 9, fontFamily: "Inter_700Bold", color: WHITE },
  cellLabel:    { fontSize: 11, fontFamily: "Inter_500Medium", color: DARK, textAlign: "center" },
});

/* ══════════════════════════════════════════════════════════
   UPCOMING REMINDERS
══════════════════════════════════════════════════════════ */
function UpcomingReminders({ reminders }: { reminders: ApiReminder[] }) {
  return (
    <View style={ur.section}>
      <View style={ur.header}>
        <Text style={ur.sectionTitle}>Yaklaşan Hatırlatmalar</Text>
        <Pressable hitSlop={8}>
          <Text style={ur.seeAll}>Tümünü Gör</Text>
        </Pressable>
      </View>

      {reminders.length === 0 ? (
        <View style={ur.empty}>
          <Ionicons name="checkmark-circle-outline" size={28} color={GREEN} />
          <Text style={ur.emptyTxt}>Yaklaşan hatırlatma yok</Text>
        </View>
      ) : (
        <View style={ur.list}>
          {reminders.slice(0, 3).map((r) => (
            <View key={r.id} style={ur.item}>
              <View style={[ur.iconWrap, { backgroundColor: `${r.color}18` }]}>
                <Ionicons name={r.icon as keyof typeof Ionicons.glyphMap} size={18} color={r.color} />
              </View>
              <View style={ur.mid}>
                <Text style={ur.itemTitle} numberOfLines={1}>{r.title}</Text>
                <Text style={ur.itemDate}>{formatDate(r.date)}</Text>
              </View>
              <View style={[ur.alarmWrap, { backgroundColor: `${r.color}15` }]}>
                <Ionicons name="alarm-outline" size={18} color={r.color} />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
const ur = StyleSheet.create({
  section:      { marginHorizontal: 20, marginTop: 22, marginBottom: 8 },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.3 },
  seeAll:       { fontSize: 13, fontFamily: "Inter_600SemiBold", color: P },
  empty:        { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: WHITE, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: BORDER },
  emptyTxt:     { fontSize: 14, fontFamily: "Inter_400Regular", color: BODY },
  list:         { gap: 10 },
  item:         {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: WHITE, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "rgba(123,94,167,0.08)",
    ...Platform.select({
      ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  iconWrap:     { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  mid:          { flex: 1 },
  itemTitle:    { fontSize: 14, fontFamily: "Inter_600SemiBold", color: DARK },
  itemDate:     { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, marginTop: 2 },
  alarmWrap:    { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
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
      <Text style={em.sub}>İlk evcil hayvanını ekleyerek{"\n"}sağlık ve bakım takibine başla</Text>
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
  root:    { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 16, paddingBottom: 80 },
  circle:  { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  title:   { fontSize: 22, fontFamily: "Inter_700Bold", color: DARK, textAlign: "center", letterSpacing: -0.4 },
  sub:     { fontSize: 14, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center", lineHeight: 22 },
  btn:     { borderRadius: 50, overflow: "hidden", marginTop: 8 },
  btnGrad: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 28 },
  btnTxt:  { fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE },
});

/* ══════════════════════════════════════════════════════════
   MAIN EVCILIM TAB
══════════════════════════════════════════════════════════ */
export function EvcilimTab({ botPad }: { botPad: number }) {
  const { pets } = usePets();
  const { user } = useAuth();
  const router = useRouter();

  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [vaccinations, setVaccinations]   = useState<ApiVaccination[]>([]);
  const [appointments, setAppointments]   = useState<ApiAppointment[]>([]);
  const [nutrition, setNutrition]         = useState<ApiNutrition | null>(null);
  const [loading, setLoading]             = useState(false);

  const effectivePetId   = selectedPetId ?? pets[0]?.id ?? null;
  const selectedPet      = pets.find((p) => p.id === effectivePetId) ?? pets[0] ?? null;
  const selectedIndex    = pets.findIndex((p) => p.id === effectivePetId);
  const safeIndex        = selectedIndex >= 0 ? selectedIndex : 0;

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

  const nav = (route: string) => router.push(route as Parameters<typeof router.push>[0]);

  if (pets.length === 0) {
    return (
      <EmptyPetsState onAdd={() => nav("/evcilim/add")} />
    );
  }

  const reminders = buildReminders(vaccinations, appointments, nutrition);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 4, paddingBottom: botPad + 24 }}
    >
      {selectedPet && (
        <>
          {/* Profile Carousel */}
          <ProfileCarousel
            pets={pets}
            selectedIndex={safeIndex}
            onSelectIndex={(i) => setSelectedPetId(pets[i]!.id)}
            onAdd={() => nav("/evcilim/add")}
            onEdit={() => nav(`/evcilim/${selectedPet.id}`)}
          />

          {loading ? (
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <ActivityIndicator color={P} size="large" />
            </View>
          ) : (
            <>
              {/* Hızlı Durum */}
              <QuickStatusCards
                vaccinations={vaccinations}
                appointments={appointments}
                nutrition={nutrition}
                petId={selectedPet.id}
                onNav={nav}
              />

              {/* Yönetim */}
              <ManagementGrid
                petId={selectedPet.id}
                vaccinations={vaccinations}
                appointments={appointments}
                onNav={nav}
              />

              {/* Yaklaşan Hatırlatmalar */}
              <UpcomingReminders reminders={reminders} />
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}
