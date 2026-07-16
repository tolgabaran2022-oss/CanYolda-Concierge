import { Icon } from "@/components/Icon";
import { useAuth } from "@/contexts/AuthContext";
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
import type {
  CustomerInfo,
  MakePurchaseResult,
  PurchasesPackage,
} from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* ─────────────────────────────────────────────────────────────
   CENTRALIZED BOOST PACKAGE CONFIGURATION
───────────────────────────────────────────────────────────── */
interface BoostPackageMeta {
  durationDays: number;
  isPopular: boolean;
  sortOrder: number;
}

const BOOST_PACKAGE_CONFIG: Record<string, BoostPackageMeta> = {
  boost_1_day:  { durationDays: 1, isPopular: false, sortOrder: 0 },
  boost_3_days: { durationDays: 3, isPopular: true,  sortOrder: 1 },
  boost_7_days: { durationDays: 7, isPopular: false, sortOrder: 2 },
};

const DEFAULT_PACKAGE_ID = "boost_3_days";

function getMeta(identifier: string): BoostPackageMeta {
  return BOOST_PACKAGE_CONFIG[identifier] ?? { durationDays: 1, isPopular: false, sortOrder: 99 };
}

function sortPackages(pkgs: PurchasesPackage[]): PurchasesPackage[] {
  return [...pkgs].sort(
    (a, b) => getMeta(a.identifier).sortOrder - getMeta(b.identifier).sortOrder
  );
}

/* ─────────────────────────────────────────────────────────────
   PURCHASE STATE MACHINE
───────────────────────────────────────────────────────────── */
type PurchaseState =
  | "idle"
  | "starting"
  | "processing"
  | "success"
  | "cancelled"
  | "pending"
  | "error";

/* ─────────────────────────────────────────────────────────────
   SAFE RESULT MODEL
   Carries verified purchase data to the backend activation
   stage (Step 10). At this stage no DB write is performed.
───────────────────────────────────────────────────────────── */
type CompletedBoostPurchase = {
  packageIdentifier: string;
  productIdentifier: string;
  customerInfo: CustomerInfo;
};

/**
 * Placeholder for Step 10 — backend promotion activation.
 * Called after RevenueCat confirms a successful Test Store purchase.
 * Does NOT activate the listing promotion yet.
 */
function handleVerifiedPurchaseResult(result: CompletedBoostPurchase): void {
  if (__DEV__) {
    console.log(
      "[Boost] Test Store purchase completed.",
      "pkg:", result.packageIdentifier,
      "product:", result.productIdentifier
    );
  }
  // TODO Step 10: POST to /api/boost/verify-iap to activate listing promotion
}

/* ─────────────────────────────────────────────────────────────
   ERROR CLASSIFICATION
   Maps RC error shape to Turkish user messages without
   exposing raw stack traces or internal error objects.
───────────────────────────────────────────────────────────── */
type PurchaseErrorKind =
  | "cancelled"
  | "pending"
  | "unavailable"
  | "network"
  | "sdk_unavailable"
  | "unknown";

function classifyPurchaseError(err: unknown): {
  kind: PurchaseErrorKind;
  message: string;
} {
  if (typeof err !== "object" || err === null) {
    return { kind: "unknown", message: "Satın alma işlemi tamamlanamadı. Lütfen tekrar deneyin." };
  }

  /* RC errors expose userCancelled as a direct boolean property */
  if ("userCancelled" in err && err.userCancelled === true) {
    return { kind: "cancelled", message: "Satın alma işlemi iptal edildi." };
  }

  const code = "code" in err && typeof err.code === "number" ? err.code : -1;

  /* PURCHASE_CANCELLED_ERROR = 1 */
  if (code === 1) return { kind: "cancelled", message: "Satın alma işlemi iptal edildi." };
  /* PAYMENT_PENDING_ERROR = 6 */
  if (code === 6) return { kind: "pending",   message: "Ödemeniz mağaza tarafından işleniyor." };
  /* PRODUCT_NOT_AVAILABLE_FOR_PURCHASE = 3 */
  if (code === 3) return { kind: "unavailable", message: "Bu paket şu anda satın alınamıyor." };
  /* NETWORK_ERROR = 23 */
  if (code === 23) return { kind: "network", message: "Bağlantı sorunu nedeniyle satın alma tamamlanamadı." };

  /* Expo Go / unavailable native module */
  const rawMsg =
    "message" in err && typeof err.message === "string" ? err.message.toLowerCase() : "";
  if (
    rawMsg.includes("native module") ||
    rawMsg.includes("not found") ||
    rawMsg.includes("unitialized") ||
    rawMsg.includes("unavailable") ||
    rawMsg.includes("sdk not configured")
  ) {
    return {
      kind: "sdk_unavailable",
      message: "Satın alma testi için Development Build kullanmanız gerekiyor.",
    };
  }

  return {
    kind: "unknown",
    message: "Satın alma işlemi tamamlanamadı. Lütfen tekrar deneyin.",
  };
}

