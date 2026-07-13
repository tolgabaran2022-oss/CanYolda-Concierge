/**
 * WelcomeScreen — CanYoldaşı giriş ekranı
 *
 * Mimari:
 *   View (flex:1, backgroundColor cream)
 *     ├── heroWrap  — height * 0.58, resizeMode cover + krem gradyan
 *     └── SafeAreaView (flex:1) — butonlar, link, yasal metin
 */
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
  useFonts,
} from "@expo-google-fonts/quicksand";
import React from "react";
import {
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

/* ── Renk paleti ───────────────────────────────────────────────────── */
const C = {
  cream:     "#FBF2EA",
  purple900: "#26215C",
  purple600: "#534AB7",
  purple500: "#6C5CE7",
  purple200: "#CECBF6",
  muted:     "#8B8798",
  white:     "#FFFFFF",
};

const HERO_IMAGE = require("@/assets/images/login-hero.jpg");

export default function WelcomeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cream} />

      {/* ── Hero görseli — kalan tüm alanı doldurur ─────────────── */}
      <View style={[styles.heroWrap, { marginTop: insets.top }]}>
        <Image
          source={HERO_IMAGE}
          style={styles.heroImage}
          resizeMode="cover"
          accessible
          accessibilityLabel="canyoldaşı — köpek ve kedi ile karşılama görseli"
        />
        {/* Görselden krem zemine yumuşak geçiş */}
        <LinearGradient
          colors={["rgba(251,242,234,0)", C.cream]}
          style={styles.heroFade}
          pointerEvents="none"
        />
      </View>

      {/* ── Buton alanı ──────────────────────────────────────────── */}
      <SafeAreaView edges={["bottom"]} style={styles.sheet}>
        {/* Giriş Yap */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/login-form");
          }}
          style={({ pressed }) => [pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Giriş Yap"
        >
          <LinearGradient
            colors={[C.purple500, C.purple600]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.btn, styles.btnPrimary]}
          >
            <Text style={styles.btnPrimaryText} maxFontSizeMultiplier={1.2}>
              Giriş yap
            </Text>
          </LinearGradient>
        </Pressable>

        {/* Kayıt Ol */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/register");
          }}
          style={({ pressed }) => [
            styles.btn,
            styles.btnSecondary,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Kayıt Ol"
        >
          <Text style={styles.btnSecondaryText} maxFontSizeMultiplier={1.2}>
            Kayıt ol
          </Text>
        </Pressable>

        {/* Şifremi Unuttum */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/forgot-password");
          }}
          accessibilityRole="link"
          hitSlop={8}
        >
          <Text style={styles.forgot} maxFontSizeMultiplier={1.2}>
            Şifremi unuttum?
          </Text>
        </Pressable>

        {/* Yasal metin */}
        <Text style={styles.terms}>
          Devam ederek{" "}
          <Text style={styles.termsLink}>Kullanım Koşulları</Text>
          {" "}ve{" "}
          <Text style={styles.termsLink}>Gizlilik Politikası</Text>
          {"'nı kabul etmiş olursunuz."}
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.cream,
  },

  /* Hero */
  heroWrap: {
    width: "100%",
    flex:  1,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroFade: {
    position: "absolute",
    left:     0,
    right:    0,
    bottom:   0,
    height:   96,
  },

  /* Sheet */
  sheet: {
    paddingHorizontal: 26,
    paddingTop:        8,
    paddingBottom:     12,
    gap:               14,
  },

  /* Buttons */
  btn: {
    height:          54,
    borderRadius:    27,
    alignItems:      "center",
    justifyContent:  "center",
  },
  btnPrimary: {
    shadowColor:   C.purple600,
    shadowOpacity: 0.35,
    shadowRadius:  12,
    shadowOffset:  { width: 0, height: 8 },
    elevation:     6,
  },
  btnPrimaryText: {
    color:          C.white,
    fontSize:       16.5,
    fontFamily:     "Quicksand_700Bold",
    letterSpacing:  0.2,
  },
  btnSecondary: {
    backgroundColor: C.white,
    borderWidth:     1.5,
    borderColor:     C.purple200,
    shadowColor:     C.purple900,
    shadowOpacity:   0.08,
    shadowRadius:    8,
    shadowOffset:    { width: 0, height: 4 },
    elevation:       2,
  },
  btnSecondaryText: {
    color:         C.purple900,
    fontSize:      16.5,
    fontFamily:    "Quicksand_700Bold",
    letterSpacing: 0.2,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },

  /* Links */
  forgot: {
    textAlign:  "center",
    fontSize:   14.5,
    color:      C.purple600,
    fontFamily: "Quicksand_600SemiBold",
    paddingVertical: 2,
  },
  terms: {
    textAlign:       "center",
    fontSize:        12.5,
    lineHeight:      20,
    color:           C.muted,
    fontFamily:      "Quicksand_500Medium",
    paddingHorizontal: 6,
  },
  termsLink: {
    color:      C.purple600,
    fontFamily: "Quicksand_700Bold",
  },
});
