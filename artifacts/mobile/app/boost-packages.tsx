import { Icon } from "@/components/Icon";
import { useAuth } from "@/contexts/AuthContext";
import { useBoost } from "@/contexts/BoostContext";
import { useColors } from "@/hooks/useColors";
import { fetchOfferings, type RCPackageInfo } from "@/services/revenueCat";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* ── Duration helper (derived from RC package identifier) ──── */
function getDurationDays(identifier: string): number {
  if (identifier.includes("7")) return 7;
  if (identifier.includes("3")) return 3;
  return 1;
}

/* ── Whether a package is the "popular" pick ─────────────────
   RC has no native popularity flag; we mark boost_3_days.    */
function isPopularPackage(identifier: string): boolean {
  return identifier === "boost_3_days";
}

/* ── Purchase (called only after user confirms; purchasePackage
   is intentionally NOT called at this offerings-only stage) ── */
async function purchaseWithRC(nativePackage: unknown): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const Purchases = (await import("react-native-purchases")).default;
    // @ts-expect-error nativePackage is typed as any from RC service
    const { customerInfo } = await Purchases.purchasePackage(nativePackage);
    const entitlement = customerInfo.entitlements.active["listing_boost"];
    // @ts-expect-error
    return entitlement?.productIdentifier ?? nativePackage?.product?.identifier ?? null;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.message.includes("PURCHASE_CANCELLED") ||
        (err as any).code === "1")
    ) {
      return null;
    }
    throw err;
  }
}

