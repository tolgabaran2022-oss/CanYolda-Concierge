import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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
const EMAIL_RE    = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email,     setEmail]     = useState("");
  const [emailErr,  setEmailErr]  = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent,      setSent]      = useState(false);
  const [devCode,   setDevCode]   = useState<string | null>(null);

  const validate = (): boolean => {
    if (!email.trim()) { setEmailErr("E-posta adresi zorunludur"); return false; }
    if (!EMAIL_RE.test(email.trim())) { setEmailErr("Geçerli bir e-posta adresi giriniz"); return false; }
    setEmailErr("");
    return true;
  };

  const handleSend = async () => {
    if (!validate()) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json() as { ok?: boolean; devCode?: string; error?: string };
      if (!res.ok && res.status !== 200) {
        Alert.alert("Hata", data.error ?? "Bir hata oluştu. Lütfen tekrar deneyin.");
        return;
      }
      if (data.devCode) setDevCode(data.devCode);
      setSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Bağlantı Hatası", "İnternet bağlantınızı kontrol edin ve tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

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
            <Text style={S.title}>Şifremi Unuttum</Text>
            <Text style={S.subtitle}>
              {sent
                ? "Sıfırlama kodu gönderildi"
                : "E-postanı gir, sana sıfırlama kodu gönderelim"}
            </Text>
          </View>

          {!sent ? (
            <View style={S.card}>
              <View style={S.inputGroup}>
                <Text style={S.label}>E-posta</Text>
                <View style={[S.inputWrap, emailErr ? S.inputWrapErr : {}]}>
                  <TextInput
                    style={S.input}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setEmailErr(""); }}
                    placeholder="ornek@mail.com"
                    placeholderTextColor="#AAA"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                  />
                </View>
                {emailErr ? (
                  <Text style={S.errTxt}>{emailErr}</Text>
                ) : null}
              </View>

              <Pressable
                style={({ pressed }) => [S.btn, { opacity: pressed || isLoading ? 0.85 : 1 }]}
                onPress={handleSend}
                disabled={isLoading}
              >
                <LinearGradient colors={["#9B7DE8", "#5A3BB2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.btnGrad}>
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={S.btnTxt}>Sıfırlama Kodu Gönder</Text>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable onPress={() => router.back()} style={S.cancelRow}>
                <Text style={S.cancelTxt}>Giriş ekranına dön</Text>
              </Pressable>
            </View>
          ) : (
            <View style={S.card}>
              <View style={S.successBox}>
                <View style={S.successDot} />
                <Text style={S.successTitle}>Kod Gönderildi</Text>
                <Text style={S.successMsg}>
                  Eğer <Text style={{ fontWeight: "600" }}>{email}</Text> adresi kayıtlıysa, sıfırlama kodu gönderildi.
                </Text>
                {devCode ? (
                  <View style={S.devBox}>
                    <Text style={S.devLabel}>Geliştirici modu — kod:</Text>
                    <Text style={S.devCode}>{devCode}</Text>
                  </View>
                ) : null}
              </View>

              <Pressable
                style={({ pressed }) => [S.btn, { opacity: pressed ? 0.85 : 1 }]}
                onPress={() =>
                  router.push({
                    pathname: "/(auth)/reset-password" as any,
                    params: { email: email.trim().toLowerCase() },
                  })
                }
              >
                <LinearGradient colors={["#9B7DE8", "#5A3BB2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.btnGrad}>
                  <Text style={S.btnTxt}>Yeni Şifre Oluştur</Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                style={S.cancelRow}
                onPress={() => { setSent(false); setDevCode(null); }}
              >
                <Text style={S.cancelTxt}>E-postayı değiştir</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  gradient:  { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24, gap: 28 },
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
  errTxt: { fontSize: 12, fontWeight: "400", color: "#E53E3E" },
  btn: { borderRadius: 14, overflow: "hidden" },
  btnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 15,
    shadowColor: "#5A3BB2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  btnTxt: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  cancelRow: { alignItems: "center", paddingVertical: 4 },
  cancelTxt: { fontSize: 14, fontWeight: "500", color: PURPLE },
  successBox: { alignItems: "center", gap: 10, paddingVertical: 8 },
  successDot: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "rgba(56,161,105,0.15)",
    borderWidth: 3, borderColor: "#38A169",
  },
  successTitle: { fontSize: 20, fontWeight: "700", color: "#2D8B47" },
  successMsg: {
    fontSize: 14, fontWeight: "400", color: "#555",
    textAlign: "center", lineHeight: 21,
  },
  devBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(123,94,167,0.08)",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    marginTop: 4,
  },
  devLabel: { fontSize: 12, fontWeight: "500", color: PURPLE },
  devCode:  { fontSize: 22, fontWeight: "700", color: PURPLE_DARK, letterSpacing: 4 },
});
