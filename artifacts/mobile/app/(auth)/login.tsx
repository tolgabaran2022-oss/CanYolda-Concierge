import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
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

const PURPLE = "#7B5EA7";
const PURPLE_DARK = "#5C3D8F";
const PURPLE_BLOB = "rgba(180,155,220,0.28)";
const PURPLE_BLOB2 = "rgba(160,130,210,0.20)";
const BG = "#F7F3FF";
const CREAM = "#FFF8F0";

const DOG_CAT_IMAGE =
  "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=600&q=85";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleSocial = () => {
    Alert.alert("Yakında", "Sosyal giriş yakında eklenecek.");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
      {/* BG blobs */}
      <View style={styles.blobTopLeft} />
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      {/* Logo */}
      <View style={styles.logoSection}>
        <Ionicons name="heart" size={28} color={PURPLE} style={{ marginBottom: 2 }} />
        <Text style={styles.appName}>canyoldaşı</Text>
        <Text style={styles.tagline}>
          Dostların için{"\n"}
          her şey{" "}
          <Text style={{ color: PURPLE, fontFamily: "Inter_600SemiBold" }}>
            bir tık uzağında
          </Text>
        </Text>
      </View>

      {/* Hero */}
      <View style={styles.heroContainer}>
        <View style={styles.heroBlobBg} />
        <Image
          source={{ uri: DOG_CAT_IMAGE }}
          style={styles.heroImage}
          contentFit="cover"
        />
        {/* Paw badge */}
        <View style={[styles.pawBadge, { backgroundColor: PURPLE }]}>
          <Ionicons name="paw" size={22} color="#FFFFFF" />
        </View>
        {/* Decorative dots */}
        <View style={[styles.dot, { top: 16, right: 24, width: 18, height: 18, backgroundColor: "rgba(180,155,220,0.5)" }]} />
        <View style={[styles.dot, { bottom: 24, right: 8, width: 12, height: 12, backgroundColor: "#F0D9B8" }]} />
        <View style={[styles.dot, { top: 60, right: 8, width: 10, height: 10, backgroundColor: "rgba(180,155,220,0.35)" }]} />
      </View>

      {/* Buttons */}
      <View style={styles.btnSection}>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.88 : 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/login-form");
          }}
        >
          <Ionicons name="person-outline" size={20} color="#FFF" />
          <Text style={styles.primaryBtnText}>Giriş Yap</Text>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" style={styles.btnArrow} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.88 : 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(auth)/register");
          }}
        >
          <Ionicons name="person-add-outline" size={20} color={PURPLE_DARK} />
          <Text style={styles.secondaryBtnText}>Kayıt Ol</Text>
          <Ionicons name="chevron-forward" size={20} color={PURPLE} style={styles.btnArrow} />
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
            <Ionicons name="logo-apple" size={22} color="#111" />
          </Pressable>
          <Pressable style={styles.socialBtn} onPress={handleSocial}>
            <Ionicons name="logo-facebook" size={22} color="#1877F2" />
          </Pressable>
        </View>

        {/* Privacy */}
        <View style={styles.privacyRow}>
          <View style={[styles.shieldBadge, { backgroundColor: "rgba(123,94,167,0.10)" }]}>
            <Ionicons name="shield-checkmark-outline" size={16} color={PURPLE} />
          </View>
          <Text style={styles.privacyText}>
            Devam ederek{" "}
            <Text style={{ color: PURPLE, fontFamily: "Inter_600SemiBold" }}>
              Kullanım Koşulları
            </Text>{" "}
            ve{" "}
            <Text style={{ color: PURPLE, fontFamily: "Inter_600SemiBold" }}>
              Gizlilik Politikası
            </Text>
            {"'"}nı kabul etmiş olursunuz.
          </Text>
        </View>
      </View>

      {/* Bottom paw */}
      <Ionicons name="paw" size={22} color={PURPLE} style={styles.bottomPaw} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  /* Blobs */
  blobTopLeft: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: PURPLE_BLOB,
    transform: [{ scaleX: 1.3 }],
  },
  blobTopRight: {
    position: "absolute",
    top: -30,
    right: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: PURPLE_BLOB2,
    transform: [{ scaleY: 1.4 }],
  },
  blobBottomLeft: {
    position: "absolute",
    bottom: -80,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: PURPLE_BLOB,
    transform: [{ scaleX: 1.2 }],
  },

  /* Logo */
  logoSection: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 8,
    gap: 4,
  },
  appName: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: PURPLE_DARK,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 4,
  },

  /* Hero */
  heroContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
    height: 210,
  },
  heroBlobBg: {
    position: "absolute",
    width: 300,
    height: 200,
    borderRadius: 120,
    backgroundColor: "rgba(180,155,220,0.22)",
    transform: [{ scaleX: 1.1 }, { scaleY: 0.9 }],
  },
  heroImage: {
    width: 260,
    height: 190,
    borderRadius: 100,
  },
  pawBadge: {
    position: "absolute",
    left: 28,
    top: "50%",
    marginTop: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PURPLE,
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
  btnSection: {
    paddingHorizontal: 28,
    gap: 12,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PURPLE,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 22,
    gap: 10,
    shadowColor: PURPLE,
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
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 22,
    gap: 10,
    borderWidth: 1.5,
    borderColor: "rgba(123,94,167,0.2)",
  },
  secondaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: PURPLE_DARK,
    flex: 1,
  },
  btnArrow: {
    marginLeft: "auto",
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
    backgroundColor: "rgba(123,94,167,0.15)",
  },
  dividerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#999",
  },

  /* Social */
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  socialBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  googleG: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#4285F4",
  },

  /* Privacy */
  privacyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 4,
  },
  shieldBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#777",
    lineHeight: 18,
  },

  /* Bottom paw */
  bottomPaw: {
    alignSelf: "center",
    marginTop: "auto",
    paddingTop: 8,
  },
});
