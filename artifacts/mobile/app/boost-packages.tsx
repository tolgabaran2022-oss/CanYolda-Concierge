import { Icon } from "@/components/Icon";
import { useAuth } from "@/contexts/AuthContext";
import { useBoost } from "@/contexts/BoostContext";
import { useColors } from "@/hooks/useColors";
import { fetchOfferings } from "@/services/revenueCat";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { PurchasesPackage } from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* ─────────────────────────────────────────────────────────────
   CENTRALIZED BOOST PACKAGE CONFIGURATION
   Single source of truth for identifier → UI metadata mapping.
───────────────────────────────────────────────────────────── */
interface BoostPackageMeta {
  durationDays: number;
  isPopular: boolean;
  /** Display sort order (ascending) */
  sortOrder: number;
}

const BOOST_PACKAGE_CONFIG: Record<string, BoostPackageMeta> = {
  boost_1_day:  { durationDays: 1, isPopular: false, sortOrder: 0 },
  boost_3_days: { durationDays: 3, isPopular: true,  sortOrder: 1 },
  boost_7_days: { durationDays: 7, isPopular: false, sortOrder: 2 },
};

const DEFAULT_PACKAGE_ID = "boost_3_days";

/* ── Helpers ───────────────────────────────────────────────── */
function getMeta(identifier: string): BoostPackageMeta {
  return BOOST_PACKAGE_CONFIG[identifier] ?? { durationDays: 1, isPopular: false, sortOrder: 99 };
}

function sortPackages(pkgs: PurchasesPackage[]): PurchasesPackage[] {
  return [...pkgs].sort(
    (a, b) => getMeta(a.identifier).sortOrder - getMeta(b.identifier).sortOrder
  );
}

/* ── Purchase helper ───────────────────────────────────────────
   purchasePackage is intentionally NOT called at this offerings-
   only stage. The function is wired to the button for the next
   integration step.
──────────────────────────────────────────────────────────── */
async function purchaseWithRC(pkg: PurchasesPackage): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const { default: Purchases } = await import("react-native-purchases");
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  const entitlement = customerInfo.entitlements.active["listing_boost"];
  return entitlement?.productIdentifier ?? pkg.product.identifier;
}

