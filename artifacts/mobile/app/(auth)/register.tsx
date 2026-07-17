/**
 * RegisterScreen — kayıt ol ekranı
 *
 * Animasyon felsefesi: "premium sessizlik" — login-form ile birebir aynı dil
 *  - Bloom giriş (FadeIn, dikey kayma yok)
 *  - Pati glow pulse (hareket yok, gölge nefes alır)
 *  - Blob morfing (köşe yarıçapı organik değişim)
 *  - Input glow halkası odakta
 *  - Buton shimmer süpürmesi
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
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
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
import { useAuth } from "@/contexts/AuthContext";

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

const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE   = /^5[0-9]{9}$/;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** 10 ham rakamı → "(5XX) XXX XX XX" formatında görüntüle */
function formatPhoneDisplay(d: string): string {
  if (d.length === 0) return "";
  if (d.length <= 3)  return `(${d}`;
  if (d.length <= 6)  return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  if (d.length <= 8)  return `(${d.slice(0, 3)}) ${d.slice(3, 6)} ${d.slice(6)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
}

/* ── Animasyonlu input alanı: glow halkası + renk geçişi ── */
function AnimatedField({
  label,
  icon,
  children,
  focused,
  delay,
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
    borderColor: interpolateColor(focus.value, [0, 1], ["transparent", C.purple500]),
    backgroundColor: interpolateColor(focus.value, [0, 1], [C.cream, C.white]),
    transform: [{ scale: interpolate(focus.value, [0, 1], [1, 1.018]) }],
    shadowOpacity: interpolate(focus.value, [0, 1], [0, 0.18]),
    shadowRadius: interpolate(focus.value, [0, 1], [0, 10]),
    shadowColor: C.purple500,
    shadowOffset: { width: 0, height: 0 },
    elevation: interpolate(focus.value, [0, 1], [0, 3]),
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

/* ── Organik blob: köşe yarıçapı morfing ── */
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
    borderTopLeftRadius: interpolate(morph.value, [0, 1], [110, 70]),
    borderTopRightRadius: interpolate(morph.value, [0, 1], [70, 130]),
    borderBottomLeftRadius: interpolate(morph.value, [0, 1], [130, 80]),
    borderBottomRightRadius: interpolate(morph.value, [0, 1], [80, 120]),
    opacity: interpolate(morph.value, [0, 0.5, 1], [0.75, 0.95, 0.75]),
  }));

  return <Animated.View style={[style, blobStyle]} pointerEvents="none" />;
}

/* ── Pati glow pulse ── */
function GlowPaw({ reduceMotion }: { reduceMotion: boolean }) {
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
    opacity: interpolate(glow.value, [0, 1], [0, 0.45]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.22]) }],
  }));

  const blobScale = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.035]) }],
  }));

  return (
    <Animated.View entering={FadeIn.delay(120).duration(500)} style={styles.iconWrap}>
      <Animated.View style={[styles.glowRing, ringStyle]} />
      <Animated.View style={blobScale}>
        <LinearGradient
          colors={[C.purple500, C.purple600]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBlob}
        >
          <Ionicons name="paw" size={34} color={C.white} />
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

/* ── Buton shimmer süpürmesi ── */
function ShimmerBtn({
  label,
  valid,
  loading,
  onPress,
  animStyle,
  onPressIn,
  onPressOut,
  entryDelay,
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

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sweep.value }],
  }));

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

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const phoneRef    = useRef<TextInput>(null);
  const emailRef    = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [name, setName]             = useState("");
  const [phoneRaw, setPhoneRaw]     = useState(""); // max 10 digits, starts with 5
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"name" | "phone" | "email" | "password" | null>(null);
  const [loading, setLoading]       = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const [fontsLoaded] = useFonts({ Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold });

  const onPhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 10);
    setPhoneRaw(digits);
  };

  const valid = useMemo(
    () =>
      name.trim().length >= 2 &&
      PHONE_RE.test(phoneRaw) &&
      EMAIL_RE.test(email.trim()) &&
      password.length >= 6,
    [name, phoneRaw, email, password]
  );

  const btnScale = useSharedValue(1);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  if (!fontsLoaded) return null;

  const onRegister = async () => {
    if (!valid || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, phoneRaw);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Kayıt yapılamadı.";
      Alert.alert("Hata", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cream} />

      <MorphBlob style={[styles.blob, styles.blobTopRight]} delay={0} />
      <MorphBlob style={[styles.blob, styles.blobBottomLeft]} delay={2500} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
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
              accessibilityRole="button" accessibilityLabel="Geri dön" hitSlop={8}
            >
              <Ionicons name="chevron-back" size={22} color={C.purple900} />
            </Pressable>
          </Animated.View>

          <GlowPaw reduceMotion={reduceMotion} />

          <Animated.View entering={FadeIn.delay(200).duration(400)}>
            <Text style={styles.title} maxFontSizeMultiplier={1.2}>Hesap Oluştur</Text>
            <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
              Topluluğa katıl, hayvan hayatlarına dokunuş yap.
            </Text>
          </Animated.View>

          {/* Form kartı */}
          <Animated.View entering={FadeIn.delay(280).duration(400)} style={styles.card}>

            <AnimatedField
              label="Ad Soyad" focused={focusedField === "name"} delay={330}
              icon={
                <Ionicons
                  name="person-outline" size={19}
                  color={focusedField === "name" ? C.purple500 : C.muted}
                  style={styles.inputIcon}
                />
              }
            >
              <TextInput
                style={styles.input} value={name} onChangeText={setName}
                onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)}
                placeholder="Adın Soyadın" placeholderTextColor={C.muted}
                autoCapitalize="words" autoCorrect={false}
                autoComplete="name" textContentType="name"
                returnKeyType="next" onSubmitEditing={() => phoneRef.current?.focus()}
                accessibilityLabel="Ad Soyad"
              />
            </AnimatedField>

            <View style={styles.fieldGap} />

            {/* ── Telefon Numarası ── */}
            <AnimatedField
              label="Telefon Numarası" focused={focusedField === "phone"} delay={370}
              icon={
                <Ionicons
                  name="call-outline" size={19}
                  color={focusedField === "phone" ? C.purple500 : C.muted}
                  style={styles.inputIcon}
                />
              }
            >
              <Text style={styles.phonePrefix}>+90 </Text>
              <TextInput
                ref={phoneRef}
                style={styles.input}
                value={formatPhoneDisplay(phoneRaw)}
                onChangeText={onPhoneChange}
                onFocus={() => setFocusedField("phone")}
                onBlur={() => setFocusedField(null)}
                placeholder="(5__) ___ __ __"
                placeholderTextColor={C.muted}
                keyboardType="number-pad"
                autoCorrect={false}
                autoComplete="tel"
                textContentType="telephoneNumber"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                accessibilityLabel="Telefon numarası"
              />
            </AnimatedField>

            <View style={styles.fieldGap} />

            <AnimatedField
              label="E-posta" focused={focusedField === "email"} delay={410}
              icon={
                <Ionicons
                  name="mail-outline" size={19}
                  color={focusedField === "email" ? C.purple500 : C.muted}
                  style={styles.inputIcon}
                />
              }
            >
              <TextInput
                ref={emailRef}
                style={styles.input} value={email} onChangeText={setEmail}
                onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)}
                placeholder="ornek@mail.com" placeholderTextColor={C.muted}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                autoComplete="email" textContentType="emailAddress"
                returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()}
                accessibilityLabel="E-posta adresi"
              />
            </AnimatedField>

            <View style={styles.fieldGap} />

            <AnimatedField
              label="Şifre" focused={focusedField === "password"} delay={450}
              icon={
                <Ionicons
                  name="lock-closed-outline" size={19}
                  color={focusedField === "password" ? C.purple500 : C.muted}
                  style={styles.inputIcon}
                />
              }
            >
              <TextInput
                ref={passwordRef}
                style={styles.input} value={password} onChangeText={setPassword}
                onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)}
                placeholder="En az 6 karakter" placeholderTextColor={C.muted}
                secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false}
                autoComplete="new-password" textContentType="newPassword"
                returnKeyType="go" onSubmitEditing={onRegister}
                accessibilityLabel="Şifre"
              />
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setShowPassword((s) => !s); }}
                hitSlop={8} accessibilityRole="button"
                accessibilityLabel={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={C.purple600} />
              </Pressable>
            </AnimatedField>

            <ShimmerBtn
              label="Kayıt Ol"
              valid={valid} loading={loading} onPress={onRegister}
              animStyle={btnAnimStyle} entryDelay={510}
              onPressIn={() => { if (valid) btnScale.value = withSpring(0.97, { damping: 18 }); }}
              onPressOut={() => { btnScale.value = withSpring(1, { damping: 14 }); }}
            />

            <Animated.View entering={FadeIn.delay(570).duration(350)} style={styles.loginRow}>
              <Text style={styles.loginText} maxFontSizeMultiplier={1.2}>Zaten hesabın var mı? </Text>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.replace("/(auth)/login-form"); }}
                accessibilityRole="link" hitSlop={8}
              >
                <Text style={styles.loginLink} maxFontSizeMultiplier={1.2}>Giriş Yap</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(630).duration(350)} style={styles.hint}>
            <Ionicons name="shield-checkmark-outline" size={16} color={C.muted} />
            <Text style={styles.hintText} maxFontSizeMultiplier={1.3}>
              Bilgilerin güvenle şifrelenir; şifreni kimseyle paylaşma.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 26, paddingBottom: 24 },

  blob: { position: "absolute", backgroundColor: C.purple100 },
  blobTopRight: { width: 220, height: 220, top: -70, right: -80 },
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
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: C.purple500,
    top: -10, left: "50%", marginLeft: -54,
  },
  iconBlob: {
    width: 88, height: 88, alignItems: "center", justifyContent: "center",
    borderTopLeftRadius: 44, borderTopRightRadius: 38,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 46,
    shadowColor: C.purple600, shadowOpacity: 0.4,
    shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },

  title: {
    textAlign: "center", marginTop: 18,
    fontSize: 25, color: C.purple900, fontFamily: "Quicksand_700Bold",
  },
  subtitle: {
    textAlign: "center", marginTop: 8, lineHeight: 22,
    fontSize: 14.5, color: C.muted, fontFamily: "Quicksand_500Medium",
  },

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
  phonePrefix: {
    fontSize: 15.5, color: C.purple900, fontFamily: "Quicksand_600SemiBold",
    marginRight: 2,
  },
  input: { flex: 1, fontSize: 15.5, color: C.purple900, fontFamily: "Quicksand_600SemiBold" },

  btn: {
    height: 54, borderRadius: 27, marginTop: 20,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  btnShadow: {
    shadowColor: C.purple600, shadowOpacity: 0.35,
    shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  btnText: { color: C.white, fontSize: 16, letterSpacing: 0.2, fontFamily: "Quicksand_700Bold" },
  btnTextDisabled: { color: C.purple600, opacity: 0.55 },
  shimmerStrip: {
    position: "absolute",
    top: 0, bottom: 0, width: 60,
    backgroundColor: "rgba(255,255,255,0.22)",
    transform: [{ skewX: "-18deg" }],
  },

  loginRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 18 },
  loginText: { fontSize: 14, color: C.muted, fontFamily: "Quicksand_500Medium" },
  loginLink: { fontSize: 14, color: C.purple600, fontFamily: "Quicksand_700Bold" },

  hint: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    marginTop: "auto", paddingTop: 28, paddingHorizontal: 8,
  },
  hintText: { flex: 1, fontSize: 12.5, lineHeight: 19, color: C.muted, fontFamily: "Quicksand_500Medium" },
  pressed: { transform: [{ scale: 0.97 }] },
});
