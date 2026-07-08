import { Ionicons } from "@expo/vector-icons";
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

const PURPLE      = "#7B5CBF";
const PURPLE_DARK = "#3D2080";
const BG          = "#FAF7F2";

const HERO_IMAGE = require("@/assets/images/hero-logo-pets.png");

export default function WelcomeScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { width: sw } = useWindowDimensions();

  /* Image height: keep the original PNG aspect ratio (4265 × 4585) */
  const heroW = sw;
  const heroH = Math.round(sw * (4585 / 4265));
  /* Fade overlay covers the bottom 38% of the image */
  const fadeH = Math.round(heroH * 0.38);

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 20) }]}>

      {/* ── Soft top-left blob ─────────────────────────────────── */}
      <View
        style={[
          styles.blob,
          {
            top: -sw * 0.18,
            left: -sw * 0.22,
            width:  sw * 0.58,
            height: sw * 0.58,
          },
        ]}
      />

      {/* ── Hero image — full-bleed, flush to top ──────────────── */}
      <View style={[styles.heroWrap, { marginTop: insets.top }]}>
        <Image
          source={HERO_IMAGE}
          style={{ width: heroW, height: heroH }}
          contentFit="cover"
        />

        {/* Soft gradient fade at the bottom of the hero */}
        <LinearGradient
          colors={["transparent", BG]}
          style={[styles.heroFade, { height: fadeH }]}
          pointerEvents="none"
        />
      </View>

      {/* ── Buttons — float below the hero naturally ───────────── */}
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
            <View style={styles.btnIconWrap}>
              <Ionicons name="log-in-outline" size={21} color="#FFF" />
            </View>
            <Text style={styles.primaryBtnText}>Giriş Yap</Text>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.65)" />
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
          <View style={[styles.btnIconWrap, styles.btnIconWrapSecondary]}>
            <Ionicons name="person-add-outline" size={21} color={PURPLE} />
          </View>
          <Text style={styles.secondaryBtnText}>Kayıt Ol</Text>
          <Ionicons name="chevron-forward" size={18} color={PURPLE} />
        </Pressable>

        {/* Terms */}
        <View style={styles.termsRow}>
          <View style={styles.heartBadge}>
            <Ionicons name="heart" size={16} color={PURPLE} />
          </View>
          <Text style={styles.termsText}>
            Devam ederek{" "}
            <Text style={styles.termsLink}>Kullanım Koşulları</Text>
            {" "}ve{" "}
            <Text style={styles.termsLink}>Gizlilik Politikası</Text>
            {"'"}nı kabul etmiş olursunuz.
          </Text>
        </View>
      </View>

      {/* Bottom paw */}
      <Ionicons name="paw" size={22} color={PURPLE} style={styles.bottomPaw} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  /* Top-left ambient blob — very soft, no hard edge */
  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#C8B4F0",
    opacity: 0.13,
    zIndex: 0,
  },

  /* Hero */
  heroWrap: {
    width: "100%",
    overflow: "hidden",
    zIndex: 1,
  },
  heroFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },

  /* Buttons */
  btnSection: {
    paddingHorizontal: 26,
    gap: 13,
    marginTop: -8,
    zIndex: 2,
  },

  btnIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnIconWrapSecondary: {
    backgroundColor: `${PURPLE}14`,
  },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 18,
    gap: 13,
    shadowColor: "#5A3BB2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 10,
  },
  primaryBtnText: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    letterSpacing: 0.2,
  },

  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 18,
    gap: 13,
    borderWidth: 1.5,
    borderColor: `${PURPLE}20`,
    shadowColor: "#2D1B4E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 5,
  },
  secondaryBtnText: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#1A1A2E",
    letterSpacing: 0.2,
  },

  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 2,
    marginTop: 2,
  },
  heartBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: `${PURPLE}10`,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888",
    lineHeight: 20,
  },
  termsLink: {
    color: PURPLE,
    fontFamily: "Inter_600SemiBold",
  },

  bottomPaw: {
    alignSelf: "center",
    marginTop: 12,
    opacity: 0.4,
    zIndex: 1,
  },
});
