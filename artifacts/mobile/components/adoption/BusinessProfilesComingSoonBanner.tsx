import React, { useCallback, useRef, useState } from "react";
import {
  BackHandler,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";

const BANNER = require("@/assets/images/business-profiles-banner.png");

const PURPLE       = "#7C3AED";
const PURPLE_LIGHT = "#A855F7";
const PURPLE_DARK  = "#6D28D9";

/* ─────────────────────────────────────────────────────────── */

const BusinessProfilesComingSoonBanner = React.memo(() => {
  const [visible, setVisible] = useState(false);
  const opening = useRef(false);
  const insets = useSafeAreaInsets();

  const openModal = useCallback(() => {
    if (opening.current) return;
    opening.current = true;
    setVisible(true);
    setTimeout(() => { opening.current = false; }, 600);
  }, []);

  const closeModal = useCallback(() => {
    setVisible(false);
  }, []);

  /* Android hardware back */
  React.useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      closeModal();
      return true;
    });
    return () => sub.remove();
  }, [visible, closeModal]);

  return (
    <>
      {/* ── Banner ── */}
      <Pressable
        onPress={openModal}
        style={s.container}
        accessibilityRole="button"
        accessibilityLabel="Veteriner ve Petshop profilleri hakkında bilgi al"
      >
        {({ pressed }) => (
          <View style={[s.inner, pressed && { opacity: 0.88 }]}>
            <Image
              source={BANNER}
              style={s.image}
              resizeMode="cover"
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>
        )}
      </Pressable>

      {/* ── Modal ── */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={closeModal} accessibilityLabel="Pencereyi kapat">
          <View style={s.backdrop} />
        </TouchableWithoutFeedback>

        {/* Card (centered, above backdrop) */}
        <View
          style={[
            s.cardWrap,
            { paddingBottom: insets.bottom + 24, paddingTop: insets.top + 24 },
          ]}
          pointerEvents="box-none"
        >
          <View style={s.card}>
            {/* Close button */}
            <Pressable
              onPress={closeModal}
              style={s.closeBtn}
              hitSlop={8}
              accessibilityLabel="Pencereyi kapat"
              accessibilityRole="button"
            >
              <Icon name="x" size={16} color={PURPLE} />
            </Pressable>

            {/* Icon */}
            <LinearGradient
              colors={[PURPLE_LIGHT, PURPLE_DARK]}
              style={s.iconCircle}
            >
              <Icon name="Store" size={26} color="white" />
            </LinearGradient>

            {/* Badge */}
            <View style={s.badge}>
              <Text style={s.badgeTxt}>ÇOK YAKINDA</Text>
            </View>

            {/* Title */}
            <Text style={s.title}>Veteriner ve Petshop Profilleri</Text>

            {/* Message */}
            <Text style={s.message}>
              Bu özellik üzerinde çalışıyoruz. Kullanıma sunulduğunda en kısa sürede bilgilendirileceksiniz.
            </Text>

            {/* Tamam button */}
            <Pressable onPress={closeModal} style={s.btnWrap}>
              {({ pressed }) => (
                <LinearGradient
                  colors={[PURPLE_LIGHT, PURPLE_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[s.btn, { opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text style={s.btnTxt}>Tamam</Text>
                </LinearGradient>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
});

BusinessProfilesComingSoonBanner.displayName = "BusinessProfilesComingSoonBanner";
export default BusinessProfilesComingSoonBanner;

/* ─── styles ──────────────────────────────────────────────── */
const s = StyleSheet.create({
  /* banner */
  container: {
    width:        "100%",
    borderRadius: 20,
    overflow:     "hidden",
  },
  inner: {
    height:          170,
    backgroundColor: "#F6F0FF",
  },
  image: {
    width:  "100%",
    height: "100%",
  },

  /* backdrop */
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.30)",
  },

  /* card wrapper */
  cardWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems:     "center",
    justifyContent: "center",
    pointerEvents:  "box-none",
  } as any,

  /* card */
  card: {
    width:           "88%",
    maxWidth:        380,
    backgroundColor: "#FFFFFF",
    borderRadius:    24,
    padding:         24,
    alignItems:      "center",
    borderWidth:     1,
    borderColor:     "rgba(124,58,237,0.10)",
    /* shadow */
    ...Platform.select({
      ios: {
        shadowColor:   "#7C3AED",
        shadowOffset:  { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius:  20,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },

  /* close */
  closeBtn: {
    position:        "absolute",
    top:             14,
    right:           14,
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: "#EDE9FE",
    alignItems:      "center",
    justifyContent:  "center",
    zIndex:          1,
  },

  /* icon */
  iconCircle: {
    width:          64,
    height:         64,
    borderRadius:   32,
    alignItems:     "center",
    justifyContent: "center",
    marginBottom:   16,
    marginTop:      4,
  },

  /* badge */
  badge: {
    backgroundColor:  "#EDE9FE",
    borderRadius:     20,
    paddingHorizontal: 12,
    paddingVertical:   4,
    marginBottom:      12,
  },
  badgeTxt: {
    fontSize:      11,
    fontFamily:    "Inter_700Bold",
    color:         PURPLE,
    letterSpacing: 0.5,
  },

  /* title */
  title: {
    fontSize:      18,
    fontFamily:    "Inter_700Bold",
    color:         "#28105E",
    textAlign:     "center",
    marginBottom:  10,
    lineHeight:    24,
  },

  /* message */
  message: {
    fontSize:      14,
    fontFamily:    "Inter_400Regular",
    color:         "#6B7280",
    textAlign:     "center",
    lineHeight:    21,
    marginBottom:  24,
  },

  /* button */
  btnWrap: { width: "100%", borderRadius: 14, overflow: "hidden" },
  btn: {
    height:         50,
    alignItems:     "center",
    justifyContent: "center",
    borderRadius:   14,
  },
  btnTxt: {
    fontSize:   15,
    fontFamily: "Inter_700Bold",
    color:      "white",
  },
});
