import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdoptionCard } from "@/components/AdoptionCard";
import { EmptyState } from "@/components/EmptyState";
import { PetCard } from "@/components/PetCard";
import { useAdoption } from "@/contexts/AdoptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBoost } from "@/contexts/BoostContext";
import { usePets } from "@/contexts/PetsContext";
import { useColors } from "@/hooks/useColors";

type Tab = "pets" | "adoption";

const TAB_FLOAT_H = 64;
const TAB_BOTTOM_GAP = Platform.OS === "web" ? 12 : 10;

export default function PetsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { pets } = usePets();
  const { listings } = useAdoption();
  const { user } = useAuth();
  const { boostStatuses, fetchBoostStatus } = useBoost();
  const [activeTab, setActiveTab] = useState<Tab>("pets");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const tabClearance = insets.bottom + TAB_BOTTOM_GAP + TAB_FLOAT_H;

  useEffect(() => {
    if (listings.length > 0) {
      fetchBoostStatus(listings.map((l) => l.id));
    }
  }, [listings, fetchBoostStatus]);

  const sortedListings = [...listings].sort((a, b) => {
    const aFeatured = boostStatuses[a.id]?.isFeatured ? 1 : 0;
    const bFeatured = boostStatuses[b.id]?.isFeatured ? 1 : 0;
    if (bFeatured !== aFeatured) return bFeatured - aFeatured;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const fabAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (activeTab === "pets") {
      router.push("/add-pet");
    } else {
      router.push("/add-adoption");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          {activeTab === "pets" ? "Evcil Hayvanlar" : "Sahiplendirme"}
        </Text>

        {/* Segment control */}
        <View style={[styles.segment, { backgroundColor: colors.muted }]}>
          {(["pets", "adoption"] as Tab[]).map((tab) => (
            <Pressable
              key={tab}
              style={[
                styles.segmentItem,
                activeTab === tab && {
                  backgroundColor: colors.card,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      activeTab === tab ? colors.primary : colors.mutedForeground,
                    fontFamily:
                      activeTab === tab ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {tab === "pets" ? "Evcil Hayvanlarım" : "Sahiplendirme"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {activeTab === "pets" ? (
        <FlatList
          key="pets"
          data={pets}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabClearance + 80 },
          ]}
          renderItem={({ item }) => (
            <PetCard pet={item} isOwner={item.userId === user?.id} />
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title="Henüz evcil hayvan yok"
              subtitle='Aşağıdaki "+" butonuna tıklayarak bir hayvan profili oluştur.'
            />
          }
        />
      ) : (
        <FlatList
          key="adoption"
          data={sortedListings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabClearance + 80 },
          ]}
          renderItem={({ item }) => <AdoptionCard listing={item} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            sortedListings.some((l) => boostStatuses[l.id]?.isFeatured) ? (
              <View style={[styles.featuredNote, { backgroundColor: `${"#E07A35"}12` }]}>
                <Ionicons name="star" size={14} color="#E07A35" />
                <Text style={[styles.featuredNoteText, { color: "#E07A35" }]}>
                  Öne çıkan ilanlar üstte gösterilir
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="hand-left-outline"
              title="Sahiplendirme ilanı yok"
              subtitle="Yuva arayan hayvanlar için ilan paylaş."
            />
          }
        />
      )}

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            bottom: tabClearance + 14,
            backgroundColor: activeTab === "pets" ? colors.primary : colors.secondary,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        onPress={fabAction}
      >
        <Ionicons name="add" size={28} color="white" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  segment: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentText: {
    fontSize: 13,
  },
  row: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  listContent: {
    paddingTop: 8,
  },
  featuredNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 4,
    marginTop: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  featuredNoteText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
