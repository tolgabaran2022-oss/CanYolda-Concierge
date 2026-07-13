import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
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
const PURPLE_DARK = "#3D2070";
const BG = "#F5F1FF";
const BLOB = "rgba(180,155,220,0.22)";
const BLOB2 = "rgba(160,130,210,0.16)";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      Alert.alert("Geçersiz E-posta", "Lütfen geçerli bir e-posta adresi girin.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Hata", "Şifre en az 6 karakter olmalıdır.");
      return;
    }
    setIsLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Kayit yapilamadi.";
      Alert.alert("Hata", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Blobs */}
      <View style={[styles.blobTL, { top: insets.top - 50 }]} />
      <View style={[styles.blobTR, { top: insets.top - 30 }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
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
            <View style={styles.iconCircle} />
            <Text style={styles.title}>Hesap Oluştur</Text>
            <Text style={styles.subtitle}>
              Topluluğa katıl, hayvan hayatlarına dokunuş yap
            </Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            {/* Ad Soyad */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Ad Soyad</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Adın Soyadın"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* E-posta */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>E-posta</Text>
              <View style={styles.inputWrap}>
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

            {/* Şifre */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Şifre</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="En az 6 karakter"
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
              style={({ pressed }) => [styles.button, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Kayıt Ol</Text>
              )}
            </Pressable>

            <View style={styles.loginRow}>
              <Text style={[styles.loginLabel, { color: colors.mutedForeground }]}>
                Zaten hesabın var mı?
              </Text>
              <Pressable onPress={() => router.replace("/(auth)/login-form")}>
                <Text style={styles.loginLink}> Giriş Yap</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  blobTL: {
    position: "absolute",
    left: -55,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: BLOB,
    transform: [{ scaleX: 1.3 }],
    zIndex: 0,
  },
  blobTR: {
    position: "absolute",
    right: -45,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: BLOB2,
    transform: [{ scaleY: 1.5 }],
    zIndex: 0,
  },
  container: { flexGrow: 1, paddingHorizontal: 24, gap: 24, zIndex: 1 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(123,94,167,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  header: { alignItems: "center", gap: 8 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PURPLE,
    marginBottom: 8,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  title: { fontSize: 26, fontWeight: "700", color: PURPLE_DARK },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: "#8874A8",
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 24,
    padding: 24,
    gap: 14,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.10)",
  },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(123,94,167,0.25)",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, fontWeight: "400" },
  toggleTxt: { fontSize: 13, fontWeight: "600", color: PURPLE },
  button: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
    backgroundColor: PURPLE,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  loginLabel: { fontSize: 14, fontWeight: "400" },
  loginLink: { fontSize: 14, fontWeight: "600", color: PURPLE },
});
