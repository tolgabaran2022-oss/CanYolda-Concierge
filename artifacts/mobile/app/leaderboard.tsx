import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";

/* ── API ───────────────────────────────────────────────────────── */
const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

async function apiFetch(path: string): Promise<Response> {
  const token = await AsyncStorage.getItem("@canyoldasi:jwt");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { headers });
}

/* ── Types ─────────────────────────────────────────────────────── */
interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  totalPoints: number;
  distinctAnimals: number;
  level: string;
}

interface MyRankEntry {
  rank: number | null;
  userId: string;
  name: string;
  avatarUrl: string | null;
  totalPoints: number;
  distinctAnimals: number;
  level: string;
}

interface LeaderboardData {
  monthKey: string;
  top3: LeaderboardEntry[];
  ranking: LeaderboardEntry[];
  myRank: MyRankEntry | null;
}

/* ── Design tokens ─────────────────────────────────────────────── */
const C = {
  purple:      "#7B5EA7",
  purpleDark:  "#6D28D9",
  purpleFaint: "rgba(109,40,217,0.08)",
  bg:          "#F8F5FF",
  white:       "#FFFFFF",
  text:        "#1C1B1F",
  textMuted:   "#6B7280",
  border:      "rgba(109,40,217,0.12)",
};

/* ── Turkish month names ────────────────────────────────────────── */
const MONTHS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function getIstanbulMonthKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year  = parts.find(p => p.type === "year")?.value  ?? "";
  const month = parts.find(p => p.type === "month")?.value ?? "";
  return `${year}-${month}`;
}

function monthKeyToDisplay(key: string): string {
  const [year, mon] = key.split("-").map(Number);
  return `${MONTHS_TR[(mon ?? 1) - 1]} ${year}`;
}

