import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
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
import { AnimalCard } from "@/components/AnimalCard";
import { useAdoption } from "@/contexts/AdoptionContext";
import { useAnimals } from "@/contexts/AnimalsContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePets } from "@/contexts/PetsContext";
import { useColors } from "@/hooks/useColors";

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { animals } = useAnimals();
  const { pets } = usePets();
  const { listings } = useAdoption();
  const router = useRouter();

  const myAnimals = animals.filter((a) => a.userId === user?.id);
  const myPets = pets.filter((p) => p.userId === user?.id);
  const myListings = listings.filter((l) => l.userId === user?.id);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const tabBarOffset = Platform.OS === "web" ? 84 : 80;

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

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: topPad + 16, paddingBottom: insets.bottom + tabBarOffset + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile card */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
        </View>
        <Text style={[styles.userName, { color: colors.foreground }]}>{user.name}</Text>
        <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{user.email}</Text>

        {/* Stats */}
        <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
          {[
            { value: myAnimals.length, label: "Bildirdi" },
            { value: myPets.length, label: "Evcil" },
            { value: myListings.length, label: "İlan" },
          ].map((stat, i) => (
            <View
              key={i}
              style={[
                styles.statItem,
                i < 2 && { borderRightColor: colors.border, borderRightWidth: 1 },
              ]}
            >
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Hızlı Erişim
        </Text>
        <View style={[styles.actionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            {
              icon: "paw-outline" as const,
              label: "Sokak Hayvanı Ekle",
              color: colors.primary,
              action: () => router.push("/add-animal"),
            },
            {
              icon: "heart-outline" as const,
              label: "Evcil Hayvan Ekle",
              color: colors.secondary,
              action: () => router.push("/add-pet"),
            },
            {
              icon: "hand-left-outline" as const,
              label: "Sahiplendirme İlanı Ver",
              color: "#8B5CF6",
              action: () => router.push("/add-adoption"),
            },
          ].map((item, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [
                styles.actionItem,
                { borderTopColor: colors.border, borderTopWidth: i > 0 ? 1 : 0 },
                pressed && { opacity: 0.7 },
              ]}
              onPress={item.action}
            >
              <View style={[styles.actionIcon, { backgroundColor: item.color + "20" }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      </View>

      {/* My animals */}
      {myAnimals.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Bildirdiklerim
          </Text>
          {myAnimals.slice(0, 3).map((animal) => (
            <AnimalCard key={animal.id} animal={animal} />
          ))}
        </View>
      )}

      {/* Logout */}
      <Pressable
        style={({ pressed }) => [
          styles.logoutBtn,
          { borderColor: colors.destructive, opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>
          Çıkış Yap
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 20,
  },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    paddingTop: 28,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "white",
  },
  userName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  userEmail: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    width: "100%",
    borderTopWidth: 1,
  },
  statItem: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 2,
  },
  actionsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    marginTop: 4,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
