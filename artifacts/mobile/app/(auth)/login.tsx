import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PURPLE      = "#7B5CBF";
const PURPLE_DARK = "#3D2080";
const BLOB_PURPLE = "#C8B4F0";
const BLOB_CREAM  = "#F0E4CE";
const BG          = "#FAF7F2";

const HERO_IMAGE = require("@/assets/images/hero-logo-pets.png");

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: sw, height: sh } = useWindowDimensions();

  /* Responsive blob sizes — never overflow screen edges */
  const b1 = Math.min(sw * 0.52, 210);
  const b2 = Math.min(sw * 0.42, 170);
  const b3 = Math.min(sw * 0.30, 120);

  return (
    <View style={styles.root}>

      {/* ── Decorative blobs ─────────────────────────────────── */}
      <View style={[styles.blob, {
        top: insets.top - 10,
        left: -b1 * 0.35,
        width: b1, height: b1,
        backgroundColor: BLOB_PURPLE,
        opacity: 0.28,
      }]} />
      <View style={[styles.blob, {
        top: insets.top + sh * 0.08,
        right: -b2 * 0.25,
        width: b2, height: b2,
        backgroundColor: BLOB_CREAM,
        opacity: 0.40,
      }]} />
      <View style={[styles.blob, {
        bottom: Math.max(insets.bottom, 16) + sh * 0.15,
        right: -b3 * 0.20,
        width: b3, height: b3,
        backgroundColor: BLOB_PURPLE,
        opacity: 0.20,
      }]} />
      <View style={[styles.blob, {
        bottom: Math.max(insets.bottom, 16),
        left: -b2 * 0.30,
        width: b2 * 1.1, height: b2 * 1.1,
        backgroundColor: BLOB_CREAM,
        opacity: 0.32,
      }]} />

      {/* ── Safe-area content ────────────────────────────────── */}
      <View style={[
        styles.safe,
        {
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 20),
        },
      ]}>

        {/* ── Hero (logo + pets graphic) ────────────────────── */}
        <View style={styles.heroSection}>
          <Image
            source={HERO_IMAGE}
            style={styles.heroImage}
            contentFit="contain"
          />
        </View>

        {/* ── CTA buttons ───────────────────────────────────── */}
        <View style={styles.btnSection}>

          {/* Giriş Yap */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(auth)/login-form");
            }}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.975 : 1 }],
              opacity: pressed ? 0.93 : 1,
            })}
          >
            <LinearGradient
              colors={["#9B7DE8", "#5A3BB2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryBtn}
            >
              <View style={styles.btnIconWrap}>
                <Ionicons name="log-in-outline" size={21} color="#FFF" />
              </View>
              <Text style={styles.primaryBtnText}>Giriş Yap</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.65)" />
            </LinearGradient>
          </Pressable>

          {/* Kayıt Ol */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(auth)/register");
            }}
            style={({ pressed }) => [
              styles.secondaryBtn,
              {
                transform: [{ scale: pressed ? 0.975 : 1 }],
                opacity: pressed ? 0.93 : 1,
              },
            ]}
          >
            <View style={[styles.btnIconWrap, styles.btnIconWrapSecondary]}>
              <Ionicons name="person-add-outline" size={21} color={PURPLE} />
            </View>
            <Text style={styles.secondaryBtnText}>Kayıt Ol</Text>
            <Ionicons name="chevron-forward" size={18} color={PURPLE} />
          </Pressable>

          {/* Terms row */}
          <View style={styles.termsRow}>
            <View style={styles.heartBadge}>
              <Ionicons name="heart" size={16} color={PURPLE} />
            </View>
            <Text style={styles.termsText}>
              Devam ederek{" "}
              <Text style={styles.termsLink}>Kullanım Koşulları</Text>
              {" "}ve{" "}
              <Text style={styles.termsLink}>Gizlilik Politikası</Text>
              {"'"}nı kabul etmiş olursunuz.
            </Text>
          </View>
        </View>

        {/* Bottom paw */}
        <Ionicons
          name="paw"
          size={22}
          color={PURPLE}
          style={styles.bottomPaw}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  /* Blobs */
  blob: { position: "absolute", borderRadius: 999, zIndex: 0 },

  /* Hero section — takes most of the vertical space */
  heroSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    zIndex: 1,
    minHeight: 240,
  },
  heroImage: {
    width: "100%",
    maxWidth: 380,
    aspectRatio: 4265 / 4585,
  },

  /* Buttons section */
  btnSection: {
    paddingHorizontal: 26,
    paddingBottom: 8,
    gap: 13,
    zIndex: 1,
  },

  /* Shared icon wrap */
  btnIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnIconWrapSecondary: {
    backgroundColor: `${PURPLE}14`,
  },

  /* Giriş Yap — gradient */
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 18,
    gap: 13,
    shadowColor: "#5A3BB2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 10,
  },
  primaryBtnText: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    letterSpacing: 0.2,
  },

  /* Kayıt Ol — white card */
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 18,
    gap: 13,
    borderWidth: 1.5,
    borderColor: `${PURPLE}20`,
    shadowColor: "#2D1B4E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 5,
  },
  secondaryBtnText: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#1A1A2E",
    letterSpacing: 0.2,
  },

  /* Terms */
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 2,
    marginTop: 2,
  },
  heartBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: `${PURPLE}10`,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888",
    lineHeight: 20,
  },
  termsLink: {
    color: PURPLE,
    fontFamily: "Inter_600SemiBold",
  },

  /* Bottom paw */
  bottomPaw: {
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
    opacity: 0.45,
    zIndex: 1,
  },
});
