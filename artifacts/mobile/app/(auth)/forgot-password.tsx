import { Ionicons } from "@expo/vector-icons";
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

  /* dev only — backend returns code so we can test without SMTP */
  const [devCode,   setDevCode]   = useState<string | null>(null);

  const validate = (): boolean => {
    if (!email.trim()) {
      setEmailErr("E-posta adresi zorunludur");
      return false;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setEmailErr("Geçerli bir e-posta adresi giriniz");
      return false;
    }
    setEmailErr("");
    return true;
  };

  const handleSend = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
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
            <Ionicons name="chevron-back" size={22} color={PURPLE} />
          </Pressable>

          {/* Header */}
          <View style={S.header}>
            <View style={S.iconCircle}>
              <Ionicons name="key-outline" size={32} color="#FFF" />
            </View>
            <Text style={S.title}>Şifremi Unuttum</Text>
            <Text style={S.subtitle}>
              {sent
                ? "Sıfırlama kodu gönderildi"
                : "E-postanı gir, sana sıfırlama kodu gönderelim"}
            </Text>
          </View>

          {!sent ? (
            /* ── Send code form ── */
            <View style={S.card}>
              <View style={S.inputGroup}>
                <Text style={S.label}>E-posta</Text>
                <View style={[S.inputWrap, emailErr ? S.inputWrapErr : {}]}>
                  <Ionicons name="mail-outline" size={18} color={emailErr ? "#E53E3E" : PURPLE} />
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
                  <View style={S.errRow}>
                    <Ionicons name="alert-circle" size={13} color="#E53E3E" />
                    <Text style={S.errTxt}>{emailErr}</Text>
                  </View>
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
                    <>
                      <Ionicons name="send-outline" size={18} color="#FFF" />
                      <Text style={S.btnTxt}>Sıfırlama Kodu Gönder</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable onPress={() => router.back()} style={S.cancelRow}>
                <Text style={S.cancelTxt}>Giriş ekranına dön</Text>
              </Pressable>
            </View>
          ) : (
            /* ── Success state ── */
            <View style={S.card}>
              <View style={S.successBox}>
                <Ionicons name="checkmark-circle" size={48} color="#38A169" />
                <Text style={S.successTitle}>Kod Gönderildi</Text>
                <Text style={S.successMsg}>
                  Eğer <Text style={{ fontFamily: "Inter_600SemiBold" }}>{email}</Text> adresi kayıtlıysa, sıfırlama kodu gönderildi.
                </Text>

                {devCode ? (
                  <View style={S.devBox}>
                    <Ionicons name="code-slash" size={15} color="#7B5EA7" />
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
                  <Ionicons name="shield-checkmark-outline" size={18} color="#FFF" />
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
  header:    { alignItems: "center", gap: 8 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: PURPLE,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  title: {
    fontSize: 26, fontFamily: "Inter_700Bold", color: PURPLE_DARK,
  },
  subtitle: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: "#888",
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
  label: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#666" },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 1.5,
    borderColor: "rgba(123,94,167,0.25)",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  inputWrapErr: { borderColor: "#E53E3E", backgroundColor: "#FFF5F5" },
  input: {
    flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: "#1A0A3C",
  },
  errRow:  { flexDirection: "row", alignItems: "center", gap: 5 },
  errTxt:  { fontSize: 12, fontFamily: "Inter_400Regular", color: "#E53E3E" },
  btn: { borderRadius: 14, overflow: "hidden" },
  btnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 15,
    shadowColor: "#5A3BB2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  btnTxt: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  cancelRow: { alignItems: "center", paddingVertical: 4 },
  cancelTxt: { fontSize: 14, fontFamily: "Inter_500Medium", color: PURPLE },

  /* success */
  successBox: { alignItems: "center", gap: 10, paddingVertical: 8 },
  successTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#2D8B47" },
  successMsg: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: "#555",
    textAlign: "center", lineHeight: 21,
  },
  devBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(123,94,167,0.08)",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    marginTop: 4,
  },
  devLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: PURPLE },
  devCode:  { fontSize: 22, fontFamily: "Inter_700Bold", color: PURPLE_DARK, letterSpacing: 4 },
});
