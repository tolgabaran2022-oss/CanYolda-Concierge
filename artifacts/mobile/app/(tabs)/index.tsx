import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBadge, STATUS_COLORS } from "@/components/StatusBadge";
import type { AnimalStatus } from "@/contexts/AnimalsContext";
import { useAnimals } from "@/contexts/AnimalsContext";
import { useColors } from "@/hooks/useColors";
import { formatTimeAgo } from "@/utils/formatters";

const { height: SCREEN_H } = Dimensions.get("window");
const SNAP_COLLAPSED = 270;
const SNAP_EXPANDED = Math.floor(SCREEN_H * 0.6);

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Hepsi" },
  { key: "aç", label: "Aç" },
  { key: "yaralı", label: "Yaralı" },
  { key: "sağlıklı", label: "Sağlıklı" },
  { key: "bilinmiyor", label: "Bilinmiyor" },
];

const DEFAULT_REGION = {
  latitude: 41.0082,
  longitude: 28.9784,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const TAB_FLOAT_H = 64;
const TAB_BOTTOM_GAP = Platform.OS === "web" ? 12 : 10;

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { animals } = useAnimals();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(false);
  const [locPermission, requestLocPermission] = Location.useForegroundPermissions();
  const mapRef = useRef<MapView>(null);
  const sheetAnim = useRef(new Animated.Value(SNAP_COLLAPSED)).current;

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (locPermission?.granted) {
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then((loc) => {
          setRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        })
        .catch(() => {});
    }
  }, [locPermission?.granted]);

  const toggleSheet = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.spring(sheetAnim, {
      toValue: next ? SNAP_EXPANDED : SNAP_COLLAPSED,
      useNativeDriver: false,
      damping: 20,
      stiffness: 200,
      mass: 0.9,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const filtered = filter === "all"
    ? animals
    : animals.filter((a) => a.status === (filter as AnimalStatus));

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const tabClearance = insets.bottom + TAB_BOTTOM_GAP + TAB_FLOAT_H;
  const isIOS = Platform.OS === "ios";

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        region={region}
        showsUserLocation={!!(locPermission?.granted && Platform.OS !== "web")}
        showsMyLocationButton={false}
        onPress={() => setSelectedId(null)}
      >
        {animals.map((animal) => (
          <Marker
            key={animal.id}
            coordinate={{ latitude: animal.latitude, longitude: animal.longitude }}
            onPress={() => {
              setSelectedId(animal.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <View
              style={[
                styles.marker,
                {
                  backgroundColor: STATUS_COLORS[animal.status],
                  transform: [{ scale: selectedId === animal.id ? 1.25 : 1 }],
                },
              ]}
            >
              <Ionicons name="paw" size={13} color="white" />
              {animal.needsHelpByUsers.length > 0 && <View style={styles.urgentDot} />}
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Top glass bar */}
      <View style={[styles.topBar, { top: topPad + 12 }]}>
        {isIOS ? (
          <BlurView intensity={75} tint="light" style={StyleSheet.absoluteFill} />
        ) : (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(250,247,240,0.88)" }]}
          />
        )}
        <Ionicons name="paw" size={17} color={colors.primary} />
        <Text style={[styles.topTitle, { color: colors.foreground }]}>CanYoldaşı</Text>
        <View style={{ flex: 1 }} />
        <View style={[styles.countPill, { backgroundColor: `${colors.primary}18` }]}>
          <Text style={[styles.countText, { color: colors.primary }]}>
            {animals.length} hayvan
          </Text>
        </View>
        {!locPermission?.granted && Platform.OS !== "web" && (
          <Pressable
            style={[styles.locBtn, { backgroundColor: `${colors.secondary}18` }]}
            onPress={requestLocPermission}
          >
            <Ionicons name="location-outline" size={18} color={colors.secondary} />
          </Pressable>
        )}
      </View>

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            right: 16,
            bottom: tabClearance + 14,
            backgroundColor: colors.primary,
            opacity: pressed ? 0.82 : 1,
          },
        ]}
        onPress={() => {
          router.push("/add-animal");
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
      >
        <Ionicons name="add" size={26} color="white" />
      </Pressable>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.sheet, { height: sheetAnim }]}>
        {isIOS ? (
          <BlurView
            intensity={82}
            tint="light"
            style={[StyleSheet.absoluteFill, styles.sheetRadius]}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.sheetRadius,
              { backgroundColor: "rgba(250,247,240,0.93)" },
            ]}
          />
        )}

        {/* Drag handle */}
        <Pressable style={styles.handleRow} onPress={toggleSheet} hitSlop={12}>
          <View style={styles.handle} />
        </Pressable>

        {/* Title row */}
        <View style={styles.sheetTitleRow}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
            Yakındaki Hayvanlar
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/animals" as any)}
            hitSlop={8}
          >
            <Text style={[styles.seeAll, { color: colors.primary }]}>Hepsini Gör</Text>
          </Pressable>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={styles.filterRow}
        >
          {STATUS_FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? colors.primary : `${colors.primary}14`,
                    borderColor: active ? colors.primary : "transparent",
                  },
                ]}
                onPress={() => {
                  setFilter(f.key);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: active ? "white" : colors.foreground },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Animal rows */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: tabClearance + 8 }}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyRow}>
              <Ionicons name="paw-outline" size={22} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Bu filtrede hayvan yok
              </Text>
            </View>
          ) : (
            filtered.map((animal) => (
              <Pressable
                key={animal.id}
                style={({ pressed }) => [
                  styles.animalRow,
                  {
                    backgroundColor:
                      selectedId === animal.id
                        ? `${colors.primary}10`
                        : pressed
                        ? `${colors.primary}07`
                        : "transparent",
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setSelectedId(animal.id);
                  router.push(`/animal/${animal.id}` as const);
                }}
              >
                <View
                  style={[
                    styles.animalIcon,
                    { backgroundColor: STATUS_COLORS[animal.status] },
                  ]}
                >
                  <Ionicons name="paw" size={16} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <StatusBadge status={animal.status} size="sm" />
                    {animal.needsHelpByUsers.length > 0 && (
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentBadgeText}>Acil</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[styles.animalNote, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {animal.notes || "Not eklenmemiş"}
                  </Text>
                  <Text style={[styles.animalMeta, { color: colors.mutedForeground }]}>
                    {animal.userName} · {formatTimeAgo(animal.timestamp)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </Pressable>
            ))
          )}
        </ScrollView>
      </Animated.View>
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
    shadowOpacity: 0.28,
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
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.65)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  topTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  countPill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  locBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  fab: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E07A35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 20,
  },
  sheetRadius: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 0.5,
    borderColor: "rgba(255,255,255,0.75)",
  },

  handleRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 6,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.16)",
  },

  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },

  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  animalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  animalIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  animalNote: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  animalMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  urgentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#EF4444",
  },
  urgentBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "white",
  },

  emptyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 28,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
