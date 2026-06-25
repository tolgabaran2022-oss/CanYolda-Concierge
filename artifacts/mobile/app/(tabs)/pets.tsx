import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { AdoptionCard } from "@/components/AdoptionCard";
import { AppHeader } from "@/components/AppHeader";
import { useAdoption } from "@/contexts/AdoptionContext";
import { useBoost } from "@/contexts/BoostContext";

const PURPLE = "#7B5EA7";
const PURPLE_DARK = "#3D2070";
const PURPLE_LIGHT = "#A988D4";
const BG = "#F5F1FF";

type Tab = "create" | "adoption";

const TAB_FLOAT_H = 64;
const TAB_BOTTOM_GAP = Platform.OS === "web" ? 12 : 10;

const TIPS = [
  "Hayvanın yaşı, karakteri ve sağlık durumunu belirt",
  "Net ve aydınlık fotoğraflar ekle — ilanını öne çıkarır",
  "Sahiplenecek kişiyle yüz yüze görüşmeyi tercih et",
];

function CreateListingCTA({ onPress }: { onPress: () => void }) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.ctaScroll}
    >
      {/* Hero */}
      <View style={styles.heroCard}>
        <View style={styles.heroIconWrap}>
          <LinearGradient
            colors={[`${PURPLE}30`, `${PURPLE_LIGHT}18`]}
            style={styles.heroIconGrad}
          >
            <Ionicons name="heart" size={42} color={PURPLE} />
          </LinearGradient>
        </View>
        <Text style={styles.heroTitle}>
          Evcil hayvanını sahiplendirme ilanına ekle
        </Text>
        <Text style={styles.heroSubtitle}>
          Fotoğraf, açıklama ve konum ekleyerek ilan oluştur
        </Text>

        <Pressable
          style={({ pressed }) => [styles.ctaBtn, { opacity: pressed ? 0.88 : 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onPress();
          }}
        >
          <LinearGradient
            colors={[PURPLE_LIGHT, PURPLE]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBtnGrad}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFF" />
            <Text style={styles.ctaBtnText}>İlan Oluştur</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Tips card */}
      <View style={styles.tipsCard}>
        <View style={styles.tipsHeader}>
          <Ionicons name="information-circle-outline" size={18} color={PURPLE} />
          <Text style={styles.tipsTitle}>İlan verirken dikkat edilmesi gerekenler</Text>
        </View>
        {TIPS.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <View style={styles.tipDot} />
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {[
          { icon: "paw-outline" as const, label: "Aktif İlan", value: "2.4K+" },
          { icon: "heart-outline" as const, label: "Sahiplenme", value: "800+" },
          { icon: "people-outline" as const, label: "Topluluk", value: "12K+" },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, i > 0 && { marginLeft: 10 }]}>
            <Ionicons name={s.icon} size={20} color={PURPLE} />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default function PetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { listings } = useAdoption();
  const { boostStatuses, fetchBoostStatus } = useBoost();
  const [activeTab, setActiveTab] = useState<Tab>("create");

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

  const goCreateListing = () => router.push("/add-adoption");

  return (
    <View style={styles.container}>
      <AppHeader topPad={topPad} />

      {/* Screen title */}
      <View style={styles.titleRow}>
        <Text style={styles.screenTitle}>Evcil Hayvan İlanı Ver</Text>
      </View>

      {/* Segment control */}
      <View style={styles.segmentWrap}>
        {(["create", "adoption"] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.segmentItem, activeTab === tab && styles.segmentActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === tab ? styles.segmentTextActive : styles.segmentTextInactive,
              ]}
            >
              {tab === "create" ? "İlan Oluştur" : "Tüm İlanlar"}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === "create" ? (
        <CreateListingCTA onPress={goCreateListing} />
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
            <View style={styles.emptyWrap}>
              <Ionicons name="heart-outline" size={48} color={`${PURPLE}60`} />
              <Text style={styles.emptyTitle}>Henüz ilan yok</Text>
              <Text style={styles.emptySubtitle}>
                İlk sahiplendirme ilanını sen oluştur
              </Text>
              <Pressable
                style={({ pressed }) => [styles.emptyBtn, { opacity: pressed ? 0.85 : 1 }]}
                onPress={goCreateListing}
              >
                <Text style={styles.emptyBtnText}>İlan Oluştur</Text>
              </Pressable>
            </View>
          }
        />
      )}

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: tabClearance + 14, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          goCreateListing();
        }}
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
    marginBottom: 10,
    zIndex: 1,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
    textAlign: "center",
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
  segmentText: { fontSize: 13 },
  segmentTextActive: { color: "#FFF", fontFamily: "Inter_600SemiBold" },
  segmentTextInactive: { color: "#8874A8", fontFamily: "Inter_400Regular" },

  /* CTA scroll */
  ctaScroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 120,
    gap: 14,
  },

  /* Hero card */
  heroCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.15)",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    gap: 10,
  },
  heroIconWrap: { marginBottom: 4 },
  heroIconGrad: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
    textAlign: "center",
    lineHeight: 26,
  },
  heroSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#8874A8",
    textAlign: "center",
    lineHeight: 20,
  },
  ctaBtn: {
    width: "100%",
    marginTop: 6,
    borderRadius: 50,
    overflow: "hidden",
  },
  ctaBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 32,
  },
  ctaBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    letterSpacing: 0.2,
  },

  /* Tips card */
  tipsCard: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.15)",
    padding: 16,
    gap: 10,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  tipsTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: PURPLE_DARK,
    flex: 1,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PURPLE,
    marginTop: 6,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#5C4A7A",
    lineHeight: 20,
  },

  /* Stats row */
  statsRow: {
    flexDirection: "row",
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.12)",
    alignItems: "center",
    paddingVertical: 14,
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#8874A8",
  },

  /* List */
  listContent: { paddingTop: 4 },

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

  /* Empty (adoption tab) */
  emptyWrap: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: PURPLE_DARK,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#8874A8",
    textAlign: "center",
  },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: PURPLE,
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  emptyBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
