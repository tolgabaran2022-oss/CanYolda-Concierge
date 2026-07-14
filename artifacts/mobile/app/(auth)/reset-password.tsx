/**
 * ResetPasswordScreen — Yeni Şifre Oluştur
 *
 * Birleşik akış: 6 haneli kod + yeni şifre + şifre onayı tek ekranda
 * Tasarım dili: register.tsx ile birebir aynı sistem
 *  - MorphBlob: organik köşe bloblları
 *  - GlowLock: çift daire + kilit ikonu
 *  - AnimatedField: glow borderlı input alanı
 *  - ShimmerBtn: shimmer süpürmeli buton
 */
import { Ionicons } from "@expo/vector-icons";
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
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

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

const RESEND_COOLDOWN = 60;

type PasswordRule = { label: string; test: (p: string) => boolean };
const PWD_RULES: PasswordRule[] = [
  { label: "En az 8 karakter",     test: (p) => p.length >= 8 },
  { label: "Büyük harf (A-Z)",     test: (p) => /[A-Z]/.test(p) },
  { label: "Küçük harf (a-z)",     test: (p) => /[a-z]/.test(p) },
  { label: "Rakam (0-9)",          test: (p) => /[0-9]/.test(p) },
  { label: "Özel karakter (!@#…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];
function isStrong(p: string) { return PWD_RULES.every((r) => r.test(p)); }

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/* ── Organik blob köşe morfing ───────────────────────────────────── */
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

/* ── Kilit ikonu: çift daire + glow pulse ────────────────────────── */
function GlowLock({ reduceMotion }: { reduceMotion: boolean }) {
  const glow = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
  }, [reduceMotion]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity:   interpolate(glow.value, [0, 1], [0, 0.45]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.22]) }],
  }));
  const outerStyle = useAnimatedStyle(() => ({
    opacity:   interpolate(glow.value, [0, 1], [0.8, 1]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.03]) }],
  }));
  const innerScale = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.035]) }],
  }));

  return (
    <Animated.View entering={FadeIn.delay(120).duration(500)} style={styles.iconWrap}>
      <Animated.View style={[styles.glowRing, ringStyle]} />
      <Animated.View style={[styles.iconOuterCircle, outerStyle]}>
        <Animated.View style={innerScale}>
          <LinearGradient
            colors={[C.purple500, C.purple600]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconInnerCircle}
          >
            <Ionicons name="lock-closed" size={28} color={C.white} />
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

/* ── Glow borderlı animasyonlu input alanı ───────────────────────── */
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

/* ── Shimmer süpürmeli buton ─────────────────────────────────────── */
function ShimmerBtn({
  label, valid, loading, onPress, animStyle, onPressIn, onPressOut, entryDelay,
}: {
  label: string;
  valid: boolean;
  loading: boolean;
  onPress: () => void;
  animStyle: object;
  onPressIn: () => void;
  onPressOut: () => void;
  entryDelay: number;
}) {
  const sweep = useSharedValue(-120);
  useEffect(() => {
    if (!valid) { sweep.value = -120; return; }
    sweep.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(320, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
          withTiming(-120, { duration: 0 }),
          withTiming(-120, { duration: 2200 })
        ),
        -1
      )
    );
  }, [valid]);

  const shimmerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sweep.value }] }));

  return (
    <Animated.View entering={FadeIn.delay(entryDelay).duration(400)}>
      <AnimatedPressable
        onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}
        disabled={!valid || loading}
        style={animStyle}
        accessibilityRole="button"
        accessibilityState={{ disabled: !valid || loading }}
      >
        <LinearGradient
          colors={valid ? [C.purple500, C.purple600] : [C.purple200, C.purple200]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.btn, valid && styles.btnShadow]}
        >
          {loading ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={[styles.btnText, !valid && styles.btnTextDisabled]} maxFontSizeMultiplier={1.2}>
              {label}
            </Text>
          )}
          {valid && (
            <Animated.View style={[styles.shimmerStrip, shimmerStyle]} pointerEvents="none" />
          )}
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [code,        setCode]        = useState("");
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [showPwd,     setShowPwd]     = useState(false);
  const [showCfm,     setShowCfm]     = useState(false);
  const [focusedField,setFocusedField]= useState<"code" | "pwd" | "cfm" | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [resending,   setResending]   = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [errorMsg,    setErrorMsg]    = useState("");
  const [cooldown,    setCooldown]    = useState(0);
  const [reduceMotion,setReduceMotion]= useState(false);
  const [maxReached,  setMaxReached]  = useState(false);

  const pwdRef  = useRef<TextInput>(null);
  const cfmRef  = useRef<TextInput>(null);
  const timerRef= useRef<ReturnType<typeof setInterval> | null>(null);

  const btnScale = useSharedValue(1);
  const btnAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const [fontsLoaded] = useFonts({ Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold });

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  if (!fontsLoaded) return null;

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const canSubmit =
    code.length === 6 &&
    isStrong(password) &&
    password === confirm &&
    !maxReached;

  /* ── Form gönder ─────────────────────────────────────────────────*/
  const onSubmit = async () => {
    if (!canSubmit || loading) return;
    setErrorMsg("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Adım 1: Kodu doğrula → resetToken al
      const verifyRes = await fetch(`${API_BASE}/auth/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const verifyData = await verifyRes.json() as {
        ok?: boolean; error?: string;
        resetToken?: string; remaining?: number; maxAttemptsReached?: boolean;
      };

      if (!verifyRes.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (verifyData.maxAttemptsReached) {
          setMaxReached(true);
          setErrorMsg(verifyData.error ?? "Maksimum deneme sayısına ulaşıldı. Yeni kod talep edin.");
        } else {
          const kalan = typeof verifyData.remaining === "number"
            ? ` (${verifyData.remaining} hakkınız kaldı)`
            : "";
          setErrorMsg((verifyData.error ?? "Kod hatalı.") + kalan);
          setCode("");
        }
        return;
      }

      // Adım 2: Yeni şifreyi kaydet
      const resetRes = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken: verifyData.resetToken, password }),
      });
      const resetData = await resetRes.json() as { ok?: boolean; error?: string; expired?: boolean };

      if (!resetRes.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrorMsg(resetData.error ?? "Şifre güncellenemedi. Lütfen tekrar deneyin.");
        if (resetData.expired) {
          setTimeout(() => router.replace("/(auth)/forgot-password" as never), 2500);
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

  /* ── Yeniden gönder ──────────────────────────────────────────────*/
  const onResend = async () => {
    if (resending || cooldown > 0) return;
    setResending(true);
    setErrorMsg("");
    setMaxReached(false);
    setCode("");

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok && res.status === 429) {
        setErrorMsg(data.error ?? "Lütfen biraz bekleyin.");
      } else {
        startCooldown();
      }
    } catch {
      setErrorMsg("İnternet bağlantınızı kontrol edin.");
    } finally {
      setResending(false);
    }
  };

  /* ── Başarı ekranı ───────────────────────────────────────────────*/
  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.cream} />
        <MorphBlob style={[styles.blob, styles.blobTopRight]} />
        <MorphBlob style={[styles.blob, styles.blobBottomLeft]} delay={2500} />
        <View style={styles.successWrap}>
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={styles.successOuterCircle}>
              <LinearGradient
                colors={[C.purple500, C.purple600]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.successIconCircle}
              >
                <Ionicons name="checkmark" size={38} color={C.white} />
              </LinearGradient>
            </View>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(200).duration(400)}>
            <Text style={styles.successTitle} maxFontSizeMultiplier={1.2}>Şifren Güncellendi!</Text>
            <Text style={styles.successMsg} maxFontSizeMultiplier={1.3}>
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

  /* ── Ana form ────────────────────────────────────────────────────*/
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
              <Ionicons name="chevron-back" size={22} color={C.purple900} />
            </Pressable>
          </Animated.View>

          {/* Kilit ikonu */}
          <GlowLock reduceMotion={reduceMotion} />

          {/* Başlık */}
          <Animated.View entering={FadeIn.delay(200).duration(400)}>
            <Text style={styles.title} maxFontSizeMultiplier={1.2}>Yeni Şifre Oluştur</Text>
            <Text style={styles.subtitleLine} maxFontSizeMultiplier={1.3}>
              6 haneli doğrulama kodunu şu adrese gönderdik
            </Text>
            <Text style={styles.emailLine} maxFontSizeMultiplier={1.2} numberOfLines={1}>
              {email ?? ""}
            </Text>
          </Animated.View>

          {/* Hata mesajı */}
          {errorMsg ? (
            <Animated.View entering={FadeIn.duration(250)} style={styles.globalError}>
              <Ionicons name="alert-circle" size={16} color={C.error} />
              <Text style={styles.globalErrorText}>{errorMsg}</Text>
            </Animated.View>
          ) : null}

          {/* Form kartı */}
          <Animated.View entering={FadeIn.delay(280).duration(400)} style={styles.card}>

            {/* Doğrulama Kodu */}
            <AnimatedField
              label="Doğrulama Kodu"
              focused={focusedField === "code"}
              delay={330}
              icon={
                <Ionicons
                  name="shield-checkmark-outline"
                  size={19}
                  color={focusedField === "code" ? C.purple500 : C.muted}
                  style={styles.inputIcon}
                />
              }
            >
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={(t) => {
                  setCode(t.replace(/\D/g, "").slice(0, 6));
                  if (errorMsg) setErrorMsg("");
                }}
                onFocus={() => setFocusedField("code")}
                onBlur={() => setFocusedField(null)}
                placeholder="6 haneli kod"
                placeholderTextColor={C.muted}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="next"
                onSubmitEditing={() => pwdRef.current?.focus()}
                textContentType="oneTimeCode"
                autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
                editable={!maxReached}
                accessibilityLabel="6 haneli doğrulama kodu"
              />
              {code.length === 6 && (
                <Ionicons name="checkmark-circle" size={18} color={C.success} />
              )}
            </AnimatedField>

            <View style={styles.fieldGap} />

            {/* Yeni Şifre */}
            <AnimatedField
              label="Yeni Şifre"
              focused={focusedField === "pwd"}
              delay={390}
              icon={
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color={focusedField === "pwd" ? C.purple500 : C.muted}
                  style={styles.inputIcon}
                />
              }
            >
              <TextInput
                ref={pwdRef}
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
                hitSlop={8} accessibilityRole="button"
                accessibilityLabel={showPwd ? "Şifreyi gizle" : "Şifreyi göster"}
              >
                <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={20} color={C.purple600} />
              </Pressable>
            </AnimatedField>

            {/* Şifre güç göstergesi */}
            {password.length > 0 && (
              <Animated.View entering={FadeIn.duration(250)} style={styles.rulesBox}>
                {PWD_RULES.map((r) => {
                  const ok = r.test(password);
                  return (
                    <View key={r.label} style={styles.ruleRow}>
                      <Ionicons
                        name={ok ? "checkmark-circle" : "ellipse-outline"}
                        size={13}
                        color={ok ? C.success : C.muted}
                      />
                      <Text style={[styles.ruleTxt, ok && styles.ruleTxtOk]}>{r.label}</Text>
                    </View>
                  );
                })}
              </Animated.View>
            )}

            <View style={styles.fieldGap} />

            {/* Yeni Şifre Tekrar */}
            <AnimatedField
              label="Yeni Şifre Tekrar"
              focused={focusedField === "cfm"}
              delay={450}
              icon={
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color={focusedField === "cfm" ? C.purple500 : C.muted}
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
                placeholder="Şifreni tekrar gir"
                placeholderTextColor={C.muted}
                secureTextEntry={!showCfm}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                accessibilityLabel="Şifre onayı"
              />
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setShowCfm((v) => !v); }}
                hitSlop={8} accessibilityRole="button"
              >
                <Ionicons name={showCfm ? "eye-off-outline" : "eye-outline"} size={20} color={C.purple600} />
              </Pressable>
            </AnimatedField>

            {/* Şifre eşleşme göstergesi */}
            {confirm.length > 0 && (
              <View style={styles.matchRow}>
                <Ionicons
                  name={password === confirm ? "checkmark-circle" : "close-circle"}
                  size={13}
                  color={password === confirm ? C.success : C.error}
                />
                <Text style={[styles.matchText, password !== confirm && { color: C.error }]}>
                  {password === confirm ? "Şifreler uyuşuyor" : "Şifreler uyuşmuyor"}
                </Text>
              </View>
            )}

            {/* Ana buton */}
            <ShimmerBtn
              label="Yeni Şifreyi Kaydet"
              valid={canSubmit}
              loading={loading}
              onPress={onSubmit}
              animStyle={btnAnimStyle}
              entryDelay={510}
              onPressIn={() => { if (canSubmit) btnScale.value = withSpring(0.97, { damping: 18 }); }}
              onPressOut={() => { btnScale.value = withSpring(1, { damping: 14 }); }}
            />

            {/* Yeniden gönder satırı */}
            <Animated.View entering={FadeIn.delay(570).duration(350)} style={styles.resendRow}>
              <Text style={styles.resendText} maxFontSizeMultiplier={1.2}>Kod gelmedi mi? </Text>
              <Pressable
                onPress={onResend}
                disabled={resending || cooldown > 0}
                accessibilityRole="button"
                hitSlop={8}
              >
                {resending ? (
                  <ActivityIndicator size="small" color={C.purple600} />
                ) : cooldown > 0 ? (
                  <Text style={[styles.resendLink, { color: C.muted }]} maxFontSizeMultiplier={1.2}>
                    {cooldown} sn sonra tekrar gönder
                  </Text>
                ) : (
                  <Text style={styles.resendLink} maxFontSizeMultiplier={1.2}>Tekrar Gönder</Text>
                )}
              </Pressable>
            </Animated.View>
          </Animated.View>

          {/* Alt güvenlik notu */}
          <Animated.View entering={FadeIn.delay(630).duration(350)} style={styles.hint}>
            <Ionicons name="shield-checkmark-outline" size={16} color={C.muted} />
            <Text style={styles.hintText} maxFontSizeMultiplier={1.3}>
              Yeni şifren güçlü şekilde korunur; doğrulama kodunu kimseyle paylaşma.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  flex:      { flex: 1 },
  scroll:    { flexGrow: 1, paddingHorizontal: 26, paddingBottom: 24 },

  blob:           { position: "absolute", backgroundColor: C.purple100 },
  blobTopRight:   { width: 220, height: 220, top: -70, right: -80 },
  blobBottomLeft: { width: 180, height: 180, bottom: -60, left: -70 },

  backBtn: {
    width: 42, height: 42, borderRadius: 21, marginTop: 8,
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.purple200,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.purple900, shadowOpacity: 0.06,
    shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },

  iconWrap: { alignItems: "center", marginTop: 22, position: "relative" },
  glowRing: {
    position: "absolute",
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: C.purple500,
    top: -8, left: "50%", marginLeft: -60,
  },
  iconOuterCircle: {
    width: 104, height: 104, borderRadius: 52,
    backgroundColor: C.purple100,
    alignItems: "center", justifyContent: "center",
  },
  iconInnerCircle: {
    width: 72, height: 72,
    alignItems: "center", justifyContent: "center",
    borderTopLeftRadius:     36,
    borderTopRightRadius:    30,
    borderBottomLeftRadius:  28,
    borderBottomRightRadius: 38,
    shadowColor:    C.purple600,
    shadowOpacity:  0.4,
    shadowRadius:   16,
    shadowOffset:   { width: 0, height: 8 },
    elevation: 8,
  },

  title: {
    textAlign: "center", marginTop: 18,
    fontSize: 25, color: C.purple900, fontFamily: "Quicksand_700Bold",
  },
  subtitleLine: {
    textAlign: "center", marginTop: 10, lineHeight: 22,
    fontSize: 14.5, color: C.muted, fontFamily: "Quicksand_500Medium",
  },
  emailLine: {
    textAlign: "center", marginTop: 4,
    fontSize: 14.5, color: C.purple600, fontFamily: "Quicksand_700Bold",
  },

  globalError: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FFF5F5", borderRadius: 14, padding: 14, marginTop: 16,
    borderWidth: 1, borderColor: "rgba(229,62,62,0.2)",
  },
  globalErrorText: { fontSize: 13.5, color: C.error, fontFamily: "Quicksand_500Medium", flex: 1 },

  card: {
    marginTop: 24, padding: 20, borderRadius: 24, backgroundColor: C.white,
    shadowColor: C.purple900, shadowOpacity: 0.07,
    shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  label: {
    fontSize: 13.5, color: C.purple900,
    fontFamily: "Quicksand_600SemiBold", marginBottom: 8, marginLeft: 2,
  },
  fieldGap: { height: 16 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    height: 52, borderRadius: 16, paddingHorizontal: 14, borderWidth: 1.5,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15.5, color: C.purple900, fontFamily: "Quicksand_600SemiBold" },

  rulesBox: { gap: 5, backgroundColor: C.purple100, borderRadius: 14, padding: 12, marginTop: 4 },
  ruleRow:  { flexDirection: "row", alignItems: "center", gap: 7 },
  ruleTxt:  { fontSize: 12.5, color: C.muted, fontFamily: "Quicksand_500Medium" },
  ruleTxtOk:{ color: C.success, fontFamily: "Quicksand_600SemiBold" },

  matchRow:  { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  matchText: { fontSize: 12.5, color: C.success, fontFamily: "Quicksand_500Medium" },

  btn: {
    height: 54, borderRadius: 27, marginTop: 20,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  btnShadow: {
    shadowColor: C.purple600, shadowOpacity: 0.35,
    shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  btnText:         { color: C.white, fontSize: 16, letterSpacing: 0.2, fontFamily: "Quicksand_700Bold" },
  btnTextDisabled: { color: C.purple600, opacity: 0.55 },
  shimmerStrip: {
    position: "absolute", top: 0, bottom: 0, width: 60,
    backgroundColor: "rgba(255,255,255,0.22)",
    transform: [{ skewX: "-18deg" }],
  },

  resendRow:  { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 16 },
  resendText: { fontSize: 14, color: C.muted, fontFamily: "Quicksand_500Medium" },
  resendLink: { fontSize: 14, color: C.purple600, fontFamily: "Quicksand_700Bold" },

  hint: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    marginTop: "auto", paddingTop: 28, paddingHorizontal: 8,
  },
  hintText: { flex: 1, fontSize: 12.5, lineHeight: 19, color: C.muted, fontFamily: "Quicksand_500Medium" },

  successWrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 32,
  },
  successOuterCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: C.purple100,
    alignItems: "center", justifyContent: "center",
    marginBottom: 0,
  },
  successIconCircle: {
    width: 84, height: 84, borderRadius: 42,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.purple600, shadowOpacity: 0.4,
    shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 12,
  },
  successTitle: {
    marginTop: 24, fontSize: 26, color: C.purple900,
    fontFamily: "Quicksand_700Bold", textAlign: "center",
  },
  successMsg: {
    marginTop: 10, fontSize: 15, color: C.muted,
    fontFamily: "Quicksand_500Medium", textAlign: "center", lineHeight: 22,
  },

  pressed: { transform: [{ scale: 0.97 }] },
});
