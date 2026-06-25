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
const PURPLE_DEEP = "#5B3E9B";
const BLOB        = "#C8B4E8";
const BG          = "#FAF8F3";

const HERO = require("@/assets/images/hero-logo-pets.png");

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const press  = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const social = () => Alert.alert("Yakında", "Sosyal giriş yakında eklenecek.");

  return (
    <View style={[S.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom + 8, 28) }]}>

      {/* ── Dekoratif blob'lar ─────────────────────
          Sol üst: büyük oval
          Sağ üst: küçük oval
      ─────────────────────────────────────────── */}
      <View style={S.blobTopLeft} />
      <View style={S.blobTopRight} />
      <View style={S.blobRightMid} />

      {/* ── LOGO ────────────────────────────────── */}
      <View style={S.logoSection}>
        <Ionicons name="heart" size={16} color={PURPLE} style={{ marginBottom: 2 }} />
        <Text style={S.logoText}>canyoldaşı</Text>
        <View style={S.taglineWrap}>
          <Text style={S.taglineNormal}>Dostların için</Text>
          <Text style={S.taglineNormal}>
            her şey <Text style={S.taglineBold}>bir tık uzağında</Text>
          </Text>
        </View>
      </View>

      {/* ── HERO ────────────────────────────────── */}
      <View style={S.heroSection}>
        {/* Sol paw dairesi */}
        <View style={S.pawCircle}>
          <Ionicons name="paw" size={22} color="#FFF" />
        </View>

        {/* Sağ mor noktalar */}
        <View style={[S.dot, { top: 12, right: 32, width: 14, height: 14 }]} />
        <View style={[S.dot, { top: 36, right: 18, width: 10, height: 10, opacity: 0.55 }]} />
        <View style={[S.dot, { top: 56, right: 38, width: 7,  height: 7,  opacity: 0.35 }]} />

        <Image source={HERO} style={S.heroImage} contentFit="contain" />
      </View>

      {/* ── CTA ─────────────────────────────────── */}
      <View style={S.ctaSection}>

        {/* Giriş Yap */}
        <Pressable
          onPress={() => { press(); router.push("/(auth)/login-form"); }}
          style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
        >
          <LinearGradient
            colors={["#9070CC", PURPLE_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={S.btnPrimary}
          >
            <Ionicons name="person-outline" size={19} color="rgba(255,255,255,0.85)" />
            <Text style={S.btnPrimaryText}>Giriş Yap</Text>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.55)" />
          </LinearGradient>
        </Pressable>

        {/* Kayıt Ol */}
        <Pressable
          style={({ pressed }) => [S.btnSecondary, { opacity: pressed ? 0.82 : 1 }]}
          onPress={() => { press(); router.push("/(auth)/register"); }}
        >
          <Ionicons name="person-add-outline" size={19} color={PURPLE_DEEP} />
          <Text style={S.btnSecondaryText}>Kayıt Ol</Text>
          <Ionicons name="chevron-forward" size={18} color="rgba(91,62,155,0.4)" />
        </Pressable>

        {/* veya */}
        <Text style={S.veya}>veya</Text>

        {/* Sosyal */}
        <View style={S.socialRow}>
          {([
            { key: "g", node: <Text style={S.gText}>G</Text> },
            { key: "a", node: <Ionicons name="logo-apple"    size={22} color="#111" /> },
            { key: "f", node: <Ionicons name="logo-facebook" size={22} color="#1877F2" /> },
          ] as const).map(({ key, node }) => (
            <Pressable
              key={key}
              style={({ pressed }) => [S.socialBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={social}
            >
              {node}
            </Pressable>
          ))}
        </View>

        {/* Privacy */}
        <View style={S.privacyRow}>
          <View style={S.shieldWrap}>
            <Ionicons name="shield-checkmark-outline" size={15} color={PURPLE} />
          </View>
          <Text style={S.privacyText}>
            Devam ederek{" "}
            <Text style={S.privacyBold}>Kullanım Koşulları</Text>
            {" "}ve{" "}
            <Text style={S.privacyBold}>Gizlilik Politikası</Text>
            {"'"}nı kabul etmiş olursunuz.
          </Text>
        </View>
      </View>

      {/* ── Alt paw ─────────────────────────────── */}
      <Ionicons name="paw" size={20} color={PURPLE} style={{ marginTop: 12, opacity: 0.45 }} />
    </View>
  );
}

const S = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    paddingHorizontal: 24,
    overflow: "hidden",
  },

  /* Blob'lar */
  blobTopLeft: {
    position: "absolute",
    top: -100,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: BLOB,
    opacity: 0.38,
    transform: [{ scaleX: 1.25 }, { scaleY: 0.85 }],
  },
  blobTopRight: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: BLOB,
    opacity: 0.28,
  },
  blobRightMid: {
    position: "absolute",
    top: 200,
    right: -48,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: BLOB,
    opacity: 0.22,
  },

  /* Logo */
  logoSection: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 12,
    zIndex: 2,
  },
  logoText: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DEEP,
    letterSpacing: -1,
    marginBottom: 6,
  },
  taglineWrap: {
    alignItems: "center",
    gap: 1,
  },
  taglineNormal: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#555",
    textAlign: "center",
    lineHeight: 21,
  },
  taglineBold: {
    fontFamily: "Inter_700Bold",
    color: PURPLE_DEEP,
  },

  /* Hero */
  heroSection: {
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    maxHeight: 240,
    zIndex: 2,
    marginBottom: 4,
  },
  pawCircle: {
    position: "absolute",
    left: 4,
    top: "30%",
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  dot: {
    position: "absolute",
    borderRadius: 10,
    backgroundColor: PURPLE,
    opacity: 0.7,
    zIndex: 3,
  },
  heroImage: {
    width: "80%",
    aspectRatio: 4265 / 4585,
    zIndex: 2,
  },

  /* CTA */
  ctaSection: {
    width: "100%",
    gap: 12,
    zIndex: 2,
  },

  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 22,
    gap: 10,
    shadowColor: PURPLE_DEEP,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 5,
  },
  btnPrimaryText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },

  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 50,
    paddingVertical: 15,
    paddingHorizontal: 22,
    gap: 10,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "rgba(123,94,167,0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  btnSecondaryText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: PURPLE_DEEP,
  },

  veya: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(0,0,0,0.35)",
    marginVertical: -2,
  },

  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  gText: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    color: "#4285F4",
    lineHeight: 22,
  },

  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  shieldWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(123,94,167,0.10)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  privacyText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: "Inter_400Regular",
    color: "rgba(0,0,0,0.45)",
    lineHeight: 17,
  },
  privacyBold: {
    fontFamily: "Inter_700Bold",
    color: PURPLE,
  },
});
