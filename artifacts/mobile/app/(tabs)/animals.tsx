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
import { EmptyState } from "@/components/EmptyState";
import { STATUS_COLORS } from "@/components/StatusBadge";
import type { AnimalStatus } from "@/contexts/AnimalsContext";
import { useAnimals } from "@/contexts/AnimalsContext";
import { useColors } from "@/hooks/useColors";

const FILTERS: { key: "all" | AnimalStatus; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "hungry", label: "Aç" },
  { key: "injured", label: "Yaralı" },
  { key: "healthy", label: "Sağlıklı" },
  { key: "unknown", label: "Bilinmiyor" },
];

export default function AnimalsScreen() {
  const colors = useColors();
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Sokak Hayvanları
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.push("/add-animal")}
          >
            <Ionicons name="add" size={20} color="white" />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map((f) => {
            const isActive = filter === f.key;
            const dotColor = f.key !== "all" ? STATUS_COLORS[f.key] : colors.primary;
            return (
              <Pressable
                key={f.key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? dotColor : colors.muted,
                    borderColor: isActive ? dotColor : "transparent",
                  },
                ]}
                onPress={() => setFilter(f.key)}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: isActive ? "white" : colors.mutedForeground,
                      fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {f.label}
                  {f.key !== "all"
                    ? ` (${animals.filter((a) => a.status === f.key).length})`
                    : ` (${animals.length})`}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

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
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  filterScroll: {
    paddingHorizontal: 0,
    gap: 8,
    paddingBottom: 4,
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
    paddingTop: 8,
  },
});