/* ─────────────────────────────────────────────────────────────
   SCREEN
───────────────────────────────────────────────────────────── */
export default function BoostPackagesScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { user, token }                     = useAuth();
  const { purchaseBoost, fetchBoostStatus } = useBoost();

  const { listingId, petName } = useLocalSearchParams<{
    listingId: string;
    petName: string;
  }>();

  /* ── Offerings state ───────────────────────────────────── */
  const [packages, setPackages]               = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [purchasing, setPurchasing]           = useState(false);

  /* Guard against duplicate fetches in React Strict Mode */
  const fetchingRef = useRef(false);

  /* ── Load offerings from RevenueCat ───────────────────── */
  const loadOfferings = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const raw  = await fetchOfferings();
      const sorted = sortPackages(raw);
      setPackages(sorted);

      /* Default: boost_3_days; fallback to first available */
      const preferred = sorted.find((p) => p.identifier === DEFAULT_PACKAGE_ID) ?? sorted[0] ?? null;
      setSelectedPackage(preferred);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (__DEV__) console.warn("[BoostPackages] Offerings load failed:", msg);
      setError("Öne çıkarma paketleri yüklenemedi.");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadOfferings();
  }, [loadOfferings]);

  /* ── Purchase handler ─────────────────────────────────── */
  const handleBoost = async () => {
    if (!selectedPackage || !user || !listingId || !token) return;

    if (Platform.OS === "web") {
      Alert.alert(
        "Uygulama Gerekli",
        "Öne çıkarma satın almak için iOS veya Android uygulamasını kullanın.",
        [{ text: "Tamam" }]
      );
      return;
    }

    setPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const productId = await purchaseWithRC(selectedPackage);
      if (!productId) { setPurchasing(false); return; }

      const meta = getMeta(selectedPackage.identifier);
      await purchaseBoost({
        listingId,
        rcPackageIdentifier: selectedPackage.identifier,
        durationDays:        meta.durationDays,
        packageName:         selectedPackage.product.title,
        token,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "İlan Öne Çıkarıldı! 🎉",
        `${selectedPackage.product.title} başarıyla aktive edildi. ${meta.durationDays} gün boyunca ilanın listenin en üstünde görünecek.`,
        [{ text: "Harika!", onPress: () => router.back() }]
      );
      fetchBoostStatus([listingId]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Satın alma tamamlanamadı. Lütfen tekrar deneyin.";
      Alert.alert("Hata", msg, [{ text: "Tamam" }]);
    } finally {
      setPurchasing(false);
    }
  };

  /* ── Packages section ─────────────────────────────────── */
  function renderPackages() {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Paketler yükleniyor…
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.stateBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Icon name="WifiOff" size={28} color={colors.mutedForeground} />
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{error}</Text>
          <Pressable style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={loadOfferings}>
            <Icon name="RefreshCw" size={16} color="white" />
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      );
    }

    if (packages.length === 0) {
      return (
        <View style={[styles.stateBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
            Şu an aktif öne çıkarma paketi bulunmuyor.
          </Text>
        </View>
      );
    }

    return packages.map((pkg) => {
      const isSelected = selectedPackage?.identifier === pkg.identifier;
      const meta       = getMeta(pkg.identifier);

      return (
        <Pressable
          key={pkg.identifier}
          style={[
            styles.packageCard,
            {
              borderColor:     isSelected ? colors.primary : colors.border,
              backgroundColor: isSelected ? `${colors.primary}08` : colors.card,
              borderWidth:     isSelected ? 2 : 1,
            },
          ]}
          onPress={() => {
            setSelectedPackage(pkg);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          {meta.isPopular && (
            <View style={[styles.bestValueBadge, { backgroundColor: colors.secondary }]}>
              <Text style={styles.bestValueText}>EN ÇOK TERCİH EDİLEN</Text>
            </View>
          )}
          <View style={styles.packageRow}>
            <View style={styles.packageLeft}>
              <View style={[styles.radioOuter, { borderColor: isSelected ? colors.primary : colors.border }]}>
                {isSelected && (
                  <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.packageLabel, { color: colors.foreground }]}>
                  {pkg.product.title}
                </Text>
                <Text style={[styles.packageDesc, { color: colors.mutedForeground }]}>
                  {meta.durationDays} gün öne çıkarma
                </Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.packagePrice, { color: colors.primary }]}>
                {pkg.product.priceString}
              </Text>
              <Text style={[styles.packageDays, { color: colors.mutedForeground }]}>
                {meta.durationDays} Gün
              </Text>
            </View>
          </View>
        </Pressable>
      );
    });
  }

  /* ── CTA summary ──────────────────────────────────────── */
  const ctaSummary = selectedPackage && !loading && !error
    ? `${selectedPackage.product.title} · ${selectedPackage.product.priceString} · ${getMeta(selectedPackage.identifier).durationDays} Gün`
    : null;

  const ctaDisabled = purchasing || loading || !!error || !selectedPackage;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#E07A35", "#C96320"]}
        style={[styles.hero, { paddingTop: Platform.OS === "web" ? 20 : insets.top + 12 }]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Icon name="ChevronLeft" size={22} color="white" />
        </Pressable>
        <View style={styles.heroContent}>
          <View style={styles.starBadge}>
            <Icon name="Star" size={24} color="#FFD700" />
          </View>
          <Text style={styles.heroTitle}>İlanı Öne Çıkar</Text>
          <Text style={styles.heroSubtitle}>
            {petName ? `${petName} için` : "İlanın"} görünürlüğünü artır, daha fazla kişiye ulaş
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Benefits */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Öne Çıkarma Avantajları</Text>
          <View style={[styles.benefitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { icon: "TrendingUp", text: "Listelerin en üstünde gösterilir" },
              { icon: "Star",       text: '"Öne Çıkan" etiketi ile dikkat çeker' },
              { icon: "Eye",        text: "Normal ilanlardan daha fazla görüntüleme alır" },
              { icon: "RefreshCw",  text: "Süre bitince tekrar satın alınabilir" },
            ].map((b, i) => (
              <View
                key={i}
                style={[
                  styles.benefitRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                ]}
              >
                <View style={[styles.benefitIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Icon name={b.icon as "Star"} size={18} color={colors.primary} />
                </View>
                <Text style={[styles.benefitText, { color: colors.foreground }]}>{b.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Web notice */}
        {Platform.OS === "web" && (
          <View style={[styles.webNotice, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
            <Icon name="Smartphone" size={18} color={colors.primary} />
            <Text style={[styles.webNoticeText, { color: colors.primary }]}>
              Öne çıkarma satın almak için iOS veya Android uygulamasını kullanın.
            </Text>
          </View>
        )}

        {/* Packages — loaded from RevenueCat */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Paket Seç</Text>
          {renderPackages()}
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.muted }]}>
          <Icon name="Info" size={16} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Satın alma Apple/Google hesabınız üzerinden gerçekleşir. Süre bitince tekrar öne çıkarabilirsiniz.
          </Text>
        </View>
      </ScrollView>

      {/* CTA */}
      <View
        style={[
          styles.ctaContainer,
          {
            backgroundColor: colors.background,
            paddingBottom:   insets.bottom + 16,
            borderTopColor:  colors.border,
          },
        ]}
      >
        {ctaSummary && (
          <Text style={[styles.ctaSummary, { color: colors.mutedForeground }]}>{ctaSummary}</Text>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            {
              backgroundColor: Platform.OS === "web" || error ? colors.mutedForeground : colors.primary,
              opacity: pressed || ctaDisabled ? 0.75 : 1,
            },
          ]}
          onPress={handleBoost}
          disabled={ctaDisabled}
        >
          {purchasing ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Icon name="Star" size={20} color="white" />
              <Text style={styles.ctaButtonText}>
                {Platform.OS === "web" ? "Uygulama Gerekli" : "Öne Çıkarmayı Satın Al"}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  hero:         { paddingHorizontal: 20, paddingBottom: 32 },
  backBtn:      { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  heroContent:  { alignItems: "center", gap: 8 },
  starBadge:    {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  heroTitle:    { fontSize: 24, fontFamily: "Inter_700Bold", color: "white" },
  heroSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)", textAlign: "center" },
  content:      { padding: 20, gap: 20 },
  section:      { gap: 12 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  benefitCard:  { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  benefitRow:   { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  benefitIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  benefitText:  { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  webNotice:    { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, padding: 14, borderWidth: 1 },
  webNoticeText:{ fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  /* State boxes */
  centered:     { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 32 },
  loadingText:  { fontSize: 14, fontFamily: "Inter_400Regular" },
  stateBox:     { alignItems: "center", gap: 14, padding: 24, borderRadius: 16, borderWidth: 1 },
  stateText:    { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center" },
  retryBtn:     { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText:    { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "white" },
  /* Package cards */
  packageCard:    { borderRadius: 16, padding: 16, overflow: "hidden" },
  bestValueBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginBottom: 10 },
  bestValueText:  { fontSize: 11, fontFamily: "Inter_700Bold", color: "white" },
  packageRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  packageLeft:    { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  radioOuter:     { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner:     { width: 12, height: 12, borderRadius: 6 },
  packageLabel:   { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  packageDesc:    { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  packagePrice:   { fontSize: 22, fontFamily: "Inter_700Bold" },
  packageDays:    { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  /* Info */
  infoBox:      { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 12 },
  infoText:     { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  /* CTA */
  ctaContainer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  ctaSummary:     { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  ctaButton:      {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 16, paddingVertical: 16,
    shadowColor: "#E07A35", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  ctaButtonText:  { fontSize: 17, fontFamily: "Inter_700Bold", color: "white" },
});