export default function BoostPackagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();
  const { purchaseBoost, fetchBoostStatus } = useBoost();

  const { listingId, petName } = useLocalSearchParams<{
    listingId: string;
    petName: string;
  }>();

  /* ── RC Offerings state ────────────────────────────────── */
  const [rcPackages, setRcPackages]       = useState<RCPackageInfo[]>([]);
  const [offeringsLoading, setLoading]    = useState(true);
  const [offeringsError, setError]        = useState<string | null>(null);
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [purchaseLoading, setPurchasing]  = useState(false);

  /* ── Load offerings from RevenueCat ───────────────────── */
  const loadOfferings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pkgs = await fetchOfferings();
      setRcPackages(pkgs);
      /* Auto-select popular package (boost_3_days) or first */
      const popular = pkgs.find((p) => isPopularPackage(p.identifier)) ?? pkgs[0];
      if (popular) setSelectedId(popular.identifier);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (__DEV__) console.warn("[BoostPackages] Offerings load failed:", msg);
      setError("Öne çıkarma paketleri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOfferings();
  }, [loadOfferings]);

  const selectedPkg = rcPackages.find((p) => p.identifier === selectedId) ?? null;

  /* ── Purchase handler ─────────────────────────────────── */
  const handleBoost = async () => {
    if (!selectedPkg || !user || !listingId || !token) return;

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
      const productId = await purchaseWithRC(selectedPkg.nativePackage);
      if (!productId) {
        setPurchasing(false);
        return;
      }

      const durationDays = getDurationDays(selectedPkg.identifier);
      await purchaseBoost({
        listingId,
        rcPackageIdentifier: selectedPkg.identifier,
        durationDays,
        packageName: selectedPkg.title,
        token,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        "İlan Öne Çıkarıldı! 🎉",
        `${selectedPkg.title} başarıyla aktive edildi. ${durationDays} gün boyunca ilanın listenin en üstünde görünecek.`,
        [{ text: "Harika!", onPress: () => router.back() }]
      );

      fetchBoostStatus([listingId]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Satın alma tamamlanamadı. Lütfen tekrar deneyin.";
      Alert.alert("Hata", msg, [{ text: "Tamam" }]);
    } finally {
      setPurchasing(false);
    }
  };

  /* ── Packages section renderer ────────────────────────── */
  function renderPackages() {
    if (offeringsLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Paketler yükleniyor…
          </Text>
        </View>
      );
    }

    if (offeringsError) {
      return (
        <View style={[styles.errorBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Icon name="WifiOff" size={28} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            {offeringsError}
          </Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={loadOfferings}
          >
            <Icon name="RefreshCw" size={16} color="white" />
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      );
    }

    if (rcPackages.length === 0) {
      return (
        <View style={[styles.errorBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Öne çıkarma paketleri yüklenemedi.
          </Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={loadOfferings}
          >
            <Icon name="RefreshCw" size={16} color="white" />
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      );
    }

    return rcPackages.map((pkg) => {
      const isSelected = selectedId === pkg.identifier;
      const popular    = isPopularPackage(pkg.identifier);
      const days       = getDurationDays(pkg.identifier);

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
            setSelectedId(pkg.identifier);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          {popular && (
            <View style={[styles.bestValueBadge, { backgroundColor: colors.secondary }]}>
              <Text style={styles.bestValueText}>EN ÇOK TERCİH EDİLEN</Text>
            </View>
          )}
          <View style={styles.packageRow}>
            <View style={styles.packageLeft}>
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: isSelected ? colors.primary : colors.border },
                ]}
              >
                {isSelected && (
                  <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.packageLabel, { color: colors.foreground }]}>
                  {pkg.title}
                </Text>
                <Text style={[styles.packageDesc, { color: colors.mutedForeground }]}>
                  {days} gün öne çıkarma
                </Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.packagePrice, { color: colors.primary }]}>
                {pkg.priceString}
              </Text>
              <Text style={[styles.packageDays, { color: colors.mutedForeground }]}>
                {days} Gün
              </Text>
            </View>
          </View>
        </Pressable>
      );
    });
  }

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
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Öne Çıkarma Avantajları
          </Text>
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
                  i > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.benefitIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Icon name={b.icon as any} size={18} color={colors.primary} />
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
        {selectedPkg && !offeringsLoading && !offeringsError && (
          <Text style={[styles.ctaSummary, { color: colors.mutedForeground }]}>
            {selectedPkg.title} · {selectedPkg.priceString} · {getDurationDays(selectedPkg.identifier)} Gün
          </Text>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            {
              backgroundColor:
                Platform.OS === "web" || offeringsError
                  ? colors.mutedForeground
                  : colors.primary,
              opacity: pressed || purchaseLoading || !selectedPkg || offeringsLoading ? 0.75 : 1,
            },
          ]}
          onPress={handleBoost}
          disabled={purchaseLoading || !selectedPkg || offeringsLoading || !!offeringsError}
        >
          {purchaseLoading ? (
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
  container: { flex: 1 },
  hero: { paddingHorizontal: 20, paddingBottom: 32 },
  backBtn: {
    width: 36, height: 36,
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  heroContent: { alignItems: "center", gap: 8 },
  starBadge: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle:    { fontSize: 24, fontFamily: "Inter_700Bold", color: "white" },
  heroSubtitle: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)", textAlign: "center",
  },
  content:      { padding: 20, gap: 20 },
  section:      { gap: 12 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  benefitCard:  { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  benefitRow:   { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  benefitIcon:  {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  benefitText:  { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  webNotice:    {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, padding: 14, borderWidth: 1,
  },
  webNoticeText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  /* Packages */
  centered: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 32 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  errorBox: {
    alignItems: "center", gap: 14, padding: 24,
    borderRadius: 16, borderWidth: 1,
  },
  errorText: { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center" },
  retryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
  },
  retryText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "white" },
  packageCard:  { borderRadius: 16, padding: 16, overflow: "hidden" },
  bestValueBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 8, marginBottom: 10,
  },
  bestValueText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "white" },
  packageRow:  {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
  },
  packageLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  radioInner:   { width: 12, height: 12, borderRadius: 6 },
  packageLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  packageDesc:  { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  packagePrice: { fontSize: 22, fontFamily: "Inter_700Bold" },
  packageDays:  { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  infoBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, padding: 12,
  },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  ctaContainer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  ctaSummary: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  ctaButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 16, paddingVertical: 16,
    shadowColor: "#E07A35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  ctaButtonText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "white" },
});
