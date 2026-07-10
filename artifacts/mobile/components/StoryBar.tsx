import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ApiStoryGroup } from "@/lib/storiesApi";

const PURPLE = "#7B5EA7";
const IS_WEB = Platform.OS === "web";
const AV     = IS_WEB ? 50 : 68;   // avatar circle diameter
const AVR    = AV / 2;
const IW     = IS_WEB ? 60 : 72;   // item column width

interface Props {
  stories: ApiStoryGroup[];
  currentUserId?: string;
  onPressGroup: (group: ApiStoryGroup) => void;
  onAddStory: () => void;
}

export function StoryBar({ stories, currentUserId, onPressGroup, onAddStory }: Props) {
  const currentUserGroup = stories.find((g) => g.userId === currentUserId);
  const otherGroups      = stories.filter((g) => g.userId !== currentUserId);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={S.scroll}
      contentContainerStyle={S.content}
    >
      {/* ── Add story ── */}
      <Pressable
        style={S.item}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onAddStory();
        }}
      >
        <View style={S.addCircle}>
          <View style={S.addInner}>
            <Ionicons name="add" size={IS_WEB ? 18 : 22} color={PURPLE} />
          </View>
        </View>
        <Text style={S.name} numberOfLines={1}>
          Hikayeni{"\n"}Ekle
        </Text>
      </Pressable>

      {/* ── Current user's stories ── */}
      {currentUserGroup && (
        <Pressable
          style={S.item}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPressGroup(currentUserGroup);
          }}
        >
          {currentUserGroup.hasUnseen ? (
            <LinearGradient
              colors={["#C278F0", "#7B5EA7", "#5B3FD6"]}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={S.gradientRing}
            >
              <View style={S.avatarWrap}>
                <Image source={{ uri: currentUserGroup.avatarUrl }} style={S.avatar} contentFit="cover" />
              </View>
            </LinearGradient>
          ) : (
            <View style={S.seenCircle}>
              <Image source={{ uri: currentUserGroup.avatarUrl }} style={S.avatar} contentFit="cover" />
            </View>
          )}
          <Text style={S.name} numberOfLines={1}>{currentUserGroup.username}</Text>
        </Pressable>
      )}

      {/* ── Other users' stories ── */}
      {otherGroups.map((group) => (
        <Pressable
          key={group.userId}
          style={S.item}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPressGroup(group);
          }}
        >
          {group.hasUnseen ? (
            <LinearGradient
              colors={["#C278F0", "#7B5EA7", "#5B3FD6"]}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={S.gradientRing}
            >
              <View style={S.avatarWrap}>
                <Image source={{ uri: group.avatarUrl }} style={S.avatar} contentFit="cover" />
              </View>
            </LinearGradient>
          ) : (
            <View style={S.seenCircle}>
              <Image source={{ uri: group.avatarUrl }} style={S.avatar} contentFit="cover" />
            </View>
          )}
          <Text style={S.name} numberOfLines={1}>{group.username}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const S = StyleSheet.create({
  scroll:   { flexGrow: 0 },
  content:  {
    paddingHorizontal: 16,
    paddingVertical: IS_WEB ? 8 : 12,
    gap: IS_WEB ? 12 : 16,
  },

  item: { alignItems: "center", gap: IS_WEB ? 4 : 6, width: IW },

  addCircle: {
    width: AV,
    height: AV,
    borderRadius: AVR,
    borderWidth: 1.5,
    borderColor: "rgba(123,94,167,0.25)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(123,94,167,0.04)",
  },
  addInner: {
    width: IS_WEB ? 40 : 56,
    height: IS_WEB ? 40 : 56,
    borderRadius: IS_WEB ? 20 : 28,
    backgroundColor: "rgba(123,94,167,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  gradientRing: {
    width: AV,
    height: AV,
    borderRadius: AVR,
    alignItems: "center",
    justifyContent: "center",
    padding: 2.5,
  },
  avatarWrap: {
    width: AV - 7,
    height: AV - 7,
    borderRadius: (AV - 7) / 2,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    overflow: "hidden",
  },
  seenCircle: {
    width: AV,
    height: AV,
    borderRadius: AVR,
    borderWidth: 2,
    borderColor: "#DDDDE8",
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%" },

  name: {
    fontSize: IS_WEB ? 10 : 11,
    fontFamily: "Inter_500Medium",
    color: "#333",
    textAlign: "center",
    lineHeight: IS_WEB ? 13 : 14,
  },
});
