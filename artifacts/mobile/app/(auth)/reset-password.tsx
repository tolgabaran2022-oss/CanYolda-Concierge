/**
 * ResetPasswordScreen — Yeni Şifre Oluştur (link tabanlı flow)
 *
 * Token URL parametresinden alınır (e-posta bağlantısından deep link).
 * Mount'ta GET /api/auth/reset-password/verify ile doğrulanır.
 * POST /api/auth/reset-password { token, newPassword, confirmPassword } ile kaydedilir.
 */
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
  useFonts,
} from "@expo-google-fonts/quicksand";
import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
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
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Lock, LockOpen, Eye, EyeOff, ChevronLeft,
  CheckCircle, XCircle, AlertCircle,
} from "lucide-react-native";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

const C = {
  cream:     "#FBF2EA",
  purple900: "#26215C",
  purple600: "#534AB7",
  purple500: "#6C5CE7",
  purple200: "#CECBF6",
  purple100: "#EAE7FB",
  muted:     "#8B8798",
  white:     "#FFFFFF",
  error:     "#E53E3E",
  success:   "#38A169",
};

type PasswordRule = { label: string; test: (p: string) => boolean };
const PWD_RULES: PasswordRule[] = [
  { label: "En az 8 karakter",     test: (p) => p.length >= 8 },
  { label: "Büyük harf (A-Z)",     test: (p) => /[A-Z]/.test(p) },
  { label: "Küçük harf (a-z)",     test: (p) => /[a-z]/.test(p) },
  { label: "Rakam (0-9)",          test: (p) => /[0-9]/.test(p) },
  { label: "Özel karakter (!@#…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];
function isStrong(p: string) { return PWD_RULES.every((r) => r.test(p)); }

type TokenState = "verifying" | "valid" | "expired" | "used" | "error";

/* ── Organik blob ─────────────────────────────────────────────── */
function MorphBlob({ style, delay = 0 }: { style: object; delay?: number }) {
  const morph = useSharedValue(0);
  useEffect(() => {
    morph.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 5000, easing: Easing.inOut(Easing.sin) })
        ),
        -1
      )
    );
  }, []);
  const blobStyle = useAnimatedStyle(() => ({
    borderTopLeftRadius:     interpolate(morph.value, [0, 1], [110, 70]),
    borderTopRightRadius:    interpolate(morph.value, [0, 1], [70, 130]),
    borderBottomLeftRadius:  interpolate(morph.value, [0, 1], [130, 80]),
    borderBottomRightRadius: interpolate(morph.value, [0, 1], [80, 120]),
    opacity: interpolate(morph.value, [0, 0.5, 1], [0.75, 0.95, 0.75]),
  }));
  return <Animated.View style={[style, blobStyle]} pointerEvents="none" />;
}

