import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Platform,
  useWindowDimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimalCard } from "@/components/AnimalCard";
import { EmptyState } from "@/components/EmptyState";
import { useAnimals } from "@/contexts/AnimalsContext";
import { useTheme } from "@/hooks/useTheme";

const PURPLE      = "#7B5EA7";
const PURPLE_DARK = "#4A2D8F";
const BG          = "#F8F9FC";

type FilterKey = "all" | "injured" | "hungry" | "healthy";

const FILTERS: { key: FilterKey; label: string; emoji: string; accent: string }[] = [
  { key: "all",     label: "Hepsi",          emoji: "🐾", accent: PURPLE      },
  { key: "injured", label: "Acil",            emoji: "🚨", accent: "#DC2626"  },
  { key: "hungry",  label: "Yardım Bekleyen", emoji: "🟡", accent: "#D97706"  },
  { key: "healthy", label: "Sağlıklı",        emoji: "🟢", accent: "#16A34A"  },
];

function filterAnimals(
  animals: import("@/contexts/AnimalsContext").StrayAnimal[],
  key: FilterKey
) {
  if (key === "all")     return animals;
  if (key === "injured") return animals.filter((a) => a.status === "injured");
  if (key === "hungry")  return animals.filter((a) => a.status === "hungry" || a.status === "unknown");
  if (key === "healthy") return animals.filter((a) => a.status === "healthy");
  return animals;
}

function countForFilter(
  animals: import("@/contexts/AnimalsContext").StrayAnimal[],
  key: FilterKey
) {
  return filterAnimals(animals, key).length;
}

