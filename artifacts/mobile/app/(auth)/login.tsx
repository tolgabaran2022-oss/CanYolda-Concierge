import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PET_IMAGE =
  "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=600&q=85";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleSocial = () => {
    Alert.alert("Yakında", "Sosyal giriş yakında eklenecek.");
  };

  return (
    <LinearGradient
      colors={["#F7F4FF", "#EFE9FF", "#FFFFFF"]}
      style={styles.container}
    >
      {/* Blobs */}
      <View style={[styles.blob1, { top: -80 + insets.top * 0.5 }]} />
      <View style={styles.blob2} />

      {/* Logo */}
      <View style={[styles.logoSection, { paddingTop: insets.top + 20 }]}>
        <Ionicons name="heart" size={22} color="#7C5CFF" style={{ marginBottom: 6 }} />
        <Text style={styles.logo}>canyoldaşı</Text>
        <Text style={styles.subtitle}>
          Dostların için her şey{" "}
          <Text style={styles.subtitleBold}>bir tık uzağında</Text>
        </Text>
      </View>

      {/* Pet card */}
      <View style={styles.petCard}>
        <Image
          source={{ uri: PET_IMAGE }}
          style={styles.petImage}
          contentFit="cover"
        />
        {/* Paw badge */}
        <View style={styles.pawBadge}>
          <Ionicons name="paw" size={20} color="#FFFFFF" />
        </View>
        {/* Decorative dots */}
        <View style={[styles.dot, { top: 14, right: 20, backgroundColor: "rgba(180,155,220,0.55)", width: 16, height: 16 }]} />
        <View style={[styles.dot, { bottom: 18, right: 10, backgroundColor: "#EAD8C0", width: 11, height: 11 }]} />
        <View style={[styles.dot, { top: 52, right: 8, backgroundColor: "rgba(180,155,220,0.35)", width: 9, height: 9 }]} />
      </View>

      {/* Buttons */}
      <View style={styles.buttonSection}>
        <Pressable
          activeOpacity={0.85}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/login-form");
          }}
        >
          <LinearGradient
            colors={["#7C5CFF", "#9B7BFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryBtn}
          >
            <Ionicons name="person-outline" size={19} color="#FFF" />
            <Text style={styles.primaryBtnText}>Giriş Yap</Text>
            <Ionicons name="chevron-forward" size={19} color="rgba(255,255,255,0.75)" style={{ marginLeft: "auto" }} />
          </LinearGradient>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/register");
          }}
        >
          <Ionicons name="person-add-outline" size={19} color="#6A5ACD" />
          <Text style={styles.secondaryBtnText}>Kayıt Ol</Text>
          <Ionicons name="chevron-forward" size={19} color="#9B8FC8" style={{ marginLeft: "auto" }} />
        </Pressable>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social */}
        <View style={styles.socialRow}>
          <Pressable style={styles.socialBtn} onPress={handleSocial}>
            <Text style={styles.googleG}>G</Text>
          </Pressable>
          <Pressable style={styles.socialBtn} onPress={handleSocial}>
            <Ionicons name="logo-apple" size={21} color="#111" />
          </Pressable>
          <Pressable style={styles.socialBtn} onPress={handleSocial}>
            <Ionicons name="logo-facebook" size={21} color="#1877F2" />
          </Pressable>
        </View>

        {/* Privacy */}
        <View style={styles.privacyRow}>
          <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark-outline" size={15} color="#7C5CFF" />
          </View>
          <Text style={styles.privacyText}>
            Devam ederek{" "}
            <Text style={styles.privacyLink}>Kullanım Koşulları</Text>
            {" "}ve{" "}
            <Text style={styles.privacyLink}>Gizlilik Politikası</Text>
            {"'"}nı kabul etmiş olursunuz.
          </Text>
        </View>
      </View>

      {/* Bottom paw */}
      <Ionicons
        name="paw"
        size={22}
        color="#9B7BFF"
        style={[styles.bottomPaw, { marginBottom: Math.max(insets.bottom, 16) }]}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },

  /* Blobs */
  blob1: {
    position: "absolute",
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#D9CCFF",
    opacity: 0.65,
  },
  blob2: {
    position: "absolute",
    bottom: 100,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#C7B8FF",
    opacity: 0.45,
  },

  /* Logo */
  logoSection: {
    alignItems: "center",
    gap: 4,
    zIndex: 1,
  },
  logo: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: "#3A2E6B",
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#6B6B7A",
    textAlign: "center",
  },
  subtitleBold: {
    color: "#7C5CFF",
    fontFamily: "Inter_600SemiBold",
  },

  /* Pet card */
  petCard: {
    width: 280,
    height: 190,
    borderRadius: 36,
    overflow: "visible",
    marginTop: 28,
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  petImage: {
    width: 280,
    height: 190,
    borderRadius: 36,
  },
  pawBadge: {
    position: "absolute",
    left: -6,
    top: "35%",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#7C5CFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C5CFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  dot: {
    position: "absolute",
    borderRadius: 50,
  },

  /* Buttons */
  buttonSection: {
    width: "100%",
    paddingHorizontal: 28,
    marginTop: 28,
    gap: 12,
    zIndex: 1,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 22,
    shadowColor: "#7C5CFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    flex: 1,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 22,
    backgroundColor: "#F2F0FF",
    borderWidth: 1.5,
    borderColor: "rgba(124,92,255,0.18)",
  },
  secondaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#6A5ACD",
    flex: 1,
  },

  /* Divider */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(124,92,255,0.15)",
  },
  dividerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#9E9EAE",
  },

  /* Social */
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  googleG: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    color: "#4285F4",
  },

  /* Privacy */
  privacyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 2,
  },
  shieldBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(124,92,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  privacyText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: "Inter_400Regular",
    color: "#8A8A9A",
    lineHeight: 17,
  },
  privacyLink: {
    color: "#7C5CFF",
    fontFamily: "Inter_600SemiBold",
  },

  /* Bottom paw */
  bottomPaw: {
    marginTop: "auto",
    paddingTop: 10,
  },
});
