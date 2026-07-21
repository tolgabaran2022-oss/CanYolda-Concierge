import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
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

export default function HealthScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { t } = useTranslation();
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

  const vaccLabels: Record<string, string> = {
    current:   t("pets.health.vaccLabels.current"),
    upcoming:  t("pets.health.vaccLabels.upcoming"),
    overdue:   t("pets.health.vaccLabels.overdue"),
    scheduled: t("pets.health.vaccLabels.scheduled"),
  };
  const vaccColors: Record<string, string> = { current: "#43B96C", upcoming: "#FF9500", overdue: "#E55D6F", scheduled: "#7B5EA7" };

  const apptLabels: Record<string, string> = {
    upcoming:  t("pets.health.apptLabels.upcoming"),
    completed: t("pets.health.apptLabels.completed"),
    cancelled: t("pets.health.apptLabels.cancelled"),
  };
  const apptColors: Record<string, string> = { upcoming: "#7B5EA7", completed: "#43B96C", cancelled: "#E55D6F" };

  const S = makeStyles(C);

  const overdue = vaccinations.filter(v => v.status === "overdue");
  const upcomingVacc = vaccinations.filter(v => v.status === "upcoming" || v.status === "scheduled");
  const current = vaccinations.filter(v => v.status === "current");
  const upcomingAppts = appointments.filter(a => a.status === "upcoming")
    .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate));

  const quickActions = [
    { icon: "add-circle-outline",      label: t("pets.health.addAppt"),    route: `/evcilim/${petId}/appointments` },
    { icon: "shield-checkmark-outline", label: t("pets.health.addVacc"),    route: `/evcilim/${petId}/vaccinations` },
    { icon: "medical-outline",          label: t("pets.health.medications"), route: `/evcilim/${petId}/medications` },
    { icon: "document-text-outline",    label: t("pets.health.documents"),   route: `/evcilim/${petId}/documents` },
  ];

  if (loading) {
    return (
      <SafeAreaView style={S.flex} edges={["bottom"]}>
        <Stack.Screen options={{ title: t("pets.health.title"), headerBackTitle: t("pets.health.backTitle") }} />
        <View style={S.center}><ActivityIndicator color={C.purple} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.flex} edges={["bottom"]}>
      <Stack.Screen options={{ title: t("pets.health.title"), headerBackTitle: t("pets.health.backTitle") }} />

      <ScrollView
        contentContainerStyle={S.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.purple} />}
      >
        {/* Stats row */}
        <View style={S.statsRow}>
          <View style={[S.statCard, { backgroundColor: overdue.length > 0 ? "#FFF1F0" : C.card }]}>
            <Text style={[S.statNum, { color: overdue.length > 0 ? "#E55D6F" : C.purple }]}>{overdue.length}</Text>
            <Text style={S.statLabel}>{t("pets.health.overdueVaccine")}</Text>
          </View>
          <View style={S.statCard}>
            <Text style={[S.statNum, { color: "#FF9500" }]}>{upcomingVacc.length}</Text>
            <Text style={S.statLabel}>{t("pets.health.upcomingVaccine")}</Text>
          </View>
          <View style={S.statCard}>
            <Text style={[S.statNum, { color: "#43B96C" }]}>{current.length}</Text>
            <Text style={S.statLabel}>{t("pets.health.currentVaccine")}</Text>
          </View>
        </View>

        {/* Overdue alert */}
        {overdue.length > 0 && (
          <View style={S.alertCard}>
            <Icon name="warning-outline" size={20} color="#E55D6F" />
            <View style={{ flex: 1 }}>
              <Text style={S.alertTitle}>{t("pets.health.overdueAlert")}</Text>
              <Text style={S.alertSub}>{overdue.map(v => v.vaccineName).join(", ")} {t("pets.health.overdueAlertSub")}</Text>
            </View>
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/evcilim/${petId}/appointments`); }}>
              <Icon name="chevron-forward" size={18} color="#E55D6F" />
            </Pressable>
          </View>
        )}

        {/* Upcoming appointments */}
        <View style={S.section}>
          <View style={S.sectionHeader}>
            <Text style={S.sectionTitle}>{t("pets.health.upcomingAppts")}</Text>
            <Pressable onPress={() => router.push(`/evcilim/${petId}/appointments`)}>
              <Text style={S.seeAll}>{t("pets.health.seeAll")}</Text>
            </Pressable>
          </View>
          {upcomingAppts.length === 0 ? (
            <View style={S.emptyRow}>
              <Icon name="calendar-outline" size={22} color={C.textMuted} />
              <Text style={S.emptyText}>{t("pets.health.noAppt")}</Text>
              <Pressable style={S.addPill} onPress={() => router.push(`/evcilim/${petId}/appointments`)}>
                <Text style={S.addPillTxt}>{t("pets.health.add")}</Text>
              </Pressable>
            </View>
          ) : (
            upcomingAppts.slice(0, 3).map(a => {
              const color = apptColors[a.status] ?? "#8C8699";
              const label = apptLabels[a.status] ?? a.status;
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
            <Text style={S.sectionTitle}>{t("pets.health.vaccSectionTitle")}</Text>
            <Pressable onPress={() => router.push(`/evcilim/${petId}/vaccinations`)}>
              <Text style={S.seeAll}>{t("pets.health.seeAll")}</Text>
            </Pressable>
          </View>
          {vaccinations.length === 0 ? (
            <View style={S.emptyRow}>
              <Icon name="shield-checkmark-outline" size={22} color={C.textMuted} />
              <Text style={S.emptyText}>{t("pets.health.noVacc")}</Text>
              <Pressable style={S.addPill} onPress={() => router.push(`/evcilim/${petId}/vaccinations`)}>
                <Text style={S.addPillTxt}>{t("pets.health.add")}</Text>
              </Pressable>
            </View>
          ) : (
            vaccinations.slice(0, 5).map(v => {
              const color = vaccColors[v.status] ?? "#8C8699";
              const label = vaccLabels[v.status] ?? v.status;
              return (
                <View key={v.id} style={S.rowCard}>
                  <View style={[S.rowIcon, { backgroundColor: `${color}14` }]}>
                    <Icon name="shield-checkmark-outline" size={18} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.rowTitle}>{v.vaccineName}</Text>
                    <Text style={S.rowSub}>
                      {v.administeredDate
                        ? `${t("pets.health.administered")} ${formatDate(v.administeredDate)}`
                        : t("pets.health.unknownDate")}
                      {v.nextDueDate ? ` · ${t("pets.health.next")} ${formatDate(v.nextDueDate)}` : ""}
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
              <Text style={S.aiTitle}>{t("pets.health.aiTitle")}</Text>
              <Text style={S.aiSub}>{t("pets.health.aiSub")}</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={C.purple} />
          </Pressable>
        )}

        {/* Quick actions */}
        <View style={S.actionsGrid}>
          {quickActions.map(({ icon, label, route }) => (
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
