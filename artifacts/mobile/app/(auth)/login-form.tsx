import { Icon } from "@/components/Icon";
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
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const PURPLE = "#7B5EA7";
const PURPLE_DARK = "#5C3D8F";
const BADGE_COLOR = "#6A3DB5";

/* ── Pure-View paw print ────────────────────────────────────────── */
function PawPrint({ size = 44, color = "#FFF" }: { size?: number; color?: string }) {
  const s = size / 44;
  const toe = (x: number, y: number, rot: string) => ({
    position: "absolute" as const,
    width: 11 * s,
    height: 13 * s,
    borderRadius: 6 * s,
    backgroundColor: color,
    left: x * s,
    top: y * s,
    transform: [{ rotate: rot }],
  });
  return (
    <View style={{ width: size, height: size }}>
      {/* 3 toe beans */}
      <View style={toe(0, 12, "-20deg")} />
      <View style={toe(16, 4, "0deg")} />
      <View style={toe(33, 12, "20deg")} />
      {/* Central pad */}
      <View style={{
        position: "absolute",
        width: 26 * s,
        height: 22 * s,
        borderRadius: 11 * s,
        backgroundColor: color,
        left: 9 * s,
        top: 24 * s,
      }} />
    </View>
  );
}

/* ── Heart badge ────────────────────────────────────────────────── */
function HeartBadge() {
  return (
    <View style={styles.heartBadge}>
      <Text style={styles.heartChar}>{"\u2665"}</Text>
    </View>
  );
}

/* ── Screen ─────────────────────────────────────────────────────── */
export default function LoginFormScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      Alert.alert("Geçersiz E-posta", "Lütfen geçerli bir e-posta adresi girin.");
      return;
    }
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Giriş yapılamadı.";
      Alert.alert("Hata", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#F7F3FF", "#EDE5FF", "#F0E8FF"]} style={styles.gradient}>
      {/* Top-left ambient glow — large enough that its physical edge never appears on screen */}
      <LinearGradient
        colors={["rgba(123,94,167,0.24)", "rgba(155,120,200,0.10)", "rgba(196,181,253,0.03)", "rgba(196,181,253,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glowTL}
        pointerEvents="none"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <Pressable
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.back()}
          >
            <Icon name="back" size={21} color={PURPLE} strokeWidth={2.3} />
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <View style={styles.iconCircle}>
                <PawPrint size={42} color="#FFF" />
              </View>
              <HeartBadge />
            </View>
            <Text style={styles.title}>Hoş geldin</Text>
            <Text style={styles.subtitle}>Hesabına giriş yap</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>E-posta</Text>
              <View style={[styles.inputWrap, { borderColor: "rgba(123,94,167,0.25)", backgroundColor: "rgba(255,255,255,0.9)" }]}>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ornek@mail.com"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Şifre</Text>
              <View style={[styles.inputWrap, { borderColor: "rgba(123,94,167,0.25)", backgroundColor: "rgba(255,255,255,0.9)" }]}>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)}>
                  <Text style={styles.toggleTxt}>{showPassword ? "Gizle" : "Göster"}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              style={styles.forgotRow}
              onPress={() => router.push("/(auth)/forgot-password" as any)}
            >
              <Text style={[styles.forgotTxt, { color: PURPLE }]}>Şifremi Unuttum?</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                { backgroundColor: PURPLE, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Giriş Yap</Text>
              )}
            </Pressable>

            <View style={styles.registerRow}>
              <Text style={[styles.registerLabel, { color: colors.mutedForeground }]}>
                Hesabın yok mu?
              </Text>
              <Pressable onPress={() => router.replace("/(auth)/register")}>
                <Text style={[styles.registerLink, { color: PURPLE }]}>{" "}Kayıt Ol</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  glowTL: {
    position: "absolute",
    top: -400,
    left: -400,
    width: 900,
    height: 900,
    zIndex: 0,
    pointerEvents: "none",
  },
  container: { flexGrow: 1, paddingHorizontal: 24, gap: 28 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(123,94,167,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  header: { alignItems: "center", gap: 8 },

  iconWrap: {
    marginBottom: 8,
    position: "relative",
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: PURPLE,
    alignItems: "center", justifyContent: "center",
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  heartBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: BADGE_COLOR,
    borderWidth: 2.5,
    borderColor: "#EDE5FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },
  heartChar: {
    fontSize: 11,
    color: "#FFF",
    lineHeight: 13,
  },

  title: { fontSize: 26, fontWeight: "700", color: PURPLE_DARK },
  subtitle: { fontSize: 14, fontWeight: "400", color: "#888" },
  card: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 24, padding: 24, gap: 16,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 20, elevation: 4,
    borderWidth: 1, borderColor: "rgba(123,94,167,0.10)",
  },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500" },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  input: { flex: 1, fontSize: 15, fontWeight: "400" },
  toggleTxt: { fontSize: 13, fontWeight: "600", color: PURPLE },
  loginButton: {
    borderRadius: 14, paddingVertical: 15, alignItems: "center",
    marginTop: 4,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  loginButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  forgotRow: { alignItems: "flex-end", marginTop: -4 },
  forgotTxt: { fontSize: 13, fontWeight: "600" },
  registerRow: {
    flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 4,
  },
  registerLabel: { fontSize: 14, fontWeight: "400" },
  registerLink: { fontSize: 14, fontWeight: "600" },
});
