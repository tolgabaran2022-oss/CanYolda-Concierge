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

const FILTERS: { key: "all" | AnimalStatus; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "hungry", label: "Aç" },
  { key: "injured", label: "Yaralı" },
  { key: "healthy", label: "Sağlıklı" },
  { key: "unknown", label: "Bilinmiyor" },
];

export default function AnimalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { animals } = useAnimals();
  const [filter, setFilter] = useState<"all" | AnimalStatus>("all");

  const filtered = useMemo(
    () => (filter === "all" ? animals : animals.filter((a) => a.status === filter)),
    [animals, filter]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const tabBarOffset = Platform.OS === "web" ? 84 : 80;

  return (
    <View style={styles.container}>
      {/* Header with blobs + logo */}
      <AppHeader topPad={topPad} />

      {/* Screen title + add button */}
      <View style={styles.titleRow}>
        <Text style={styles.screenTitle}>Sokak Hayvanları</Text>
        <Pressable
          style={({ pressed }) => [
            styles.addBtn,
            { opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => router.push("/add-animal")}
        >
          <Ionicons name="add" size={22} color="white" />
        </Pressable>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
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
                  backgroundColor: isActive ? chipColor : "rgba(255,255,255,0.7)",
                  borderColor: isActive ? chipColor : "rgba(123,94,167,0.2)",
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
                {f.label} ({count})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AnimalCard animal={item} />}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + tabBarOffset + 16 },
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
    zIndex: 1,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#2D1B4E",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1.5,
  },
  filterText: {
    fontSize: 13,
  },
  list: {
    paddingTop: 4,
  },
});
