import { Icon } from "@/components/Icon";
import { usePetPremium } from "@/contexts/PetPremiumContext";
import {
  fetchPetPremiumOfferings,
  getPetPremiumCustomerInfo,
  purchasePetPremium,
  restorePurchases,
  PET_PREMIUM_ENTITLEMENT_ID,
} from "@/services/revenueCat";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PurchasesPackage } from "react-native-purchases";

const PURPLE = "#7C45D9";

/* ─────────────────────────────────────────────────────────────────────────────
   Inner content — shared between full-screen route and modal overlay
───────────────────────────────────────────────────────────────────────────── */
function PremiumInner({
  source,
  returnTo,
  onClose,
}: {
  source?: string;
  returnTo?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  // `add_second_pet` is the canonical source. Keep `add_pet` as a legacy
  // alias so older deep links still receive the correct copy.
  const isSecondPet = source === "add_second_pet" || source === "add_pet";

  const { refresh } = usePetPremium();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(Platform.OS !== "web");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);

  /** Maps RC package identifier to user-friendly translated presentation. */
  function getPackagePresentation(pkg: PurchasesPackage): { title: string; description: string } {
    switch (pkg.identifier) {
      case "$rc_weekly":
        return { title: t("premium.weeklyTitle"), description: t("premium.weeklyDesc") };
      case "$rc_monthly":
        return { title: t("premium.monthlyTitle"), description: t("premium.monthlyDesc") };
      case "$rc_annual":
        return { title: t("premium.annualTitle"), description: t("premium.annualDesc") };
      default:
        return {
          title: pkg.product.title || pkg.identifier,
          description: pkg.product.description || t("premium.defaultDesc"),
        };
    }
  }

  /** Maps a thrown error message to a user-facing translated string. */
  function packageLoadErrorMessage(err: unknown): string {
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("offering_not_found:")) return t("premium.errNotConfigured");
    if (msg.startsWith("no_packages:"))        return t("premium.errNotReady");
    if (msg.includes("not yet initialized") || msg.includes("SDK not available")) return t("premium.errInit");
    return t("premium.errLoad");
  }

  const features: [string, string, string?][] = [
    ["paw",          t("premium.feat1"), t("premium.feat1Sub")],
    ["sparkles",     t("premium.feat2"), t("premium.feat2Sub")],
    ["bell",         t("premium.feat3"), t("premium.feat3Sub")],
    ["stethoscope",  t("premium.feat4"), t("premium.feat4Sub")],
    ["file-text",    t("premium.feat5"), t("premium.feat5Sub")],
    ["users",        t("premium.feat6"), t("premium.feat6Sub")],
  ];

  const loadOfferings = () => {
    if (Platform.OS === "web") return;
    setLoading(true);
    setLoadError(null);
    fetchPetPremiumOfferings()
      .then((items) => {
        setPackages(items);
        const weekly = items.find((p) => p.identifier === "$rc_weekly");
        const annual = items.find((p) => p.identifier === "$rc_annual");
        setSelected(weekly ?? annual ?? items[0] ?? null);
      })
      .catch((err: unknown) => {
        setPackages([]);
        setLoadError(packageLoadErrorMessage(err));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOfferings(); }, []);

  async function buy() {
    if (!selected || buying) return;
    setBuying(true);
    try {
      const purchaseResult = await purchasePetPremium(selected);

      const activeEntitlement = purchaseResult.customerInfo.entitlements.active[PET_PREMIUM_ENTITLEMENT_ID];
      if (!activeEntitlement) {
        if (__DEV__) {
          console.warn(
            "[PetPremium] Entitlement aktifleşmedi — RC dashboard'da '" + PET_PREMIUM_ENTITLEMENT_ID +
            "' entitlement oluşturulmalı ve Monthly/Yearly ürünleri bağlanmalıdır.",
            { activeEntitlements: Object.keys(purchaseResult.customerInfo.entitlements.active) }
          );
        }
        Alert.alert(t("premium.verifyFailedTitle"), t("premium.verifyFailedMsg"));
        return;
      }

      const verifiedStatus = await refresh(true);
      if (verifiedStatus?.isPremium !== true) {
        Alert.alert(t("premium.verifyFailedTitle"), t("premium.verifyBackendMsg"));
        return;
      }

      const destination = returnTo ? decodeURIComponent(returnTo) : null;
      Alert.alert(
        t("premium.activeTitle"),
        t("premium.activeMsg"),
        [{
          text: t("premium.continueBtn"),
          onPress: () => {
            onClose();
            if (destination) {
              router.push(destination as Parameters<typeof router.push>[0]);
            }
          },
        }]
      );
    } catch (error: unknown) {
      const e = error as { userCancelled?: boolean };
      if (!e?.userCancelled) Alert.alert(t("premium.buyFailedTitle"), t("premium.buyFailedMsg"));
    } finally { setBuying(false); }
  }

  async function restore() {
    try {
      const customerInfo = await restorePurchases();
      if (!customerInfo) {
        Alert.alert(t("premium.restoreFailedTitle"), t("premium.restoreFailedCheckMsg"));
        return;
      }

      const activeEntitlement = customerInfo.entitlements.active[PET_PREMIUM_ENTITLEMENT_ID];
      if (!activeEntitlement) {
        Alert.alert(t("premium.restoreNoActiveTitle"), t("premium.restoreNoActiveMsg"));
        return;
      }

      const verifiedStatus = await refresh(true);
      if (verifiedStatus?.isPremium !== true) {
        Alert.alert(t("premium.verifyFailedTitle"), t("premium.restoreVerifyMsg"));
        return;
      }

      Alert.alert(t("premium.restoreSuccessTitle"), t("premium.restoreSuccessMsg"));
    } catch {
      Alert.alert(t("premium.restoreFailedTitle"), t("premium.restoreErrorMsg"));
    }
  }

  const heroTitle = isSecondPet ? t("evcilimPremium.addPetTitle") : t("evcilimPremium.defaultTitle");
  const heroSub   = isSecondPet ? t("evcilimPremium.addPetDescription") : t("evcilimPremium.defaultDescription");

  return (
    <ScrollView contentContainerStyle={s.content}>
      <Pressable onPress={onClose} style={s.close} accessibilityLabel={t("common.close")}>
        <Icon name="close" size={22} color="#4E3B66" />
      </Pressable>

      <LinearGradient colors={["#9B6EE8", PURPLE]} style={s.hero}>
        <Icon name="diamond-outline" size={36} color="#FFF" />
        <Text style={s.heroTitle}>{heroTitle}</Text>
        <Text style={s.heroSub}>{heroSub}</Text>
      </LinearGradient>

      <View style={s.features}>
        {features.map(([icon, label, sub]) => (
          <View key={label} style={s.feature}>
            <View style={s.icon}><Icon name={icon} size={19} color={PURPLE} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.featureText}>{label}</Text>
              {sub ? <Text style={s.featureSub}>{sub}</Text> : null}
            </View>
            <Icon name="checkmark-circle" size={20} color="#42B96B" />
          </View>
        ))}
      </View>

      <Text style={s.sectionTitle}>{t("premium.packageSelect")}</Text>

      {Platform.OS === "web" ? (
        <View style={s.notice}>
          <Text style={s.noticeText}>{t("premium.webOnly")}</Text>
        </View>
      ) : loading ? (
        <ActivityIndicator color={PURPLE} style={{ marginVertical: 16 }} />
      ) : loadError !== null ? (
        <View style={s.notice}>
          <Text style={s.noticeText}>{loadError}</Text>
          <Pressable onPress={loadOfferings} style={s.retryBtn}>
            <Icon name="refresh-outline" size={15} color={PURPLE} />
            <Text style={s.retryTxt}>{t("common.retry")}</Text>
          </Pressable>
        </View>
      ) : packages.length === 0 ? (
        <View style={s.notice}>
          <Text style={s.noticeText}>{t("premium.noPackages")}</Text>
        </View>
      ) : (
        packages.map((pkg) => {
          const active = selected?.identifier === pkg.identifier;
          const { title, description } = getPackagePresentation(pkg);
          return (
            <Pressable
              key={pkg.identifier}
              onPress={() => setSelected(pkg)}
              style={[s.package, active && s.packageActive]}
            >
              <View style={[s.radio, active && s.radioActive]}>
                {active && <Icon name="checkmark" size={14} color="#FFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.packageName}>{title}</Text>
                <Text style={s.packageSub}>{description}</Text>
              </View>
              <Text style={s.price}>{pkg.product.priceString}</Text>
            </Pressable>
          );
        })
      )}

      <Pressable
        disabled={!selected || buying || Platform.OS === "web" || loadError !== null}
        onPress={buy}
        style={[s.buy, (!selected || buying || Platform.OS === "web" || loadError !== null) && { opacity: 0.45 }]}
      >
        <LinearGradient colors={["#9B55ED", PURPLE]} style={s.buyInner}>
          {buying ? <ActivityIndicator color="#FFF" /> : <Text style={s.buyText}>{t("premium.buyBtn")}</Text>}
        </LinearGradient>
      </Pressable>

      {Platform.OS !== "web" && (
        <Pressable onPress={restore}>
          <Text style={s.restore}>{t("premium.restoreBtn")}</Text>
        </Pressable>
      )}

      <Text style={s.foot}>{t("premium.footer")}</Text>
    </ScrollView>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Named export: modal overlay (used programmatically from other screens)
───────────────────────────────────────────────────────────────────────────── */
export function EvcilimPremiumModal({
  visible,
  onClose,
  source,
  returnTo,
}: {
  visible: boolean;
  onClose: () => void;
  source?: string;
  returnTo?: string;
}) {
  const openingRef = useRef(false);

  useEffect(() => {
    if (visible) { openingRef.current = false; }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={m.container}>
        <Pressable style={m.backdrop} onPress={onClose} accessible={false} />
        <SafeAreaView style={m.sheet} edges={["bottom"]}>
          <PremiumInner source={source} returnTo={returnTo} onClose={onClose} />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Default export: full-screen route (unchanged behaviour)
───────────────────────────────────────────────────────────────────────────── */
export default function EvcilimPremiumScreen() {
  const router = useRouter();
  const { source, returnTo } = useLocalSearchParams<{ source?: string; returnTo?: string }>();

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <PremiumInner
        source={source}
        returnTo={returnTo}
        onClose={() => router.back()}
      />
    </SafeAreaView>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Styles
───────────────────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: "#F7F3FD" },
  content:      { padding: 20, paddingBottom: 36 },
  close:        { width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", alignSelf: "flex-end", marginBottom: 8 },
  hero:         { borderRadius: 28, padding: 26, alignItems: "center", gap: 8 },
  heroTitle:    { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFF", textAlign: "center" },
  heroSub:      { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,.86)", textAlign: "center", lineHeight: 20 },
  features:     { backgroundColor: "#FFF", borderRadius: 24, padding: 14, marginTop: 16 },
  feature:      { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  icon:         { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F3ECFF", alignItems: "center", justifyContent: "center" },
  featureText:  { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#211733" },
  featureSub:   { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8C8699", marginTop: 2 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#211733", marginTop: 22, marginBottom: 10 },
  package:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFF", borderRadius: 18, borderWidth: 1, borderColor: "#E8DEF4", padding: 15, marginBottom: 10 },
  packageActive:{ borderColor: PURPLE, backgroundColor: "#F7F0FF" },
  radio:        { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "#CBBBE3", alignItems: "center", justifyContent: "center" },
  radioActive:  { backgroundColor: PURPLE, borderColor: PURPLE },
  packageName:  { fontSize: 15, fontFamily: "Inter_700Bold", color: "#211733" },
  packageSub:   { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8C8699", marginTop: 3 },
  price:        { fontSize: 16, fontFamily: "Inter_700Bold", color: "#211733" },
  notice:       { backgroundColor: "#FFF", borderRadius: 18, padding: 18, alignItems: "center", gap: 10 },
  noticeText:   { fontSize: 13, fontFamily: "Inter_400Regular", color: "#71677E", textAlign: "center" },
  retryBtn:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F3ECFF", borderRadius: 50, paddingHorizontal: 16, paddingVertical: 8 },
  retryTxt:     { fontSize: 13, fontFamily: "Inter_600SemiBold", color: PURPLE },
  buy:          { borderRadius: 18, overflow: "hidden", marginTop: 10 },
  buyInner:     { height: 56, alignItems: "center", justifyContent: "center" },
  buyText:      { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  restore:      { textAlign: "center", fontSize: 13, fontFamily: "Inter_600SemiBold", color: PURPLE, marginTop: 18 },
  foot:         { fontSize: 11, fontFamily: "Inter_400Regular", color: "#9992A4", textAlign: "center", lineHeight: 17, marginTop: 16 },
});

const m = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-end" },
  backdrop:  { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.50)" },
  sheet:     {
    backgroundColor: "#F7F3FD",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    overflow: "hidden",
  },
});
