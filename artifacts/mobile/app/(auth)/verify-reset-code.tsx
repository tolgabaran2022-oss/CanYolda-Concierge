import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
  useFonts,
} from "@expo-google-fonts/quicksand";
import React, { useState, useRef } from "react";
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

export default function VerifyResetCodeScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [code,       setCode]       = useState("");
  const [loading,    setLoading]    = useState(false);
  const [resending,  setResending]  = useState(false);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [remaining,  setRemaining]  = useState<number | null>(null);
  const [maxReached, setMaxReached] = useState(false);

  const inputRef = useRef<TextInput>(null);

  const [fontsLoaded] = useFonts({
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  if (!fontsLoaded) return null;

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + "*".repeat(Math.max(2, b.length)) + c)
    : "";

  const onVerify = async () => {
    if (code.length !== 6 || loading) return;
    setErrorMsg("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const res = await fetch(`${API_BASE}/auth/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json() as {
        ok?: boolean; error?: string;
        resetToken?: string; remaining?: number; maxAttemptsReached?: boolean;
      };

      if (!res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (data.maxAttemptsReached) {
          setMaxReached(true);
          setErrorMsg(data.error ?? "Maksimum deneme sayısına ulaşıldı.");
        } else {
          setErrorMsg(data.error ?? "Kod doğrulanamadı.");
          if (typeof data.remaining === "number") setRemaining(data.remaining);
          setCode("");
          inputRef.current?.focus();
        }
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: "/(auth)/reset-password",
        params: { email, resetToken: data.resetToken },
      } as never);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMsg("İnternet bağlantınızı kontrol edin ve tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (resending || maxReached) return;
    setResending(true);
    setErrorMsg("");
    setRemaining(null);
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
        Alert.alert(
          "Kod Gönderildi",
          "Yeni sıfırlama kodu e-posta adresinize gönderildi.",
          [{ text: "Tamam" }]
        );
      }
    } catch {
      setErrorMsg("İnternet bağlantınızı kontrol edin.");
    } finally {
      setResending(false);
    }
  };

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
            <Icon name="ChevronLeft" size={22} color={C.purple900} />
          </Pressable>

          {/* İkon */}
          <View style={styles.iconWrap}>
            <LinearGradient
              colors={[C.purple500, C.purple600]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconBlob}
            >
              <Icon name="mail-outline" size={34} color={C.white} />
            </LinearGradient>
          </View>

          <Text style={styles.title} maxFontSizeMultiplier={1.2}>
            E-postanı kontrol et
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
            <Text style={styles.emailText}>{maskedEmail}</Text>
            {"\n"}adresine 6 haneli sıfırlama kodu gönderdik.
          </Text>

          {/* Form */}
          <View style={styles.card}>
            <Text style={styles.label}>Sıfırlama Kodu</Text>
            <View style={[styles.codeWrap, errorMsg ? styles.codeWrapError : null]}>
              <TextInput
                ref={inputRef}
                style={styles.codeInput}
                value={code}
                onChangeText={(t) => {
                  setCode(t.replace(/\D/g, "").slice(0, 6));
                  if (errorMsg) { setErrorMsg(""); setRemaining(null); }
                }}
                placeholder="· · · · · ·"
                placeholderTextColor={C.purple200}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={onVerify}
                editable={!maxReached}
                accessibilityLabel="6 haneli sıfırlama kodu"
                autoFocus
              />
            </View>

            {errorMsg ? (
              <View style={styles.errorRow}>
                <Icon name="alert-circle-outline" size={14} color={C.error} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : remaining !== null ? null : null}

            {remaining !== null && !maxReached && (
              <Text style={styles.remainingText}>{remaining} deneme hakkınız kaldı</Text>
            )}

            {/* Doğrula butonu */}
            <Pressable
              onPress={onVerify}
              disabled={code.length !== 6 || loading || maxReached}
              style={({ pressed }) => [pressed && code.length === 6 && styles.pressed]}
              accessibilityRole="button"
              accessibilityState={{ disabled: code.length !== 6 || loading || maxReached }}
            >
              <LinearGradient
                colors={code.length === 6 && !maxReached ? [C.purple500, C.purple600] : [C.purple200, C.purple200]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.btn, code.length === 6 && !maxReached && styles.btnShadow]}
              >
                {loading ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <Text style={[styles.btnText, (code.length !== 6 || maxReached) && styles.btnTextDisabled]} maxFontSizeMultiplier={1.2}>
                    Kodu Doğrula
                  </Text>
                )}
              </LinearGradient>
            </Pressable>

            {/* Yeniden gönder */}
            <Pressable
              onPress={onResend}
              disabled={resending}
              style={styles.resendRow}
              accessibilityRole="button"
            >
              {resending ? (
                <ActivityIndicator size="small" color={C.purple600} />
              ) : (
                <>
                  <Icon name="RefreshCw" size={14} color={C.purple600} />
                  <Text style={styles.resendText}>Kodu yeniden gönder</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* İpucu */}
          <View style={styles.hint}>
            <Icon name="Info" size={16} color={C.muted} />
            <Text style={styles.hintText} maxFontSizeMultiplier={1.3}>
              Kod birkaç dakika içinde gelmezse spam klasörünü kontrol et. Kod 10 dakika geçerlidir.
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

  blob:          { position: "absolute", backgroundColor: C.purple100 },
  blobTopRight:  { width: 220, height: 220, borderRadius: 110, top: -70,  right: -80,  opacity: 0.9 },
  blobBottomLeft:{ width: 180, height: 180, borderRadius: 90,  bottom: -60, left: -70, opacity: 0.7 },

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

  card: {
    marginTop: 26, padding: 20, borderRadius: 24,
    backgroundColor: C.white,
    shadowColor: C.purple900, shadowOpacity: 0.07,
    shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  label: { fontSize: 13.5, color: C.purple900, fontFamily: "Quicksand_600SemiBold", marginBottom: 10, marginLeft: 2 },

  codeWrap: {
    height: 64, borderRadius: 18, borderWidth: 1.5, borderColor: C.purple200,
    backgroundColor: C.cream, alignItems: "center", justifyContent: "center",
  },
  codeWrapError: { borderColor: C.error, backgroundColor: "#FFF5F5" },
  codeInput: {
    fontSize: 30, fontFamily: "Quicksand_700Bold", color: C.purple900,
    letterSpacing: 10, textAlign: "center", width: "100%", height: "100%",
    paddingHorizontal: 20,
  },

  errorRow:      { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  errorText:     { fontSize: 13, color: C.error, fontFamily: "Quicksand_500Medium", flex: 1 },
  remainingText: { fontSize: 12, color: C.muted, fontFamily: "Quicksand_500Medium", marginTop: 4, marginLeft: 2 },

  btn: { height: 54, borderRadius: 27, marginTop: 16, alignItems: "center", justifyContent: "center" },
  btnShadow: { shadowColor: C.purple600, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  btnText: { color: C.white, fontSize: 16, letterSpacing: 0.2, fontFamily: "Quicksand_700Bold" },
  btnTextDisabled: { color: C.purple600, opacity: 0.55 },

  resendRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, paddingVertical: 4 },
  resendText: { fontSize: 14, color: C.purple600, fontFamily: "Quicksand_600SemiBold" },

  hint: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginTop: "auto", paddingTop: 28, paddingHorizontal: 8 },
  hintText: { flex: 1, fontSize: 12.5, lineHeight: 19, color: C.muted, fontFamily: "Quicksand_500Medium" },

  pressed: { transform: [{ scale: 0.97 }] },
});
