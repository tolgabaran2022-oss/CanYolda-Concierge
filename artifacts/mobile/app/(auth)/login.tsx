import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
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
import { LinearGradient } from "expo-linear-gradient";

const PURPLE = "#7B5CBF";
const BG     = "#FAF7F2";

const HERO_IMAGE = require("@/assets/images/hero-logo-pets.png");

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: sw } = useWindowDimensions();

  /* PNG native: 4265 × 4585 — cap at 430 for web container */
  const heroW = Math.min(sw, 430);
  const heroH = Math.round(heroW * (4585 / 4265));

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 20) }]}>

      {/* ── Hero — full-bleed, flush under status bar ──────────── */}
      <View style={[styles.heroWrap, { marginTop: insets.top, width: heroW, height: heroH }]}>
        <Image
          source={HERO_IMAGE}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
        />
      </View>

      {/* ── Buttons — natural spacing below hero ───────────────── */}
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
            <View style={styles.iconWrap}>
              <Ionicons name="log-in-outline" size={21} color="#FFF" />
            </View>
            <Text style={styles.primaryBtnText}>Giriş Yap</Text>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.70)" />
          </LinearGradient>
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
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: PURPLE }}>
            Şifremi Unuttum?
          </Text>
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

        {/* Terms */}
        <View style={styles.termsRow}>
          <View style={styles.heartBadge}>
            <Ionicons name="heart" size={15} color={PURPLE} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  heroWrap: {
    overflow: "hidden",
  },

  /* Buttons */
  btnSection: {
    flex: 1,
    paddingHorizontal: 26,
    gap: 12,
    justifyContent: "center",
    paddingBottom: 8,
  },

  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapSecondary: {
    backgroundColor: `${PURPLE}14`,
  },

  /* Giriş Yap */
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 13,
    shadowColor: "#5A3BB2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30,
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

  /* Kayıt Ol */
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 13,
    borderWidth: 1.5,
    borderColor: `${PURPLE}35`,
    shadowColor: "#2D1B4E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
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

  /* Terms */
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 2,
    marginTop: 4,
  },
  heartBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: `${PURPLE}10`,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888",
    lineHeight: 20,
    paddingTop: 7,
  },
  termsLink: {
    color: PURPLE,
    fontFamily: "Inter_600SemiBold",
  },
});
