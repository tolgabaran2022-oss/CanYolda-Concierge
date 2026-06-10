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
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

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

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Kayıt yapılamadı.";
      Alert.alert("Hata", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#FAF7F0", "#F5EAD7", "#D4EDDA"]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={[styles.logoCircle, { backgroundColor: colors.secondary }]}>
              <Ionicons name="heart" size={36} color="#FFFFFF" />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Hesap Oluştur
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Topluluğa katıl, hayvan hayatlarına dokunuş yap
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: "rgba(255,255,255,0.85)" }]}>
            {[
              { label: "Ad Soyad", value: name, setter: setName, placeholder: "Adın Soyadın", icon: "person-outline" as const, keyboardType: "default" as const },
              { label: "E-posta", value: email, setter: setEmail, placeholder: "ornek@mail.com", icon: "mail-outline" as const, keyboardType: "email-address" as const },
            ].map((field) => (
              <View key={field.label} style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  {field.label}
                </Text>
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Ionicons name={field.icon} size={18} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    value={field.value}
                    onChangeText={field.setter}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType={field.keyboardType}
                    autoCapitalize={field.keyboardType === "email-address" ? "none" : "words"}
                    autoCorrect={false}
                  />
                </View>
              </View>
            ))}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                Şifre
              </Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />
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
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.secondary, opacity: pressed ? 0.85 : 1 },
              ]}
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
              <Pressable onPress={() => router.replace("/(auth)/login")}>
                <Text style={[styles.loginLink, { color: colors.primary }]}>
                  {" "}Giriş Yap
                </Text>
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
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 28,
  },
  header: {
    alignItems: "center",
    gap: 8,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#6FA870",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  card: {
    borderRadius: 24,
    padding: 24,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  button: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#6FA870",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  loginRow: { flexDirection: "row", justifyContent: "center", marginTop: 4 },
  loginLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  loginLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
