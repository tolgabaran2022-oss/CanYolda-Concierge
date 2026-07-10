import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBadge, STATUS_COLORS } from "@/components/StatusBadge";
import type { StrayAnimal } from "@/contexts/AnimalsContext";
import { getDefaultAnimalImageUri } from "@/utils/animalDefaults";
import { formatTimeAgo } from "@/utils/formatters";

const C = {
  purple:  "#7B5EA7",
  purpleD: "#3D2080",
  text:    "#1A0A3C",
  muted:   "#8B8FA8",
  card:    "#FFFFFF",
  border:  "#EEE9F8",
  bg:      "#F8F9FC",
  divider: "#F4F0FC",
};

interface Props {
  animal: StrayAnimal;
  onLike?: (id: string) => void;
  index?: number;
}

export function AnimalCard({ animal, onLike, index = 0 }: Props) {
  const router   = useRouter();
  const [liked, setLiked] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const delay = Math.min(index * 60, 300);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.timing(pressScale, {
      toValue: 0.975,
      duration: 80,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(pressScale, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked((v) => !v);
    onLike?.(animal.id);
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1,   duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const statusDotColor = STATUS_COLORS[animal.status];
  const thumbUri = animal.image ?? animal.animalImage ?? getDefaultAnimalImageUri(animal.animalType);

  return (
    <Animated.View
      style={[
        S.wrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: pressScale }],
        },
      ]}
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/animal/${animal.id}` as any);
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={S.card}
      >
        {/* Thumbnail */}
        <View style={S.thumbWrap}>
          <Image
            source={{ uri: thumbUri }}
            style={S.thumb}
            contentFit="cover"
            transition={180}
          />
          <View style={[S.statusDot, { backgroundColor: statusDotColor }]} />
        </View>

        {/* Main content */}
        <View style={S.content}>
          <StatusBadge status={animal.status} size="sm" />
          <Text style={S.notes} numberOfLines={2}>
            {animal.notes || "Not eklenmemiş"}
          </Text>
          <Text style={S.meta}>
            <Text style={S.metaName}>{animal.userName}</Text>
            <Text style={S.dot}> · </Text>
            {formatTimeAgo(animal.timestamp)}
          </Text>
          {animal.locationName ? (
            <View style={S.locRow}>
              <Ionicons name="location-outline" size={11} color={C.muted} />
              <Text style={S.locText} numberOfLines={1}>{animal.locationName}</Text>
            </View>
          ) : null}
        </View>

        {/* Arrow */}
        <View style={S.arrowWrap}>
          <View style={S.arrowCircle}>
            <Ionicons name="chevron-forward" size={13} color={C.purple} />
          </View>
        </View>
      </Pressable>

      {/* Interaction row */}
      <View style={S.divider} />
      <View style={S.interactRow}>

        {/* Like */}
        <Pressable
          onPress={handleLike}
          style={({ pressed }) => [S.interactBtn, pressed && { opacity: 0.7 }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={17}
              color={liked ? "#EF4444" : C.muted}
            />
          </Animated.View>
          <Text style={[S.interactText, liked && { color: "#EF4444" }]}>
            {animal.fedByUsers.length + (liked ? 1 : 0)}
          </Text>
        </Pressable>

        <View style={S.interactSep} />

        {/* Comment */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/animal/${animal.id}` as any);
          }}
          style={({ pressed }) => [S.interactBtn, pressed && { opacity: 0.7 }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chatbubble-outline" size={16} color={C.muted} />
          <Text style={S.interactText}>{animal.comments.length}</Text>
        </Pressable>

        <View style={S.interactSep} />

        {/* Location */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert(
              "Konumu Aç",
              animal.locationName
                ? `${animal.locationName} konumunu haritada aç?`
                : "Konum bilgisi mevcut değil.",
              animal.locationName
                ? [{ text: "İptal", style: "cancel" }, { text: "Aç", style: "default" }]
                : [{ text: "Tamam" }]
            );
          }}
          style={({ pressed }) => [S.interactBtn, pressed && { opacity: 0.7 }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="location-outline" size={16} color={C.muted} />
          <Text style={S.interactText}>Konumu Aç</Text>
        </Pressable>

        <View style={{ flex: 1 }} />

      </View>
    </Animated.View>
  );
}

const S = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 22,
    backgroundColor: C.card,
    shadowColor: "#1E0B4B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 14,
  },

  /* Thumbnail */
  thumbWrap: {
    width: 60,
    height: 60,
    borderRadius: 14,
    overflow: "visible",
    flexShrink: 0,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: "#EDE9F8",
  },
  statusDot: {
    position: "absolute",
    top: -3,
    left: -3,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },

  /* Content */
  content: { flex: 1, gap: 5 },
  notes: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  meta: {
    fontSize: 11.5,
    fontFamily: "Inter_400Regular",
    color: C.muted,
  },
  metaName: {
    fontFamily: "Inter_500Medium",
    color: "#5C4A7A",
  },
  dot: { color: "#C0B8D8" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  locText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.muted,
    flex: 1,
  },

  /* Arrow */
  arrowWrap: { justifyContent: "center" },
  arrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: `${C.purple}10`,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Interaction row */
  divider: {
    height: 1,
    backgroundColor: C.divider,
    marginHorizontal: 14,
  },
  interactRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 11,
    alignItems: "center",
    gap: 0,
  },
  interactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  interactSep: {
    width: 1,
    height: 16,
    backgroundColor: C.border,
    marginHorizontal: 8,
  },
  interactText: {
    fontSize: 12.5,
    fontFamily: "Inter_500Medium",
    color: C.muted,
  },
  urgentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  urgentText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#DC2626",
  },
});
