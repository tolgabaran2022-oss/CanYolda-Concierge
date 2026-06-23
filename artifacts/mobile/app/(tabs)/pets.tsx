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
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { PetCard } from "@/components/PetCard";
import { useAdoption } from "@/contexts/AdoptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBoost } from "@/contexts/BoostContext";
import { usePets } from "@/contexts/PetsContext";

const PURPLE = "#7B5EA7";
const BG = "#F5F1FF";

type Tab = "pets" | "adoption";

const TAB_FLOAT_H = 64;
const TAB_BOTTOM_GAP = Platform.OS === "web" ? 12 : 10;

export default function PetsScreen() {
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
    <View style={styles.container}>
      <AppHeader topPad={topPad} />

      {/* Screen title */}
      <View style={styles.titleRow}>
        <Text style={styles.screenTitle}>Evcil Hayvanlar</Text>
      </View>

      {/* Segment control */}
      <View style={styles.segmentWrap}>
        {(["pets", "adoption"] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[
              styles.segmentItem,
              activeTab === tab && styles.segmentActive,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === tab
                  ? styles.segmentTextActive
                  : styles.segmentTextInactive,
              ]}
            >
              {tab === "pets" ? "Evcil Hayvanlarım" : "Sahiplendirme"}
            </Text>
          </Pressable>
        ))}
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
              <View style={styles.featuredNote}>
                <Ionicons name="star" size={14} color={PURPLE} />
                <Text style={styles.featuredNoteText}>
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
  container: { flex: 1, backgroundColor: BG },
  titleRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
    zIndex: 1,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#2D1B4E",
  },
  segmentWrap: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1.5,
    borderColor: "rgba(123,94,167,0.18)",
    zIndex: 1,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: PURPLE,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentText: {
    fontSize: 13,
  },
  segmentTextActive: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  segmentTextInactive: {
    color: "#8874A8",
    fontFamily: "Inter_400Regular",
  },
  row: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  listContent: {
    paddingTop: 4,
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
    backgroundColor: `${PURPLE}15`,
  },
  featuredNoteText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: PURPLE,
  },
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
