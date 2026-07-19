/**
 * WelcomeScreen — CanYoldaşı giriş ekranı
 *
 * Tasarım: Figma — lavanta arkaplan, organik blob + pati dekorasyonu (sağ alt),
 *          "bir tık uzağında" bold mor, hero görseli fade-in.
 */
import { Icon } from "@/components/Icon";
import { useLanguage } from "@/contexts/LanguageContext";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
  useFonts,
} from "@expo-google-fonts/quicksand";
import React, { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { LangCode } from "@/i18n";

/* ── Renk paleti ───────────────────────────────────────────────────── */
const C = {
  lavender:  "#EDE8FF",
  purple900: "#26215C",
  purple600: "#534AB7",
  purple500: "#6C5CE7",
  purple300: "#A78BFA",
  purple200: "#CECBF6",
  purple100: "#EAE7FB",
  muted:     "#8B8798",
  white:     "#FFFFFF",
};

const BG_RGBA0 = "rgba(237,232,255,0)";
const BG_SOLID = C.lavender;

const HERO_IMAGE = require("@/assets/images/login-hero.jpg");

/* ── Language Selector Modal ──────────────────────────────────────── */
function LanguageModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { currentLanguage, supportedLanguages, changeLanguage } = useLanguage();

  const handleSelect = async (code: LangCode) => {
    await changeLanguage(code);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={LS.overlay} onPress={onClose}>
        <View style={LS.sheet}>
          <Text style={LS.title}>{t("language.select")}</Text>
          {supportedLanguages.map((lang) => {
            const selected = currentLanguage === lang.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => handleSelect(lang.code)}
                style={({ pressed }) => [
                  LS.option,
                  selected && LS.optionSelected,
                  pressed && { opacity: 0.75 },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={lang.nativeLabel}
              >
                <Text style={[LS.optionLabel, selected && LS.optionLabelSelected]}>
                  {lang.nativeLabel}
                </Text>
                {selected && (
                  <Icon name="checkmark" size={18} color={C.purple500} />
                )}
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

export default function WelcomeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { t }   = useTranslation();
  const { currentLanguage, supportedLanguages } = useLanguage();
  const [langModalVisible, setLangModalVisible] = useState(false);

  const [fontsLoaded] = useFonts({
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  if (!fontsLoaded) return null;

  const currentLangMeta = supportedLanguages.find((l) => l.code === currentLanguage)
    ?? supportedLanguages[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BG_SOLID} />

      {/* ── Dil seçici (sağ üst) ──────────────────────────────────── */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setLangModalVisible(true);
        }}
        style={[styles.langPill, { top: insets.top + 10 }]}
        accessibilityRole="button"
        accessibilityLabel={t("language.select")}
        hitSlop={8}
      >
        <Icon name="globe" size={14} color={C.purple600} />
        <Text style={styles.langPillText}>{currentLangMeta.shortLabel}</Text>
        <Icon name="chevron-down" size={12} color={C.purple600} />
      </Pressable>

      {/* ── Sağ alt dekoratif blob + pati ─────────────────────────── */}
      <View style={styles.decoBlob} pointerEvents="none">
        <Icon name="paw" size={52} color="rgba(255,255,255,0.75)" />
      </View>
      <View style={styles.decoCircleSm} pointerEvents="none" />
      <View style={styles.decoCircleTiny} pointerEvents="none" />

      {/* ── Hero görseli ───────────────────────────────────────────── */}
      <View style={[styles.heroWrap, { marginTop: insets.top }]}>
        <Image
          source={HERO_IMAGE}
          style={styles.heroImage}
          resizeMode="cover"
          accessible
          accessibilityLabel={t("auth.welcome.heroAlt")}
        />
        <LinearGradient
          colors={[BG_SOLID, BG_RGBA0]}
          style={styles.heroTopFade}
          pointerEvents="none"
        />
        <LinearGradient
          colors={[BG_RGBA0, BG_SOLID]}
          style={styles.heroFade}
          pointerEvents="none"
        />
      </View>

      {/* ── Buton alanı ──────────────────────────────────────────────── */}
      <SafeAreaView edges={["bottom"]} style={styles.sheet}>
        {/* Giriş Yap */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/login-form");
          }}
          style={({ pressed }) => [pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("auth.welcome.login")}
        >
          <LinearGradient
            colors={[C.purple500, C.purple600]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.btn, styles.btnPrimary]}
          >
            <Text style={styles.btnPrimaryText} maxFontSizeMultiplier={1.2}>
              {t("auth.welcome.login")}
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
          accessibilityLabel={t("auth.welcome.register")}
        >
          <Text style={styles.btnSecondaryText} maxFontSizeMultiplier={1.2}>
            {t("auth.welcome.register")}
          </Text>
        </Pressable>

        {/* Şifremi Unuttum? */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/forgot-password");
          }}
          accessibilityRole="link"
          hitSlop={8}
        >
          <Text style={styles.forgot} maxFontSizeMultiplier={1.2}>
            {t("auth.login.forgotPassword")}
          </Text>
        </Pressable>

        {/* Yasal metin */}
        <Text style={styles.terms}>
          {t("auth.register.termsPart1")}
          <Text
            style={styles.termsLink}
            onPress={() => router.push("/terms-of-service" as any)}
            accessibilityRole="link"
          >{t("account.termsOfService")}</Text>
          {t("auth.register.termsAnd")}
          <Text
            style={styles.termsLink}
            onPress={() => router.push("/privacy-policy" as any)}
            accessibilityRole="link"
          >{t("account.privacyPolicy")}</Text>
          {t("auth.register.termsPart2")}
        </Text>
      </SafeAreaView>

      {/* ── Dil seçimi modal ─────────────────────────────────────────── */}
      <LanguageModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.lavender,
  },

  /* ── Dil pill ─── */
  langPill: {
    position:        "absolute",
    right:           16,
    zIndex:          10,
    flexDirection:   "row",
    alignItems:      "center",
    gap:             4,
    backgroundColor: C.white,
    borderWidth:     1,
    borderColor:     C.purple200,
    borderRadius:    20,
    paddingHorizontal: 10,
    paddingVertical:   6,
    minHeight:       36,
    shadowColor:     C.purple600,
    shadowOpacity:   0.12,
    shadowRadius:    8,
    shadowOffset:    { width: 0, height: 2 },
    elevation:       3,
  },
  langPillText: {
    fontSize:   13,
    fontFamily: "Quicksand_700Bold",
    color:      C.purple600,
    letterSpacing: 0.5,
  },

  /* ── Dekoratif blob (sağ alt) ─── */
  decoBlob: {
    position:             "absolute",
    bottom:               -32,
    right:                -32,
    width:                168,
    height:               168,
    borderTopLeftRadius:  100,
    borderTopRightRadius: 60,
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 50,
    backgroundColor:      C.purple300,
    opacity:              0.55,
    alignItems:           "center",
    justifyContent:       "center",
    zIndex:               0,
  },
  decoCircleSm: {
    position:        "absolute",
    bottom:          112,
    right:           -10,
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: C.purple200,
    opacity:         0.7,
    zIndex:          0,
  },
  decoCircleTiny: {
    position:        "absolute",
    bottom:          168,
    right:           28,
    width:           18,
    height:          18,
    borderRadius:    9,
    backgroundColor: C.purple300,
    opacity:         0.45,
    zIndex:          0,
  },

  /* ── Hero ─── */
  heroWrap: {
    width:  "100%",
    flex:   1,
    zIndex: 1,
  },
  heroImage: {
    width:  "100%",
    height: "100%",
  },
  heroTopFade: {
    position: "absolute",
    left:     0,
    right:    0,
    top:      0,
    height:   90,
  },
  heroFade: {
    position: "absolute",
    left:     0,
    right:    0,
    bottom:   0,
    height:   110,
  },

  /* ── Sheet ─── */
  sheet: {
    paddingHorizontal: 26,
    paddingTop:        8,
    paddingBottom:     12,
    gap:               14,
    zIndex:            1,
  },

  /* ── Buttons ─── */
  btn: {
    height:         54,
    borderRadius:   27,
    alignItems:     "center",
    justifyContent: "center",
  },
  btnPrimary: {
    shadowColor:   C.purple600,
    shadowOpacity: 0.38,
    shadowRadius:  14,
    shadowOffset:  { width: 0, height: 8 },
    elevation:     7,
  },
  btnPrimaryText: {
    color:         C.white,
    fontSize:      16.5,
    fontFamily:    "Quicksand_700Bold",
    letterSpacing: 0.2,
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

  /* ── Links ─── */
  forgot: {
    textAlign:       "center",
    fontSize:        14.5,
    color:           C.purple600,
    fontFamily:      "Quicksand_600SemiBold",
    paddingVertical: 2,
  },
  terms: {
    textAlign:         "center",
    fontSize:          12.5,
    lineHeight:        20,
    color:             C.muted,
    fontFamily:        "Quicksand_500Medium",
    paddingHorizontal: 6,
  },
  termsLink: {
    color:      C.purple600,
    fontFamily: "Quicksand_700Bold",
  },
});

/* ── Language Modal Styles ──────────────────────────────────────────── */
const LS = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent:  "center",
    alignItems:      "center",
    padding:         24,
  },
  sheet: {
    backgroundColor: C.white,
    borderRadius:    20,
    padding:         20,
    width:           "100%",
    maxWidth:        320,
    gap:             8,
    shadowColor:     "#000",
    shadowOpacity:   0.15,
    shadowRadius:    20,
    shadowOffset:    { width: 0, height: 8 },
    elevation:       12,
  },
  title: {
    fontSize:     17,
    fontFamily:   "Quicksand_700Bold",
    color:        C.purple900,
    marginBottom: 4,
    textAlign:    "center",
  },
  option: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingVertical:   14,
    paddingHorizontal: 16,
    borderRadius:   12,
    backgroundColor: "transparent",
  },
  optionSelected: {
    backgroundColor: C.purple100,
  },
  optionLabel: {
    fontSize:   16,
    fontFamily: "Quicksand_600SemiBold",
    color:      C.purple900,
  },
  optionLabelSelected: {
    color:      C.purple500,
    fontFamily: "Quicksand_700Bold",
  },
});
