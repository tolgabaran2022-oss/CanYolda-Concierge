import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import {
  apiGetVaccinations, apiGetAppointments,
  type ApiVaccination, type ApiAppointment,
} from "@/lib/petManagementApi";
import { usePetPremium } from "@/contexts/PetPremiumContext";

const SHADOW = {
  shadowColor: "#7B5EA7", shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
};

function formatDate(s: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return s; }
}

function vaccStatus(v: ApiVaccination): { label: string; color: string } {
  const colors = { current: "#43B96C", upcoming: "#FF9500", overdue: "#E55D6F", scheduled: "#7B5EA7" };
  const labels = { current: "Güncel", upcoming: "Yaklaşıyor", overdue: "Gecikmiş", scheduled: "Planlandı" };
  return { label: labels[v.status] ?? v.status, color: colors[v.status] ?? "#8C8699" };
}

function apptStatus(a: ApiAppointment): { label: string; color: string } {
  const colors = { upcoming: "#7B5EA7", completed: "#43B96C", cancelled: "#E55D6F" };
  const labels = { upcoming: "Yaklaşan", completed: "Tamamlandı", cancelled: "İptal" };
  return { label: labels[a.status] ?? a.status, color: colors[a.status] ?? "#8C8699" };
}

export default function HealthScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const C = useColors();
  const router = useRouter();
  const { isPremium } = usePetPremium();

  const [vaccinations, setVaccinations] = useState<ApiVaccination[]>([]);
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!petId) return;
    try {
      const [v, a] = await Promise.all([apiGetVaccinations(petId), apiGetAppointments(petId)]);
      setVaccinations(v);
      setAppointments(a);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [petId]);

  useEffect(() => { load(); }, [load]);

  const S = makeStyles(C);

  const overdue = vaccinations.filter(v => v.status === "overdue");
  const upcoming = vaccinations.filter(v => v.status === "upcoming" || v.status === "scheduled");
  const current = vaccinations.filter(v => v.status === "current");
  const upcomingAppts = appointments.filter(a => a.status === "upcoming")
    .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate));

  if (loading) {
    return (
      <SafeAreaView style={S.flex} edges={["bottom"]}>
        <Stack.Screen options={{ title: "Sağlık Özeti", headerBackTitle: "Geri" }} />
        <View style={S.center}><ActivityIndicator color={C.purple} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.flex} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Sağlık Özeti", headerBackTitle: "Geri" }} />

      <ScrollView
        contentContainerStyle={S.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.purple} />}
      >
        {/* Stats row */}
        <View style={S.statsRow}>
          <View style={[S.statCard, { backgroundColor: overdue.length > 0 ? "#FFF1F0" : C.card }]}>
            <Text style={[S.statNum, { color: overdue.length > 0 ? "#E55D6F" : C.purple }]}>{overdue.length}</Text>
            <Text style={S.statLabel}>Gecikmiş Aşı</Text>
          </View>
          <View style={S.statCard}>
            <Text style={[S.statNum, { color: "#FF9500" }]}>{upcoming.length}</Text>
            <Text style={S.statLabel}>Yaklaşan Aşı</Text>
          </View>
          <View style={S.statCard}>
            <Text style={[S.statNum, { color: "#43B96C" }]}>{current.length}</Text>
            <Text style={S.statLabel}>Güncel Aşı</Text>
          </View>
        </View>

        {/* Overdue alert */}
        {overdue.length > 0 && (
          <View style={S.alertCard}>
            <Icon name="warning-outline" size={20} color="#E55D6F" />
            <View style={{ flex: 1 }}>
              <Text style={S.alertTitle}>Gecikmiş Aşı Var</Text>
              <Text style={S.alertSub}>{overdue.map(v => v.vaccineName).join(", ")} için veteriner randevusu alınız.</Text>
            </View>
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/evcilim/${petId}/appointments`); }}>
              <Icon name="chevron-forward" size={18} color="#E55D6F" />
            </Pressable>
          </View>
        )}

        {/* Upcoming appointments */}
        <View style={S.section}>
          <View style={S.sectionHeader}>
            <Text style={S.sectionTitle}>Yaklaşan Randevular</Text>
            <Pressable onPress={() => router.push(`/evcilim/${petId}/appointments`)}>
              <Text style={S.seeAll}>Tümü</Text>
            </Pressable>
          </View>
          {upcomingAppts.length === 0 ? (
            <View style={S.emptyRow}>
              <Icon name="calendar-outline" size={22} color={C.textMuted} />
              <Text style={S.emptyText}>Randevu yok</Text>
              <Pressable style={S.addPill} onPress={() => router.push(`/evcilim/${petId}/appointments`)}>
                <Text style={S.addPillTxt}>Ekle</Text>
              </Pressable>
            </View>
          ) : (
            upcomingAppts.slice(0, 3).map(a => {
              const { label, color } = apptStatus(a);
              return (
                <View key={a.id} style={S.rowCard}>
                  <View style={[S.rowIcon, { backgroundColor: `${color}14` }]}>
                    <Icon name="calendar-outline" size={18} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.rowTitle}>{a.title}</Text>
                    <Text style={S.rowSub}>{formatDate(a.appointmentDate)}{a.appointmentTime ? ` · ${a.appointmentTime}` : ""}</Text>
                  </View>
                  <View style={[S.statusBadge, { backgroundColor: `${color}14` }]}>
                    <Text style={[S.statusTxt, { color }]}>{label}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Vaccinations */}
        <View style={S.section}>
          <View style={S.sectionHeader}>
            <Text style={S.sectionTitle}>Aşı Durumu</Text>
            <Pressable onPress={() => router.push(`/evcilim/${petId}/vaccinations`)}>
              <Text style={S.seeAll}>Tümü</Text>
            </Pressable>
          </View>
          {vaccinations.length === 0 ? (
            <View style={S.emptyRow}>
              <Icon name="shield-checkmark-outline" size={22} color={C.textMuted} />
              <Text style={S.emptyText}>Aşı kaydı yok</Text>
              <Pressable style={S.addPill} onPress={() => router.push(`/evcilim/${petId}/vaccinations`)}>
                <Text style={S.addPillTxt}>Ekle</Text>
              </Pressable>
            </View>
          ) : (
            vaccinations.slice(0, 5).map(v => {
              const { label, color } = vaccStatus(v);
              return (
                <View key={v.id} style={S.rowCard}>
                  <View style={[S.rowIcon, { backgroundColor: `${color}14` }]}>
                    <Icon name="shield-checkmark-outline" size={18} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.rowTitle}>{v.vaccineName}</Text>
                    <Text style={S.rowSub}>
                      {v.administeredDate ? `Yapıldı: ${formatDate(v.administeredDate)}` : "Tarihi bilinmiyor"}
                      {v.nextDueDate ? ` · Sonraki: ${formatDate(v.nextDueDate)}` : ""}
                    </Text>
                  </View>
                  <View style={[S.statusBadge, { backgroundColor: `${color}14` }]}>
                    <Text style={[S.statusTxt, { color }]}>{label}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Premium AI hint */}
        {isPremium && (
          <Pressable
            style={S.aiCard}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/evcilim/${petId}/assistant`); }}
          >
            <View style={S.aiIconWrap}>
              <Icon name="sparkles-outline" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.aiTitle}>AI Hayvan Asistanı</Text>
              <Text style={S.aiSub}>Sağlık soruların için AI destekli yanıtlar al.</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={C.purple} />
          </Pressable>
        )}

        {/* Quick actions */}
        <View style={S.actionsGrid}>
          {[
            { icon: "add-circle-outline", label: "Randevu Ekle", route: `/evcilim/${petId}/appointments` },
            { icon: "shield-checkmark-outline", label: "Aşı Ekle", route: `/evcilim/${petId}/vaccinations` },
            { icon: "medical-outline", label: "İlaç Takibi", route: `/evcilim/${petId}/medications` },
            { icon: "document-text-outline", label: "Belgeler", route: `/evcilim/${petId}/documents` },
          ].map(({ icon, label, route }) => (
            <Pressable
              key={label}
              style={S.actionBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(route as Parameters<typeof router.push>[0]); }}
            >
              <View style={S.actionIcon}><Icon name={icon} size={20} color={C.purple} /></View>
              <Text style={S.actionLabel}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    flex:         { flex: 1, backgroundColor: C.bg },
    center:       { flex: 1, alignItems: "center", justifyContent: "center" },
    scroll:       { padding: 16, paddingBottom: 40, gap: 16 },
    statsRow:     { flexDirection: "row", gap: 10 },
    statCard:     { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 14, alignItems: "center", borderWidth: 1, borderColor: C.border, ...SHADOW },
    statNum:      { fontSize: 28, fontFamily: "Inter_700Bold", color: C.purple },
    statLabel:    { fontSize: 11, fontFamily: "Inter_400Regular", color: C.textMuted, textAlign: "center", marginTop: 2 },
    alertCard:    { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF1F0", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#FFD0D0" },
    alertTitle:   { fontSize: 14, fontFamily: "Inter_700Bold", color: "#E55D6F" },
    alertSub:     { fontSize: 12, fontFamily: "Inter_400Regular", color: "#E55D6F", marginTop: 2, lineHeight: 17 },
    section:      { backgroundColor: C.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.border, ...SHADOW },
    sectionHeader:{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: C.text },
    seeAll:       { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.purple },
    emptyRow:     { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
    emptyText:    { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: C.textMuted },
    addPill:      { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: `${C.purple}12`, borderRadius: 10 },
    addPillTxt:   { fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.purple },
    rowCard:      { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderColor: C.border },
    rowIcon:      { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    rowTitle:     { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },
    rowSub:       { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textMuted, marginTop: 1 },
    statusBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusTxt:    { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    aiCard:       { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: `${C.purple}10`, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: `${C.purple}30` },
    aiIconWrap:   { width: 40, height: 40, borderRadius: 13, backgroundColor: C.purple, alignItems: "center", justifyContent: "center" },
    aiTitle:      { fontSize: 14, fontFamily: "Inter_700Bold", color: C.purple },
    aiSub:        { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textMuted, marginTop: 1 },
    actionsGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    actionBtn:    { width: "47.5%", backgroundColor: C.card, borderRadius: 16, padding: 14, alignItems: "center", gap: 8, borderWidth: 1, borderColor: C.border, ...SHADOW },
    actionIcon:   { width: 44, height: 44, borderRadius: 14, backgroundColor: `${C.purple}12`, alignItems: "center", justifyContent: "center" },
    actionLabel:  { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text, textAlign: "center" },
  });
}
