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
const BG     = "#FAF7F2";

const HERO_IMAGE = require("@/assets/images/login-hero.jpg");

/* Estimated height of the button section (2 btns + forgot + terms + gaps + padding) */
const BTN_SECTION_H = 250;

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router  = useRouter();
  const { width: sw, height: sh } = useWindowDimensions();

  const topPad    = Math.max(insets.top,    12);
  const bottomPad = Math.max(insets.bottom, 16);

  const isSmall  = sh < 800;
  const isXSmall = sh < 680;

  /* Hero gets everything that the button section + safe area doesn't use */
  const heroH = Math.max(sh - topPad - bottomPad - BTN_SECTION_H, 160);
  /* Cap at ~65 % of viewport height so tall tablets don't over-inflate it */
  const heroHCapped = Math.min(heroH, Math.round(sh * 0.65));

  /* On very small screens, slightly widen the hero (clamp to screen width) */
  const heroW = Math.min(sw, 430);

  return (
    <View style={[styles.root, { paddingTop: topPad, paddingBottom: bottomPad }]}>

      {/* Ambient glows */}
      <LinearGradient
        colors={[
          "rgba(124,92,246,0.20)",
          "rgba(167,139,250,0.09)",
          "rgba(196,181,253,0.03)",
          "rgba(196,181,253,0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.glowTopLeft, isSmall && styles.glowSmall]}
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
        style={[styles.glowRight, isSmall && styles.glowSmall]}
        pointerEvents="none"
      />

      {/* ── Hero — explicit dimensions so expo-image renders predictably cross-platform ── */}
      <View style={{ width: heroW, height: heroHCapped, alignSelf: "center" }}>
        <Image
          source={HERO_IMAGE}
          style={{ width: "100%", height: "100%" }}
          contentFit="contain"
          accessible
          accessibilityLabel="Canyoldaşı - köpek ve kedi ile karşılama görseli"
        />
      </View>

      {/* ── Auth controls — pinned below hero, never pushed off-screen ── */}
      <View
        style={[
          styles.btnSection,
          isSmall  && styles.btnSectionSmall,
          isXSmall && styles.btnSectionXSmall,
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
  },

  glowTopLeft: {
    position: "absolute",
    top: -300,
    left: -300,
    width: 700,
    height: 700,
    zIndex: 0,
    pointerEvents: "none",
  },
  glowRight: {
    position: "absolute",
    top: -200,
    right: -300,
    width: 700,
    height: 700,
    zIndex: 0,
    pointerEvents: "none",
  },
  glowSmall: {
    width: 440,
    height: 440,
  },

  btnSection: {
    paddingHorizontal: 26,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 12,
    zIndex: 2,
  },
  btnSectionSmall: {
    paddingTop: 12,
    gap: 10,
  },
  btnSectionXSmall: {
    paddingTop: 6,
    gap: 8,
  },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    paddingVertical: 17,
    paddingHorizontal: 18,
    shadowColor: "#5A3BB2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
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
    paddingVertical: 17,
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
    marginTop: 2,
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
