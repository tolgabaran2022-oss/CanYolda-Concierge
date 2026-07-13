import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PURPLE = "#7B5CBF";
const BG = "#FAF7F2";

const HERO_IMAGE = require("@/assets/images/hero-logo-pets.png");

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: sw } = useWindowDimensions();

  const heroW = Math.min(sw, 430);
  const heroH = Math.round(heroW * (4585 / 4265));

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 20) }]}>

      {/* ── Ambient glows — oversized so their physical edges never enter the viewport ── */}
      <LinearGradient
        colors={["rgba(124,92,246,0.22)", "rgba(167,139,250,0.12)", "rgba(196,181,253,0.04)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glowTopLeft}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(255,222,180,0.15)", "rgba(255,237,213,0.07)", "transparent"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.glowRight}
        pointerEvents="none"
      />

      {/* Hero */}
      <View style={[styles.heroWrap, { marginTop: insets.top, width: heroW, height: heroH }]}>
        <Image
          source={HERO_IMAGE}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
        />
      </View>

      {/* Buttons */}
      <View style={styles.btnSection}>

        {/* Giriş Yap */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/login-form");
          }}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.975 : 1 }],
            opacity: pressed ? 0.93 : 1,
          })}
        >
          <LinearGradient
            colors={["#9B7DE8", "#5A3BB2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Giriş Yap</Text>
          </LinearGradient>
        </Pressable>

        {/* Kayıt Ol */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/register");
          }}
          style={({ pressed }) => [
            styles.secondaryBtn,
            {
              transform: [{ scale: pressed ? 0.975 : 1 }],
              opacity: pressed ? 0.93 : 1,
            },
          ]}
        >
          <Text style={styles.secondaryBtnText}>Kayıt Ol</Text>
        </Pressable>

        {/* Şifremi Unuttum */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/forgot-password");
          }}
          style={({ pressed }) => ({
            alignSelf: "center",
            paddingVertical: 10,
            paddingHorizontal: 20,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={styles.forgotText}>Şifremi Unuttum?</Text>
        </Pressable>

        {/* Terms */}
        <View style={styles.termsRow}>
          <Text style={styles.termsText}>
            Devam ederek{" "}
            <Text style={styles.termsLink}>Kullanım Koşulları</Text>
            {" "}ve{" "}
            <Text style={styles.termsLink}>Gizlilik Politikası</Text>
            {"'"}nı kabul etmiş olursunuz.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    overflow: "visible",
  },

  /* Ambient glows — physically extend far beyond the viewport so no hard edge is ever visible */
  glowTopLeft: {
    position: "absolute",
    top: -140,
    left: -140,
    width: 520,
    height: 480,
    borderRadius: 260,
    zIndex: 0,
    pointerEvents: "none",
  },
  glowRight: {
    position: "absolute",
    top: -60,
    right: -160,
    width: 440,
    height: 520,
    borderRadius: 260,
    zIndex: 0,
    pointerEvents: "none",
  },

  heroWrap: {
    overflow: "hidden",
  },

  btnSection: {
    flex: 1,
    paddingHorizontal: 26,
    gap: 12,
    justifyContent: "center",
    paddingBottom: 8,
  },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    shadowColor: "#5A3BB2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30,
    shadowRadius: 18,
    elevation: 10,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 0.2,
  },

  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: `${PURPLE}35`,
    shadowColor: "#2D1B4E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
  },
  secondaryBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A2E",
    letterSpacing: 0.2,
  },

  forgotText: {
    fontSize: 14,
    fontWeight: "600",
    color: PURPLE,
  },

  termsRow: {
    paddingHorizontal: 8,
    marginTop: 4,
    alignItems: "center",
  },
  termsText: {
    fontSize: 13,
    fontWeight: "400",
    color: "#888",
    lineHeight: 20,
    textAlign: "center",
  },
  termsLink: {
    color: PURPLE,
    fontWeight: "600",
  },
});
