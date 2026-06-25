import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Animated,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimalCard } from "@/components/AnimalCard";
import { EmptyState } from "@/components/EmptyState";
import type { AnimalStatus } from "@/contexts/AnimalsContext";
import { useAnimals } from "@/contexts/AnimalsContext";

const PURPLE = "#7B5EA7";
const BG     = "#F9F8FF";

type FilterKey = "all" | "injured" | "hungry" | "healthy";

const FILTERS: { key: FilterKey; label: string; emoji: string }[] = [
  { key: "all",     label: "Hepsi",           emoji: "" },
  { key: "injured", label: "Acil",             emoji: "🚨" },
  { key: "hungry",  label: "Yardım Bekleyen",  emoji: "🟡" },
  { key: "healthy", label: "Sağlıklı",         emoji: "🟢" },
];

function filterAnimals(animals: import("@/contexts/AnimalsContext").StrayAnimal[], key: FilterKey) {
  if (key === "all") return animals;
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

export default function AnimalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { animals } = useAnimals();
  const [filter, setFilter] = useState<FilterKey>("all");
  const fabScale = React.useRef(new Animated.Value(1)).current;

  const filtered = useMemo(() => filterAnimals(animals, filter), [animals, filter]);

  const topPad      = Platform.OS === "web" ? 20 : insets.top;
  const bottomNavH  = 68 + insets.bottom + 10;

  const pressFab = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(fabScale, { toValue: 0.88, useNativeDriver: true, speed: 40 }),
      Animated.spring(fabScale, { toValue: 1,    useNativeDriver: true, speed: 30 }),
    ]).start();
    router.push("/add-animal");
  };

  const renderHeader = () => (
    <>
      {/* ── Hero header ─────────────────────────── */}
      <View style={[H.hero, { paddingTop: topPad + 12 }]}>
        {/* Logo row */}
        <View style={H.logoRow}>
          <Ionicons name="paw" size={16} color={PURPLE} />
          <Text style={H.logoText}>canyoldaşı</Text>
        </View>

        <Text style={H.title}>Sokak Hayvanları</Text>
        <Text style={H.subtitle}>Yakınındaki canlı durumları keşfet</Text>

        {/* Count banner */}
        <Pressable style={H.countBanner} onPress={() => {}}>
          <View style={H.countIconWrap}>
            <Ionicons name="paw" size={20} color={PURPLE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={H.countMain}>{animals.length} aktif durum bulundu</Text>
            <Text style={H.countSub}>Onların hayatına dokunabilirsin</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={PURPLE} />
        </Pressable>
      </View>

      {/* ── Filter chips ────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flex: 0, backgroundColor: BG }}
        contentContainerStyle={F.scroll}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count  = countForFilter(animals, f.key);
          return (
            <Pressable
              key={f.key}
              onPress={() => {
                Haptics.selectionAsync();
                setFilter(f.key);
              }}
              style={active ? undefined : F.chipInactive}
            >
              {active ? (
                <LinearGradient
                  colors={["#9478D8", "#5B3FD6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={F.chipGradient}
                >
                  <Text style={F.chipTextActive}>
                    {f.emoji ? `${f.emoji} ` : ""}{f.label} ({count})
                  </Text>
                </LinearGradient>
              ) : (
                <Text style={F.chipTextInactive}>
                  {f.emoji ? `${f.emoji} ` : ""}{f.label} ({count})
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ height: 4 }} />
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AnimalCard animal={item} />}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: bottomNavH + 80 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="paw-outline"
            title="Hayvan bulunamadı"
            subtitle="Bu kategoride henüz sokak hayvanı bildirilmemiş."
          />
        }
      />

      {/* FAB */}
      <Animated.View
        style={[
          FAB.wrap,
          { bottom: bottomNavH - 8, transform: [{ scale: fabScale }] },
        ]}
      >
        <Pressable onPress={pressFab}>
          <LinearGradient
            colors={["#9478D8", "#5B3FD6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={FAB.gradient}
          >
            <Ionicons name="add" size={22} color="#FFF" />
            <Text style={FAB.label}>Yeni Durum{"\n"}Bildir</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────── */

const H = StyleSheet.create({
  hero: {
    backgroundColor: BG,
    paddingHorizontal: 18,
    paddingBottom: 16,
    gap: 4,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  logoText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: PURPLE,
    letterSpacing: -0.2,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#1E0B4B",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13.5,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    marginBottom: 12,
  },
  countBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.12)",
    shadowColor: "#2D1B4E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  countIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(123,94,167,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  countMain: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#1E0B4B",
  },
  countSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    marginTop: 1,
  },
});

const F = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: "center",
  },
  chipInactive: {
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(123,94,167,0.18)",
  },
  chipGradient: {
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipTextActive: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  chipTextInactive: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#4A2D8F",
  },
});

const FAB = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 18,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 32,
    shadowColor: "#5B3FD6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    lineHeight: 17,
  },
});
