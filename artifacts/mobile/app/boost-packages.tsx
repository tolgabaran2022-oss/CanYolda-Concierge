import { Icon } from "@/components/Icon";
import { useAuth } from "@/contexts/AuthContext";
import { useAdoption } from "@/contexts/AdoptionContext";
import { useColors } from "@/hooks/useColors";
import { fetchOfferings, restorePurchases } from "@/services/revenueCat";
import { Image } from "expo-image";
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
   CONSTANTS
───────────────────────────────────────────────────────────── */
const P        = "#7C3AED";
const P_DARK   = "#4C2A85";
const P_LIGHT  = "#A855F7";
const P_BG     = "#FAF8FF";
const P_BADGE  = "#F3EEFF";
const GOLD     = "#F59E0B";

/* ─────────────────────────────────────────────────────────────
   CENTRALIZED BOOST PACKAGE CONFIGURATION
───────────────────────────────────────────────────────────── */
interface BoostPackageMeta {
  durationDays: number;
  label:        string;
  subtitle:     string;
  badge:        string | null;
  badgeColor:   string;
  sortOrder:    number;
}

const BOOST_PACKAGE_CONFIG: Record<string, BoostPackageMeta> = {
  boost_1_day:  {
    durationDays: 1, label: "1 Gün",  subtitle: "Hızlı Destek",
    badge: null,           badgeColor: P,    sortOrder: 0,
  },
  boost_3_days: {
    durationDays: 3, label: "3 Gün",  subtitle: "Daha Fazla Görünürlük",
    badge: "EN POPÜLER",   badgeColor: P,    sortOrder: 1,
  },
  boost_7_days: {
    durationDays: 7, label: "7 Gün",  subtitle: "Maksimum Erişim",
    badge: "EN AVANTAJLI", badgeColor: GOLD, sortOrder: 2,
  },
};

const DEFAULT_PACKAGE_ID = "boost_3_days";

