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

const HERO_IMAGE = require("@/assets/images/hero-logo-pets.png");

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleSocial = () =>
    Alert.alert("Yakında", "Sosyal giriş yakında eklenecek.");

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>

      {/* Bottom decorative blobs (below the hero graphic) */}
      <View style={styles.blobBottomRight} />
      <View style={styles.blobBottomLeft} />

      {/* ── Hero graphic: logo + tagline + pets + blobs ── */}
      <Image
        source={HERO_IMAGE}
        style={styles.heroImage}
        contentFit="contain"
      />

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

  blobBottomRight: {
    position: "absolute",
    bottom: 70,
    right: -60,
    width: 160,
    height: 160,
    backgroundColor: BLOB_CREAM,
    opacity: 0.45,
    borderTopLeftRadius: 140,
    borderTopRightRadius: 50,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 100,
  },
  blobBottomLeft: {
    position: "absolute",
    bottom: -50,
    left: -55,
    width: 180,
    height: 180,
    backgroundColor: BLOB_PURPLE,
    opacity: 0.5,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 140,
    borderBottomRightRadius: 60,
    borderBottomLeftRadius: 40,
  },

  /* ── Hero graphic ──────────────────────────── */
  heroImage: {
    width: "100%",
    aspectRatio: 0.9,
    marginTop: 4,
    zIndex: 1,
  },

  /* ── Buttons ───────────────────────────────── */
  btnSection: {
    paddingHorizontal: 28,
    gap: 12,
    marginTop: 4,
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
