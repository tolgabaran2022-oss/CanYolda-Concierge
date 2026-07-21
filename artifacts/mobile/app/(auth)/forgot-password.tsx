/**
 * ForgotPasswordScreen — canyoldaşı şifre sıfırlama ekranı
 *
 * Link tabanlı akış: E-posta gönderilir, başarı ekranı gösterilir.
 * Kullanıcı e-postasındaki butona tıklayarak reset-password ekranına gider.
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
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { ChevronLeft, Mail, ArrowLeft, Info, CheckCircle, RefreshCw } from "lucide-react-native";
import { useTranslation } from "react-i18next";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

const C = {
  lavender:     "#EDE8FF",
  lavenderSoft: "#F3F0FF",
  purple900: "#26215C",
  purple600: "#534AB7",
  purple500: "#6C5CE7",
  purple300: "#A78BFA",
  purple200: "#CECBF6",
  purple100: "#EAE7FB",
  muted:     "#8B8798",
  white:     "#FFFFFF",
  success:   "#38A169",
  successBg: "#F0FFF4",
  successBdr:"#9AE6B4",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOLDOWN_MS = 120 * 1000; // 120 seconds

function formatRemaining(ms: number): string {
  const totalSecs = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail]     = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [remaining, setRemaining]       = useState(0);
  const resendAvailableAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [fontsLoaded] = useFonts({
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  const valid = useMemo(() => EMAIL_RE.test(email.trim()), [email]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  if (!fontsLoaded) return null;

  const startCooldown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const availableAt = Date.now() + COOLDOWN_MS;
    resendAvailableAtRef.current = availableAt;
    setRemaining(COOLDOWN_MS);
    timerRef.current = setInterval(() => {
      const rem = (resendAvailableAtRef.current ?? 0) - Date.now();
      if (rem <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        resendAvailableAtRef.current = null;
        setRemaining(0);
      } else {
        setRemaining(rem);
      }
    }, 250);
  };

  const onSend = async () => {
    if (!valid || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        if (res.status === 429) {
          Alert.alert(t("auth.forgotPassword.rateLimitTitle"), data.error ?? t("auth.forgotPassword.rateLimitMsg"));
        } else {
          Alert.alert(t("common.error"), data.error ?? t("auth.forgotPassword.sendError"));
        }
        return;
      }
      setSent(true);
      startCooldown();
    } catch {
      Alert.alert(t("common.error"), t("common.networkError"));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (loading || remaining > 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        Alert.alert(t("common.error"), data.error ?? t("auth.forgotPassword.resendError"));
        return;
      }
      startCooldown();
      Alert.alert(t("auth.forgotPassword.resentTitle"), t("auth.forgotPassword.resentMsg"));
    } catch {
      Alert.alert(t("common.error"), t("common.networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.lavender} />

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
            accessibilityLabel={t("common.goBack")}
            hitSlop={8}
          >
            <ChevronLeft size={22} color={C.purple900} strokeWidth={2.5} />
          </Pressable>

          {/* Marka ikonu */}
          <View style={styles.iconWrap}>
            <View style={styles.glowRingBase} />
            <LinearGradient
              colors={[C.purple500, C.purple600]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconBlob}
            >
              <Mail size={34} color={C.white} strokeWidth={2} />
            </LinearGradient>
          </View>

          <Text style={styles.title} maxFontSizeMultiplier={1.2}>
            {t("auth.forgotPassword.screenTitle")}
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
            {sent ? t("auth.forgotPassword.subtitleSent") : t("auth.forgotPassword.subtitleDefault")}
          </Text>

          {/* Başarı kartı */}
          {sent ? (
            <View style={styles.successCard}>
              <View style={styles.successRow}>
                <CheckCircle size={20} color={C.success} strokeWidth={2} />
                <Text style={styles.successTitle} maxFontSizeMultiplier={1.2}>
                  {t("auth.forgotPassword.linkSentTitle")}
                </Text>
              </View>
              <Text style={styles.successMsg} maxFontSizeMultiplier={1.3}>
                {t("auth.forgotPassword.linkSentLine1", { email: email.trim().toLowerCase() })}
                {"\n"}
                {t("auth.forgotPassword.linkSentLine2")}
              </Text>

              {/* Tekrar Gönder */}
              <Pressable
                onPress={onResend}
                disabled={loading || remaining > 0}
                style={({ pressed }) => [styles.resendBtn, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                {loading ? (
                  <ActivityIndicator size="small" color={C.purple500} />
                ) : (
                  <>
                    <RefreshCw size={14} color={remaining > 0 ? C.muted : C.purple500} strokeWidth={2.5} />
                    <Text style={[styles.resendText, remaining > 0 && styles.resendTextMuted]}>
                      {remaining > 0
                        ? t("auth.forgotPassword.resendCooldown", { time: formatRemaining(remaining) })
                        : t("auth.forgotPassword.resend")}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            /* Form kartı */
            <View style={styles.card}>
              <Text style={styles.label}>{t("auth.forgotPassword.email")}</Text>
              <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
                <Mail
                  size={19}
                  color={focused ? C.purple500 : C.muted}
                  strokeWidth={2}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder={t("auth.forgotPassword.emailPlaceholder")}
                  placeholderTextColor={C.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={onSend}
                  accessibilityLabel={t("auth.emailAccessibility")}
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
                  colors={valid ? [C.purple500, C.purple600] : [C.purple200, C.purple200]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.btn, valid && styles.btnShadow]}
                >
                  {loading ? (
                    <ActivityIndicator color={C.white} />
                  ) : (
                    <Text
                      style={[styles.btnText, !valid && styles.btnTextDisabled]}
                      maxFontSizeMultiplier={1.2}
                    >
                      {t("auth.forgotPassword.submitBtn")}
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          )}

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
            <ArrowLeft size={15} color={C.purple600} strokeWidth={2.5} />
            <Text style={styles.backLink} maxFontSizeMultiplier={1.2}>
              {t("auth.forgotPassword.backToLoginScreen")}
            </Text>
          </Pressable>

          {/* Alt ipucu */}
          <View style={styles.hint}>
            <Info size={16} color={C.muted} strokeWidth={2} />
            <Text style={styles.hintText} maxFontSizeMultiplier={1.3}>
              {t("auth.forgotPassword.hint")}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.lavender },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 26, paddingBottom: 24 },

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

  iconWrap: { alignItems: "center", marginTop: 28, position: "relative" },
  glowRingBase: {
    position: "absolute",
    width: 114, height: 114, borderRadius: 57,
    backgroundColor: C.purple200,
    top: -13, left: "50%", marginLeft: -57,
    opacity: 0.55,
  },
  iconBlob: {
    width: 88, height: 88,
    alignItems: "center", justifyContent: "center",
    borderRadius: 44,
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

  successCard: {
    marginTop: 26, padding: 20, borderRadius: 20,
    backgroundColor: C.successBg,
    borderWidth: 1.5, borderColor: C.successBdr,
  },
  successRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  successTitle: {
    fontSize: 16, color: C.success, fontFamily: "Quicksand_700Bold",
  },
  successMsg: {
    fontSize: 14, lineHeight: 21, color: "#2D6A4F",
    fontFamily: "Quicksand_500Medium",
  },
  resendBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 16, alignSelf: "flex-start",
    paddingVertical: 4,
  },
  resendText: {
    fontSize: 13.5, color: C.purple500, fontFamily: "Quicksand_600SemiBold",
  },
  resendTextMuted: { color: C.muted },

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
    backgroundColor: C.lavenderSoft, borderWidth: 1.5, borderColor: "transparent",
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
