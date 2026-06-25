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

const PURPLE       = "#7B5CBF";
const PURPLE_DARK  = "#3D2080";
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

      {/* Decorative blobs */}
      <View style={styles.blobBottomRight} />
      <View style={styles.blobBottomLeft} />

      {/* Hero graphic */}
      <Image
        source={HERO_IMAGE}
        style={styles.heroImage}
        contentFit="contain"
      />

      {/* ── Buttons ─────────────────────────────── */}
      <View style={styles.btnSection}>

        {/* Giriş Yap – gradient */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/login-form");
          }}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        >
          <LinearGradient
            colors={["#9478D8", "#5A3BB2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBtn}
          >
            <Ionicons name="person-outline" size={22} color="#FFF" />
            <Text style={styles.primaryBtnText}>Giriş Yap</Text>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </Pressable>

        {/* Kayıt Ol – white card */}
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.9 : 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/register");
          }}
        >
          <Ionicons name="person-add-outline" size={22} color="#1A1A2E" />
          <Text style={styles.secondaryBtnText}>Kayıt Ol</Text>
          <Ionicons name="chevron-forward" size={22} color="#333" />
        </Pressable>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social */}
        <View style={styles.socialRow}>
          {/* Google */}
          <Pressable style={styles.socialBtn} onPress={handleSocial}>
            <View style={styles.googleGWrap}>
              <Text style={[styles.googleSegment, { color: "#4285F4" }]}>G</Text>
            </View>
          </Pressable>
          {/* Apple */}
          <Pressable style={styles.socialBtn} onPress={handleSocial}>
            <Ionicons name="logo-apple" size={28} color="#111" />
          </Pressable>
          {/* Facebook */}
          <Pressable style={styles.socialBtn} onPress={handleSocial}>
            <Ionicons name="logo-facebook" size={30} color="#1877F2" />
          </Pressable>
        </View>

        {/* Privacy */}
        <View style={styles.privacyRow}>
          <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark-outline" size={18} color={PURPLE} />
          </View>
          <Text style={styles.privacyText}>
            Devam ederek{" "}
            <Text style={styles.privacyLink}>Kullanım Koşulları</Text>
            {" "}ve{"\n"}
            <Text style={styles.privacyLink}>Gizlilik Politikası</Text>
            {"'"}nı kabul etmiş olursunuz.
          </Text>
        </View>
      </View>

      {/* Bottom paw */}
      <Ionicons name="paw" size={26} color={PURPLE} style={styles.bottomPaw} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  /* Blobs */
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
    width: 200,
    height: 200,
    backgroundColor: BLOB_PURPLE,
    opacity: 0.5,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 160,
    borderBottomRightRadius: 60,
    borderBottomLeftRadius: 40,
  },

  /* Hero */
  heroImage: {
    width: "100%",
    aspectRatio: 4265 / 4585,
    marginTop: 4,
    zIndex: 1,
  },

  /* Button section */
  btnSection: {
    paddingHorizontal: 24,
    gap: 13,
    marginTop: 0,
    zIndex: 1,
  },

  /* Giriş Yap */
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 36,
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
    shadowColor: "#5A3BB2",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryBtnText: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },

  /* Kayıt Ol */
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 36,
    paddingVertical: 17,
    paddingHorizontal: 24,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  secondaryBtnText: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#1A1A2E",
  },

  /* Divider */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  dividerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#B0B0B0",
  },

  /* Social */
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  socialBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  },
  googleGWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  googleSegment: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    lineHeight: 30,
  },

  /* Privacy */
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 2,
  },
  shieldBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(123,92,191,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888",
    lineHeight: 19,
  },
  privacyLink: {
    color: PURPLE,
    fontFamily: "Inter_700Bold",
  },

  /* Bottom paw */
  bottomPaw: {
    alignSelf: "center",
    marginTop: "auto",
    paddingTop: 8,
  },
});
