/**
 * ForgotPasswordScreen — canyoldaşı şifre sıfırlama ekranı
 *
 * Tasarım notları:
 *  - Karşılama ekranıyla aynı dil: krem zemin, organik mor blob'lar, pati motifi
 *  - Gri daire yerine gradyanlı organik blob içinde pati ikonu (marka imzası)
 *  - Form üstte toplanır; klavye açılınca KeyboardAvoidingView ile yukarı kayar
 *  - Alt boşluk dekoratif blob + faydalı ipucu metniyle dengelenir
 */
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
  useFonts,
} from "@expo-google-fonts/quicksand";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const C = {
  cream:     "#FBF2EA",
  purple900: "#26215C",
  purple600: "#534AB7",
  purple500: "#6C5CE7",
  purple200: "#CECBF6",
  purple100: "#EAE7FB",
  muted:     "#8B8798",
  white:     "#FFFFFF",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fontsLoaded] = useFonts({
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  const valid = useMemo(() => EMAIL_RE.test(email.trim()), [email]);

  if (!fontsLoaded) return null;

  const onSend = async () => {
    if (!valid || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      // TODO: API çağrısı — sıfırlama kodu gönder
      // await sendResetCode(email.trim());
      router.push({
        pathname: "/(auth)/verify-code",
        params: { email: email.trim() },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cream} />

      {/* Dekoratif blob'lar — karşılama ekranındaki motifin devamı */}
      <View style={[styles.blob, styles.blobTopRight]} pointerEvents="none" />
      <View style={[styles.blob, styles.blobBottomLeft]} pointerEvents="none" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Geri butonu */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Geri dön"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={C.purple900} />
          </Pressable>

          {/* Marka imzası: organik blob içinde pati */}
          <View style={styles.iconWrap}>
            <LinearGradient
              colors={[C.purple500, C.purple600]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconBlob}
            >
              <Ionicons name="paw" size={34} color={C.white} />
            </LinearGradient>
          </View>

          <Text style={styles.title} maxFontSizeMultiplier={1.2}>
            Şifreni mi unuttun?
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
            Sorun değil! E-postanı yaz,{"\n"}sana bir sıfırlama kodu gönderelim.
          </Text>

          {/* Form kartı */}
          <View style={styles.card}>
            <Text style={styles.label}>E-posta</Text>
            <View
              style={[
                styles.inputWrap,
                focused && styles.inputWrapFocused,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={19}
                color={focused ? C.purple500 : C.muted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="ornek@mail.com"
                placeholderTextColor={C.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={onSend}
                accessibilityLabel="E-posta adresi"
              />
            </View>

            <Pressable
              onPress={onSend}
              disabled={!valid || loading}
              style={({ pressed }) => [pressed && valid && styles.pressed]}
              accessibilityRole="button"
              accessibilityState={{ disabled: !valid || loading }}
            >
              <LinearGradient
                colors={
                  valid
                    ? [C.purple500, C.purple600]
                    : [C.purple200, C.purple200]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.btn, valid && styles.btnShadow]}
              >
                {loading ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <Text
                    style={[
                      styles.btnText,
                      !valid && styles.btnTextDisabled,
                    ]}
                    maxFontSizeMultiplier={1.2}
                  >
                    Sıfırlama Kodu Gönder
                  </Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Giriş ekranına dönüş */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            accessibilityRole="link"
            hitSlop={8}
            style={styles.backLinkWrap}
          >
            <Ionicons name="arrow-back" size={15} color={C.purple600} />
            <Text style={styles.backLink} maxFontSizeMultiplier={1.2}>
              Giriş ekranına dön
            </Text>
          </Pressable>

          {/* Alt boşluğu dolduran faydalı ipucu */}
          <View style={styles.hint}>
            <Ionicons name="information-circle-outline" size={16} color={C.muted} />
            <Text style={styles.hintText} maxFontSizeMultiplier={1.3}>
              Kod birkaç dakika içinde gelmezse spam klasörünü kontrol etmeyi unutma.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 26, paddingBottom: 24 },

  // Dekoratif blob'lar
  blob: { position: "absolute", backgroundColor: C.purple100 },
  blobTopRight: {
    width: 220, height: 220, borderRadius: 110,
    top: -70, right: -80, opacity: 0.9,
  },
  blobBottomLeft: {
    width: 180, height: 180, borderRadius: 90,
    bottom: -60, left: -70, opacity: 0.7,
  },

  backBtn: {
    width: 42, height: 42, borderRadius: 21, marginTop: 8,
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.purple200,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.purple900, shadowOpacity: 0.06,
    shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },

  iconWrap: { alignItems: "center", marginTop: 28 },
  iconBlob: {
    width: 88, height: 88,
    alignItems: "center", justifyContent: "center",
    // Organik blob hissi: asimetrik köşeler
    borderTopLeftRadius: 44, borderTopRightRadius: 38,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 46,
    shadowColor: C.purple600, shadowOpacity: 0.35,
    shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },

  title: {
    textAlign: "center", marginTop: 20,
    fontSize: 25, color: C.purple900, fontFamily: "Quicksand_700Bold",
  },
  subtitle: {
    textAlign: "center", marginTop: 8, lineHeight: 22,
    fontSize: 14.5, color: C.muted, fontFamily: "Quicksand_500Medium",
  },

  card: {
    marginTop: 26, padding: 20, borderRadius: 24,
    backgroundColor: C.white,
    shadowColor: C.purple900, shadowOpacity: 0.07,
    shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  label: {
    fontSize: 13.5, color: C.purple900,
    fontFamily: "Quicksand_600SemiBold", marginBottom: 8, marginLeft: 2,
  },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    height: 52, borderRadius: 16, paddingHorizontal: 14,
    backgroundColor: C.cream, borderWidth: 1.5, borderColor: "transparent",
  },
  inputWrapFocused: { borderColor: C.purple500, backgroundColor: C.white },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, fontSize: 15.5, color: C.purple900,
    fontFamily: "Quicksand_600SemiBold",
  },

  btn: {
    height: 54, borderRadius: 27, marginTop: 16,
    alignItems: "center", justifyContent: "center",
  },
  btnShadow: {
    shadowColor: C.purple600, shadowOpacity: 0.35,
    shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  btnText: {
    color: C.white, fontSize: 16, letterSpacing: 0.2,
    fontFamily: "Quicksand_700Bold",
  },
  btnTextDisabled: { color: C.purple600, opacity: 0.55 },

  backLinkWrap: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 20, paddingVertical: 4,
  },
  backLink: {
    fontSize: 14.5, color: C.purple600, fontFamily: "Quicksand_600SemiBold",
  },

  hint: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    marginTop: "auto", paddingTop: 28, paddingHorizontal: 8,
  },
  hintText: {
    flex: 1, fontSize: 12.5, lineHeight: 19,
    color: C.muted, fontFamily: "Quicksand_500Medium",
  },
  pressed: { transform: [{ scale: 0.97 }] },
});
