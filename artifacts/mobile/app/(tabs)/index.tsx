import BottomSheet, {
  BottomSheetFlatList,
  type BottomSheetFlatListMethods,
} from "@gorhom/bottom-sheet";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Linking,
  Platform,
  useWindowDimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBadge, STATUS_COLORS } from "@/components/StatusBadge";
import type { AnimalStatus, StrayAnimal } from "@/contexts/AnimalsContext";
import { useAnimals } from "@/contexts/AnimalsContext";
import { useColors } from "@/hooks/useColors";
import { formatTimeAgo } from "@/utils/formatters";

const DEFAULT_REGION = {
  latitude: 41.0082,
  longitude: 28.9784,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const PURPLE = "#7C3AED";

const STATUS_FILTERS: {
  key: "all" | AnimalStatus;
  label: string;
  icon: string;
  accent: string;
}[] = [
  { key: "all",     label: "Hepsi",      icon: "paw-outline",              accent: PURPLE    },
  { key: "hungry",  label: "Aç",          icon: "restaurant-outline",       accent: "#F97316" },
  { key: "injured", label: "Yaralı",      icon: "medkit-outline",           accent: "#EF4444" },
  { key: "healthy", label: "Sağlıklı",    icon: "checkmark-circle-outline", accent: "#16A34A" },
  { key: "unknown", label: "Bilinmiyor",  icon: "help-circle-outline",      accent: "#71717A" },
];

const TAB_FLOAT_H = 64;
const TAB_BOTTOM_GAP = Platform.OS === "web" ? 12 : 10;

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: SW } = useWindowDimensions();
  const router = useRouter();
  const { animals } = useAnimals();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [filter, setFilter] = useState("all");
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locPermission, requestLocPermission] =
    Location.useForegroundPermissions();

  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const listRef = useRef<BottomSheetFlatListMethods>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  /* scrollTarget: animal ID we want to scroll the card list to */
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

  const snapPoints = useMemo(() => ["30%", "55%", "88%"], []);
  const tabClearance = insets.bottom + TAB_BOTTOM_GAP + TAB_FLOAT_H;
  const topPad = Platform.OS === "web" ? (SW < 1024 ? 54 : 16) : insets.top;

  /* ── Pulse animation for user location marker ─────────── */
  useEffect(() => {
    if (!userLocation) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 2.2,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [userLocation]);

  /* ── Locate me ────────────────────────────────────────── */
  const locateMe = async () => {
    if (Platform.OS === "web") {
      if (typeof navigator === "undefined" || !navigator.geolocation) return;
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setUserLocation(coords);
          mapRef.current?.animateToRegion(
            { ...coords, latitudeDelta: 0.008, longitudeDelta: 0.008 },
            800
          );
          setIsLocating(false);
        },
        () => {
          Alert.alert(
            "Konum Bilgisi Alınamadı",
            "Lütfen cihazınızın konum hizmetlerini açın."
          );
          setIsLocating(false);
        },
        { timeout: 10000 }
      );
      return;
    }

    setIsLocating(true);
    try {
      let perm = locPermission;
      if (!perm?.granted) {
        perm = await requestLocPermission();
      }

      if (!perm?.granted) {
        if (perm?.canAskAgain === false) {
          Alert.alert(
            "Konum İzni Gerekli",
            "Konumunuzu gösterebilmemiz için konum izni vermeniz gerekiyor.",
            [
              { text: "İptal", style: "cancel" },
              { text: "Ayarlara Git", onPress: () => Linking.openSettings() },
            ]
          );
        } else {
          Alert.alert(
            "Konum İzni Gerekli",
            "Konumunuzu gösterebilmemiz için konum izni vermeniz gerekiyor."
          );
        }
        return;
      }

      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 10000)
      );

      const loc = await (Promise.race([
        locationPromise,
        timeoutPromise,
      ]) as Promise<Location.LocationObject>);
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setUserLocation(coords);
      mapRef.current?.animateToRegion(
        { ...coords, latitudeDelta: 0.008, longitudeDelta: 0.008 },
        800
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "timeout") {
        Alert.alert(
          "Konum Alınamadı",
          "Konum bilgisi alınamadı. Lütfen cihazınızın konum hizmetlerini açın."
        );
      } else {
        Alert.alert(
          "Konum Hatası",
          "Konum bilgisi alınamadı. Lütfen cihazınızın konum hizmetlerini açın."
        );
      }
    } finally {
      setIsLocating(false);
    }
  };

  /* ── Data ─────────────────────────────────────────────── */

  /* Only render markers for records with valid coordinates */
  const validAnimals = useMemo(
    () =>
      animals.filter((a) => {
        const lat = a.latitude;
        const lng = a.longitude;
        if (typeof lat !== "number" || typeof lng !== "number") return false;
        if (!isFinite(lat) || !isFinite(lng)) return false;
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
        if (lat === 0 && lng === 0) return false; /* sentinel — never set */
        return true;
      }),
    [animals]
  );

  const filtered = useMemo(
    () =>
      filter === "all"
        ? animals
        : animals.filter((a) => a.status === (filter as AnimalStatus)),
    [animals, filter]
  );

  /* ── Scroll to card when scrollTarget is set ──────────── */
  useEffect(() => {
    if (!scrollTarget) return;
    const index = filtered.findIndex((a) => a.id === scrollTarget);
    if (index === -1) return; /* animal not yet in filtered — wait for next render */
    setScrollTarget(null);
    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }, 280);
    return () => clearTimeout(t);
  }, [scrollTarget, filtered]);

  const countPerFilter = useMemo(
    () =>
      STATUS_FILTERS.reduce<Record<string, number>>((acc, f) => {
        acc[f.key] =
          f.key === "all"
            ? animals.length
            : animals.filter((a) => a.status === f.key).length;
        return acc;
      }, {}),
    [animals]
  );

  /* ── Centralized handlers ─────────────────────────────── */

  /* Filter change — also clears any stale pending scroll */
  const handleFilterChange = useCallback((key: string) => {
    setFilter(key);
    setScrollTarget(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  /* Marker tap: navigate to Hayvanlar tab and auto-open the exact report detail */
  const handleMarkerPress = useCallback((animalId: string) => {
    const animal = animals.find((a) => a.id === animalId);
    if (!animal) {
      if (__DEV__) console.warn("[MAP] Marker tapped but animal not found:", animalId);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedId(animalId);

    // Navigate to the Hayvanlar tab; animals.tsx reads the reportId param
    // and auto-opens the matching detail screen using the unique report ID.
    router.navigate({
      pathname: "/(tabs)/animals",
      params: { reportId: animalId },
    });
  }, [animals, router]);

  /* Card tap: sync camera to pin + navigate to detail */
  const handleCardPress = useCallback((animal: StrayAnimal) => {
    setSelectedId(animal.id);
    /* Soft pan to the animal's location without aggressive zoom */
    if (typeof animal.latitude === "number" && typeof animal.longitude === "number") {
      mapRef.current?.animateToRegion(
        {
          latitude:      animal.latitude,
          longitude:     animal.longitude,
          latitudeDelta:  0.012,
          longitudeDelta: 0.012,
        },
        600
      );
    }
    router.push(`/animal/${animal.id}` as const);
  }, [router]);

  /* ── Sheet list header ────────────────────────────────── */
  const ListHeader = useMemo(
    () => (
      <>
        {/* Title row */}
        <View style={styles.sheetTitleRow}>
          <View style={styles.sheetTitleGroup}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              Yakındaki Hayvanlar
            </Text>
            <View
              style={[
                styles.countBadge,
                { backgroundColor: `${colors.primary}18` },
              ]}
            >
              <Text
                style={[styles.countBadgeText, { color: colors.primary }]}
              >
                {animals.length} hayvan
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.navigate("/animals")}
            hitSlop={8}
          >
            <Text style={[styles.seeAll, { color: colors.primary }]}>
              Hepsini Gör
            </Text>
          </Pressable>
        </View>

        {/* Horizontal filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={styles.filterRow}
        >
          {STATUS_FILTERS.map((f) => {
            const active = filter === f.key;
            const accentColor = f.accent ?? colors.primary;
            const activeBg = accentColor;
            const inactiveBg = `${accentColor}12`;
            const count = countPerFilter[f.key] ?? 0;
            return (
              <Pressable
                key={f.key}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? activeBg : inactiveBg,
                    borderColor: active ? activeBg : `${accentColor}30`,
                  },
                ]}
                onPress={() => handleFilterChange(f.key)}
              >
                <Icon
                  name={f.icon}
                  size={13}
                  color={active ? "white" : accentColor}
                />
                <Text
                  style={[
                    styles.pillText,
                    { color: active ? "white" : colors.text },
                  ]}
                >
                  {f.label}
                </Text>
                <View
                  style={[
                    styles.pillCount,
                    {
                      backgroundColor: active
                        ? "rgba(255,255,255,0.25)"
                        : `${accentColor}20`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillCountText,
                      { color: active ? "white" : accentColor },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </>
    ),
    [filter, countPerFilter, animals.length, colors, handleFilterChange]
  );

  /* ── Animal row renderer ──────────────────────────────── */
  const renderAnimalRow = useCallback(
    ({ item: animal }: { item: StrayAnimal }) => {
      const isSelected = selectedId === animal.id;
      return (
        <Pressable
          style={({ pressed }) => [
            styles.animalRow,
            isSelected && styles.animalRowSelected,
            {
              backgroundColor: isSelected
                ? `${colors.primary}0D`
                : pressed
                ? `${colors.primary}07`
                : "transparent",
              borderLeftColor: isSelected ? colors.primary : "transparent",
            },
          ]}
          onPress={() => handleCardPress(animal)}
        >
          <View
            style={[
              styles.animalIcon,
              { backgroundColor: STATUS_COLORS[animal.status] },
            ]}
          >
            <Icon name="paw" size={16} color="white" />
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
            <Text
              style={[styles.animalMeta, { color: colors.mutedForeground }]}
            >
              {animal.userName} · {formatTimeAgo(animal.timestamp)}
            </Text>
          </View>
          <Icon name="chevron-forward" size={16} color={colors.mutedForeground} />
        </Pressable>
      );
    },
    [selectedId, colors, handleCardPress]
  );

  const EmptyList = useMemo(
    () => (
      <View style={styles.emptyRow}>
        <Icon name="paw-outline" size={22} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Bu filtrede hayvan yok
        </Text>
      </View>
    ),
    [colors.mutedForeground]
  );

  /* ── Render ───────────────────────────────────────────── */
  return (
    <View style={styles.container}>
      {/* Map fills the whole screen */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        region={region}
        userInterfaceStyle={colors.isDark ? "dark" : "light"}
        showsUserLocation={!!(locPermission?.granted && Platform.OS !== "web")}
        showsMyLocationButton={false}
        onPress={() => setSelectedId(null)}
      >
        {validAnimals.map((animal) => (
          <Marker
            key={animal.id}
            coordinate={{
              latitude: animal.latitude,
              longitude: animal.longitude,
            }}
            tracksViewChanges={false}
            onPress={() => handleMarkerPress(animal.id)}
          >
            <View
              style={[
                styles.marker,
                {
                  backgroundColor: STATUS_COLORS[animal.status],
                  transform: [
                    { scale: selectedId === animal.id ? 1.3 : 1 },
                  ],
                  borderColor: selectedId === animal.id ? "white" : "white",
                  shadowOpacity: selectedId === animal.id ? 0.45 : 0.28,
                },
              ]}
            >
              <Icon name="paw" size={13} color="white" />
              {animal.needsHelpByUsers.length > 0 && (
                <View style={styles.urgentDot} />
              )}
            </View>
          </Marker>
        ))}

        {userLocation && Platform.OS !== "web" && (
          <Marker
            coordinate={userLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.userMarkerWrapper}>
              <Animated.View
                style={[
                  styles.userPulse,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
              <View style={styles.userDot}>
                <Icon name="navigate" size={12} color="white" />
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Top bar */}
      <View style={[styles.topBar, { top: topPad + 12 }]}>
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.background },
          ]}
        />
        {/* Row 1: title + count */}
        <View style={styles.topBarRow}>
          <Icon name="paw" size={17} color={colors.primary} />
          <Text style={[styles.topTitle, { color: colors.foreground }]}>
            CanYoldaşı
          </Text>
          <View style={{ flex: 1 }} />
          <View
            style={[
              styles.countPill,
              { backgroundColor: `${colors.primary}18` },
            ]}
          >
            <Text style={[styles.countText, { color: colors.primary }]}>
              {animals.length} hayvan
            </Text>
          </View>
        </View>
        {/* Row 2: report button */}
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }, styles.emergencyBtn]}
          onPress={() => {
            const coords = userLocation ?? { latitude: region.latitude, longitude: region.longitude };
            router.push({
              pathname: "/add-animal",
              params: {
                initialLat: String(coords.latitude),
                initialLng: String(coords.longitude),
              },
            });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          hitSlop={4}
        >
          <LinearGradient
            colors={["#FF6B35", "#EF4444"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emergencyGradient}
          >
            <Icon name="warning" size={14} color="#FFF" />
            <Text style={styles.emergencyText}>Hayvan Durumu Bildir</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Location button — fixed right side, below emergency button */}
      <Pressable
        style={({ pressed }) => [
          styles.locateBtn,
          { top: topPad + 148, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={() => {
          locateMe();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        hitSlop={8}
      >
        {isLocating ? (
          <ActivityIndicator size="small" color={PURPLE} />
        ) : (
          <Icon name="navigate" size={20} color={PURPLE} />
        )}
      </Pressable>

      {/* FAB — add animal */}
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
        <Icon name="add" size={26} color="white" />
      </Pressable>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        enableContentPanningGesture
        enableHandlePanningGesture
        animateOnMount
        handleIndicatorStyle={styles.handleBar}
        handleStyle={styles.handleWrapper}
        backgroundStyle={[
          styles.sheetBackground,
          { backgroundColor: colors.background },
        ]}
        style={styles.sheetShadow}
      >
        <BottomSheetFlatList
          ref={listRef}
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderAnimalRow}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={EmptyList}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: tabClearance + 16 }}
          ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />}
          onScrollToIndexFailed={(info) => {
            /* FlatList hasn't measured the item yet — retry after layout */
            setTimeout(() => {
              listRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.5,
              });
            }, 350);
          }}
        />
      </BottomSheet>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────── */
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

  userMarkerWrapper: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  userPulse: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(99,102,241,0.25)",
  },
  userDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "white",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 6,
  },

  topBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "column",
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 10,
    gap: 8,
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
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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

  emergencyBtn: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  emergencyGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  emergencyText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    letterSpacing: -0.1,
  },

  locateBtn: {
    position: "absolute",
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
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

  /* Bottom sheet chrome */
  sheetShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 20,
  },
  sheetBackground: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 0.5,
    borderColor: "rgba(255,255,255,0.75)",
  },
  handleWrapper: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.14)",
  },

  /* Sheet content */
  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
  },
  sheetTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },

  filterRow: {
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 14,
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
  },
  pillEmoji: {
    fontSize: 13,
    lineHeight: 16,
    includeFontPadding: false,
  },
  pillText: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: "Inter_600SemiBold",
    includeFontPadding: false,
  },
  pillCount: {
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pillCountText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Inter_700Bold",
    includeFontPadding: false,
  },

  animalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderLeftWidth: 3,
  },
  animalRowSelected: {
    paddingLeft: 17, /* compensate for 3px border so content doesn't shift */
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
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
