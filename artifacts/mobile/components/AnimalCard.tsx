import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBadge, STATUS_COLORS } from "@/components/StatusBadge";
import type { StrayAnimal } from "@/contexts/AnimalsContext";
import { formatTimeAgo } from "@/utils/formatters";

const C = {
  purple: "#7B5EA7",
  text:   "#111827",
  muted:  "#6B7280",
  card:   "#FFFFFF",
  border: "#F0EDF8",
  bg:     "#F9F8FF",
};

interface Props {
  animal: StrayAnimal;
  onLike?: (id: string) => void;
}

export function AnimalCard({ animal, onLike }: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);

  const statusDotColor = STATUS_COLORS[animal.status];

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked((v) => !v);
    onLike?.(animal.id);
  };

  return (
    <View style={S.wrapper}>
      <Pressable
        style={({ pressed }) => [S.card, pressed && { opacity: 0.95 }]}
        onPress={() => router.push(`/animal/${animal.id}` as any)}
      >
        {/* Thumbnail */}
        <View style={S.thumbWrap}>
          {animal.image ? (
            <Image source={{ uri: animal.image }} style={S.thumb} contentFit="cover" />
          ) : (
            <View style={S.thumbPlaceholder}>
              <Ionicons name="camera-outline" size={24} color="#C0B8D8" />
            </View>
          )}
          {/* Status dot */}
          <View style={[S.statusDot, { backgroundColor: statusDotColor }]} />
        </View>

        {/* Main content */}
        <View style={S.content}>
          <StatusBadge status={animal.status} size="sm" />
          <Text style={S.notes} numberOfLines={2}>{animal.notes || "Not eklenmemiş"}</Text>
          <Text style={S.meta}>
            {animal.userName}
            <Text style={S.dot}> · </Text>
            {formatTimeAgo(animal.timestamp)}
          </Text>
          {animal.locationName ? (
            <View style={S.locRow}>
              <Ionicons name="location-outline" size={12} color={C.muted} />
              <Text style={S.locText}>{animal.locationName}</Text>
            </View>
          ) : null}
        </View>

        {/* Arrow */}
        <View style={S.arrowWrap}>
          <View style={S.arrowCircle}>
            <Ionicons name="chevron-forward" size={14} color={C.purple} />
          </View>
        </View>
      </Pressable>

      {/* Interaction row */}
      <View style={S.interactRow}>
        <Pressable onPress={handleLike} style={S.interactBtn} hitSlop={8}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={16}
            color={liked ? "#FF3B6B" : C.muted}
          />
          <Text style={S.interactText}>
            {animal.fedByUsers.length + (liked ? 1 : 0)}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push(`/animal/${animal.id}` as any)}
          style={S.interactBtn}
          hitSlop={8}
        >
          <Ionicons name="chatbubble-outline" size={15} color={C.muted} />
          <Text style={S.interactText}>{animal.comments.length}</Text>
        </Pressable>

        <Pressable
          onPress={() =>
            Alert.alert(
              "Konumu Aç",
              animal.locationName
                ? `${animal.locationName} konumunu haritada aç?`
                : "Konum bilgisi mevcut değil.",
              animal.locationName
                ? [{ text: "İptal", style: "cancel" }, { text: "Aç", style: "default" }]
                : [{ text: "Tamam" }]
            )
          }
          style={S.interactBtn}
          hitSlop={8}
        >
          <Ionicons name="location-outline" size={15} color={C.muted} />
          <Text style={S.interactText}>Konumu Aç</Text>
        </Pressable>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 18,
    backgroundColor: C.card,
    shadowColor: "#2D1B4E",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },

  /* Card top row */
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },

  /* Thumbnail */
  thumbWrap: {
    width: 88,
    height: 88,
    borderRadius: 14,
    overflow: "visible",
    flexShrink: 0,
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 14,
  },
  thumbPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 14,
    backgroundColor: "#EDE9F8",
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    position: "absolute",
    top: -4,
    left: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },

  /* Content */
  content: { flex: 1, gap: 4 },
  notes: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    lineHeight: 20,
  },
  meta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.muted,
  },
  dot: { color: "#C0B8D8" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  locText: { fontSize: 11.5, fontFamily: "Inter_400Regular", color: C.muted },

  /* Arrow */
  arrowWrap:   { paddingLeft: 4 },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `rgba(123,94,167,0.10)`,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Interaction row */
  interactRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F4F0FC",
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 20,
    alignItems: "center",
  },
  interactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  interactText: {
    fontSize: 12.5,
    fontFamily: "Inter_500Medium",
    color: C.muted,
  },
});
