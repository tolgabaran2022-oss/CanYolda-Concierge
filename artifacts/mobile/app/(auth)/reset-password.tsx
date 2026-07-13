import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PURPLE      = "#7B5EA7";
const PURPLE_DARK = "#5C3D8F";
const GREEN       = "#38A169";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

type Rule = { label: string; test: (p: string) => boolean };
const RULES: Rule[] = [
  { label: "En az 8 karakter",     test: (p) => p.length >= 8 },
  { label: "Büyük harf (A-Z)",     test: (p) => /[A-Z]/.test(p) },
  { label: "Küçük harf (a-z)",     test: (p) => /[a-z]/.test(p) },
  { label: "Rakam (0-9)",          test: (p) => /[0-9]/.test(p) },
  { label: "Özel karakter (!@#…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function isStrongPassword(p: string) {
  return RULES.every((r) => r.test(p));
}

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [code,      setCode]      = useState("");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPwd,   setShowPwd]   = useState(false);
  const [showCfm,   setShowCfm]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [errors,    setErrors]    = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!code.trim() || code.trim().length < 4)
      errs.code = "Lütfen geçerli bir sıfırlama kodu girin";
    if (!isStrongPassword(password))
      errs.password = "Şifre güvenlik kurallarını karşılamıyor";
    if (password !== confirm)
      errs.confirm = "Şifreler uyuşmuyor";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleReset = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:    (email ?? "").toLowerCase().trim(),
          code:     code.trim(),
          password,
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        const msg =
          res.status === 400 && data.error?.includes("süresi")
            ? "Kodun süresi dolmuş. Lütfen yeni bir kod talep edin."
            : res.status === 400 && data.error?.includes("geçersiz")
            ? "Kod geçersiz. Lütfen tekrar kontrol edin."
            : data.error ?? "Bir hata oluştu. Lütfen tekrar deneyin.";
        setErrors({ global: msg });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setErrors({ global: "İnternet bağlantınızı kontrol edin ve tekrar deneyin." });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <LinearGradient colors={["#F7F3FF", "#EDE5FF", "#F0E8FF"]} style={S.gradient}>
        <View style={[S.successRoot, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
          <View style={S.successCircle} />
          <Text style={S.successTitle}>Şifreniz Güncellendi!</Text>
          <Text style={S.successMsg}>
            Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.
          </Text>
          <Pressable
            style={({ pressed }) => [S.btn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.replace("/(auth)/login-form" as any)}
          >
            <LinearGradient colors={["#9B7DE8", "#5A3BB2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.btnGrad}>
              <Text style={S.btnTxt}>Giriş Yap</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#F7F3FF", "#EDE5FF", "#F0E8FF"]} style={S.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[S.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable
            style={({ pressed }) => [S.backBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.back()}
          >
            <Text style={S.backArrow}>{"<"}</Text>
          </Pressable>

          {/* Header */}
          <View style={S.header}>
            <View style={S.iconCircle} />
            <Text style={S.title}>Yeni Şifre Oluştur</Text>
            <Text style={S.subtitle}>
              {email ? (
                <><Text style={{ fontWeight: "600" }}>{email}</Text>{" "}adresine gönderilen kodu gir</>
              ) : "Sıfırlama kodunu ve yeni şifreni gir"}
            </Text>
          </View>

          {/* Global error */}
          {errors.global ? (
            <View style={S.globalErr}>
              <Text style={S.globalErrTxt}>{errors.global}</Text>
            </View>
          ) : null}

          <View style={S.card}>
            {/* Code */}
            <View style={S.inputGroup}>
              <Text style={S.label}>Sıfırlama Kodu</Text>
              <View style={[S.inputWrap, errors.code ? S.inputWrapErr : {}]}>
                <TextInput
                  style={[S.input, S.codeInput]}
                  value={code}
                  onChangeText={(t) => { setCode(t.replace(/\D/g, "").slice(0, 6)); setErrors((e) => ({ ...e, code: "" })); }}
                  placeholder="6 haneli kod"
                  placeholderTextColor="#AAA"
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="next"
                />
              </View>
              {errors.code ? <Text style={S.errTxt}>{errors.code}</Text> : null}
            </View>

            {/* New password */}
            <View style={S.inputGroup}>
              <Text style={S.label}>Yeni Şifre</Text>
              <View style={[S.inputWrap, errors.password ? S.inputWrapErr : {}]}>
                <TextInput
                  style={S.input}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: "" })); }}
                  placeholder="••••••••"
                  placeholderTextColor="#AAA"
                  secureTextEntry={!showPwd}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPwd((v) => !v)}>
                  <Text style={S.toggleTxt}>{showPwd ? "Gizle" : "Göster"}</Text>
                </Pressable>
              </View>
              {errors.password ? <Text style={S.errTxt}>{errors.password}</Text> : null}
            </View>

            {/* Strength rules */}
            {password.length > 0 ? (
              <View style={S.rulesBox}>
                {RULES.map((r) => {
                  const ok = r.test(password);
                  return (
                    <View key={r.label} style={S.ruleRow}>
                      <View style={[S.ruleDot, { backgroundColor: ok ? GREEN : "#BDB5D0" }]} />
                      <Text style={[S.ruleTxt, ok && S.ruleTxtOk]}>{r.label}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* Confirm password */}
            <View style={S.inputGroup}>
              <Text style={S.label}>Yeni Şifre Tekrar</Text>
              <View style={[S.inputWrap, errors.confirm ? S.inputWrapErr : {}]}>
                <TextInput
                  style={S.input}
                  value={confirm}
                  onChangeText={(t) => { setConfirm(t); setErrors((e) => ({ ...e, confirm: "" })); }}
                  placeholder="••••••••"
                  placeholderTextColor="#AAA"
                  secureTextEntry={!showCfm}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                />
                <Pressable onPress={() => setShowCfm((v) => !v)}>
                  <Text style={S.toggleTxt}>{showCfm ? "Gizle" : "Göster"}</Text>
                </Pressable>
              </View>
              {errors.confirm ? <Text style={S.errTxt}>{errors.confirm}</Text> : null}
              {confirm.length > 0 && !errors.confirm && password === confirm ? (
                <Text style={[S.errTxt, { color: GREEN }]}>Şifreler uyuşuyor</Text>
              ) : null}
            </View>

            <Pressable
              style={({ pressed }) => [S.btn, { opacity: pressed || isLoading ? 0.85 : 1 }]}
              onPress={handleReset}
              disabled={isLoading}
            >
              <LinearGradient colors={["#9B7DE8", "#5A3BB2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.btnGrad}>
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={S.btnTxt}>Şifremi Güncelle</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              style={S.cancelRow}
              onPress={() => router.replace("/(auth)/forgot-password" as any)}
            >
              <Text style={S.cancelTxt}>Yeni kod talep et</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  gradient:  { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24, gap: 24 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(123,94,167,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 20, fontWeight: "600", color: PURPLE },
  header:    { alignItems: "center", gap: 8 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: PURPLE,
    marginBottom: 8,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  title: { fontSize: 26, fontWeight: "700", color: PURPLE_DARK },
  subtitle: {
    fontSize: 14, fontWeight: "400", color: "#888",
    textAlign: "center", paddingHorizontal: 8,
  },
  globalErr: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FFF5F5", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "rgba(229,62,62,0.25)",
  },
  globalErrTxt: { fontSize: 13, fontWeight: "500", color: "#E53E3E", flex: 1 },
  card: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 24, padding: 24, gap: 16,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 20, elevation: 4,
    borderWidth: 1, borderColor: "rgba(123,94,167,0.10)",
  },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500", color: "#666" },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 1.5,
    borderColor: "rgba(123,94,167,0.25)",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  inputWrapErr: { borderColor: "#E53E3E", backgroundColor: "#FFF5F5" },
  input: { flex: 1, fontSize: 15, fontWeight: "400", color: "#1A0A3C" },
  codeInput: { fontSize: 20, fontWeight: "700", letterSpacing: 4 },
  toggleTxt: { fontSize: 13, fontWeight: "600", color: PURPLE },
  errTxt:  { fontSize: 12, fontWeight: "400", color: "#E53E3E" },
  rulesBox: { gap: 6, backgroundColor: "rgba(123,94,167,0.05)", borderRadius: 12, padding: 12 },
  ruleRow:  { flexDirection: "row", alignItems: "center", gap: 7 },
  ruleDot:  { width: 8, height: 8, borderRadius: 4 },
  ruleTxt:  { fontSize: 12, fontWeight: "400", color: "#AAA" },
  ruleTxtOk:{ color: GREEN, fontWeight: "500" },
  btn: { borderRadius: 14, overflow: "hidden" },
  btnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 15,
  },
  btnTxt: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  cancelRow: { alignItems: "center", paddingVertical: 4 },
  cancelTxt: { fontSize: 14, fontWeight: "500", color: PURPLE },
  successRoot: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 32, gap: 16,
  },
  successCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(56,161,105,0.15)",
    borderWidth: 4, borderColor: GREEN,
  },
  successTitle: { fontSize: 26, fontWeight: "700", color: "#1A0A3C" },
  successMsg: {
    fontSize: 15, fontWeight: "400", color: "#555",
    textAlign: "center", lineHeight: 22,
  },
});
