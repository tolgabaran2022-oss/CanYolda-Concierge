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

const PURPLE = "#7B5CBF";
const BG     = "#FAF7F2";

const HERO_IMAGE = require("@/assets/images/hero-logo-pets.png");

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: sw } = useWindowDimensions();

  // Hero: scale down ~10% to create breathing room,
  // then centre horizontally. Keeps logo slightly higher
  // so animals feel balanced within the frame.
  const heroScale = 0.90;
  const heroW = Math.round(sw * heroScale);
  const heroH = Math.round(heroW * (4585 / 4265));
  const heroX = Math.round((sw - heroW) / 2);
  // Pull hero slightly up (decrease top margin)
  const heroTop = Math.max(insets.top - 4, 0);
  // Gradient fade: 18% of hero height for subtle dissolve
  const fadeH = Math.round(heroH * 0.18);

  // Pull buttons up by ~50px with negative margin overlapping fade
  const btnOverlap = fadeH * 0.65 + 14;

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 16) }]}>

      {/* Ambient soft blob top-left */}
      <View
        style={[
          styles.blob,
          {
            top:    -sw * 0.18,
            left:   -sw * 0.22,
            width:   sw * 0.55,
            height:  sw * 0.55,
          },
        ]}
      />

      {/* Hero section */}
      <View
        style={[
          styles.heroWrap,
          {
            marginTop: heroTop,
            marginLeft: heroX,
            width: heroW,
            height: heroH,
          },
        ]}
      >
        <Image
          source={HERO_IMAGE}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
        />

        {/* Soft gradient fade at hero bottom to BG */}
        <LinearGradient
          colors={["transparent", BG]}
          style={[styles.heroFade, { height: fadeH }]}
          pointerEvents="none"
        />
      </View>

      {/* Buttons pulled up, wide margins, premium feel */}
      <View style={[styles.btnSection, { marginTop: -btnOverlap }]}>

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
            <View style={styles.iconWrap}>
              <Ionicons name="log-in-outline" size={21} color="#FFF" />
            </View>
            <Text style={styles.primaryBtnText}>Giriş Yap</Text>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.70)" />
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
          <View style={[styles.iconWrap, styles.iconWrapSecondary]}>
            <Ionicons name="person-add-outline" size={21} color={PURPLE} />
          </View>
          <Text style={styles.secondaryBtnText}>Kayıt Ol</Text>
          <Ionicons name="chevron-forward" size={22} color={PURPLE} />
        </Pressable>

        {/* Terms larger text, closer to buttons */}
        <View style={styles.termsRow}>
          <View style={styles.heartBadge}>
            <Ionicons name="heart" size={14} color={PURPLE} />
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

      {/* Bottom decorative paw small and subtle */}
      <Ionicons
        name="paw"
        size={18}
        color={PURPLE}
        style={styles.bottomPaw}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#C8B4F0",
    opacity: 0.10,
    zIndex: 0,
  },

  heroWrap: {
    overflow: "hidden",
    zIndex: 1,
  },
  heroFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },

  // Buttons — wider horizontal margins, tighter vertical
  btnSection: {
    paddingHorizontal: 36,
    gap: 13,
    zIndex: 2,
  },

  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapSecondary: {
    backgroundColor: `${PURPLE}12`,
  },

  // Giriş Yap
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    paddingVertical: 17,
    paddingHorizontal: 20,
    gap: 14,
    shadowColor: "#5A3BB2",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 12,
  },
  primaryBtnText: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    letterSpacing: 0.3,
  },

  // Kayıt Ol
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 17,
    paddingHorizontal: 20,
    gap: 14,
    borderWidth: 1.5,
    borderColor: `${PURPLE}30`,
    shadowColor: "#2D1B4E",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 6,
  },
  secondaryBtnText: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#1A1A2E",
    letterSpacing: 0.3,
  },

  // Terms — larger, more readable
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 2,
    marginTop: 8,
  },
  heartBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${PURPLE}10`,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#777",
    lineHeight: 22,
    paddingTop: 8,
  },
  termsLink: {
    color: PURPLE,
    fontFamily: "Inter_600SemiBold",
  },

  // Bottom paw accent
  bottomPaw: {
    alignSelf: "center",
    marginTop: "auto",
    marginBottom: 14,
    opacity: 0.35,
    zIndex: 1,
  },
});
