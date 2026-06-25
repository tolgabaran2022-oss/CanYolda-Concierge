import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
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
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { STATUS_COLORS } from "@/components/StatusBadge";
import type { AnimalStatus } from "@/contexts/AnimalsContext";
import { useAnimals } from "@/contexts/AnimalsContext";

const PURPLE = "#7B5EA7";
const BG = "#F5F1FF";

const TAB_BAR_H = 64;
const TAB_BAR_MARGIN = Platform.OS === "web" ? 12 : 10;

const FILTERS: { key: "all" | AnimalStatus; label: string }[] = [
  { key: "all",      label: "Hepsi"      },
  { key: "hungry",   label: "Aç"         },
  { key: "injured",  label: "Yaralı"     },
  { key: "healthy",  label: "Sağlıklı"   },
  { key: "unknown",  label: "Bilinmiyor" },
];

export default function AnimalsScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { animals } = useAnimals();
  const [filter, setFilter] = useState<"all" | AnimalStatus>("all");

  const filtered = useMemo(
    () => filter === "all" ? animals : animals.filter((a) => a.status === filter),
    [animals, filter]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // Bottom of floating tab bar from bottom of screen
  const tabBarBottom = insets.bottom + TAB_BAR_MARGIN + TAB_BAR_H;

  return (
    <View style={styles.container}>
      {/* Header */}
      <AppHeader topPad={topPad} />

      {/* Title row — no add button here */}
      <View style={styles.titleRow}>
        <Text style={styles.screenTitle}>Sokak Hayvanları</Text>
        <Text style={[styles.countBadge, { color: PURPLE }]}>
          {filtered.length} hayvan
        </Text>
      </View>

      {/* Filter chips — proper vertical padding */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {FILTERS.map((f) => {
          const isActive  = filter === f.key;
          const chipColor = f.key === "all" ? PURPLE : STATUS_COLORS[f.key];
          const count =
            f.key === "all"
              ? animals.length
              : animals.filter((a) => a.status === f.key).length;
          return (
            <Pressable
              key={f.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? chipColor : "rgba(255,255,255,0.85)",
                  borderColor: isActive ? chipColor : "rgba(123,94,167,0.22)",
                },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color: isActive ? "white" : "#8874A8",
                    fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {f.label}
                {count > 0 ? ` (${count})` : ""}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* List — padded well clear of tab bar + safe area */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AnimalCard animal={item} />}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: tabBarBottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="paw-outline"
            title="Hayvan bulunamadı"
            subtitle="Bu kategoride henüz sokak hayvanı bildirilmemiş."
          />
        }
      />

      {/* True floating action button — above tab bar */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            bottom: tabBarBottom + 16,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        onPress={() => router.push("/add-animal")}
      >
        <Ionicons name="add" size={28} color="white" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  /* Title row */
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 2,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#2D1B4E",
  },
  countBadge: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  /* Filter chips */
  filterScroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 8,
  },
  filterChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  filterText: {
    fontSize: 13,
  },

  /* List */
  list: {
    paddingTop: 4,
  },

  /* FAB */
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
    elevation: 8,
  },
});
