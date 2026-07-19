import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/Icon";

/* useNativeDriver is unsupported on web */
const ND = Platform.OS !== "web";

/* ─── colour tokens ───────────────────────────────────────── */
const PURPLE       = "#7C3AED";
const PURPLE_LIGHT = "#A855F7";
const PURPLE_DARK  = "#6D28D9";
const TEXT_DARK    = "#28105E";
const TEXT_MUTED   = "#5E6175";

/* ─── asset ───────────────────────────────────────────────── */
const ILLUSTRATION = require("@/assets/images/business-profiles-coming-soon.png");

/* ═══════════════════════════════════════════════════════════ */

const BusinessProfilesComingSoonBanner = React.memo(() => {
  const { width } = useWindowDimensions();
  const narrow    = width < 360;

  /* ── notification state ───────────────────────────────── */
  const [notified, setNotified] = useState(false);

  /* ── reduce-motion guard ──────────────────────────────── */
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => sub.remove();
  }, []);

  /* ── animated values ──────────────────────────────────── */
  const entryOpacity  = useRef(new Animated.Value(0)).current;
  const entryY        = useRef(new Animated.Value(8)).current;
  const floatY        = useRef(new Animated.Value(0)).current;
  const badgeScale    = useRef(new Animated.Value(1)).current;
  const badgeOpacity  = useRef(new Animated.Value(0.92)).current;
  const sparkleRot    = useRef(new Animated.Value(0)).current;
  const shimmerX      = useRef(new Animated.Value(-40)).current;

  /* ── loop refs (for cleanup) ──────────────────────────── */
  const loopRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    /* E. Entry */
    Animated.parallel([
      Animated.timing(entryOpacity, { toValue: 1, duration: 450, useNativeDriver: ND }),
      Animated.timing(entryY,       { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
    ]).start();

    if (reducedMotion) return;

    const loops: Animated.CompositeAnimation[] = [];

    /* A. Float */
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -3, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: ND }),
        Animated.timing(floatY, { toValue:  0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: ND }),
      ])
    );
    float.start();
    loops.push(float);

    /* B. Badge pulse */
    const badge = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(badgeScale,   { toValue: 1.04, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: ND }),
          Animated.timing(badgeOpacity, { toValue: 1,    duration: 1100, useNativeDriver: ND }),
        ]),
        Animated.parallel([
          Animated.timing(badgeScale,   { toValue: 1,    duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: ND }),
          Animated.timing(badgeOpacity, { toValue: 0.92, duration: 1100, useNativeDriver: ND }),
        ]),
      ])
    );
    badge.start();
    loops.push(badge);

    /* C. Sparkle rotation */
    const sparkle = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleRot, { toValue:  12, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: ND }),
        Animated.timing(sparkleRot, { toValue:   0, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: ND }),
        Animated.timing(sparkleRot, { toValue: -12, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: ND }),
        Animated.timing(sparkleRot, { toValue:   0, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: ND }),
      ])
    );
    sparkle.start();
    loops.push(sparkle);

    /* D. Button shimmer */
    shimmerX.setValue(-40);
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerX, { toValue: 240, duration: 3500, easing: Easing.linear, useNativeDriver: ND }),
        Animated.delay(1500),
      ])
    );
    shimmer.start();
    loops.push(shimmer);

    loopRef.current = loops;
    return () => loops.forEach((l) => l.stop());
  }, [reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── sparkle rotate interpolation ────────────────────── */
  const sparkleRotStr = sparkleRot.interpolate({
    inputRange:  [-12, 0, 12],
    outputRange: ["-12deg", "0deg", "12deg"],
  });

  /* ── notify handler ───────────────────────────────────── */
  const handleNotify = useCallback(() => {
    if (notified) return;
    setNotified(true);
    Alert.alert(
      "Bildirim Talebin Alındı",
      "Veteriner ve petshop işletme profilleri kullanıma açıldığında sana haber vereceğiz."
    );
  }, [notified]);

  /* ── responsive sizes ─────────────────────────────────── */
  const titleSize = narrow ? 15 : 17;
  const descSize  = narrow ? 9.5 : 10.5;

  /* ─────────────────────────────────────────────────────── */
  return (
    <Animated.View
      style={[s.root, { opacity: entryOpacity, transform: [{ translateY: entryY }] }]}
      accessibilityLabel="Çok yakında veteriner ve petshop işletme profilleri"
    >
      <LinearGradient
        colors={["#FFFFFF", "#F8F5FF", "#EEE7FF"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={s.gradient}
      >
        {/* Decorative paw prints */}
        <View style={[s.deco, { bottom: 10, left: 20, opacity: 0.04 }]} pointerEvents="none">
          <Icon name="paw" size={40} color={PURPLE} />
        </View>
        <View style={[s.deco, { top: 8, left: "45%", opacity: 0.04 }]} pointerEvents="none">
          <Icon name="paw" size={28} color={PURPLE} />
        </View>
        <View style={[s.deco, { bottom: 6, left: "30%", opacity: 0.035 }]} pointerEvents="none">
          <Icon name="paw" size={20} color={PURPLE} />
        </View>

        {/* ── Right: illustration (absolute) ── */}
        <Animated.View
          style={[s.illustrationWrap, { transform: [{ translateY: floatY }] }]}
          pointerEvents="none"
        >
          <Image
            source={ILLUSTRATION}
            style={s.illustration}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Animated.View>

        {/* ── Top-right COMING SOON badge ── */}
        <View style={s.comingSoonWrap}>
          <LinearGradient
            colors={[PURPLE_LIGHT, PURPLE_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.comingSoonBadge}
          >
            <Animated.View style={{ transform: [{ rotate: sparkleRotStr }] }}>
              <Icon name="Sparkles" size={8} color="white" />
            </Animated.View>
            <Text style={s.comingSoonTxt}>COMING SOON</Text>
          </LinearGradient>
        </View>

        {/* ── Left: content ── */}
        <View style={[s.leftContent, { width: narrow ? "62%" : "56%" }]}>

          {/* Store icon circle */}
          <LinearGradient colors={[PURPLE_LIGHT, PURPLE]} style={s.iconCircle}>
            <Icon name="Store" size={18} color="white" />
          </LinearGradient>

          {/* ÇOK YAKINDA badge */}
          <Animated.View style={{ transform: [{ scale: badgeScale }], opacity: badgeOpacity, alignSelf: "flex-start" }}>
            <LinearGradient
              colors={[PURPLE_LIGHT, PURPLE]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.topBadge}
            >
              <Text style={s.topBadgeTxt}>🚀 ÇOK YAKINDA!</Text>
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Text style={[s.title, { fontSize: titleSize }]} numberOfLines={3}>
            {"Veteriner & Petshop\nİşletme Profilleri"}
          </Text>

          {/* Description */}
          <Text style={[s.desc, { fontSize: descSize }]} numberOfLines={3}>
            Veteriner klinikleri ve petshoplar doğrulanmış işletme profilleriyle CanYoldaşı'nda yerini alacak.
          </Text>

          {/* Notify button */}
          <Pressable
            onPress={handleNotify}
            accessibilityLabel="İşletme profilleri özelliği kullanıma açıldığında bildirim al"
            accessibilityRole="button"
          >
            {({ pressed }) => (
              <View style={[s.btnOuter, { opacity: pressed ? 0.85 : 1 }]}>
                <LinearGradient
                  colors={notified ? ["#A78BFA", "#8B5CF6"] : [PURPLE_LIGHT, PURPLE_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.btnGrad}
                >
                  {!notified && !reducedMotion && (
                    <Animated.View
                      style={[s.shimmer, { transform: [{ translateX: shimmerX }] }]}
                      pointerEvents="none"
                    />
                  )}
                  <Icon name={notified ? "checkmark-circle" : "notification"} size={13} color="white" />
                  <Text style={s.btnTxt}>{notified ? "Bildirim Açıldı" : "İlk Sen Haberdar Ol"}</Text>
                </LinearGradient>
              </View>
            )}
          </Pressable>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

BusinessProfilesComingSoonBanner.displayName = "BusinessProfilesComingSoonBanner";
export default BusinessProfilesComingSoonBanner;

/* ─── styles ──────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: {
    borderRadius: 18,
    borderWidth:  1,
    borderColor:  "rgba(124, 58, 237, 0.10)",
    overflow:     "hidden",
    maxWidth:     720,
    alignSelf:    "stretch",
  },
  gradient: {
    padding:       16,
    minHeight:     128,
    flexDirection: "row",
    alignItems:    "flex-start",
  },
  deco: { position: "absolute" },

  /* illustration */
  illustrationWrap: {
    position: "absolute",
    right:    -4,
    bottom:   -4,
    width:    "48%",
    height:   "95%",
  },
  illustration: { width: "100%", height: "100%" },

  /* COMING SOON top-right */
  comingSoonWrap: { position: "absolute", top: 10, right: 10, zIndex: 2 },
  comingSoonBadge: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               3,
    borderRadius:      10,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  comingSoonTxt: {
    fontSize:      8,
    fontFamily:    "Inter_700Bold",
    color:         "white",
    letterSpacing: 0.4,
  },

  /* left content */
  leftContent: { gap: 7, zIndex: 1 },

  /* icon circle */
  iconCircle: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
  },

  /* ÇOK YAKINDA badge */
  topBadge: {
    borderRadius:      20,
    paddingHorizontal: 8,
    paddingVertical:   3,
    alignSelf:         "flex-start",
  },
  topBadgeTxt: { fontSize: 9, fontFamily: "Inter_700Bold", color: "white" },

  /* title */
  title: {
    lineHeight:    20,
    fontFamily:    "Inter_700Bold",
    color:         TEXT_DARK,
    letterSpacing: -0.2,
  },

  /* description */
  desc: { lineHeight: 14, fontFamily: "Inter_400Regular", color: TEXT_MUTED },

  /* button */
  btnOuter: { alignSelf: "flex-start", borderRadius: 12, overflow: "hidden", marginTop: 2 },
  btnGrad: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "center",
    gap:               7,
    minWidth:          145,
    height:            34,
    paddingHorizontal: 14,
    overflow:          "hidden",
  },
  btnTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: "white" },

  /* shimmer */
  shimmer: {
    position:        "absolute",
    top:             0,
    bottom:          0,
    width:           35,
    backgroundColor: "rgba(255,255,255,0.10)",
    zIndex:          2,
  },
});
