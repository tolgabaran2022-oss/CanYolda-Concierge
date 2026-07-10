import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectStory: () => void;
  onSelectPost: () => void;
}

export function ShareSelectionSheet({
  visible,
  onClose,
  onSelectStory,
  onSelectPost,
}: Props) {
  const T = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(340)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 220,
          mass: 0.85,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 340,
          duration: 210,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleSelectStory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    setTimeout(onSelectStory, 240);
  };

  const handleSelectPost = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    setTimeout(onSelectPost, 240);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View style={[SS.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          SS.sheet,
          {
            transform: [{ translateY: slideAnim }],
            paddingBottom: Math.max(insets.bottom, 16) + 8,
            backgroundColor: T.card,
          },
        ]}
      >
        {/* Handle */}
        <View style={SS.handleWrap}>
          <View style={SS.handle} />
        </View>

        {/* Title */}
        <Text style={[SS.title, { color: T.text }]}>Yeni Paylaşım</Text>

        {/* Options */}
        <View style={SS.optionsWrap}>
          {/* Story */}
          <Pressable
            style={({ pressed }) => [
              SS.option,
              { backgroundColor: T.bg, opacity: pressed ? 0.76 : 1 },
            ]}
            onPress={handleSelectStory}
          >
            <LinearGradient
              colors={["#C278F0", "#7B5EA7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={SS.iconCircle}
            >
              <Ionicons name="radio-button-on" size={24} color="#FFF" />
            </LinearGradient>
            <View style={SS.optionTextBlock}>
              <Text style={[SS.optionTitle, { color: T.text }]}>Hikâye</Text>
              <Text style={[SS.optionSub, { color: T.textMuted }]}>
                24 saat boyunca görünen bir hikâye paylaş
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
          </Pressable>

          {/* Post */}
          <Pressable
            style={({ pressed }) => [
              SS.option,
              { backgroundColor: T.bg, opacity: pressed ? 0.76 : 1 },
            ]}
            onPress={handleSelectPost}
          >
            <LinearGradient
              colors={["#9478D8", "#5B3FD6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={SS.iconCircle}
            >
              <Ionicons name="images" size={22} color="#FFF" />
            </LinearGradient>
            <View style={SS.optionTextBlock}>
              <Text style={[SS.optionTitle, { color: T.text }]}>Gönderi</Text>
              <Text style={[SS.optionSub, { color: T.textMuted }]}>
                Profilinde ve akışta kalıcı bir gönderi paylaş
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
          </Pressable>
        </View>

        {/* Cancel */}
        <Pressable
          style={({ pressed }) => [
            SS.cancelBtn,
            { backgroundColor: T.bg, opacity: pressed ? 0.76 : 1 },
          ]}
          onPress={onClose}
        >
          <Text style={[SS.cancelText, { color: T.textMuted }]}>Vazgeç</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const SS = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.46)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 26,
  },
  handleWrap: {
    alignItems: "center",
    paddingBottom: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.14)",
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 2,
  },
  optionsWrap: {
    gap: 10,
    marginBottom: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextBlock: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  optionSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  cancelBtn: {
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 4,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
});