function FilterChip({
  f,
  active,
  count,
  onPress,
}: {
  f: (typeof FILTERS)[0];
  active: boolean;
  count: number;
  onPress: () => void;
}) {
  const T = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={handlePress} hitSlop={4}>
        {active ? (
          <LinearGradient
            colors={["#9478D8", "#5B3FD6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={F.chipActive}
          >
            <Text style={F.chipEmoji}>{f.emoji}</Text>
            <Text style={F.chipLabelActive}>{f.label}</Text>
            <View style={F.chipBadge}>
              <Text style={F.chipBadgeText}>{count}</Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={[F.chipInactive, { backgroundColor: T.card, borderColor: T.border }]}>
            <Text style={F.chipEmoji}>{f.emoji}</Text>
            <Text style={[F.chipLabelInactive, { color: T.text }]}>{f.label}</Text>
            <View style={[F.chipBadgeInactive, { backgroundColor: `${f.accent}18` }]}>
              <Text style={[F.chipBadgeTextInactive, { color: f.accent }]}>{count}</Text>
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function AnimalsScreen() {
  const T             = useTheme();
  const insets        = useSafeAreaInsets();
  const { width: SW } = useWindowDimensions();
  const router        = useRouter();
  const { animals }   = useAnimals();
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered   = useMemo(() => filterAnimals(animals, filter), [animals, filter]);
  const topPad     = Platform.OS === "web" ? (SW < 1024 ? 54 : 16) : insets.top;
  const bottomNavH = Platform.OS === "web" ? (SW < 1024 ? 100 : 24) : (84 + insets.bottom + 10);

  const addBtnScale = useRef(new Animated.Value(1)).current;

  const handleAdd = useCallback(() => {
    Animated.sequence([
      Animated.timing(addBtnScale, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(addBtnScale, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/add-animal");
  }, [router, addBtnScale]);

  const handleFilterChange = useCallback((key: FilterKey) => {
    Haptics.selectionAsync();
    setFilter(key);
  }, []);

  const injured = countForFilter(animals, "injured");
  const hungry  = countForFilter(animals, "hungry");
  const healthy = countForFilter(animals, "healthy");

  const renderHeader = () => (
    <>
      {/* ── Hero header ───────────────────────── */}
      <View style={[H.hero, { paddingTop: topPad + 16, backgroundColor: T.bg }]}>

        {/* Top row */}
        <View style={H.topRow}>
          <View style={H.logoRow}>
            <View style={H.logoPill}>
              <Ionicons name="paw" size={14} color={PURPLE} />
            </View>
            <Text style={[H.logoText, { color: T.text }]}>canyoldaşı</Text>
          </View>

          <Animated.View style={{ transform: [{ scale: addBtnScale }] }}>
            <Pressable onPress={handleAdd} hitSlop={8}>
              <LinearGradient
                colors={["#9C7FE0", "#5B3FD6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={H.addBtn}
              >
                <Ionicons name="add" size={15} color="#FFF" />
                <Text style={H.addBtnText}>Durum Bildir</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>

        {/* Title block */}
        <View style={H.titleBlock}>
          <Text style={[H.title, { color: T.text }]}>Sokak Hayvanları</Text>
          <Text style={[H.subtitle, { color: T.textMuted }]}>Yakınındaki canlı durumları keşfet</Text>
        </View>

        {/* Status summary row — Acil + Bekleyen + Sağlıklı + Toplam */}
        <View style={[H.summaryRow, { backgroundColor: T.card, borderColor: T.border }]}>
          <View style={H.summaryCard}>
            <View style={[H.summaryDot, { backgroundColor: "#DC2626" }]} />
            <View>
              <Text style={[H.summaryNum, { color: T.text }]}>{injured}</Text>
              <Text style={[H.summaryLabel, { color: T.textMuted }]}>Acil</Text>
            </View>
          </View>
          <View style={[H.summaryDivider, { backgroundColor: T.divider }]} />
          <View style={H.summaryCard}>
            <View style={[H.summaryDot, { backgroundColor: "#D97706" }]} />
            <View>
              <Text style={[H.summaryNum, { color: T.text }]}>{hungry}</Text>
              <Text style={[H.summaryLabel, { color: T.textMuted }]}>Bekleyen</Text>
            </View>
          </View>
          <View style={[H.summaryDivider, { backgroundColor: T.divider }]} />
          <View style={H.summaryCard}>
            <View style={[H.summaryDot, { backgroundColor: "#16A34A" }]} />
            <View>
              <Text style={[H.summaryNum, { color: T.text }]}>{healthy}</Text>
              <Text style={[H.summaryLabel, { color: T.textMuted }]}>Sağlıklı</Text>
            </View>
          </View>
          <View style={[H.summaryDivider, { backgroundColor: T.divider }]} />
          <View style={H.summaryCard}>
            <View style={[H.summaryDot, { backgroundColor: T.purple }]} />
            <View>
              <Text style={[H.summaryNum, { color: T.text }]}>{animals.length}</Text>
              <Text style={[H.summaryLabel, { color: T.textMuted }]}>Toplam</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Filter chips ──────────────────────── */}
      <View style={[F.container, { backgroundColor: T.bg }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={F.scroll}
        >
          {FILTERS.map((f) => (
            <FilterChip
              key={f.key}
              f={f}
              active={filter === f.key}
              count={countForFilter(animals, f.key)}
              onPress={() => handleFilterChange(f.key)}
            />
          ))}
        </ScrollView>
      </View>
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <AnimalCard animal={item} index={index} />}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: bottomNavH + 24 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
        ListEmptyComponent={
          <EmptyState
            icon="paw-outline"
            title="Hayvan bulunamadı"
            subtitle="Bu kategoride henüz sokak hayvanı bildirilmemiş."
          />
        }
      />
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────── */

const H = StyleSheet.create({
  hero: {
    backgroundColor: BG,
    paddingLeft: 17,
    paddingRight: 16,
    paddingBottom: 8,
    gap: 11,
    marginVertical: 11,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoPill: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${PURPLE}14`,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
    letterSpacing: -0.3,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 24,
    shadowColor: "#5B3FD6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
    letterSpacing: -0.1,
  },

  titleBlock: { gap: 2 },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#1A0A3C",
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#8B8FA8",
  },

  summaryRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.08)",
    shadowColor: "#2D1B4E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  summaryCard: {
    alignItems: "center",
    gap: 4,
    flexDirection: "row",
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  summaryNum: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#1A0A3C",
    lineHeight: 22,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#8B8FA8",
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#EEE9F8",
  },

  countBanner: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: `${PURPLE}08`,
    borderRadius: 16,
    paddingVertical: 9,
    paddingLeft: 14,
    paddingRight: 14,
    marginTop: 45,
    marginBottom: 1,
    marginLeft: 9,
    marginRight: 7,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: `${PURPLE}18`,
  },
  countIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: `${PURPLE}14`,
    alignItems: "center",
    justifyContent: "center",
  },
  countMain: {
    fontSize: 13.5,
    fontFamily: "Inter_600SemiBold",
    color: "#1A0A3C",
    letterSpacing: -0.1,
  },
  countSub: {
    fontSize: 11.5,
    fontFamily: "Inter_400Regular",
    color: "#8B8FA8",
    marginTop: 2,
  },
  countArrow: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: `${PURPLE}14`,
    alignItems: "center",
    justifyContent: "center",
  },
});

const F = StyleSheet.create({
  container: {
    backgroundColor: BG,
    paddingBottom: 4,
    width: "100%",
  },
  scroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: "center",
    flexGrow: 1,
  },
  chipActive: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
    shadowColor: "#5B3FD6",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 40,
  },
  chipInactive: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(123,94,167,0.14)",
    minHeight: 40,
    shadowColor: "#2D1B4E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  chipEmoji: { fontSize: 13, lineHeight: 16 },
  chipLabelActive: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
    letterSpacing: -0.1,
  },
  chipLabelInactive: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#3D2080",
    letterSpacing: -0.1,
  },
  chipBadge: {
    backgroundColor: "rgba(255,255,255,0.28)",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: "center",
  },
  chipBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  chipBadgeInactive: {
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: "center",
  },
  chipBadgeTextInactive: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
});