function getMeta(identifier: string): BoostPackageMeta {
  return BOOST_PACKAGE_CONFIG[identifier] ?? {
    durationDays: 1, label: "Paket", subtitle: "Öne çıkarma",
    badge: null, badgeColor: P, sortOrder: 99,
  };
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
  | "idle" | "starting" | "processing"
  | "success" | "cancelled" | "pending"
  | "error" | "restoring";

type CompletedBoostPurchase = {
  packageIdentifier:     string;
  productIdentifier:     string;
  transactionIdentifier: string | undefined;
  rcUserId:              string;
  customerInfo:          CustomerInfo;
};

type VerifyPurchaseApiResult = {
  success:            boolean;
  alreadyProcessed:   boolean;
  purchaseId:         string;
  listingId:          string;
  packageIdentifier:  string;
  durationDays:       number;
  promotionStartedAt: string;
  promotedUntil:      string;
};

async function callVerifyPurchaseApi(
  result:    CompletedBoostPurchase,
  listingId: string,
  token:     string | null
): Promise<VerifyPurchaseApiResult | null> {
  if (!token) return null;
  const baseUrl = process.env.EXPO_PUBLIC_DOMAIN ?? "";
  try {
    const res = await fetch(`${baseUrl}/api/promotions/verify-purchase`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify({
        listingId,
        rcPackageIdentifier:   result.packageIdentifier,
        productIdentifier:     result.productIdentifier,
        transactionIdentifier: result.transactionIdentifier,
        rcUserId:              result.rcUserId,
      }),
    });
    if (!res.ok) return null;
    return await res.json() as VerifyPurchaseApiResult;
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────
   ERROR CLASSIFICATION
───────────────────────────────────────────────────────────── */
type PurchaseErrorKind = "cancelled" | "pending" | "unavailable" | "network" | "sdk_unavailable" | "unknown";

function classifyPurchaseError(err: unknown): { kind: PurchaseErrorKind; message: string } {
  if (typeof err !== "object" || err === null)
    return { kind: "unknown", message: "Satın alma işlemi tamamlanamadı. Lütfen tekrar deneyin." };
  if ("userCancelled" in err && err.userCancelled === true)
    return { kind: "cancelled", message: "Satın alma işlemi iptal edildi." };
  const code = "code" in err && typeof err.code === "number" ? err.code : -1;
  if (code === 1)  return { kind: "cancelled",   message: "Satın alma işlemi iptal edildi." };
  if (code === 6)  return { kind: "pending",     message: "Ödemeniz mağaza tarafından işleniyor." };
  if (code === 3)  return { kind: "unavailable", message: "Bu paket şu anda satın alınamıyor." };
  if (code === 23) return { kind: "network",     message: "Bağlantı sorunu nedeniyle satın alma tamamlanamadı." };
  const rawMsg = "message" in err && typeof err.message === "string" ? err.message.toLowerCase() : "";
  if (rawMsg.includes("native module") || rawMsg.includes("not found") || rawMsg.includes("unavailable") || rawMsg.includes("sdk not configured"))
    return { kind: "sdk_unavailable", message: "Satın alma testi için Development Build kullanmanız gerekiyor." };
  return { kind: "unknown", message: "Satın alma işlemi tamamlanamadı. Lütfen tekrar deneyin." };
}

async function executePurchase(pkg: PurchasesPackage): Promise<MakePurchaseResult> {
  const { default: Purchases } = await import("react-native-purchases");
  return Purchases.purchasePackage(pkg);
}

/* ─────────────────────────────────────────────────────────────
   SCREEN
───────────────────────────────────────────────────────────── */
export default function BoostPackagesScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { user, token } = useAuth();
  const { getListing, refresh: refreshAdoption } = useAdoption();

  const { listingId } = useLocalSearchParams<{ listingId: string; petName?: string }>();

  const listing = listingId ? getListing(listingId) : undefined;
  const photoUri = listing?.images?.[0] ?? listing?.photo ?? null;

  /* ── Offerings state ─────────────────────────────────────── */
  const [packages,        setPackages]        = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [offeringsError,  setOfferingsError]  = useState<string | null>(null);
  const [purchaseState,   setPurchaseState]   = useState<PurchaseState>("idle");

  const fetchingRef   = useRef(false);
  const purchasingRef = useRef(false);

  /* ── Load offerings ──────────────────────────────────────── */
  const loadOfferings = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setOfferingsLoading(true);
    setOfferingsError(null);
    try {
      const raw    = await fetchOfferings();
      const sorted = sortPackages(raw);
      setPackages(sorted);
      const preferred = sorted.find((p) => p.identifier === DEFAULT_PACKAGE_ID) ?? sorted[0] ?? null;
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

  /* ── Purchase handler ────────────────────────────────────── */
  const handleBoost = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Uygulama Gerekli", "İlan öne çıkarma satın alma işlemi iOS ve Android uygulamalarında kullanılabilir.", [{ text: "Tamam" }]);
      return;
    }
    if (!user) {
      Alert.alert("Giriş Gerekli", "Satın alma işlemi için giriş yapmanız gerekiyor.", [{ text: "Tamam" }]);
      return;
    }
    if (!selectedPackage) {
      Alert.alert("Paket Seçilmedi", "Lütfen bir öne çıkarma paketi seçin.", [{ text: "Tamam" }]);
      return;
    }
    if (!listingId) return;
    if (purchasingRef.current) return;
    purchasingRef.current = true;

    setPurchaseState("starting");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setPurchaseState("processing");
      const result: MakePurchaseResult = await executePurchase(selectedPackage);
      setPurchaseState("success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const txId = result.transaction?.transactionIdentifier;
      const completedPurchase: CompletedBoostPurchase = {
        packageIdentifier:     selectedPackage.identifier,
        productIdentifier:     result.productIdentifier,
        transactionIdentifier: txId,
        rcUserId:              result.customerInfo.originalAppUserId,
        customerInfo:          result.customerInfo,
      };

      const activated = await callVerifyPurchaseApi(completedPurchase, listingId, token);

      if (activated?.success) {
        try { await refreshAdoption(); } catch { /* non-critical */ }
        const expiresLabel = activated.promotedUntil
          ? new Date(activated.promotedUntil).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
          : null;
        const body = activated.alreadyProcessed
          ? "Bu satın alma daha önce işlenmişti. İlanın zaten öne çıkarılmış durumda."
          : expiresLabel
            ? `İlanın ${activated.durationDays} gün boyunca daha fazla kişiye ulaşacak.\n\nBitiş: ${expiresLabel}`
            : `İlanın ${activated.durationDays} gün boyunca öne çıkarıldı.`;
        Alert.alert(
          activated.alreadyProcessed ? "Zaten Aktif" : "İlanın Öne Çıkarıldı 🎉",
          body,
          [{ text: "Tamam", onPress: () => { setPurchaseState("idle"); router.back(); } }]
        );
      } else {
        Alert.alert(
          "Ödemen Alındı",
          "Ödemen tamamlandı ancak ilan henüz etkinleştirilemedi. Lütfen tekrar dene — aynı satın alma faturanlandırılmaz.",
          [
            {
              text: "Tekrar Dene",
              onPress: async () => {
                const retry = await callVerifyPurchaseApi(completedPurchase, listingId, token);
                if (retry?.success) {
                  try { await refreshAdoption(); } catch { /* non-critical */ }
                }
                setPurchaseState("idle");
                router.back();
              },
            },
            { text: "Tamam", onPress: () => { setPurchaseState("idle"); router.back(); } },
          ]
        );
      }
    } catch (err: unknown) {
      const { kind, message } = classifyPurchaseError(err);
      if (kind === "cancelled") {
        setPurchaseState("idle");
        Alert.alert("İptal", "Satın alma işlemi iptal edildi.", [{ text: "Tamam" }]);
        return;
      }
      if (kind === "pending") {
        setPurchaseState("pending");
        Alert.alert("İşlem Beklemede", "Ödemeniz mağaza tarafından işleniyor.", [{ text: "Tamam", onPress: () => setPurchaseState("idle") }]);
        return;
      }
      setPurchaseState("error");
      Alert.alert("Hata", message, [{ text: "Tamam", onPress: () => setPurchaseState("idle") }]);
    } finally {
      purchasingRef.current = false;
    }
  };

  /* ── Restore handler ─────────────────────────────────────── */
  const handleRestore = async () => {
    if (Platform.OS === "web") return;
    if (purchasingRef.current) return;
    purchasingRef.current = true;
    setPurchaseState("restoring");
    try {
      const customerInfo = await restorePurchases();
      if (!customerInfo) {
        Alert.alert("Bilgi", "Geri yükleme bu platformda desteklenmiyor.", [{ text: "Tamam" }]);
        return;
      }
      const boostProductIds = new Set(["canyoldasi_boost_1_day", "canyoldasi_boost_3_days", "canyoldasi_boost_7_days"]);
      const boostTxns = customerInfo.nonSubscriptionTransactions?.filter(
        (t) => boostProductIds.has(t.productIdentifier)
      ) ?? [];

      if (!token || !listingId || boostTxns.length === 0) {
        Alert.alert("Geri Yüklendi", "Bu hesapla ilişkili öne çıkarma satın alımı bulunamadı.", [{ text: "Tamam" }]);
        return;
      }

      const latest = boostTxns.sort(
        (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
      )[0]!;

      const restored = await callVerifyPurchaseApi(
        {
          packageIdentifier:     latest.productIdentifier.replace("canyoldasi_", ""),
          productIdentifier:     latest.productIdentifier,
          transactionIdentifier: latest.transactionIdentifier,
          rcUserId:              customerInfo.originalAppUserId,
          customerInfo,
        },
        listingId,
        token
      );

      if (restored?.success) {
        try { await refreshAdoption(); } catch { /* non-critical */ }
        Alert.alert(
          restored.alreadyProcessed ? "Zaten Aktif" : "Satın Alım Geri Yüklendi",
          restored.alreadyProcessed
            ? "Bu satın alma zaten aktif durumda."
            : `İlanın ${restored.durationDays} gün boyunca tekrar öne çıkarıldı.`,
          [{ text: "Tamam", onPress: () => { setPurchaseState("idle"); router.back(); } }]
        );
      } else {
        Alert.alert("Geri Yükleme Tamamlandı", "Hesabınızın satın alma geçmişi güncellendi. Aktif bir öne çıkarma bulunamadı.", [{ text: "Tamam" }]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (__DEV__) console.warn("[Boost] Restore failed:", msg);
      Alert.alert("Hata", "Satın alımlar geri yüklenemedi. Lütfen tekrar deneyin.", [{ text: "Tamam" }]);
    } finally {
      setPurchaseState("idle");
      purchasingRef.current = false;
    }
  };

  /* ── Derived ─────────────────────────────────────────────── */
  const isPurchasing = purchaseState === "starting" || purchaseState === "processing";
  const ctaDisabled  = isPurchasing || offeringsLoading || !!offeringsError || !selectedPackage || !listingId;

  const selectedMeta  = selectedPackage ? getMeta(selectedPackage.identifier) : null;
  const ctaLabel      = isPurchasing
    ? (purchaseState === "starting" ? "Başlatılıyor…" : "İşleniyor…")
    : Platform.OS === "web" ? "Uygulama Gerekli" : "Öne Çıkarmayı Satın Al";

  /* ── Render packages ─────────────────────────────────────── */
  function renderPackages() {
    if (offeringsLoading) {
      return (
        <View style={s.centered}>
          <ActivityIndicator color={P} size="large" />
          <Text style={s.stateText}>Paketler yükleniyor…</Text>
        </View>
      );
    }
    if (offeringsError) {
      return (
        <View style={s.stateBox}>
          <Icon name="WifiOff" size={28} color="#999" />
          <Text style={s.stateText}>{offeringsError}</Text>
          <Pressable style={s.retryBtn} onPress={loadOfferings}>
            <Icon name="RefreshCw" size={16} color="white" />
            <Text style={s.retryText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      );
    }
    if (packages.length === 0) {
      return (
        <View style={s.stateBox}>
          <Text style={s.stateText}>Şu an aktif öne çıkarma paketi bulunmuyor.</Text>
        </View>
      );
    }
    return packages.map((pkg) => {
      const isSelected = selectedPackage?.identifier === pkg.identifier;
      const meta       = getMeta(pkg.identifier);
      return (
        <Pressable
          key={pkg.identifier}
          style={[s.pkgCard, isSelected && s.pkgCardSelected]}
          disabled={isPurchasing}
          onPress={() => {
            setSelectedPackage(pkg);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          {/* Radio / check */}
          <View style={[s.radioWrap, isSelected && s.radioWrapSelected]}>
            {isSelected && <Icon name="Check" size={12} color="white" />}
          </View>

          {/* Labels */}
          <View style={s.pkgLabels}>
            <Text style={[s.pkgLabel, isSelected && { color: P_DARK }]}>{meta.label}</Text>
            <Text style={s.pkgSub}>{meta.subtitle}</Text>
          </View>

          {/* Badge */}
          {meta.badge ? (
            <View style={[s.pkgBadge, { backgroundColor: meta.badgeColor }]}>
              <Text style={s.pkgBadgeText}>{meta.badge}</Text>
            </View>
          ) : (
            <View style={s.pkgBadgeSpacer} />
          )}

          {/* Price */}
          {pkg.product.priceString ? (
            <Text style={[s.pkgPrice, isSelected && { color: P }]}>
              {pkg.product.priceString}
            </Text>
          ) : (
            <Text style={s.pkgPriceUnavailable}>Fiyat yüklenemedi</Text>
          )}
        </Pressable>
      );
    });
  }

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
      >
        {/* ── Hero ── */}
        <LinearGradient
          colors={[P, P_LIGHT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.hero, { paddingTop: Platform.OS === "web" ? 24 : insets.top + 12 }]}
        >
          {/* Decorative stars */}
          <View style={[s.deco, { top: 24, right: 30, opacity: 0.18 }]}>
            <Icon name="Star" size={70} color="white" />
          </View>
          <View style={[s.deco, { top: 60, right: -10, opacity: 0.1 }]}>
            <Icon name="Star" size={44} color="white" />
          </View>
          <View style={[s.deco, { top: 14, left: 90, opacity: 0.12 }]}>
            <Icon name="Sparkles" size={20} color="white" />
          </View>
          <View style={[s.deco, { bottom: 40, left: 20, opacity: 0.12 }]}>
            <Icon name="Sparkles" size={14} color="white" />
          </View>

          {/* Back */}
          <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Icon name="ChevronLeft" size={20} color="white" />
          </Pressable>

          {/* Text */}
          <View style={s.heroText}>
            <Text style={s.heroSmall}>İLANINI GÜÇLENDİR</Text>
            <Text style={s.heroTitle}>Daha Fazla Kişiye Ulaş</Text>
            <Text style={s.heroSub}>İlanını öne çıkar, yeni yuvasına daha hızlı ulaşsın.</Text>
          </View>
        </LinearGradient>

        {/* ── Listing Preview Card — overlaps hero ── */}
        <View style={s.previewWrap}>
          <View style={s.previewCard}>
            {/* Photo */}
            <View style={s.previewPhoto}>
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={s.previewImg}
                  contentFit="cover"
                />
              ) : (
                <View style={[s.previewImg, s.previewImgPlaceholder]}>
                  <Icon name="PawPrint" size={28} color="#C4B5E0" />
                </View>
              )}
            </View>

            {/* Info */}
            <View style={s.previewInfo}>
              <Text style={s.previewName} numberOfLines={1}>
                {listing?.petName ?? "—"}
              </Text>
              <View style={s.previewLocation}>
                <Icon name="MapPin" size={12} color="#888" />
                <Text style={s.previewLocTxt} numberOfLines={1}>
                  {listing?.location || "Konum belirtilmedi"}
                </Text>
              </View>
              {/* "Öne Çıkarılacak" pill */}
              <View style={s.featurePill}>
                <Icon name="Star" size={11} color={P} />
                <Text style={s.featurePillTxt}>Öne Çıkarılacak</Text>
              </View>
              {/* Visibility row */}
              <View style={s.visibilityRow}>
                <Icon name="List" size={13} color="#999" />
                <Text style={s.visibilityLbl}>Normal</Text>
                <Icon name="ArrowRight" size={13} color="#999" />
                <View style={s.visibilityTarget}>
                  <Icon name="TrendingUp" size={13} color={P} />
                  <Text style={s.visibilityTargetTxt}>Listenin Üstü</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={s.body}>
          {/* ── Benefits ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Öne Çıkarma Avantajları</Text>
            <View style={s.benefitsRow}>
              {(
                [
                  { icon: "Star" as const,     title: "Listenin En Üstünde", sub: "Daha görünür ol",          iconColor: GOLD },
                  { icon: "Eye" as const,      title: "Daha Fazla Görüntülenme", sub: "Daha çok kişiye ulaş", iconColor: P    },
                  { icon: "Sparkles" as const, title: "Mor Yıldız Etiketi",  sub: "İlanın hemen fark edilsin", iconColor: P    },
                ] as const
              ).map((b) => (
                <View key={b.title} style={s.benefitCard}>
                  <View style={s.benefitIconWrap}>
                    <Icon name={b.icon} size={20} color={b.iconColor} />
                  </View>
                  <Text style={s.benefitTitle}>{b.title}</Text>
                  <Text style={s.benefitSub}>{b.sub}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Web notice */}
          {Platform.OS === "web" && (
            <View style={s.webNotice}>
              <Icon name="Smartphone" size={16} color={P} />
              <Text style={s.webNoticeTxt}>
                İlan öne çıkarma satın alma işlemi iOS ve Android uygulamalarında kullanılabilir.
              </Text>
            </View>
          )}

          {/* Pending notice */}
          {purchaseState === "pending" && (
            <View style={s.webNotice}>
              <Icon name="Clock" size={16} color={P} />
              <Text style={s.webNoticeTxt}>Ödemeniz mağaza tarafından işleniyor.</Text>
            </View>
          )}

          {/* ── Package Selection ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Paketini Seç</Text>
            <View style={{ gap: 10 }}>{renderPackages()}</View>
          </View>

          {/* ── Trust info ── */}
          <View style={s.trustBox}>
            <View style={s.trustRow}>
              <View style={s.trustIconWrap}>
                <Icon name="ShieldCheck" size={16} color={P} />
              </View>
              <Text style={s.trustTxt}>
                Satın alma işlemin App Store veya Google Play üzerinden güvenle tamamlanır.
              </Text>
            </View>
            <View style={s.trustRow}>
              <View style={s.trustIconWrap}>
                <Icon name="RefreshCw" size={16} color={P} />
              </View>
              <Text style={s.trustTxt}>Süre sonunda ilan normal sıralamasına döner.</Text>
            </View>
          </View>

          {/* Restore */}
          {Platform.OS !== "web" && (
            <Pressable
              style={s.restoreBtn}
              onPress={handleRestore}
              disabled={purchaseState === "restoring" || isPurchasing}
            >
              {purchaseState === "restoring" ? (
                <ActivityIndicator size="small" color="#999" />
              ) : (
                <Text style={s.restoreTxt}>Satın Alımları Geri Yükle</Text>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* ── Sticky CTA ── */}
      <View style={[s.ctaWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={s.ctaInner}>
          {/* Left: selected package summary */}
          <View style={s.ctaSummary}>
            <Text style={s.ctaSummaryLabel}>Seçilen Paket</Text>
            {selectedMeta && selectedPackage && !offeringsLoading && !offeringsError ? (
              <Text style={s.ctaSummaryValue}>
                {selectedMeta.label} · {selectedPackage.product.priceString}
              </Text>
            ) : (
              <Text style={s.ctaSummaryValue}>—</Text>
            )}
          </View>

          {/* Right: purchase button */}
          <Pressable
            style={({ pressed }) => [s.ctaBtn, (pressed || ctaDisabled) && { opacity: 0.75 }]}
            onPress={handleBoost}
            disabled={ctaDisabled}
          >
            <LinearGradient colors={[P, P_LIGHT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaBtnGrad}>
              {isPurchasing ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Icon name="Star" size={16} color="white" />
                  <Text style={s.ctaBtnTxt}>{ctaLabel}</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
        <Text style={s.ctaDisclaimer}>Satın alarak öne çıkarma süresini onaylarsın.</Text>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: P_BG },

  /* Hero */
  hero:   { paddingHorizontal: 20, paddingBottom: 64, overflow: "hidden" },
  deco:   { position: "absolute" },
  backBtn:{
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  heroText:  { alignItems: "center", gap: 6 },
  heroSmall: { fontSize: 11, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.8)", letterSpacing: 2, textTransform: "uppercase" },
  heroTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "white", textAlign: "center" },
  heroSub:   { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 20 },

  /* Preview card */
  previewWrap: { marginTop: -44, marginHorizontal: 20, zIndex: 10 },
  previewCard: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  previewPhoto:        { borderRadius: 12, overflow: "hidden" },
  previewImg:          { width: 80, height: 80, borderRadius: 12 },
  previewImgPlaceholder: {
    backgroundColor: "#F0EAF8",
    alignItems: "center", justifyContent: "center",
  },
  previewInfo:         { flex: 1, gap: 5, justifyContent: "center" },
  previewName:         { fontSize: 16, fontFamily: "Inter_700Bold", color: "#1A1A2E" },
  previewLocation:     { flexDirection: "row", alignItems: "center", gap: 4 },
  previewLocTxt:       { fontSize: 12, fontFamily: "Inter_400Regular", color: "#888", flex: 1 },
  featurePill:         {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start",
    backgroundColor: P_BADGE,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  featurePillTxt:      { fontSize: 11, fontFamily: "Inter_600SemiBold", color: P },
  visibilityRow:       { flexDirection: "row", alignItems: "center", gap: 5 },
  visibilityLbl:       { fontSize: 12, fontFamily: "Inter_400Regular", color: "#999" },
  visibilityTarget:    { flexDirection: "row", alignItems: "center", gap: 3 },
  visibilityTargetTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: P },

  /* Body */
  body:        { padding: 20, gap: 24 },
  section:     { gap: 14 },
  sectionTitle:{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#1A1A2E" },

  /* Benefit cards */
  benefitsRow: { flexDirection: "row", gap: 10 },
  benefitCard: {
    flex: 1, backgroundColor: "white", borderRadius: 14,
    padding: 12, alignItems: "center", gap: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  benefitIconWrap: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: P_BADGE, alignItems: "center", justifyContent: "center",
  },
  benefitTitle: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#1A1A2E", textAlign: "center" },
  benefitSub:   { fontSize: 10, fontFamily: "Inter_400Regular", color: "#888", textAlign: "center" },

  /* Package cards */
  pkgCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "white", borderRadius: 14,
    padding: 16, borderWidth: 1.5, borderColor: "#E8E4F0",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  pkgCardSelected: {
    borderColor: P, backgroundColor: "#F5F0FF",
  },
  radioWrap: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: "#C4B5E0",
    alignItems: "center", justifyContent: "center",
  },
  radioWrapSelected: {
    backgroundColor: P, borderColor: P,
  },
  pkgLabels: { flex: 1 },
  pkgLabel:  { fontSize: 15, fontFamily: "Inter_700Bold", color: "#1A1A2E" },
  pkgSub:    { fontSize: 12, fontFamily: "Inter_400Regular", color: "#888", marginTop: 1 },
  pkgBadge:  { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  pkgBadgeSpacer: { width: 0 },
  pkgBadgeText:   { fontSize: 9, fontFamily: "Inter_700Bold", color: "white", letterSpacing: 0.4 },
  pkgPrice:            { fontSize: 16, fontFamily: "Inter_700Bold", color: "#1A1A2E", minWidth: 44, textAlign: "right" },
  pkgPriceUnavailable: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999", minWidth: 44, textAlign: "right" },

  /* Trust */
  trustBox: { gap: 12 },
  trustRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  trustIconWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: P_BADGE, alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  trustTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666", flex: 1, lineHeight: 19 },

  /* States */
  centered:  { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 32 },
  stateBox:  { alignItems: "center", gap: 14, padding: 24, borderRadius: 16, borderWidth: 1, borderColor: "#E8E4F0", backgroundColor: "white" },
  stateText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#888", textAlign: "center" },
  retryBtn:  { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: P, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "white" },

  /* Web notice */
  webNotice:    { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: P_BADGE, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#D8C8F5" },
  webNoticeTxt: { fontSize: 13, fontFamily: "Inter_500Medium", color: P, flex: 1, lineHeight: 19 },

  /* Restore */
  restoreBtn: { alignItems: "center", paddingVertical: 8 },
  restoreTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },

  /* Sticky CTA */
  ctaWrap: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "white",
    paddingHorizontal: 20, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: "#F0EAF8",
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 12,
    gap: 8,
  },
  ctaInner:        { flexDirection: "row", alignItems: "center", gap: 12 },
  ctaSummary:      { flex: 1, gap: 2 },
  ctaSummaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },
  ctaSummaryValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#1A1A2E" },
  ctaBtn:          { borderRadius: 14, overflow: "hidden" },
  ctaBtnGrad:      {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  ctaBtnTxt:       { fontSize: 14, fontFamily: "Inter_700Bold", color: "white" },
  ctaDisclaimer:   { fontSize: 11, fontFamily: "Inter_400Regular", color: "#AAA", textAlign: "center" },
});
