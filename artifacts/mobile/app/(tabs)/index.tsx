import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBadge, STATUS_COLORS } from "@/components/StatusBadge";
import type { StrayAnimal } from "@/contexts/AnimalsContext";
import { useAnimals } from "@/contexts/AnimalsContext";
import { useColors } from "@/hooks/useColors";
import { formatTimeAgo } from "@/utils/formatters";

const DEFAULT_REGION = {
  latitude: 41.0082,
  longitude: 28.9784,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { animals } = useAnimals();
  const [selected, setSelected] = useState<StrayAnimal | null>(null);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [locPermission, requestLocPermission] = Location.useForegroundPermissions();
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (locPermission?.granted) {
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).then((loc) => {
        setRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }).catch(() => {});
    }
  }, [locPermission?.granted]);

  const tabBarOffset = Platform.OS === "web" ? 84 : 80;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        region={region}
        showsUserLocation={!!(locPermission?.granted && Platform.OS !== "web")}
        showsMyLocationButton={false}
        onPress={() => setSelected(null)}
      >
        {animals.map((animal) => (
          <Marker
            key={animal.id}
            coordinate={{ latitude: animal.latitude, longitude: animal.longitude }}
            onPress={() => {
              setSelected(animal);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <View
              style={[
                styles.marker,
                { backgroundColor: STATUS_COLORS[animal.status] },
              ]}
            >
              <Ionicons name="paw" size={13} color="white" />
              {animal.needsHelpByUsers.length > 0 && (
                <View style={styles.urgentDot} />
              )}
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Top header */}
      <View
        style={[
          styles.topBar,
          {
            top: Platform.OS === "web" ? 67 : insets.top,
            backgroundColor: "rgba(250, 247, 240, 0.92)",
          },
        ]}
      >
        <Text style={[styles.mapTitle, { color: colors.foreground }]}>
          CanYoldaşı
        </Text>
        <View style={styles.countBadge}>
          <Text style={[styles.countText, { color: colors.primary }]}>
            {animals.length} hayvan
          </Text>
        </View>
      </View>

      {/* Location permission banner */}
      {!locPermission?.granted && Platform.OS !== "web" && (
        <Pressable
          style={[
            styles.permBanner,
            {
              top: (Platform.OS === "web" ? 67 : insets.top) + 60,
              backgroundColor: colors.secondary,
            },
          ]}
          onPress={requestLocPermission}
        >
          <Ionicons name="location-outline" size={16} color="white" />
          <Text style={styles.permText}>Konumumu Göster</Text>
        </Pressable>
      )}

      {/* Selected animal card */}
      {selected && (
        <View
          style={[
            styles.animalCard,
            {
              bottom: insets.bottom + tabBarOffset + 12,
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Pressable
            style={styles.animalCardInner}
            onPress={() => {
              router.push(`/animal/${selected.id}` as const);
              setSelected(null);
            }}
          >
            <View
              style={[
                styles.statusCircle,
                { backgroundColor: STATUS_COLORS[selected.status] },
              ]}
            >
              <Ionicons name="paw" size={20} color="white" />
            </View>
            <View style={styles.animalCardText}>
              <StatusBadge status={selected.status} size="sm" />
              <Text
                style={[styles.animalCardNotes, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {selected.notes || "Not eklenmemiş"}
              </Text>
              <Text style={[styles.animalCardMeta, { color: colors.mutedForeground }]}>
                {selected.userName} · {formatTimeAgo(selected.timestamp)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </Pressable>
          <Pressable
            style={styles.closeBtn}
            onPress={() => setSelected(null)}
          >
            <Ionicons name="close" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>
      )}

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            bottom: insets.bottom + tabBarOffset + 12,
            backgroundColor: colors.primary,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        onPress={() => {
          router.push("/add-animal");
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
      >
        <Ionicons name="add" size={28} color="white" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  urgentDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "white",
  },
  topBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mapTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  countBadge: {
    backgroundColor: "rgba(224, 122, 53, 0.15)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  permBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  permText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "white",
  },
  animalCard: {
    position: "absolute",
    left: 16,
    right: 64,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  animalCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  animalCardText: {
    flex: 1,
    gap: 2,
  },
  animalCardNotes: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  animalCardMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  closeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 4,
  },
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E07A35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});
