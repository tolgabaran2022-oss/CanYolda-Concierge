import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PURPLE      = "#6C4FCF";
const PURPLE_DARK = "#2E1A6E";
const PURPLE_MID  = "#9478D8";
const BG          = "#FAFAF9";

const HERO_IMAGE = require("@/assets/images/hero-logo-pets.png");

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const press = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const handleSocial = () => Alert.alert("Yakında", "Sosyal giriş yakında eklenecek.");

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) }]}>

      {/* Subtle corner accent — top right only */}
      <View style={styles.accentTR} />

      {/* ── Top: Logo ─────────────────────────────── */}
      <View style={styles.logoSection}>
        <View style={styles.logoMark}>
          <Ionicons name="paw" size={16} color="#FFF" />
        </View>
        <Text style={styles.logoText}>canyoldaşı</Text>
      </View>

      {/* ── Hero ──────────────────────────────────── */}
      <View style={styles.heroSection}>
        <Image
          source={HERO_IMAGE}
          style={styles.heroImage}
          contentFit="contain"
        />
      </View>

      {/* ── Headline ──────────────────────────────── */}
      <View style={styles.headlineSection}>
        <Text style={styles.headline}>Sokak hayvanları için{"\n"}bir topluluk</Text>
        <Text style={styles.subheadline}>
          Bildir, takip et, sahiplendir — birlikte daha güçlüyüz.
        </Text>
      </View>

      {/* ── CTA Buttons ───────────────────────────── */}
      <View style={styles.ctaSection}>
        {/* Primary */}
        <Pressable
          onPress={() => { press(); router.push("/(auth)/login-form"); }}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
        >
          <LinearGradient
            colors={[PURPLE_MID, PURPLE]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Giriş Yap</Text>
          </LinearGradient>
        </Pressable>

        {/* Secondary */}
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => { press(); router.push("/(auth)/register"); }}
        >
          <Text style={styles.secondaryBtnText}>Kayıt Ol</Text>
        </Pressable>
      </View>

      {/* ── Social ────────────────────────────────── */}
      <View style={styles.socialSection}>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>Veya devam et</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          {[
            { label: "G", color: "#4285F4", isText: true },
            { name: "logo-apple", color: "#1A1A1A", isText: false },
            { name: "logo-facebook", color: "#1877F2", isText: false },
          ].map((s, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [styles.socialBtn, { opacity: pressed ? 0.75 : 1 }]}
              onPress={handleSocial}
            >
              {s.isText ? (
                <Text style={[styles.socialG, { color: s.color }]}>{s.label}</Text>
              ) : (
                <Ionicons name={s.name as any} size={20} color={s.color} />
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Privacy ───────────────────────────────── */}
      <Text style={styles.privacy}>
        Devam ederek{" "}
        <Text style={styles.privacyLink}>Kullanım Koşulları</Text>
        {" "}ve{" "}
        <Text style={styles.privacyLink}>Gizlilik Politikası</Text>
        {"'"}nı kabul edersiniz.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    paddingHorizontal: 24,
  },

  /* Accent */
  accentTR: {
    position: "absolute",
    top: -64,
    right: -64,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: PURPLE_MID,
    opacity: 0.08,
  },

  /* Logo */
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
    letterSpacing: -0.5,
  },

  /* Hero */
  heroSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxHeight: 280,
    minHeight: 180,
  },
  heroImage: {
    width: "72%",
    aspectRatio: 4265 / 4585,
  },

  /* Headline */
  headlineSection: {
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  headline: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
    textAlign: "center",
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(62,40,110,0.5)",
    textAlign: "center",
    lineHeight: 20,
  },

  /* CTA */
  ctaSection: {
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: `${PURPLE}35`,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  secondaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: PURPLE_DARK,
    letterSpacing: 0.2,
  },

  /* Social */
  socialSection: {
    width: "100%",
    gap: 16,
    marginBottom: 20,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.10)",
  },
  dividerLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(0,0,0,0.32)",
    letterSpacing: 0.1,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  socialG: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    lineHeight: 22,
  },

  /* Privacy */
  privacy: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(0,0,0,0.32)",
    textAlign: "center",
    lineHeight: 17,
    paddingHorizontal: 8,
  },
  privacyLink: {
    color: PURPLE,
    fontFamily: "Inter_500Medium",
  },
});
