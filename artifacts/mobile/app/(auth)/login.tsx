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
  const { width: sw } = useWindowDimensions();

  const blobSize = (ratio: number, max: number) =>
    Math.min(sw * ratio, max);

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.safe,
          { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) },
        ]}
      >
        {/* ── Decorative blobs (responsive, no overflow) ───────── */}
        <View
          style={[
            styles.blob,
            {
              top: -blobSize(0.12, 50),
              right: -blobSize(0.12, 50),
              width: blobSize(0.45, 180),
              height: blobSize(0.45, 180),
              backgroundColor: BLOB_CREAM,
              opacity: 0.35,
            },
          ]}
        />
        <View
          style={[
            styles.blob,
            {
              bottom: -blobSize(0.10, 45),
              left: -blobSize(0.10, 45),
              width: blobSize(0.55, 220),
              height: blobSize(0.55, 220),
              backgroundColor: BLOB_PURPLE,
              opacity: 0.30,
            },
          ]}
        />
        <View
          style={[
            styles.blob,
            {
              bottom: blobSize(0.18, 90),
              right: -blobSize(0.12, 55),
              width: blobSize(0.35, 150),
              height: blobSize(0.35, 150),
              backgroundColor: BLOB_CREAM,
              opacity: 0.22,
            },
          ]}
        />

        {/* ── Hero graphic (centred, includes brand + pets) ──────── */}
        <View style={styles.heroWrap}>
          <Image
            source={HERO_IMAGE}
            style={styles.heroImage}
            contentFit="contain"
          />
        </View>

        {/* ── Buttons ─────────────────────────────────────────── */}
        <View style={styles.btnSection}>
          {/* Giriş Yap */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(auth)/login-form");
            }}
            style={({ pressed }) => ({
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
          >
            <LinearGradient
              colors={["#9478D8", "#5A3BB2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryBtn}
            >
              <Ionicons name="log-in-outline" size={22} color="#FFF" />
              <Text style={styles.primaryBtnText}>Giriş Yap</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="rgba(255,255,255,0.7)"
              />
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
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Ionicons name="person-add-outline" size={22} color="#1A1A2E" />
            <Text style={styles.secondaryBtnText}>Kayıt Ol</Text>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </Pressable>

          {/* Privacy / Terms */}
          <View style={styles.privacyRow}>
            <View style={styles.shieldBadge}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={PURPLE}
              />
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
          size={24}
          color={PURPLE}
          style={styles.bottomPaw}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1, justifyContent: "space-between" },

  /* Blob base */
  blob: {
    position: "absolute",
    borderRadius: 999,
    zIndex: 0,
  },

  /* Hero */
  heroWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    zIndex: 1,
  },
  heroImage: {
    width: "100%",
    maxWidth: 400,
    aspectRatio: 4265 / 4585,
    zIndex: 1,
  },

  /* Buttons */
  btnSection: {
    paddingHorizontal: 28,
    gap: 14,
    marginBottom: 4,
    zIndex: 1,
  },

  /* Giriş Yap */
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
    shadowColor: "#5A3BB2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnText: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
    letterSpacing: 0.3,
  },

  /* Kayıt Ol */
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
    borderWidth: 1.5,
    borderColor: "rgba(123,92,191,0.18)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  secondaryBtnText: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#1A1A2E",
    letterSpacing: 0.3,
  },

  /* Privacy */
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 2,
    marginTop: 6,
  },
  shieldBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(123,92,191,0.10)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#777",
    lineHeight: 21,
  },
  privacyLink: {
    color: PURPLE,
    fontFamily: "Inter_700Bold",
  },

  /* Bottom paw */
  bottomPaw: {
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
    opacity: 0.5,
    zIndex: 1,
  },
});
