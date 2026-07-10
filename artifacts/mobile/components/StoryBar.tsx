import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ApiStoryGroup } from "@/lib/storiesApi";
import { useTheme } from "@/hooks/useTheme";

const PURPLE  = "#7B5EA7";
const PURPLE2 = "#5B3FD6";
const IS_WEB  = Platform.OS === "web";
const AV      = IS_WEB ? 50 : 68;
const AVR     = AV / 2;
const IW      = IS_WEB ? 60 : 72;

/* ── Safe avatar: handles empty/null/broken URLs with initials fallback ── */
function SafeAvatar({ uri, name, size }: { uri?: string | null; name?: string; size: number }) {
  const [failed, setFailed] = useState(false);
  const isValid =
    !!uri &&
    uri.trim().length > 0 &&
    (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("data:"));

  if (!isValid || failed) {
    const initial = ((name ?? "?").trim().charAt(0) || "?").toUpperCase();
    return (
      <LinearGradient
        colors={["#C278F0", PURPLE2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: "#FFF", fontSize: size * 0.34, fontFamily: "Inter_700Bold" }}>
          {initial}
        </Text>
      </LinearGradient>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: "100%", height: "100%" }}
      contentFit="cover"
      onError={() => setFailed(true)}
    />
  );
}

interface Props {
  stories: ApiStoryGroup[];
  currentUserId?: string;
  currentUserAvatar?: string;
  currentUserName?: string;
  onPressGroup: (group: ApiStoryGroup) => void;
  onAddStory: () => void;
}

export function StoryBar({
  stories,
  currentUserId,
  currentUserAvatar,
  currentUserName,
  onPressGroup,
  onAddStory,
}: Props) {
  const T = useTheme();
  const currentUserGroup = stories.find((g) => g.userId === currentUserId);
  const otherGroups      = stories.filter((g) => g.userId !== currentUserId);

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentUserGroup) onPressGroup(currentUserGroup);
    else onAddStory();
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[S.scroll, { backgroundColor: T.bg }]}
      contentContainerStyle={S.content}
    >
      {/* ── Add / own story ── */}
      <Pressable style={S.item} onPress={handleAdd}>
        {currentUserGroup?.hasUnseen ? (
          /* own unseen story: gradient ring */
          <LinearGradient
            colors={["#C278F0", PURPLE, PURPLE2]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={S.gradientRing}
          >
            <View style={S.avatarWrap}>
              <SafeAvatar uri={currentUserGroup.avatarUrl || currentUserAvatar} name={currentUserName} size={AV} />
            </View>
            <View style={S.addBadge}>
              <Ionicons name="checkmark" size={9} color="#FFF" />
            </View>
          </LinearGradient>
        ) : currentUserAvatar ? (
          /* has avatar, no story yet: avatar + "+" badge */
          <View style={S.seenCircle}>
            <SafeAvatar uri={currentUserAvatar} name={currentUserName} size={AV} />
            <View style={S.addBadge}>
              <Ionicons name="add" size={10} color="#FFF" />
            </View>
          </View>
        ) : (
          /* no avatar: dashed add circle */
          <View style={S.addCircle}>
            <View style={S.addInner}>
              <Ionicons name="add" size={IS_WEB ? 18 : 22} color={PURPLE} />
            </View>
          </View>
        )}
        <Text style={[S.name, { color: T.textMuted }]} numberOfLines={1}>
          Hikayen{"\n"}Ekle
        </Text>
      </Pressable>

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
              colors={["#C278F0", PURPLE, PURPLE2]}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={S.gradientRing}
            >
              <View style={S.avatarWrap}>
                <SafeAvatar uri={group.avatarUrl} name={group.username} size={AV} />
              </View>
            </LinearGradient>
          ) : (
            <View style={S.seenCircle}>
              <SafeAvatar uri={group.avatarUrl} name={group.username} size={AV} />
            </View>
          )}
          <Text style={[S.name, { color: T.textMuted }]} numberOfLines={1}>
            {(group.username ?? "").length > 11
              ? (group.username ?? "").slice(0, 10) + "…"
              : (group.username ?? "")}
          </Text>
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
    position: "relative",
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
    position: "relative",
  },

  addBadge: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: IS_WEB ? 14 : 18,
    height: IS_WEB ? 14 : 18,
    borderRadius: IS_WEB ? 7 : 9,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },

  name: {
    fontSize: IS_WEB ? 10 : 11,
    fontFamily: "Inter_500Medium",
    color: "#333",
    textAlign: "center",
    lineHeight: IS_WEB ? 13 : 14,
  },
});
