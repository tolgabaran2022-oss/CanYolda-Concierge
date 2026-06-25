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

const PURPLE      = "#7B5CBF";
const PURPLE_DARK = "#3D2080";
const BG          = "#FAF7F2";

const HERO_IMAGE = require("@/assets/images/hero-logo-pets.png");

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleSocial = () =>
    Alert.alert("Yakında", "Sosyal giriş yakında eklenecek.");

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 4, paddingBottom: Math.max(insets.bottom, 20) },
      ]}
    >
      {/* Decorative blobs — corners only, low opacity */}
      <View style={styles.blobTR} />
      <View style={styles.blobBL} />

      {/* ── Logo row ─────────────────────────────── */}
      <View style={styles.logoRow}>
        <Ionicons name="paw" size={20} color={PURPLE} />
        <Text style={styles.logoText}>canyoldaşı</Text>
      </View>

      {/* ── Hero image — 20% smaller ─────────────── */}
      <Image
        source={HERO_IMAGE}
        style={styles.heroImage}
        contentFit="contain"
      />

      {/* ── Tagline ──────────────────────────────── */}
      <Text style={styles.tagline}>
        Sokak hayvanları için{"\n"}topluluk platformu
      </Text>

      {/* ── Buttons ──────────────────────────────── */}
      <View style={styles.btnSection}>

        {/* Giriş Yap */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/login-form");
          }}
          style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
        >
          <LinearGradient
            colors={["#9478D8", "#5A3BB2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Giriş Yap</Text>
          </LinearGradient>
        </Pressable>

        {/* Kayıt Ol */}
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.88 : 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/register");
          }}
        >
          <Text style={styles.secondaryBtnText}>Kayıt Ol</Text>
        </Pressable>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social icons */}
        <View style={styles.socialRow}>
          <Pressable style={styles.socialBtn} onPress={handleSocial}>
            <Text style={styles.googleG}>G</Text>
          </Pressable>
          <Pressable style={styles.socialBtn} onPress={handleSocial}>
            <Ionicons name="logo-apple" size={22} color="#111" />
          </Pressable>
          <Pressable style={styles.socialBtn} onPress={handleSocial}>
            <Ionicons name="logo-facebook" size={22} color="#1877F2" />
          </Pressable>
        </View>

        {/* Privacy */}
        <Text style={styles.privacyText}>
          Devam ederek{" "}
          <Text style={styles.privacyLink}>Kullanım Koşulları</Text>
          {" "}ve{" "}
          <Text style={styles.privacyLink}>Gizlilik Politikası</Text>
          {"'"}nı kabul etmiş olursunuz.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
  },

  /* Blobs — corners only, very subtle */
  blobTR: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    backgroundColor: "#C8B4F0",
    opacity: 0.18,
    borderRadius: 70,
  },
  blobBL: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 160,
    height: 160,
    backgroundColor: "#F0E4CE",
    opacity: 0.22,
    borderRadius: 80,
  },

  /* Logo */
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 4,
  },
  logoText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
    letterSpacing: -0.4,
  },

  /* Hero — ~78% of screen width */
  heroImage: {
    width: "78%",
    aspectRatio: 4265 / 4585,
    zIndex: 1,
  },

  /* Tagline */
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#8874A8",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 2,
    marginBottom: 4,
  },

  /* Buttons section */
  btnSection: {
    width: "100%",
    paddingHorizontal: 24,
    gap: 11,
    zIndex: 1,
    marginTop: "auto",
  },

  /* Primary button */
  primaryBtn: {
    borderRadius: 50,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: "#5A3BB2",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    letterSpacing: 0.1,
  },

  /* Secondary button */
  secondaryBtn: {
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "rgba(123,92,191,0.28)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
    letterSpacing: 0.1,
  },

  /* Divider */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  dividerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(0,0,0,0.3)",
  },

  /* Social */
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  googleG: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#4285F4",
    lineHeight: 24,
  },

  /* Privacy */
  privacyText: {
    fontSize: 11.5,
    fontFamily: "Inter_400Regular",
    color: "rgba(0,0,0,0.38)",
    textAlign: "center",
    lineHeight: 17,
  },
  privacyLink: {
    color: PURPLE,
    fontFamily: "Inter_600SemiBold",
  },
});
