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

const PURPLE      = "#7B5EA7";
const PURPLE_DARK = "#3D2080";
const BG          = "#EEE8FF";

const HERO_IMAGE = require("@/assets/images/hero-logo-pets.png");

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const press = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const handleSocial = () => Alert.alert("Yakında", "Sosyal giriş yakında eklenecek.");

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 20) },
      ]}
    >
      {/* ── Logo ─────────────────────────────────── */}
      <View style={styles.logoBlock}>
        <Ionicons name="paw" size={28} color={PURPLE} />
        <Text style={styles.logoText}>canyoldaşı</Text>
        <Text style={styles.tagline}>
          Dostların için{"\n"}
          <Text style={styles.taglineBold}>her şey bir tık uzağında</Text>
        </Text>
      </View>

      {/* ── Hero ─────────────────────────────────── */}
      <View style={styles.heroWrap}>
        {/* Soft blob behind image */}
        <View style={styles.heroBlob} />

        {/* Floating decorative elements */}
        <View style={styles.decoPawCircle}>
          <Ionicons name="paw" size={16} color={PURPLE} />
        </View>
        <View style={styles.decoHeart}>
          <Ionicons name="heart" size={18} color="#A78BFA" />
        </View>
        <View style={[styles.decoDot, { width: 10, height: 10, bottom: 24, right: 28 }]} />
        <View style={[styles.decoDot, { width: 7, height: 7, bottom: 14, right: 48, opacity: 0.5 }]} />
        <View style={[styles.decoDot, { width: 6, height: 6, top: 36, left: 36, opacity: 0.35 }]} />

        <Image
          source={HERO_IMAGE}
          style={styles.heroImage}
          contentFit="contain"
        />
      </View>

      {/* ── Sub-tagline ───────────────────────────── */}
      <View style={styles.subTaglineRow}>
        <Text style={styles.subTagline}>Sokak hayvanları için</Text>
        <Text style={styles.subTaglineAccent}>topluluk platformu</Text>
      </View>

      {/* ── Buttons ──────────────────────────────── */}
      <View style={styles.btnSection}>
        {/* Giriş Yap */}
        <Pressable
          onPress={() => { press(); router.push("/(auth)/login-form"); }}
          style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
        >
          <LinearGradient
            colors={["#9478D8", PURPLE]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBtn}
          >
            <Ionicons name="person-outline" size={20} color="#FFF" />
            <Text style={styles.primaryBtnText}>Giriş Yap</Text>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.65)" />
          </LinearGradient>
        </Pressable>

        {/* Kayıt Ol */}
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => { press(); router.push("/(auth)/register"); }}
        >
          <Ionicons name="person-add-outline" size={20} color={PURPLE_DARK} />
          <Text style={styles.secondaryBtnText}>Kayıt Ol</Text>
          <Ionicons name="chevron-forward" size={18} color="rgba(61,32,128,0.4)" />
        </Pressable>
      </View>

      {/* ── Divider ───────────────────────────────── */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>veya</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* ── Social ────────────────────────────────── */}
      <View style={styles.socialRow}>
        <Pressable style={({ pressed }) => [styles.socialBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={handleSocial}>
          <Text style={styles.googleG}>G</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.socialBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={handleSocial}>
          <Ionicons name="logo-apple" size={22} color="#1A1A1A" />
        </Pressable>
        <Pressable style={({ pressed }) => [styles.socialBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={handleSocial}>
          <Ionicons name="logo-facebook" size={22} color="#1877F2" />
        </Pressable>
      </View>

      {/* ── Privacy ───────────────────────────────── */}
      <View style={styles.privacyRow}>
        <View style={styles.shieldCircle}>
          <Ionicons name="shield-checkmark-outline" size={16} color={PURPLE} />
        </View>
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
    paddingHorizontal: 24,
  },

  /* Logo block */
  logoBlock: {
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
    letterSpacing: -1,
    marginTop: 2,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#5C4A80",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 4,
  },
  taglineBold: {
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
  },

  /* Hero */
  heroWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    height: 220,
  },
  heroBlob: {
    position: "absolute",
    width: 260,
    height: 200,
    borderRadius: 130,
    backgroundColor: "rgba(255,255,255,0.55)",
    transform: [{ scaleX: 1.2 }],
  },
  heroImage: {
    width: "82%",
    aspectRatio: 4265 / 4585,
    zIndex: 1,
  },
  decoPawCircle: {
    position: "absolute",
    top: 16,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  decoHeart: {
    position: "absolute",
    top: 8,
    right: 16,
    zIndex: 2,
  },
  decoDot: {
    position: "absolute",
    borderRadius: 10,
    backgroundColor: PURPLE,
    opacity: 0.45,
    zIndex: 2,
  },

  /* Sub-tagline */
  subTaglineRow: {
    alignItems: "center",
    marginBottom: 16,
  },
  subTagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#6B5490",
  },
  subTaglineAccent: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: PURPLE,
    textDecorationLine: "underline",
  },

  /* Buttons */
  btnSection: {
    width: "100%",
    gap: 12,
    marginBottom: 16,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 22,
    gap: 12,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryBtnText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 50,
    paddingVertical: 15,
    paddingHorizontal: 22,
    gap: 12,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "rgba(123,94,167,0.22)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  secondaryBtnText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: PURPLE_DARK,
  },

  /* Divider */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    marginBottom: 16,
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
    gap: 20,
    marginBottom: 20,
  },
  socialBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  googleG: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#4285F4",
    lineHeight: 24,
  },

  /* Privacy */
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
    marginTop: "auto",
  },
  shieldCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(123,94,167,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#6B5490",
    lineHeight: 18,
  },
  privacyLink: {
    color: PURPLE,
    fontFamily: "Inter_600SemiBold",
  },
});
