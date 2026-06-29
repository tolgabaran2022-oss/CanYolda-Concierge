import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppleIcon, GoogleIcon } from "@/components/SocialIcons";
import { useAuth } from "@/contexts/AuthContext";
import { useAppleLogin, useGoogleLogin } from "@/hooks/useOAuthLogin";

const PURPLE       = "#7B5CBF";
const PURPLE_DARK  = "#3D2080";
const BLOB_PURPLE  = "#C8B4F0";
const BLOB_CREAM   = "#F0E4CE";
const BG           = "#FAF7F2";

const HERO_IMAGE = require("@/assets/images/hero-logo-pets.png");

/* ── Modern toast (non-blocking, auto-dismiss) ────────────────────── */
function Toast({ message, visible }: { message: string; visible: boolean }) {
  const opacity = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  }, [visible]);
  return (
    <Animated.View pointerEvents="none" style={[T.wrap, { opacity }]}>
      <View style={T.box}>
        <Ionicons name="alert-circle" size={18} color="#FF3B6B" />
        <Text style={T.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const T = StyleSheet.create({
  wrap: { position: "absolute", top: 50, left: 0, right: 0, alignItems: "center", zIndex: 999 },
  box:  { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFFFF", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 5, borderWidth: 1, borderColor: "#F0EDF8" },
  text: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#3D2070" },
});

/* ── Welcome screen ────────────────────────────────────────────── */
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loginWithOAuth } = useAuth();
  const { login: googleLogin, request: googleReq, isConfigured: googleConfigured } = useGoogleLogin();
  const { login: appleLogin, isConfigured: appleConfigured } = useAppleLogin();

  const [loadingProvider, setLoadingProvider] = useState<"google" | "apple" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleGoogle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!googleConfigured) { Alert.alert("Ayar gerekli", "Google OAuth Client ID henüz ayarlanmadı."); return; }
    setLoadingProvider("google");
    try {
      const { token, user, isNewUser } = await googleLogin();
      await loginWithOAuth({ id: user.id, name: user.name ?? "Kullanıcı", email: user.email ?? "", provider: "google", avatar: user.avatar ?? undefined }, token);
      if (isNewUser) Alert.alert("Hoş geldin!", "Profiliniz otomatik olarak oluşturuldu.");
      router.replace("/(tabs)");
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      showToast(e.message ?? "Google girişi başarısız");
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleApple = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!appleConfigured) { Alert.alert("Ayar gerekli", "Apple Sign-In yalnızca iOS'ta çalışır."); return; }
    setLoadingProvider("apple");
    try {
      const { token, user, isNewUser } = await appleLogin();
      await loginWithOAuth({ id: user.id, name: user.name ?? "Kullanıcı", email: user.email ?? "", provider: "apple", avatar: user.avatar ?? undefined }, token);
      if (isNewUser) Alert.alert("Hoş geldin!", "Profiliniz otomatik olarak oluşturuldu.");
      router.replace("/(tabs)");
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === "cancel") { setLoadingProvider(null); return; }
      showToast(e.message ?? "Apple girişi başarısız");
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>

      <Toast message={toast ?? ""} visible={!!toast} />

      {/* Decorative blobs */}
      <View style={styles.blobBottomRight} />
      <View style={styles.blobBottomLeft} />

      {/* Hero graphic */}
      <Image source={HERO_IMAGE} style={styles.heroImage} contentFit="contain" />

      {/* ── Buttons ──────────────────────────────────────────── */}
      <View style={styles.btnSection}>

        {/* Giriş Yap */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(auth)/login-form"); }}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        >
          <LinearGradient colors={["#9478D8", "#5A3BB2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
            <Ionicons name="person-outline" size={22} color="#FFF" />
            <Text style={styles.primaryBtnText}>Giriş Yap</Text>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </Pressable>

        {/* Kayıt Ol */}
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.9 : 1 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(auth)/register"); }}
        >
          <Ionicons name="person-add-outline" size={22} color="#1A1A2E" />
          <Text style={styles.secondaryBtnText}>Kayıt Ol</Text>
          <Ionicons name="chevron-forward" size={22} color="#333" />
        </Pressable>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social buttons */}
        <View style={styles.socialRow}>
          <Pressable
            disabled={loadingProvider === "google" || !googleReq}
            style={({ pressed }) => [
              styles.socialBtn,
              { opacity: pressed || loadingProvider === "google" ? 0.5 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] },
            ]}
            onPress={handleGoogle}
          >
            {loadingProvider === "google" ? (
              <ActivityIndicator size="small" color="#4285F4" />
            ) : (
              <GoogleIcon size={26} />
            )}
          </Pressable>

          <Pressable
            disabled={loadingProvider === "apple"}
            style={({ pressed }) => [
              styles.socialBtn,
              { opacity: pressed || loadingProvider === "apple" ? 0.5 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] },
            ]}
            onPress={handleApple}
          >
            {loadingProvider === "apple" ? (
              <ActivityIndicator size="small" color="#111111" />
            ) : (
              <AppleIcon size={26} color="#111111" />
            )}
          </Pressable>
        </View>

        {/* Privacy */}
        <View style={styles.privacyRow}>
          <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark-outline" size={18} color={PURPLE} />
          </View>
          <Text style={styles.privacyText}>
            Devam ederek{" "}
            <Text style={styles.privacyLink}>Kullanım Koşulları</Text>
            {" "}ve{"\n"}
            <Text style={styles.privacyLink}>Gizlilik Politikası</Text>
            {"'"}nı kabul etmiş olursunuz.
          </Text>
        </View>
      </View>

      {/* Bottom paw */}
      <Ionicons name="paw" size={26} color={PURPLE} style={styles.bottomPaw} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  /* Blobs */
  blobBottomRight: { position: "absolute", bottom: 70, right: -60, width: 160, height: 160, backgroundColor: BLOB_CREAM, opacity: 0.45, borderTopLeftRadius: 140, borderTopRightRadius: 50, borderBottomRightRadius: 20, borderBottomLeftRadius: 100 },
  blobBottomLeft:  { position: "absolute", bottom: -50, left: -55, width: 200, height: 200, backgroundColor: BLOB_PURPLE, opacity: 0.5, borderTopLeftRadius: 90, borderTopRightRadius: 160, borderBottomRightRadius: 60, borderBottomLeftRadius: 40 },

  /* Hero */
  heroImage: { width: "100%", aspectRatio: 4265 / 4585, marginTop: 4, zIndex: 1 },

  /* Button section */
  btnSection: { paddingHorizontal: 24, gap: 13, marginTop: 0, zIndex: 1 },

  /* Giriş Yap */
  primaryBtn: { flexDirection: "row", alignItems: "center", borderRadius: 36, paddingVertical: 18, paddingHorizontal: 24, gap: 12, shadowColor: "#5A3BB2", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.38, shadowRadius: 14, elevation: 6 },
  primaryBtnText: { flex: 1, fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFF" },

  /* Kayıt Ol */
  secondaryBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 36, paddingVertical: 17, paddingHorizontal: 24, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 3 },
  secondaryBtnText: { flex: 1, fontSize: 17, fontFamily: "Inter_700Bold", color: "#1A1A2E" },

  /* Divider */
  dividerRow:    { flexDirection: "row", alignItems: "center", gap: 14, marginVertical: 2 },
  dividerLine:   { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "rgba(0,0,0,0.15)" },
  dividerText:   { fontSize: 13, fontFamily: "Inter_400Regular", color: "#B0B0B0" },

  /* Social */
  socialRow:     { flexDirection: "row", justifyContent: "center", gap: 20 },
  socialBtn:     { width: 68, height: 68, borderRadius: 34, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.09, shadowRadius: 10, elevation: 3 },

  /* Privacy */
  privacyRow:    { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 2 },
  shieldBadge:   { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(123,92,191,0.12)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  privacyText:   { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#888", lineHeight: 19 },
  privacyLink:   { color: PURPLE, fontFamily: "Inter_700Bold" },

  /* Bottom paw */
  bottomPaw:     { alignSelf: "center", marginTop: "auto", paddingTop: 8 },
});
