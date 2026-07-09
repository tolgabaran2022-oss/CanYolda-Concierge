import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ApiStoryGroup } from "@/lib/storiesApi";

const PURPLE = "#7B5EA7";

interface Props {
  stories: ApiStoryGroup[];
  currentUserId?: string;
  onPressGroup: (group: ApiStoryGroup) => void;
  onAddStory: () => void;
}

export function StoryBar({ stories, currentUserId, onPressGroup, onAddStory }: Props) {
  // Current user first if they have stories, otherwise show add button
  const currentUserGroup = stories.find((g) => g.userId === currentUserId);
  const otherGroups = stories.filter((g) => g.userId !== currentUserId);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={S.scroll}
      contentContainerStyle={S.content}
    >
      {/* Add story button */}
      <Pressable
        style={S.item}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onAddStory();
        }}
      >
        <View style={S.addCircle}>
          <View style={S.addInner}>
            <Ionicons name="add" size={22} color={PURPLE} />
          </View>
        </View>
        <Text style={S.name} numberOfLines={1}>
          Hikayeni{"\n"}Ekle
        </Text>
      </Pressable>

      {/* Current user's stories (if any) */}
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
          <Text style={S.name} numberOfLines={1}>
            {currentUserGroup.username}
          </Text>
        </Pressable>
      )}

      {/* Other users' stories */}
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
          <Text style={S.name} numberOfLines={1}>
            {group.username}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const S = StyleSheet.create({
  scroll:   { flexGrow: 0 },
  content:  { paddingHorizontal: 14, paddingVertical: 12, gap: 14 },

  item:     { alignItems: "center", gap: 5, width: 68 },

  addCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
    borderColor: "rgba(123,94,167,0.2)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(123,94,167,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  gradientRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    padding: 2.5,
  },
  avatarWrap: {
    width: 61,
    height: 61,
    borderRadius: 30.5,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    overflow: "hidden",
  },
  seenCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: "#DDDDE8",
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%" },

  name: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#333",
    textAlign: "center",
    lineHeight: 14,
  },
});
