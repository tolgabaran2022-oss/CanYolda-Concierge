import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
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

const PURPLE       = "#7B5CBF";
const PURPLE_DARK  = "#4A2E8A";
const BLOB_PURPLE  = "#C8B4F0";
const BLOB_CREAM   = "#F0E4CE";
const BG           = "#FAF7F2";

const PET_IMAGE = require("@/assets/images/hero-pets.png");

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleSocial = () =>
    Alert.alert("Yakında", "Sosyal giriş yakında eklenecek.");

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>

      {/* ── Organic blobs ─────────────────────────────── */}
      {/* Left large purple blob */}
      <View style={styles.blobLeftMain} />
      <View style={styles.blobLeftTail} />
      {/* Top-right cream blob */}
      <View style={styles.blobTopRight} />
      {/* Bottom-right cream blob */}
      <View style={styles.blobBottomRight} />

      {/* ── Logo ──────────────────────────────────────── */}
      <View style={styles.logoSection}>
        <Ionicons name="heart" size={22} color={PURPLE} style={{ marginBottom: 4 }} />
        <Text style={styles.logoText}>canyoldaşı</Text>
        <Text style={styles.tagline}>
          Dostların için{"\n"}
          her şey <Text style={styles.taglinePurple}>bir tık uzağında</Text>
        </Text>
      </View>

      {/* ── Hero ──────────────────────────────────────── */}
      <View style={styles.heroOuter}>
        {/* Purple blob behind image */}
        <View style={styles.heroBlobBehind} />

        <Image
          source={PET_IMAGE}
          style={styles.heroImage}
          contentFit="cover"
        />

        {/* Paw badge – left */}
        <View style={styles.pawBadge}>
          <Ionicons name="paw" size={20} color="#FFF" />
        </View>

        {/* Decorative dots */}
        <View style={[styles.dot, { top: 12, right: 18, width: 18, height: 18, backgroundColor: "rgba(160,120,220,0.45)" }]} />
        <View style={[styles.dot, { top: 54, right: 6,  width: 10, height: 10, backgroundColor: "rgba(160,120,220,0.28)" }]} />
        <View style={[styles.dot, { bottom: 22, right: 12, width: 12, height: 12, backgroundColor: BLOB_CREAM }]} />
      </View>

      {/* ── Buttons ───────────────────────────────────── */}
      <View style={styles.btnSection}>
        {/* Giriş Yap – filled */}
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.88 : 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/login-form");
          }}
        >
          <Ionicons name="person-outline" size={20} color="#FFF" />
          <Text style={styles.primaryBtnText}>Giriş Yap</Text>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.75)" style={styles.arrow} />
        </Pressable>

        {/* Kayıt Ol – outlined */}
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.88 : 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/register");
          }}
        >
          <Ionicons name="person-add-outline" size={20} color={PURPLE_DARK} />
          <Text style={styles.secondaryBtnText}>Kayıt Ol</Text>
          <Ionicons name="chevron-forward" size={20} color={PURPLE} style={styles.arrow} />
        </Pressable>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social */}
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
        <View style={styles.privacyRow}>
          <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark-outline" size={14} color={PURPLE} />
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

  /* ── Blobs ─────────────────────────────────── */
  blobLeftMain: {
    position: "absolute",
    top: -100,
    left: -70,
    width: 230,
    height: 380,
    backgroundColor: BLOB_PURPLE,
    opacity: 0.55,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 200,
    borderBottomRightRadius: 160,
    borderBottomLeftRadius: 80,
  },
  blobLeftTail: {
    position: "absolute",
    top: 250,
    left: -50,
    width: 160,
    height: 220,
    backgroundColor: BLOB_PURPLE,
    opacity: 0.35,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 140,
    borderBottomRightRadius: 80,
    borderBottomLeftRadius: 30,
  },
  blobTopRight: {
    position: "absolute",
    top: -40,
    right: -50,
    width: 130,
    height: 130,
    backgroundColor: BLOB_CREAM,
    opacity: 0.7,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 40,
    borderBottomLeftRadius: 120,
  },
  blobBottomRight: {
    position: "absolute",
    bottom: 80,
    right: -60,
    width: 160,
    height: 160,
    backgroundColor: BLOB_CREAM,
    opacity: 0.5,
    borderTopLeftRadius: 140,
    borderTopRightRadius: 50,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 100,
  },

  /* ── Logo ──────────────────────────────────── */
  logoSection: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 4,
    zIndex: 1,
  },
  logoText: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 6,
  },
  taglinePurple: {
    color: PURPLE,
    fontFamily: "Inter_600SemiBold",
  },

  /* ── Hero ──────────────────────────────────── */
  heroOuter: {
    alignSelf: "center",
    width: 290,
    height: 205,
    marginTop: 18,
    marginBottom: 8,
    zIndex: 1,
  },
  heroBlobBehind: {
    position: "absolute",
    top: -14,
    left: -10,
    right: -10,
    bottom: -14,
    backgroundColor: BLOB_PURPLE,
    opacity: 0.38,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 160,
    borderBottomRightRadius: 130,
    borderBottomLeftRadius: 110,
  },
  heroImage: {
    width: 290,
    height: 205,
    borderRadius: 110,
  },
  pawBadge: {
    position: "absolute",
    left: -12,
    top: "38%",
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  dot: {
    position: "absolute",
    borderRadius: 50,
  },

  /* ── Buttons ───────────────────────────────── */
  btnSection: {
    paddingHorizontal: 28,
    gap: 12,
    zIndex: 1,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PURPLE,
    borderRadius: 32,
    paddingVertical: 16,
    paddingHorizontal: 22,
    gap: 10,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryBtnText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 32,
    paddingVertical: 15,
    paddingHorizontal: 22,
    gap: 10,
    borderWidth: 1.5,
    borderColor: "rgba(123,92,191,0.18)",
  },
  secondaryBtnText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: PURPLE_DARK,
  },
  arrow: { marginLeft: "auto" },

  /* Divider */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(123,92,191,0.13)",
  },
  dividerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#AAA",
  },

  /* Social */
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  socialBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  googleG: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#4285F4",
  },

  /* Privacy */
  privacyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 2,
  },
  shieldBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(123,92,191,0.10)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  privacyText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: "Inter_400Regular",
    color: "#999",
    lineHeight: 17,
  },
  privacyLink: {
    color: PURPLE,
    fontFamily: "Inter_600SemiBold",
  },

  /* Bottom paw */
  bottomPaw: {
    alignSelf: "center",
    marginTop: "auto",
    paddingTop: 6,
  },
});