/* ── Glow borderlı animasyonlu input alanı ──────────────────── */
function AnimatedField({
  label, icon, children, focused, delay,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  focused: boolean;
  delay: number;
}) {
  const focus = useSharedValue(0);
  useEffect(() => {
    focus.value = withTiming(focused ? 1 : 0, { duration: 220, easing: Easing.out(Easing.quad) });
  }, [focused]);

  const wrapStyle = useAnimatedStyle(() => ({
    borderColor:     interpolateColor(focus.value, [0, 1], ["transparent", C.purple500]),
    backgroundColor: interpolateColor(focus.value, [0, 1], [C.cream, C.white]),
    transform:       [{ scale: interpolate(focus.value, [0, 1], [1, 1.018]) }],
    shadowOpacity:   interpolate(focus.value, [0, 1], [0, 0.18]),
    shadowRadius:    interpolate(focus.value, [0, 1], [0, 10]),
    shadowColor:     C.purple500,
    shadowOffset:    { width: 0, height: 0 },
    elevation:       interpolate(focus.value, [0, 1], [0, 3]),
  }));

  return (
    <Animated.View entering={FadeIn.delay(delay).duration(400)}>
      <Text style={styles.label}>{label}</Text>
      <Animated.View style={[styles.inputWrap, wrapStyle]}>
        {icon}
        {children}
      </Animated.View>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [tokenState, setTokenState] = useState<TokenState>("verifying");
  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [showPwd,    setShowPwd]    = useState(false);
  const [showCfm,    setShowCfm]    = useState(false);
  const [focusedField, setFocusedField] = useState<"pwd" | "cfm" | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [reduceMotion, setReduceMotion] = useState(false);

  const cfmRef = useRef<TextInput>(null);

  const [fontsLoaded] = useFonts({
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  /* Verify token on mount */
  useEffect(() => {
    if (!token) {
      setTokenState("error");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/auth/reset-password/verify?token=${encodeURIComponent(token)}`
        );
        const data = await res.json() as { valid: boolean; reason?: string };
        if (cancelled) return;
        if (data.valid) {
          setTokenState("valid");
        } else if (data.reason === "used") {
          setTokenState("used");
        } else if (data.reason === "expired" || data.reason === "not_found") {
          setTokenState("expired");
        } else {
          setTokenState("error");
        }
      } catch {
        if (!cancelled) setTokenState("error");
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (!fontsLoaded) return null;

  const canSubmit = isStrong(password) && password === confirm;

  /* ── Form gönder ─────────────────────────────────────────── */
  const onSubmit = async () => {
    if (!canSubmit || loading || !token) return;
    setErrorMsg("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password, confirmPassword: confirm }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; expired?: boolean };

      if (!res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (data.expired) {
          setTokenState("expired");
        } else {
          setErrorMsg(data.error ?? "Şifre güncellenemedi. Lütfen tekrar deneyin.");
        }
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMsg("İnternet bağlantınızı kontrol edin ve tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Başarı ekranı ─────────────────────────────────────── */
  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.cream} />
        <MorphBlob style={[styles.blob, styles.blobTopRight]} />
        <MorphBlob style={[styles.blob, styles.blobBottomLeft]} delay={2500} />
        <View style={styles.centerWrap}>
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={styles.stateOuterCircle}>
              <LinearGradient
                colors={[C.purple500, C.purple600]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.stateIconCircle}
              >
                <CheckCircle size={38} color={C.white} strokeWidth={2.5} />
              </LinearGradient>
            </View>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(200).duration(400)}>
            <Text style={styles.stateTitle} maxFontSizeMultiplier={1.2}>
              Şifren Güncellendi!
            </Text>
            <Text style={styles.stateMsg} maxFontSizeMultiplier={1.3}>
              Yeni şifrenle giriş yapabilirsin.
            </Text>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(350).duration(400)} style={{ width: "100%" }}>
            <Pressable
              onPress={() => router.replace("/(auth)/login-form" as never)}
              style={({ pressed }) => [pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[C.purple500, C.purple600]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.btn, styles.btnShadow, { marginTop: 32 }]}
              >
                <Text style={styles.btnText} maxFontSizeMultiplier={1.2}>Giriş Yap</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Token doğrulanıyor ────────────────────────────────── */
  if (tokenState === "verifying") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.cream} />
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={C.purple500} />
          <Text style={styles.verifyingText} maxFontSizeMultiplier={1.2}>
            Bağlantı doğrulanıyor…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Geçersiz / süresi dolmuş token ───────────────────── */
  if (tokenState === "expired" || tokenState === "used" || tokenState === "error") {
    const isUsed    = tokenState === "used";
    const isExpired = tokenState === "expired";
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.cream} />
        <MorphBlob style={[styles.blob, styles.blobTopRight]} />
        <MorphBlob style={[styles.blob, styles.blobBottomLeft]} delay={2500} />
        <View style={styles.centerWrap}>
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={[styles.stateOuterCircle, styles.stateOuterCircleError]}>
              <View style={[styles.stateIconCircle, styles.stateIconCircleError]}>
                {isUsed
                  ? <CheckCircle size={38} color={C.muted} strokeWidth={2.5} />
                  : <XCircle size={38} color={C.white} strokeWidth={2.5} />
                }
              </View>
            </View>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(150).duration(400)}>
            <Text style={styles.stateTitle} maxFontSizeMultiplier={1.2}>
              {isUsed
                ? "Bağlantı Kullanıldı"
                : isExpired
                  ? "Bağlantının Süresi Doldu"
                  : "Geçersiz Bağlantı"}
            </Text>
            <Text style={styles.stateMsg} maxFontSizeMultiplier={1.3}>
              {isUsed
                ? "Bu şifre sıfırlama bağlantısı zaten kullanılmış."
                : isExpired
                  ? "Bu bağlantı 30 dakika geçerliydi. Lütfen yeni bir bağlantı talep edin."
                  : "Bu şifre sıfırlama bağlantısı geçersiz. Yeni bir tane talep edin."}
            </Text>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(280).duration(400)} style={{ width: "100%" }}>
            <Pressable
              onPress={() => router.replace("/(auth)/forgot-password" as never)}
              style={({ pressed }) => [pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[C.purple500, C.purple600]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.btn, styles.btnShadow, { marginTop: 32 }]}
              >
                <Text style={styles.btnText} maxFontSizeMultiplier={1.2}>
                  Yeni Bağlantı Talep Et
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Ana form (tokenState === "valid") ─────────────────── */
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cream} />

      <MorphBlob style={[styles.blob, styles.blobTopRight]} />
      <MorphBlob style={[styles.blob, styles.blobBottomLeft]} delay={2500} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Geri butonu */}
          <Animated.View entering={FadeIn.delay(0).duration(350)}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Geri dön"
              hitSlop={8}
            >
              <ChevronLeft size={22} color={C.purple900} strokeWidth={2.5} />
            </Pressable>
          </Animated.View>

          {/* Kilit ikonu */}
          <Animated.View entering={FadeIn.delay(120).duration(500)} style={styles.iconWrap}>
            <View style={styles.iconOuterCircle}>
              <LinearGradient
                colors={[C.purple500, C.purple600]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconInnerCircle}
              >
                <Lock size={28} color={C.white} strokeWidth={2} />
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Başlık */}
          <Animated.View entering={FadeIn.delay(200).duration(400)}>
            <Text style={styles.title} maxFontSizeMultiplier={1.2}>
              Yeni Şifre Oluştur
            </Text>
            <Text style={styles.subtitleLine} maxFontSizeMultiplier={1.3}>
              Güvenli yeni şifreni belirle.
            </Text>
          </Animated.View>

          {/* Hata mesajı */}
          {errorMsg ? (
            <Animated.View entering={FadeIn.duration(250)} style={styles.globalError}>
              <AlertCircle size={16} color={C.error} strokeWidth={2} />
              <Text style={styles.globalErrorText}>{errorMsg}</Text>
            </Animated.View>
          ) : null}

          {/* Form kartı */}
          <Animated.View entering={FadeIn.delay(280).duration(400)} style={styles.card}>

            {/* Yeni Şifre */}
            <AnimatedField
              label="Yeni Şifre"
              focused={focusedField === "pwd"}
              delay={330}
              icon={
                <Lock
                  size={19}
                  color={focusedField === "pwd" ? C.purple500 : C.muted}
                  strokeWidth={2}
                  style={styles.inputIcon}
                />
              }
            >
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField("pwd")}
                onBlur={() => setFocusedField(null)}
                placeholder="En az 8 karakter"
                placeholderTextColor={C.muted}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => cfmRef.current?.focus()}
                accessibilityLabel="Yeni şifre"
              />
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setShowPwd((v) => !v); }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={showPwd ? "Şifreyi gizle" : "Şifreyi göster"}
              >
                {showPwd
                  ? <EyeOff size={20} color={C.purple600} strokeWidth={2} />
                  : <Eye size={20} color={C.purple600} strokeWidth={2} />
                }
              </Pressable>
            </AnimatedField>

            {/* Şifre güç göstergesi */}
            {password.length > 0 && (
              <Animated.View entering={FadeIn.duration(250)} style={styles.rulesBox}>
                {PWD_RULES.map((r) => {
                  const ok = r.test(password);
                  return (
                    <View key={r.label} style={styles.ruleRow}>
                      {ok
                        ? <CheckCircle size={13} color={C.success} strokeWidth={2.5} />
                        : <View style={styles.ruleCircle} />
                      }
                      <Text style={[styles.ruleTxt, ok && styles.ruleTxtOk]}>{r.label}</Text>
                    </View>
                  );
                })}
              </Animated.View>
            )}

            <View style={styles.fieldGap} />

            {/* Şifre Tekrar */}
            <AnimatedField
              label="Yeni Şifre Tekrar"
              focused={focusedField === "cfm"}
              delay={390}
              icon={
                <LockOpen
                  size={19}
                  color={focusedField === "cfm" ? C.purple500 : C.muted}
                  strokeWidth={2}
                  style={styles.inputIcon}
                />
              }
            >
              <TextInput
                ref={cfmRef}
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                onFocus={() => setFocusedField("cfm")}
                onBlur={() => setFocusedField(null)}
                placeholder="Şifreni tekrar yaz"
                placeholderTextColor={C.muted}
                secureTextEntry={!showCfm}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                accessibilityLabel="Yeni şifre tekrar"
              />
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setShowCfm((v) => !v); }}
                hitSlop={8}
                accessibilityRole="button"
              >
                {showCfm
                  ? <EyeOff size={20} color={C.purple600} strokeWidth={2} />
                  : <Eye size={20} color={C.purple600} strokeWidth={2} />
                }
              </Pressable>
            </AnimatedField>

            {/* Eşleşme uyarısı */}
            {confirm.length > 0 && password !== confirm && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.mismatchWarn}>
                <AlertCircle size={12} color={C.error} strokeWidth={2} />
                <Text style={styles.mismatchText}>Şifreler eşleşmiyor</Text>
              </Animated.View>
            )}

            <View style={styles.fieldGap} />

            {/* Submit butonu */}
            <Animated.View entering={FadeIn.delay(450).duration(400)}>
              <Pressable
                onPress={onSubmit}
                disabled={!canSubmit || loading}
                style={({ pressed }) => [pressed && canSubmit && styles.pressed]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit || loading }}
              >
                <LinearGradient
                  colors={canSubmit ? [C.purple500, C.purple600] : [C.purple200, C.purple200]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.btn, canSubmit && styles.btnShadow]}
                >
                  {loading ? (
                    <ActivityIndicator color={C.white} />
                  ) : (
                    <Text
                      style={[styles.btnText, !canSubmit && styles.btnTextDisabled]}
                      maxFontSizeMultiplier={1.2}
                    >
                      Şifremi Güncelle
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 26, paddingBottom: 32 },

  blob: { position: "absolute", backgroundColor: C.purple100 },
  blobTopRight: {
    width: 200, height: 200, borderRadius: 100,
    top: -60, right: -70, opacity: 0.9,
  },
  blobBottomLeft: {
    width: 160, height: 160, borderRadius: 80,
    bottom: -50, left: -60, opacity: 0.7,
  },

  backBtn: {
    width: 42, height: 42, borderRadius: 21, marginTop: 8,
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.purple200,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.purple900, shadowOpacity: 0.06,
    shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },

  iconWrap: { alignItems: "center", marginTop: 28 },
  iconOuterCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: C.purple100,
    alignItems: "center", justifyContent: "center",
  },
  iconInnerCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.purple600, shadowOpacity: 0.35,
    shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },

  title: {
    textAlign: "center", marginTop: 20,
    fontSize: 24, color: C.purple900, fontFamily: "Quicksand_700Bold",
  },
  subtitleLine: {
    textAlign: "center", marginTop: 8,
    fontSize: 14, color: C.muted, fontFamily: "Quicksand_500Medium",
  },

  globalError: {
    flexDirection: "row", gap: 8, alignItems: "center",
    marginTop: 16, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, backgroundColor: "#FFF5F5",
    borderWidth: 1, borderColor: "#FED7D7",
  },
  globalErrorText: {
    flex: 1, fontSize: 13.5, color: C.error, fontFamily: "Quicksand_600SemiBold",
  },

  card: {
    marginTop: 24, padding: 20, borderRadius: 24,
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
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, fontSize: 15.5, color: C.purple900,
    fontFamily: "Quicksand_600SemiBold",
  },
  fieldGap: { height: 12 },

  rulesBox: { marginTop: 8, gap: 4, paddingHorizontal: 2 },
  ruleRow:  { flexDirection: "row", alignItems: "center", gap: 6 },
  ruleCircle: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.5, borderColor: C.muted },
  ruleTxt:  { fontSize: 12.5, color: C.muted, fontFamily: "Quicksand_500Medium" },
  ruleTxtOk: { color: C.success, fontFamily: "Quicksand_600SemiBold" },

  mismatchWarn: {
    flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6, paddingLeft: 2,
  },
  mismatchText: { fontSize: 12, color: C.error, fontFamily: "Quicksand_500Medium" },

  btn: {
    height: 54, borderRadius: 27, marginTop: 8,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
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

  /* State screens (loading / expired / success) */
  centerWrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 36,
  },
  verifyingText: {
    marginTop: 16, fontSize: 15, color: C.muted,
    fontFamily: "Quicksand_500Medium",
  },
  stateOuterCircle: {
    width: 104, height: 104, borderRadius: 52,
    backgroundColor: C.purple100,
    alignItems: "center", justifyContent: "center",
    marginBottom: 24,
  },
  stateOuterCircleError: { backgroundColor: "#FFF5F5" },
  stateIconCircle: {
    width: 78, height: 78, borderRadius: 39,
    alignItems: "center", justifyContent: "center",
  },
  stateIconCircleError: { backgroundColor: "#FC8181" },
  stateTitle: {
    textAlign: "center", fontSize: 22,
    color: C.purple900, fontFamily: "Quicksand_700Bold", marginBottom: 10,
  },
  stateMsg: {
    textAlign: "center", fontSize: 14.5, lineHeight: 22,
    color: C.muted, fontFamily: "Quicksand_500Medium",
  },
  pressed: { transform: [{ scale: 0.97 }] },
});
