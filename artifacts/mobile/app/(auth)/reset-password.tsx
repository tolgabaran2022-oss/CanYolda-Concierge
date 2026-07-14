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
import React, { useState } from "react";
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

type Rule = { label: string; test: (p: string) => boolean };
const RULES: Rule[] = [
  { label: "En az 8 karakter",     test: (p) => p.length >= 8 },
  { label: "Büyük harf (A-Z)",     test: (p) => /[A-Z]/.test(p) },
  { label: "Küçük harf (a-z)",     test: (p) => /[a-z]/.test(p) },
  { label: "Rakam (0-9)",          test: (p) => /[0-9]/.test(p) },
  { label: "Özel karakter (!@#…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function isStrong(p: string) {
  return RULES.every((r) => r.test(p));
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email, resetToken } = useLocalSearchParams<{ email: string; resetToken: string }>();

  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPwd,   setShowPwd]   = useState(false);
  const [showCfm,   setShowCfm]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [errorMsg,  setErrorMsg]  = useState("");
  const [pwdFocused,setPwdFocused]= useState(false);
  const [cfmFocused,setCfmFocused]= useState(false);

  const [fontsLoaded] = useFonts({
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  if (!fontsLoaded) return null;

  const canSubmit = isStrong(password) && password === confirm;

  const onReset = async () => {
    if (!canSubmit || loading) return;
    if (!resetToken) {
      setErrorMsg("Sıfırlama oturumu bulunamadı. Lütfen baştan başlayın.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, password }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; expired?: boolean };

      if (!res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrorMsg(data.error ?? "Şifre güncellenemedi. Lütfen tekrar deneyin.");
        if (data.expired) {
          setTimeout(() => router.replace("/(auth)/forgot-password" as never), 2000);
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

  /* ── Başarı ekranı ────────────────────────────────────────── */
  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.cream} />
        <View style={[styles.blob, styles.blobTopRight]}  pointerEvents="none" />
        <View style={[styles.blob, styles.blobBottomLeft]} pointerEvents="none" />
        <View style={styles.successWrap}>
          <LinearGradient
            colors={[C.purple500, C.purple600]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.successIcon}
          >
            <Ionicons name="checkmark" size={44} color={C.white} />
          </LinearGradient>
          <Text style={styles.successTitle} maxFontSizeMultiplier={1.2}>Şifren Güncellendi!</Text>
          <Text style={styles.successMsg} maxFontSizeMultiplier={1.3}>
            Yeni şifrenle giriş yapabilirsin.
          </Text>
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
        </View>
      </SafeAreaView>
    );
  }

  /* ── Ana form ─────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cream} />
      <View style={[styles.blob, styles.blobTopRight]}  pointerEvents="none" />
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
          {/* Geri */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Geri dön"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={C.purple900} />
          </Pressable>

          {/* İkon */}
          <View style={styles.iconWrap}>
            <LinearGradient
              colors={[C.purple500, C.purple600]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconBlob}
            >
              <Ionicons name="lock-closed" size={34} color={C.white} />
            </LinearGradient>
          </View>

          <Text style={styles.title} maxFontSizeMultiplier={1.2}>Yeni Şifre Oluştur</Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
            {email ? (
              <><Text style={styles.emailText}>{email}</Text>{" "}hesabı için yeni şifrenizi belirleyin.</>
            ) : "Yeni şifrenizi belirleyin."}
          </Text>

          {errorMsg ? (
            <View style={styles.globalError}>
              <Ionicons name="alert-circle" size={16} color={C.error} />
              <Text style={styles.globalErrorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            {/* Yeni Şifre */}
            <View style={styles.group}>
              <Text style={styles.label}>Yeni Şifre</Text>
              <View style={[styles.inputWrap, pwdFocused && styles.inputWrapFocused]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={pwdFocused ? C.purple500 : C.muted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPwdFocused(true)}
                  onBlur={() => setPwdFocused(false)}
                  placeholder="••••••••"
                  placeholderTextColor={C.muted}
                  secureTextEntry={!showPwd}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  accessibilityLabel="Yeni şifre"
                />
                <Pressable onPress={() => setShowPwd((v) => !v)} hitSlop={8} accessibilityRole="button">
                  <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={18} color={C.muted} />
                </Pressable>
              </View>
            </View>

            {/* Güç göstergesi */}
            {password.length > 0 && (
              <View style={styles.rulesBox}>
                {RULES.map((r) => {
                  const ok = r.test(password);
                  return (
                    <View key={r.label} style={styles.ruleRow}>
                      <Ionicons
                        name={ok ? "checkmark-circle" : "ellipse-outline"}
                        size={14}
                        color={ok ? C.success : C.muted}
                      />
                      <Text style={[styles.ruleTxt, ok && styles.ruleTxtOk]}>{r.label}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Şifre Tekrar */}
            <View style={[styles.group, { marginTop: 8 }]}>
              <Text style={styles.label}>Şifre Tekrar</Text>
              <View style={[styles.inputWrap, cfmFocused && styles.inputWrapFocused,
                confirm.length > 0 && password !== confirm && styles.inputWrapError]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={cfmFocused ? C.purple500 : C.muted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={confirm}
                  onChangeText={setConfirm}
                  onFocus={() => setCfmFocused(true)}
                  onBlur={() => setCfmFocused(false)}
                  placeholder="••••••••"
                  placeholderTextColor={C.muted}
                  secureTextEntry={!showCfm}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={onReset}
                  accessibilityLabel="Şifre tekrar"
                />
                <Pressable onPress={() => setShowCfm((v) => !v)} hitSlop={8} accessibilityRole="button">
                  <Ionicons name={showCfm ? "eye-off-outline" : "eye-outline"} size={18} color={C.muted} />
                </Pressable>
              </View>
              {confirm.length > 0 && password === confirm && (
                <View style={styles.matchRow}>
                  <Ionicons name="checkmark-circle" size={13} color={C.success} />
                  <Text style={styles.matchText}>Şifreler uyuşuyor</Text>
                </View>
              )}
              {confirm.length > 0 && password !== confirm && (
                <View style={styles.matchRow}>
                  <Ionicons name="close-circle" size={13} color={C.error} />
                  <Text style={[styles.matchText, { color: C.error }]}>Şifreler uyuşmuyor</Text>
                </View>
              )}
            </View>

            {/* Güncelle butonu */}
            <Pressable
              onPress={onReset}
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
                  <Text style={[styles.btnText, !canSubmit && styles.btnTextDisabled]} maxFontSizeMultiplier={1.2}>
                    Şifremi Güncelle
                  </Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* İpucu */}
          <View style={styles.hint}>
            <Ionicons name="shield-checkmark-outline" size={16} color={C.muted} />
            <Text style={styles.hintText} maxFontSizeMultiplier={1.3}>
              Şifren güvenli bir şekilde şifrelenerek saklanır. Hiçbir zaman düz metin olarak tutulmaz.
            </Text>
          </View>
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
  blobTopRight:   { width: 220, height: 220, borderRadius: 110, top: -70,  right: -80,  opacity: 0.9 },
  blobBottomLeft: { width: 180, height: 180, borderRadius: 90,  bottom: -60, left: -70, opacity: 0.7 },

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
    borderTopLeftRadius: 44, borderTopRightRadius: 38,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 46,
    shadowColor: C.purple600, shadowOpacity: 0.35,
    shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },

  title:     { textAlign: "center", marginTop: 20, fontSize: 25, color: C.purple900, fontFamily: "Quicksand_700Bold" },
  subtitle:  { textAlign: "center", marginTop: 8, lineHeight: 22, fontSize: 14.5, color: C.muted, fontFamily: "Quicksand_500Medium" },
  emailText: { color: C.purple600, fontFamily: "Quicksand_700Bold" },

  globalError: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FFF5F5", borderRadius: 14, padding: 14, marginTop: 16,
    borderWidth: 1, borderColor: "rgba(229,62,62,0.2)",
  },
  globalErrorText: { fontSize: 13.5, color: C.error, fontFamily: "Quicksand_500Medium", flex: 1 },

  card: {
    marginTop: 20, padding: 20, borderRadius: 24,
    backgroundColor: C.white,
    shadowColor: C.purple900, shadowOpacity: 0.07,
    shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  group:   { gap: 8 },
  label:   { fontSize: 13.5, color: C.purple900, fontFamily: "Quicksand_600SemiBold", marginLeft: 2 },

  inputWrap: {
    flexDirection: "row", alignItems: "center",
    height: 52, borderRadius: 16, paddingHorizontal: 14,
    backgroundColor: C.cream, borderWidth: 1.5, borderColor: "transparent",
  },
  inputWrapFocused: { borderColor: C.purple500, backgroundColor: C.white },
  inputWrapError:   { borderColor: C.error, backgroundColor: "#FFF5F5" },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15.5, color: C.purple900, fontFamily: "Quicksand_600SemiBold" },

  rulesBox: { gap: 5, backgroundColor: C.purple100, borderRadius: 14, padding: 12, marginTop: 4 },
  ruleRow:  { flexDirection: "row", alignItems: "center", gap: 7 },
  ruleTxt:  { fontSize: 12.5, color: C.muted, fontFamily: "Quicksand_500Medium" },
  ruleTxtOk:{ color: C.success, fontFamily: "Quicksand_600SemiBold" },

  matchRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  matchText: { fontSize: 12.5, color: C.success, fontFamily: "Quicksand_500Medium" },

  btn:         { height: 54, borderRadius: 27, marginTop: 16, alignItems: "center", justifyContent: "center" },
  btnShadow:   { shadowColor: C.purple600, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  btnText:     { color: C.white, fontSize: 16, letterSpacing: 0.2, fontFamily: "Quicksand_700Bold" },
  btnTextDisabled: { color: C.purple600, opacity: 0.55 },

  hint:     { flexDirection: "row", gap: 8, alignItems: "flex-start", marginTop: "auto", paddingTop: 28, paddingHorizontal: 8 },
  hintText: { flex: 1, fontSize: 12.5, lineHeight: 19, color: C.muted, fontFamily: "Quicksand_500Medium" },

  successWrap: {
    flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32,
  },
  successIcon: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.purple600, shadowOpacity: 0.35,
    shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 12,
  },
  successTitle: { marginTop: 24, fontSize: 26, color: C.purple900, fontFamily: "Quicksand_700Bold", textAlign: "center" },
  successMsg:   { marginTop: 10, fontSize: 15, color: C.muted, fontFamily: "Quicksand_500Medium", textAlign: "center", lineHeight: 22 },

  pressed: { transform: [{ scale: 0.97 }] },
});