/* ─────────────────────────────────────────────────────────────
   NATIVE PURCHASE EXECUTOR
   Isolated to simplify unit-testing and type-safe result handling.
───────────────────────────────────────────────────────────── */
async function executePurchase(pkg: PurchasesPackage): Promise<MakePurchaseResult> {
  const { default: Purchases } = await import("react-native-purchases");
  return Purchases.purchasePackage(pkg);
}

/* ─────────────────────────────────────────────────────────────
   SCREEN
───────────────────────────────────────────────────────────── */
export default function BoostPackagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const { listingId, petName } = useLocalSearchParams<{
    listingId: string;
    petName: string;
  }>();

  /* ── Offerings state ───────────────────────────────────── */
  const [packages, setPackages]               = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [offeringsError, setOfferingsError]   = useState<string | null>(null);

  /* ── Purchase state machine ────────────────────────────── */
  const [purchaseState, setPurchaseState]     = useState<PurchaseState>("idle");

  /* Guards */
  const fetchingRef   = useRef(false);   // prevent duplicate offerings fetch
  const purchasingRef = useRef(false);   // prevent rapid double-tap purchase

  /* ── Load offerings ────────────────────────────────────── */
  const loadOfferings = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setOfferingsLoading(true);
    setOfferingsError(null);

    try {
      const raw    = await fetchOfferings();
      const sorted = sortPackages(raw);
      setPackages(sorted);
      const preferred =
        sorted.find((p) => p.identifier === DEFAULT_PACKAGE_ID) ?? sorted[0] ?? null;
      setSelectedPackage(preferred);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (__DEV__) console.warn("[BoostPackages] Offerings load failed:", msg);
      setOfferingsError("Öne çıkarma paketleri yüklenemedi.");
    } finally {
      setOfferingsLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => { loadOfferings(); }, [loadOfferings]);

  /* ── Purchase handler ─────────────────────────────────── */
  const handleBoost = async () => {
    /* Platform guard — web */
    if (Platform.OS === "web") {
      Alert.alert(
        "Uygulama Gerekli",
        "İlan öne çıkarma satın alma işlemi iOS ve Android uygulamalarında kullanılabilir.",
        [{ text: "Tamam" }]
      );
      return;
    }

    /* Auth guard */
    if (!user) {
      Alert.alert(
        "Giriş Gerekli",
        "Satın alma işlemi için giriş yapmanız gerekiyor.",
        [{ text: "Tamam" }]
      );
      return;
    }

    /* Package guard */
    if (!selectedPackage) {
      Alert.alert("Paket Seçilmedi", "Lütfen bir öne çıkarma paketi seçin.", [{ text: "Tamam" }]);
      return;
    }

    /* Listingguard */
    if (!listingId) return;

    /* Duplicate-tap guard */
    if (purchasingRef.current) return;
    purchasingRef.current = true;

    /* ── State machine: starting ── */
    setPurchaseState("starting");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setPurchaseState("processing");

      const result: MakePurchaseResult = await executePurchase(selectedPackage);

      /* ── State machine: success ── */
      setPurchaseState("success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const completedPurchase: CompletedBoostPurchase = {
        packageIdentifier: selectedPackage.identifier,
        productIdentifier: result.productIdentifier,
        customerInfo:      result.customerInfo,
      };

      /* Placeholder — Step 10 will call the backend here */
      handleVerifiedPurchaseResult(completedPurchase);

      Alert.alert(
        "Test Satın Alma Tamamlandı",
        "Test satın alma işlemi RevenueCat tarafından tamamlandı.\n\nİlan aktivasyonu bir sonraki aşamada bağlanacak.",
        [{ text: "Tamam", onPress: () => { setPurchaseState("idle"); router.back(); } }]
      );
    } catch (err: unknown) {
      const { kind, message } = classifyPurchaseError(err);

      if (__DEV__) {
        const code = typeof err === "object" && err !== null && "code" in err ? err.code : "?";
        console.warn("[BoostPackages] Purchase error — kind:", kind, "code:", code);
      }

      if (kind === "cancelled") {
        setPurchaseState("idle");
        /* Cancellation is not a failure — subtle notice only */
        Alert.alert("İptal", "Satın alma işlemi iptal edildi.", [{ text: "Tamam" }]);
        return;
      }

      if (kind === "pending") {
        setPurchaseState("pending");
        Alert.alert(
          "İşlem Beklemede",
          "Ödemeniz mağaza tarafından işleniyor.",
          [{ text: "Tamam", onPress: () => setPurchaseState("idle") }]
        );
        return;
      }

      setPurchaseState("error");
      Alert.alert("Hata", message, [{ text: "Tamam", onPress: () => setPurchaseState("idle") }]);
    } finally {
      purchasingRef.current = false;
    }
  };

  /* ── Derived button state ─────────────────────────────── */
  const isPurchasing  = purchaseState === "starting" || purchaseState === "processing";
  const ctaDisabled   = isPurchasing || offeringsLoading || !!offeringsError || !selectedPackage;

  let ctaLabel = "Öne Çıkarmayı Satın Al";
  if (Platform.OS === "web")                  ctaLabel = "Uygulama Gerekli";
  else if (purchaseState === "starting")       ctaLabel = "Başlatılıyor…";
  else if (purchaseState === "processing")     ctaLabel = "İşleniyor…";

  const ctaSummary =
    selectedPackage && !offeringsLoading && !offeringsError
      ? `${selectedPackage.product.title} · ${selectedPackage.product.priceString} · ${getMeta(selectedPackage.identifier).durationDays} Gün`
      : null;

  /* ── Packages section renderer ────────────────────────── */
  function renderPackages() {
    if (offeringsLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
            Paketler yükleniyor…
          </Text>
        </View>
      );
    }

    if (offeringsError) {
      return (
        <View style={[styles.stateBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Icon name="WifiOff" size={28} color={colors.mutedForeground} />
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{offeringsError}</Text>
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
          disabled={isPurchasing}
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
            {([
              { icon: "TrendingUp", text: "Listelerin en üstünde gösterilir" },
              { icon: "Star",       text: '"Öne Çıkan" etiketi ile dikkat çeker' },
              { icon: "Eye",        text: "Normal ilanlardan daha fazla görüntüleme alır" },
              { icon: "RefreshCw",  text: "Süre bitince tekrar satın alınabilir" },
            ] as const).map((b, i) => (
              <View
                key={i}
                style={[
                  styles.benefitRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                ]}
              >
                <View style={[styles.benefitIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Icon name={b.icon} size={18} color={colors.primary} />
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
              İlan öne çıkarma satın alma işlemi iOS ve Android uygulamalarında kullanılabilir.
            </Text>
          </View>
        )}

        {/* Pending notice */}
        {purchaseState === "pending" && (
          <View style={[styles.webNotice, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
            <Icon name="Clock" size={18} color={colors.primary} />
            <Text style={[styles.webNoticeText, { color: colors.primary }]}>
              Ödemeniz mağaza tarafından işleniyor.
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
              backgroundColor:
                Platform.OS === "web" || offeringsError ? colors.mutedForeground : colors.primary,
              opacity: pressed || ctaDisabled ? 0.75 : 1,
            },
          ]}
          onPress={handleBoost}
          disabled={ctaDisabled}
        >
          {isPurchasing ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Icon name="Star" size={20} color="white" />
              <Text style={styles.ctaButtonText}>{ctaLabel}</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  hero:          { paddingHorizontal: 20, paddingBottom: 32 },
  backBtn:       { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  heroContent:   { alignItems: "center", gap: 8 },
  starBadge:     {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  heroTitle:     { fontSize: 24, fontFamily: "Inter_700Bold", color: "white" },
  heroSubtitle:  { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)", textAlign: "center" },
  content:       { padding: 20, gap: 20 },
  section:       { gap: 12 },
  sectionTitle:  { fontSize: 18, fontFamily: "Inter_700Bold" },
  benefitCard:   { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  benefitRow:    { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  benefitIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  benefitText:   { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  webNotice:     { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, padding: 14, borderWidth: 1 },
  webNoticeText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  centered:      { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 32 },
  stateBox:      { alignItems: "center", gap: 14, padding: 24, borderRadius: 16, borderWidth: 1 },
  stateText:     { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center" },
  retryBtn:      { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText:     { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "white" },
  packageCard:   { borderRadius: 16, padding: 16, overflow: "hidden" },
  bestValueBadge:{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginBottom: 10 },
  bestValueText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "white" },
  packageRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  packageLeft:   { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  radioOuter:    { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner:    { width: 12, height: 12, borderRadius: 6 },
  packageLabel:  { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  packageDesc:   { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  packagePrice:  { fontSize: 22, fontFamily: "Inter_700Bold" },
  packageDays:   { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  infoBox:       { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 12 },
  infoText:      { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  ctaContainer:  {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  ctaSummary:    { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  ctaButton:     {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 16, paddingVertical: 16,
    shadowColor: "#E07A35", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  ctaButtonText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "white" },
});