function addMonths(key: string, delta: number): string {
  const [year, mon] = key.split("-").map(Number);
  const d = new Date((year ?? 2026), (mon ?? 1) - 1 + delta, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/* ── Achievement level styles ──────────────────────────────────── */
function getLevelStyle(level: string): { bg: string; color: string; icon: string } {
  switch (level) {
    case "CanYoldaşı Efsanesi": return { bg: "#FEF3C7", color: "#92400E", icon: "crown" };
    case "Umut Elçisi":         return { bg: "#EFF6FF", color: "#1D4ED8", icon: "star" };
    case "Sokak Kahramanı":     return { bg: "#EDE9FE", color: "#6D28D9", icon: "shield-checkmark" };
    case "Can Dostu":           return { bg: "#FFF3E0", color: "#E65100", icon: "heart" };
    default:                    return { bg: "#F3F4F6", color: "#6B7280", icon: "star-outline" };
  }
}

/* ── Medal config ──────────────────────────────────────────────── */
const MEDAL = [
  { bg: "#FFD700", border: "#F59E0B", textColor: "#78350F", label: "1" },
  { bg: "#E5E7EB", border: "#9CA3AF", textColor: "#374151", label: "2" },
  { bg: "#D97706", border: "#B45309", textColor: "#FEF3C7", label: "3" },
];

/* ── Sub-components ─────────────────────────────────────────────── */


function AchievementBadge({ level }: { level: string }) {
  const s = getLevelStyle(level);
  return (
    <View style={[st.levelBadge, { backgroundColor: s.bg }]}>
      <Icon name={s.icon as "star"} size={11} color={s.color} />
      <Text style={[st.levelText, { color: s.color }]} numberOfLines={1}>{level}</Text>
    </View>
  );
}

function MedalBadge({ rank }: { rank: number }) {
  const m = MEDAL[rank - 1];
  if (!m) return null;
  return (
    <View style={[st.medalCircle, { backgroundColor: m.bg, borderColor: m.border }]}>
      <Text style={[st.medalText, { color: m.textColor }]}>{m.label}</Text>
    </View>
  );
}

function SkeletonBlock({ w, h, r = 8 }: { w: number | string; h: number; r?: number }) {
  return (
    <View style={{ width: w as number, height: h, borderRadius: r, backgroundColor: "#E5E7EB", opacity: 0.6 }} />
  );
}

function PodiumCard({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const isFirst = rank === 1;
  const avatarSize = isFirst ? 72 : 56;
  return (
    <View style={[
      st.podiumCard,
      isFirst ? st.podiumCardFirst : st.podiumCardOther,
    ]}>
      <MedalBadge rank={rank} />
      <UserAvatar uri={entry.avatarUrl} size={avatarSize} name={entry.name} />
      <Text style={[st.podiumName, isFirst && { fontSize: 14 }]} numberOfLines={1}>
        {entry.name}
      </Text>
      {isFirst && (
        <Text style={st.podiumAnimals} numberOfLines={2}>
          {entry.distinctAnimals} farklı hayvana destek oldu
        </Text>
      )}
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3, marginTop: 6 }}>
        <Text style={[st.podiumPoints, isFirst && { fontSize: 28 }]}>
          {entry.totalPoints}
        </Text>
        <Text style={[st.podiumPointsLabel, isFirst && { fontSize: 13 }]}>Puan</Text>
      </View>
    </View>
  );
}

function PodiumSkeleton() {
  return (
    <View style={st.podiumRow}>
      <View style={[st.podiumCard, st.podiumCardOther, { alignItems: "center", gap: 8 }]}>
        <SkeletonBlock w={28} h={28} r={14} />
        <SkeletonBlock w={56} h={56} r={28} />
        <SkeletonBlock w={72} h={12} />
        <SkeletonBlock w={40} h={18} />
      </View>
      <View style={[st.podiumCard, st.podiumCardFirst, { alignItems: "center", gap: 8 }]}>
        <SkeletonBlock w={32} h={32} r={16} />
        <SkeletonBlock w={72} h={72} r={36} />
        <SkeletonBlock w={90} h={14} />
        <SkeletonBlock w={50} h={24} />
      </View>
      <View style={[st.podiumCard, st.podiumCardOther, { alignItems: "center", gap: 8 }]}>
        <SkeletonBlock w={28} h={28} r={14} />
        <SkeletonBlock w={56} h={56} r={28} />
        <SkeletonBlock w={72} h={12} />
        <SkeletonBlock w={40} h={18} />
      </View>
    </View>
  );
}

function RankRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <View style={st.rankRow}>
      <Text style={st.rankNumber}>{entry.rank}</Text>
      <UserAvatar uri={entry.avatarUrl} size={44} name={entry.name} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text style={st.rankName} numberOfLines={1}>{entry.name}</Text>
        <AchievementBadge level={entry.level} />
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Text style={st.rankAnimals}>{entry.distinctAnimals} hayvan</Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
          <Text style={st.rankPoints}>{entry.totalPoints}</Text>
          <Text style={st.rankPointsLabel}>Puan</Text>
        </View>
      </View>
    </View>
  );
}

function RankRowSkeleton() {
  return (
    <View style={[st.rankRow, { gap: 10 }]}>
      <SkeletonBlock w={20} h={20} r={4} />
      <SkeletonBlock w={44} h={44} r={22} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBlock w="70%" h={12} />
        <SkeletonBlock w="40%" h={10} />
      </View>
      <SkeletonBlock w={40} h={16} />
    </View>
  );
}

