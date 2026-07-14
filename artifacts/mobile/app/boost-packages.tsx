import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useBoost, type BoostPackage } from "@/contexts/BoostContext";
import { useColors } from "@/hooks/useColors";

function formatPrice(priceAmount: number) {
  return `₺${(priceAmount / 100).toFixed(0)}`;
}

export default function BoostPackagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { packages, packagesLoading, createCheckout, fetchBoostStatus } = useBoost();

  const { listingId, petName } = useLocalSearchParams<{
    listingId: string;
    petName: string;
  }>();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (packages.length > 0 && !selectedId) {
      const popular = packages.find((p) => p.isPopular) ?? packages[0];
      if (popular) setSelectedId(popular.id);
    }
  }, [packages]);

  const selectedPkg = packages.find((p) => p.id === selectedId) ?? null;

  const handleBoost = async () => {
    if (!selectedPkg || !user || !listingId) return;

    setCheckoutLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const checkoutUrl = await createCheckout({
        listingId,
        userEmail: user.email,
        packageCode: selectedPkg.code,
        petName: petName ?? "",
      });

      await Linking.openURL(checkoutUrl);

      setTimeout(() => {
        if (listingId) fetchBoostStatus([listingId]);
        router.back();
      }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ödeme sayfası açılamadı. Lütfen tekrar deneyin.";
      Alert.alert("Hata", msg, [{ text: "Tamam" }]);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header gradient */}
      <LinearGradient
        colors={["#E07A35", "#C96320"]}
        style={[styles.hero, { paddingTop: Platform.OS === "web" ? 20 : insets.top + 12 }]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Icon name="chevron-back" size={22} color="white" />
        </Pressable>
        <View style={styles.heroContent}>
          <View style={styles.starBadge}>
            <Icon name="star" size={24} color="#FFD700" />
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
              { icon: "trending-up-outline", text: "Listelerin en üstünde gösterilir" },
              { icon: "star-outline", text: '"Öne Çıkan" etiketi ile dikkat çeker' },
              { icon: "eye-outline", text: "Normal ilanlardan daha fazla görüntüleme alır" },
              { icon: "refresh-outline", text: "Süre bitince tekrar satın alınabilir" },
            ].map((b, i) => (
              <View
                key={i}
                style={[
                  styles.benefitRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
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

        {/* Packages */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Paket Seç</Text>
          {packagesLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : packages.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Paketler yüklenemedi. Lütfen tekrar deneyin.
            </Text>
          ) : (
            packages.map((pkg: BoostPackage) => {
              const isSelected = selectedId === pkg.id;
              return (
                <Pressable
                  key={pkg.id}
                  style={[
                    styles.packageCard,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? `${colors.primary}08` : colors.card,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => {
                    setSelectedId(pkg.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  {pkg.isPopular && (
                    <View style={[styles.bestValueBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={styles.bestValueText}>
                        {pkg.badgeText ?? "EN ÇOK TERCİH EDİLEN"}
                      </Text>
                    </View>
                  )}
                  <View style={styles.packageRow}>
                    <View style={styles.packageLeft}>
                      <View style={[styles.radioOuter, { borderColor: isSelected ? colors.primary : colors.border }]}>
                        {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                      </View>
                      <View>
                        <Text style={[styles.packageLabel, { color: colors.foreground }]}>{pkg.name}</Text>
                        <Text style={[styles.packageDesc, { color: colors.mutedForeground }]}>
                          {pkg.shortDescription || `${pkg.durationDays} gün öne çıkarma`}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[styles.packagePrice, { color: colors.primary }]}>
                        {formatPrice(pkg.priceAmount)}
                      </Text>
                      <Text style={[styles.packageDays, { color: colors.mutedForeground }]}>
                        {pkg.durationDays} Gün
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        {/* Info note */}
        <View style={[styles.infoBox, { backgroundColor: colors.muted }]}>
          <Icon name="information-circle-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            İndirim kodu ve haftalık/aylık paketler yakında geliyor.
          </Text>
        </View>
      </ScrollView>

      {/* CTA Button */}
      <View
        style={[
          styles.ctaContainer,
          { backgroundColor: colors.background, paddingBottom: insets.bottom + 16, borderTopColor: colors.border },
        ]}
      >
        {selectedPkg && (
          <Text style={[styles.ctaSummary, { color: colors.mutedForeground }]}>
            {selectedPkg.name} · {formatPrice(selectedPkg.priceAmount)}
          </Text>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            { backgroundColor: colors.primary, opacity: pressed || checkoutLoading || !selectedPkg ? 0.75 : 1 },
          ]}
          onPress={handleBoost}
          disabled={checkoutLoading || !selectedPkg}
        >
          {checkoutLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Icon name="star" size={20} color="white" />
              <Text style={styles.ctaButtonText}>Öne Çıkarmayı Satın Al</Text>
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
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  heroContent: { alignItems: "center", gap: 8 },
  starBadge: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  heroTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "white" },
  heroSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)", textAlign: "center" },
  content: { padding: 20, gap: 20 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 20 },
  benefitCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  benefitIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  benefitText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  packageCard: { borderRadius: 16, padding: 16, overflow: "hidden" },
  bestValueBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginBottom: 10 },
  bestValueText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "white" },
  packageRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  packageLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  packageLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  packageDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  packagePrice: { fontSize: 22, fontFamily: "Inter_700Bold" },
  packageDays: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  infoBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 12 },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  ctaContainer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  ctaSummary: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  ctaButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 16, paddingVertical: 16,
    shadowColor: "#E07A35", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  ctaButtonText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "white" },
});
