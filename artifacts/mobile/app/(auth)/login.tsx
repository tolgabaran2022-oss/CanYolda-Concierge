/**
 * WelcomeScreen — CanYoldaşı auth entry point
 *
 * Architecture: SafeAreaView > KeyboardAvoidingView > flex column
 *   HeroSection  (flex ratio — shrinks on short screens)
 *   AuthSection  (flex ratio — always fully visible)
 *
 * No fixed pixel heights. No BTN_SECTION_H constants.
 * No absolute-positioned auth controls. No negative margins.
 * Fully responsive to actual viewport height.
 */
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

/* ── Design tokens ─────────────────────────────────────────────────── */
const PURPLE = "#7B5CBF";
const BG     = "#FAF7F2";

const HERO_IMAGE = require("@/assets/images/login-hero.jpg");

/* ── Viewport breakpoints ──────────────────────────────────────────── */
// Based on real device dp heights, NOT model names
// SHORT  : iPhone SE (568), small Android (640)
// MEDIUM : iPhone 8/SE3 (667), iPhone X/11 (812), iPhone 12/13 (844)
// TALL   : iPhone 14 Pro Max (932), large Android (915)
function screenClass(h: number): "short" | "medium" | "tall" {
  if (h < 700) return "short";
  if (h < 820) return "medium";
  return "tall";
}

export default function WelcomeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { height: sh, width: sw } = useWindowDimensions();

  const sc = screenClass(sh);

  /* ── Responsive flex ratios ──────────────────────────────────────── */
  //                   short  medium  tall
  const heroFlex  = sc === "short" ? 0.58 : sc === "medium" ? 0.66 : 0.72;
  const authFlex  = sc === "short" ? 0.42 : sc === "medium" ? 0.34 : 0.28;

  /* ── Centralised spacing — derived from viewport, never hardcoded ── */
  const sp = {
    heroTop:    sc === "short" ? 0  : sc === "medium" ? 4   : 8,
    authGap:    sc === "short" ? 8  : sc === "medium" ? 10  : 12,
    authPadTop: sc === "short" ? 4  : sc === "medium" ? 10  : 16,
    authPadBot: Math.max(insets.bottom, 16),
    authPadH:   26,
    legalMT:    sc === "short" ? 2  : 6,
  };

  /* ── Glow size ───────────────────────────────────────────────────── */
  const glowSize = sc === "short" ? 440 : 700;

  return (
    /* SafeAreaView handles top notch + bottom home-indicator insets */
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.fill}>

          {/* ── Ambient glows — purely decorative, pointer-events none ── */}
          <LinearGradient
            colors={[
              "rgba(124,92,246,0.20)",
              "rgba(167,139,250,0.09)",
              "rgba(196,181,253,0.03)",
              "rgba(196,181,253,0)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.glowTL, { width: glowSize, height: glowSize }]}
            pointerEvents="none"
          />
          <LinearGradient
            colors={[
              "rgba(255,222,180,0.14)",
              "rgba(255,237,213,0.05)",
              "rgba(255,237,213,0)",
            ]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.glowTR, { width: glowSize, height: glowSize }]}
            pointerEvents="none"
          />

          {/* ──────────────────────────────────────────────────────────────
               HERO SECTION
               flex ratio shrinks naturally when viewport is short.
               Image fills 100 % of the section with contentFit="contain"
               so it never crops and never distorts.
          ─────────────────────────────────────────────────────────────── */}
          <View style={[styles.heroSection, { flex: heroFlex, paddingTop: sp.heroTop }]}>
            <Image
              source={HERO_IMAGE}
              style={styles.heroImg}
              contentFit="contain"
              accessible
              accessibilityLabel="Canyoldaşı — köpek ve kedi ile karşılama görseli"
            />
          </View>

          {/* ──────────────────────────────────────────────────────────────
               AUTH SECTION
               Pinned below hero via flex. Always fully visible.
               minHeight keeps the section usable on edge-case tall fonts.
          ─────────────────────────────────────────────────────────────── */}
          <View
            style={[
              styles.authSection,
              {
                flex:             authFlex,
                gap:              sp.authGap,
                paddingHorizontal: sp.authPadH,
                paddingTop:       sp.authPadTop,
                paddingBottom:    sp.authPadBot,
              },
            ]}
          >
            {/* Giriş Yap */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(auth)/login-form");
              }}
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.975 : 1 }],
                opacity:    pressed ? 0.93 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel="Giriş Yap"
            >
              <LinearGradient
                colors={["#9B7DE8", "#5A3BB2"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText} maxFontSizeMultiplier={1.2}>
                  Giriş Yap
                </Text>
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
                  opacity:    pressed ? 0.93 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Kayıt Ol"
            >
              <Text style={styles.secondaryBtnText} maxFontSizeMultiplier={1.2}>
                Kayıt Ol
              </Text>
            </Pressable>

            {/* Şifremi Unuttum */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(auth)/forgot-password");
              }}
              style={({ pressed }) => ({
                alignSelf:        "center",
                paddingVertical:  10,
                paddingHorizontal: 20,
                opacity:          pressed ? 0.6 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel="Şifremi Unuttum"
            >
              <Text style={styles.forgotText} maxFontSizeMultiplier={1.2}>
                Şifremi Unuttum?
              </Text>
            </Pressable>

            {/* Legal / consent */}
            <View style={[styles.termsRow, { marginTop: sp.legalMT }]}>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* Root fills the whole screen; SafeAreaView handles insets */
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  /* Reusable fill helper */
  fill: {
    flex: 1,
  },

  /* Decorative glows — absolutely positioned, never affect layout flow */
  glowTL: {
    position:      "absolute",
    top:           -280,
    left:          -280,
    zIndex:        0,
    pointerEvents: "none",
  },
  glowTR: {
    position:      "absolute",
    top:           -200,
    right:         -280,
    zIndex:        0,
    pointerEvents: "none",
  },

  /* Hero section */
  heroSection: {
    width:       "100%",
    zIndex:      1,
    overflow:    "hidden",
  },
  heroImg: {
    width:  "100%",
    height: "100%",
  },

  /* Auth section — flex keeps it inside safe area */
  authSection: {
    zIndex:          2,
    justifyContent:  "center",
  },

  /* Buttons */
  primaryBtn: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    borderRadius:    20,
    paddingVertical: 17,
    paddingHorizontal: 18,
    minHeight:       54,
    shadowColor:     "#5A3BB2",
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.28,
    shadowRadius:    16,
    elevation:       10,
  },
  primaryBtnText: {
    fontSize:      17,
    fontWeight:    "700",
    color:         "#FFF",
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "#FFFFFF",
    borderRadius:    20,
    paddingVertical: 17,
    paddingHorizontal: 18,
    minHeight:       54,
    borderWidth:     1.5,
    borderColor:     `${PURPLE}35`,
    shadowColor:     "#2D1B4E",
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.08,
    shadowRadius:    14,
    elevation:       5,
  },
  secondaryBtnText: {
    fontSize:      17,
    fontWeight:    "700",
    color:         "#1A1A2E",
    letterSpacing: 0.2,
  },
  forgotText: {
    fontSize:   14,
    fontWeight: "600",
    color:      PURPLE,
  },

  /* Legal text */
  termsRow: {
    paddingHorizontal: 8,
    alignItems:        "center",
  },
  termsText: {
    fontSize:   13,
    fontWeight: "400",
    color:      "#888",
    lineHeight: 20,
    textAlign:  "center",
  },
  termsLink: {
    color:      PURPLE,
    fontWeight: "600",
  },
});
