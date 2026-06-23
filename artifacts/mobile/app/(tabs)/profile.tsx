import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { useAdoption } from "@/contexts/AdoptionContext";
import { useAnimals } from "@/contexts/AnimalsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBoost } from "@/contexts/BoostContext";
import { usePets } from "@/contexts/PetsContext";

const PURPLE = "#7B5EA7";
const PURPLE_DARK = "#3D2070";
const BG = "#F5F1FF";

const TAB_FLOAT_H = 64;
const TAB_BOTTOM_GAP = Platform.OS === "web" ? 12 : 10;

const CAT_AVATAR =
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&q=80";

function formatExpiry(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  const hoursLeft = Math.max(0, Math.floor(diff / 3_600_000));
  const minutesLeft = Math.max(0, Math.floor((diff % 3_600_000) / 60_000));
  if (hoursLeft > 0) return `${hoursLeft} saat ${minutesLeft} dk`;
  return `${minutesLeft} dakika`;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { animals } = useAnimals();
  const { pets } = usePets();
  const { listings } = useAdoption();
  const { myBoosts, fetchMyBoosts } = useBoost();
  const router = useRouter();

  const myAnimals = animals.filter((a) => a.userId === user?.id);
  const myPets = pets.filter((p) => p.userId === user?.id);
  const myListings = listings.filter((l) => l.userId === user?.id);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const tabClearance = insets.bottom + TAB_BOTTOM_GAP + TAB_FLOAT_H;

  useEffect(() => {
    if (user?.email) fetchMyBoosts(user.email);
  }, [user?.email, fetchMyBoosts]);

  const handleLogout = () => {
    Alert.alert("Çıkış Yap", "Hesabından çıkmak istiyor musun?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: async () => {
          await logout();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  if (!user) return null;

  const activeBoosts = myBoosts.filter(
    (b) => new Date(b.expires_at ?? b.expiresAt).getTime() > Date.now()
  );

  const getListingName = (listingId: string) =>
    myListings.find((l) => l.id === listingId)?.petName ?? "Bilinmiyor";

  const quickActions = [
    {
      icon: "paw-outline" as const,
      label: "Sokak Hayvanı Ekle",
      action: () => router.push("/add-animal"),
    },
    {
      icon: "heart-outline" as const,
      label: "Evcil Hayvan Ekle",
      action: () => router.push("/add-pet"),
    },
    {
      icon: "hand-left-outline" as const,
      label: "Sahiplendirme İlanı Ver",
      action: () => router.push("/add-adoption"),
    },
  ];

  return (
    <View style={styles.outerContainer}>
      <AppHeader topPad={topPad} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: tabClearance + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: CAT_AVATAR }}
              style={styles.avatarImage}
              contentFit="cover"
            />
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>

          <View style={styles.statsRow}>
            {[
              { value: myAnimals.length, label: "Bildirdi" },
              { value: myPets.length, label: "Evcil" },
              { value: myListings.length, label: "İlan" },
            ].map((stat, i) => (
              <View
                key={i}
                style={[
                  styles.statItem,
                  i < 2 && styles.statBorder,
                ]}
              >
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Active Boosts */}
        {activeBoosts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aktif Öne Çıkarmalar</Text>
            <View style={styles.card}>
              {activeBoosts.map((boost, i) => {
                const expiresAt = boost.expires_at ?? boost.expiresAt;
                const listingId = boost.listing_id ?? boost.listingId;
                const hours = boost.package_hours ?? boost.packageHours;
                return (
                  <Pressable
                    key={boost.id ?? i}
                    style={({ pressed }) => [
                      styles.cardRow,
                      i > 0 && styles.cardRowBorder,
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                    onPress={() => router.push(`/adoption/${listingId}` as const)}
                  >
                    <View style={styles.iconBadge}>
                      <Ionicons name="star" size={18} color={PURPLE} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardRowLabel}>
                        {getListingName(listingId)}
                      </Text>
                      <Text style={styles.cardRowMeta}>
                        {hours}s paket · {formatExpiry(expiresAt)} kaldı
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#8874A8" />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
          <View style={styles.card}>
            {quickActions.map((item, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  styles.cardRow,
                  i > 0 && styles.cardRowBorder,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
                onPress={item.action}
              >
                <View style={styles.iconBadge}>
                  <Ionicons name={item.icon} size={20} color={PURPLE} />
                </View>
                <Text style={styles.cardRowLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#8874A8" />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Logout */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutBtn,
            { opacity: pressed ? 0.75 : 1 },
          ]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#D94040" />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    gap: 20,
  },

  /* Profile card */
  profileCard: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.15)",
    alignItems: "center",
    paddingTop: 24,
    overflow: "hidden",
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: `${PURPLE}40`,
  },
  avatarImage: {
    width: 80,
    height: 80,
  },
  userName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
  },
  userEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#8874A8",
    marginTop: 2,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "rgba(123,94,167,0.12)",
  },
  statItem: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    gap: 2,
  },
  statBorder: {
    borderRightWidth: 1,
    borderRightColor: "rgba(123,94,167,0.12)",
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: PURPLE,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#8874A8",
  },

  /* Sections */
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
    paddingHorizontal: 2,
  },

  /* Card rows */
  card: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.15)",
    overflow: "hidden",
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  cardRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "rgba(123,94,167,0.1)",
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: `${PURPLE}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  cardRowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: PURPLE_DARK,
  },
  cardRowMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#8874A8",
    marginTop: 2,
  },

  /* Logout */
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D94040",
    paddingVertical: 14,
    marginTop: 4,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#D94040",
  },
});