/* ── Main screen ────────────────────────────────────────────────── */
export default function LeaderboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = Platform.OS === "web" ? 16 : insets.top;

  const [monthKey, setMonthKey] = useState(getIstanbulMonthKey());
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentMonthKey = getIstanbulMonthKey();

  const fetchData = useCallback(async (mk: string, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/leaderboard?month=${mk}`);
      if (!res.ok) throw new Error("Sıralama yüklenemedi");
      const json = await res.json() as LeaderboardData;
      setData(json);
    } catch {
      setError("Sıralama şu anda yüklenemiyor. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void fetchData(monthKey); }, [monthKey, fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchData(monthKey, true);
  }, [monthKey, fetchData]);

  const goPrev = () => {
    Haptics.selectionAsync();
    setMonthKey(mk => addMonths(mk, -1));
  };
  const goNext = () => {
    if (monthKey >= currentMonthKey) return;
    Haptics.selectionAsync();
    setMonthKey(mk => addMonths(mk, 1));
  };

  const canGoNext = monthKey < currentMonthKey;

  return (
    <View style={[st.root, { paddingTop: topPad }]}>
      {/* ── Header ── */}
      <View style={st.header}>
        <Pressable
          onPress={() => router.back()}
          style={st.backBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Geri dön"
        >
          <Icon name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={st.headerTitle}>Ayın Kahramanları</Text>
        </View>
        <View style={{ width: 46 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[st.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.purpleDark}
            colors={[C.purpleDark]}
          />
        }
      >
        {/* Subtitle */}
        <Text style={st.subtitle}>
          Bu ay sokaktaki dostlara en çok destek olan gönüllüler.
        </Text>

        {/* Month selector */}
        <View style={st.monthSelector}>
          <Pressable
            onPress={goPrev}
            hitSlop={10}
            style={st.monthArrow}
            accessibilityLabel="Önceki ay"
          >
            <Icon name="chevron-back" size={18} color={C.purpleDark} />
          </Pressable>
          <View style={st.monthPill}>
            <Icon name="calendar" size={14} color={C.purpleDark} />
            <Text style={st.monthText}>{monthKeyToDisplay(monthKey)}</Text>
          </View>
          <Pressable
            onPress={goNext}
            hitSlop={10}
            style={[st.monthArrow, !canGoNext && { opacity: 0.3 }]}
            disabled={!canGoNext}
            accessibilityLabel="Sonraki ay"
          >
            <Icon name="chevron-forward" size={18} color={C.purpleDark} />
          </Pressable>
        </View>

        {/* Loading state */}
        {loading && !refreshing && (
          <>
            <PodiumSkeleton />
            <View style={[st.section, { gap: 10 }]}>
              {[1, 2, 3].map(i => <RankRowSkeleton key={i} />)}
            </View>
          </>
        )}

        {/* Error state */}
        {!loading && error && (
          <View style={st.centeredState}>
            <Icon name="cloud-offline-outline" size={48} color="#D1D5DB" />
            <Text style={st.stateTitle}>{error}</Text>
            <Pressable
              style={st.retryBtn}
              onPress={() => void fetchData(monthKey)}
              accessibilityRole="button"
            >
              <Text style={st.retryText}>Tekrar Dene</Text>
            </Pressable>
          </View>
        )}

        {/* Empty state */}
        {!loading && !error && data && data.top3.length === 0 && (
          <View style={st.centeredState}>
            <Icon name="trophy-outline" size={48} color="#D1D5DB" />
            <Text style={st.stateTitle}>Bu ay henüz puan kazanan bir gönüllü yok.</Text>
            <Text style={st.stateSubtitle}>İlk yardımı sen yap!</Text>
            <Pressable
              style={st.retryBtn}
              onPress={() => router.push("/(tabs)")}
              accessibilityRole="button"
            >
              <Text style={st.retryText}>Hayvanlara Göz At</Text>
            </Pressable>
          </View>
        )}

        {/* Data */}
        {!loading && !error && data && data.top3.length > 0 && (
          <>
            {/* Podium */}
            <View style={st.podiumRow}>
              {data.top3[1] ? (
                <PodiumCard entry={data.top3[1]} rank={2} />
              ) : <View style={{ flex: 1 }} />}

              {data.top3[0] && (
                <PodiumCard entry={data.top3[0]} rank={1} />
              )}

              {data.top3[2] ? (
                <PodiumCard entry={data.top3[2]} rank={3} />
              ) : <View style={{ flex: 1 }} />}
            </View>

            {/* Remaining list */}
            {data.ranking.length > 0 && (
              <View style={st.section}>
                <Text style={st.sectionTitle}>Bu Ayın Sıralaması</Text>
                {data.ranking.map(entry => (
                  <RankRow key={entry.userId} entry={entry} />
                ))}
              </View>
            )}
          </>
        )}

        {/* Current user summary */}
        {!loading && !error && data?.myRank !== null && data?.myRank !== undefined && (
          <View style={st.myRankCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <UserAvatar
                uri={data.myRank.avatarUrl}
                size={50}
                name={data.myRank.name}
              />
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={st.senPill}>
                    <Text style={st.senText}>Sen</Text>
                  </View>
                </View>
                {data.myRank.totalPoints > 0 ? (
                  <>
                    <Text style={st.myRankLine}>
                      Bu ayki sıran: {data.myRank.rank !== null ? data.myRank.rank : "—"}
                    </Text>
                    <Text style={st.myRankSub}>
                      {data.myRank.distinctAnimals} farklı hayvana destek oldun
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={st.myRankLine}>Bu ay henüz puan kazanmadın.</Text>
                    <Text style={st.myRankSub}>
                      Yardım bekleyen bir dosta destek olarak başlayabilirsin.
                    </Text>
                  </>
                )}
              </View>
              {data.myRank.totalPoints > 0 && (
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={st.myRankPoints}>{data.myRank.totalPoints}</Text>
                  <Text style={st.myRankPointsLabel}>Puan</Text>
                </View>
              )}
            </View>
            {data.myRank.totalPoints === 0 && (
              <Pressable
                style={st.goHelpBtn}
                onPress={() => { router.push("/(tabs)"); }}
                accessibilityRole="button"
              >
                <Icon name="paw" size={14} color={C.white} />
                <Text style={st.goHelpText}>Hayvanları Gör</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Unauthenticated — no myRank card, just a hint */}
        {!loading && !error && !user && (
          <View style={[st.myRankCard, { alignItems: "center", gap: 8 }]}>
            <Icon name="person-circle" size={36} color={C.purpleDark} />
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text }}>
              Kendi sıranı görmek için giriş yap.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 20,
    paddingTop: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },

  // Month selector
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  monthArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  monthPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  monthText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },

  // Podium
  podiumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  podiumCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 20,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    overflow: "hidden",
  },
  podiumCardFirst: {
    paddingVertical: 20,
    marginBottom: 12,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    borderColor: "rgba(109,40,217,0.15)",
  },
  podiumCardOther: {},
  podiumName: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: C.text,
    textAlign: "center",
  },
  podiumAnimals: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 15,
  },
  podiumPoints: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: C.purpleDark,
  },
  podiumPointsLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.purpleDark,
    paddingBottom: 2,
  },

  // Medal badge
  medalCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  medalText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },

  // Section
  section: {
    backgroundColor: C.white,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.text,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },

  // Rank row
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
  },
  rankNumber: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: C.textMuted,
    width: 24,
    textAlign: "center",
  },
  rankName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  rankAnimals: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  rankPoints: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.purpleDark,
  },
  rankPointsLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.purpleDark,
    paddingBottom: 1,
  },

  // Level badge
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },

  // My rank card
  myRankCard: {
    backgroundColor: "#EDE9FE",
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(109,40,217,0.15)",
  },
  senPill: {
    backgroundColor: C.purpleDark,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  senText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  myRankLine: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  myRankSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  myRankPoints: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: C.purpleDark,
  },
  myRankPointsLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.purpleDark,
    textAlign: "center",
  },
  goHelpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.purpleDark,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  goHelpText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },

  // States
  centeredState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 48,
  },
  stateTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.textMuted,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 22,
  },
  stateSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  retryBtn: {
    backgroundColor: C.purpleDark,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
});
