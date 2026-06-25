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

/* ── Design tokens ────────────────────────────── */
const C = {
  bg:          "#F8F7FF",
  brand:       "#6B4FBB",
  brandDark:   "#3D2580",
  brandLight:  "#9478D8",
  textPrimary: "#111827",
  textSoft:    "#6B7280",
  border:      "rgba(107,79,187,0.20)",
  white:       "#FFFFFF",
};

const HERO = require("@/assets/images/hero-logo-pets.png");

/* ── Component ────────────────────────────────── */
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const haptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const social = () => Alert.alert("Yakında", "Sosyal giriş yakında eklenecek.");

  return (
    <View
      style={[
        S.root,
        {
          paddingTop:    Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}
    >

      {/* ════════════════════════════════════════
          BLOCK 1 — BRAND HEADER
      ════════════════════════════════════════ */}
      <View style={S.brand}>
        <View style={S.brandMark}>
          <Ionicons name="paw" size={18} color={C.white} />
        </View>
        <Text style={S.brandName}>canyoldaşı</Text>
      </View>

      {/* ════════════════════════════════════════
          BLOCK 2 — HERO + COPY
      ════════════════════════════════════════ */}
      <View style={S.heroBlock}>
        <Image source={HERO} style={S.heroImage} contentFit="contain" />
        <Text style={S.h1}>Sokak dostları{"\n"}seninle güvende</Text>
        <Text style={S.sub}>
          Raporla, takip et ve toplulukla birlikte fark yarat.
        </Text>
      </View>

      {/* ════════════════════════════════════════
          BLOCK 3 — CTA ACTIONS
      ════════════════════════════════════════ */}
      <View style={S.actions}>

        {/* Primary — Giriş Yap */}
        <Pressable
          onPress={() => { haptic(); router.push("/(auth)/login-form"); }}
          style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
        >
          <LinearGradient
            colors={[C.brandLight, C.brand]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={S.btnPrimary}
          >
            <Text style={S.btnPrimaryText}>Giriş Yap</Text>
          </LinearGradient>
        </Pressable>

        {/* Secondary — Kayıt Ol */}
        <Pressable
          style={({ pressed }) => [S.btnSecondary, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => { haptic(); router.push("/(auth)/register"); }}
        >
          <Text style={S.btnSecondaryText}>Kayıt Ol</Text>
        </Pressable>

        {/* Divider */}
        <View style={S.divider}>
          <View style={S.dividerLine} />
          <Text style={S.dividerText}>Veya devam et</Text>
          <View style={S.dividerLine} />
        </View>

        {/* Social row */}
        <View style={S.socialRow}>
          {[
            { key: "google",   render: () => <Text style={S.googleG}>G</Text>          },
            { key: "apple",    render: () => <Ionicons name="logo-apple"    size={20} color="#111" /> },
            { key: "facebook", render: () => <Ionicons name="logo-facebook" size={20} color="#1877F2" /> },
          ].map(({ key, render }) => (
            <Pressable
              key={key}
              style={({ pressed }) => [S.socialBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={social}
            >
              {render()}
            </Pressable>
          ))}
        </View>

        {/* Privacy */}
        <Text style={S.privacy}>
          Devam ederek{" "}
          <Text style={S.privacyLink}>Kullanım Koşulları</Text>
          {" "}ve{" "}
          <Text style={S.privacyLink}>Gizlilik Politikası</Text>
          {"'"}nı kabul edersiniz.
        </Text>
      </View>
    </View>
  );
}

/* ── Styles ───────────────────────────────────── */
const S = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 24,
  },

  /* ── Block 1: Brand ── */
  brand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: C.brandDark,
    letterSpacing: -0.6,
  },

  /* ── Block 2: Hero ── */
  heroBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 8,
  },
  heroImage: {
    width: "70%",
    aspectRatio: 4265 / 4585,
  },
  h1: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: C.textPrimary,
    textAlign: "center",
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textSoft,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },

  /* ── Block 3: Actions ── */
  actions: {
    gap: 12,
  },

  btnPrimary: {
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 5,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.white,
    letterSpacing: 0.2,
  },

  btnSecondary: {
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  btnSecondaryText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: C.brandDark,
    letterSpacing: 0.2,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  dividerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textSoft,
  },

  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  googleG: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#4285F4",
    lineHeight: 22,
  },

  privacy: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(0,0,0,0.35)",
    textAlign: "center",
    lineHeight: 17,
    marginTop: 4,
  },
  privacyLink: {
    color: C.brand,
    fontFamily: "Inter_500Medium",
  },
});
