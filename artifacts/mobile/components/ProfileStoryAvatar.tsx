import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { StoryViewer } from "@/components/StoryViewer";
import { apiFetchStories } from "@/lib/storiesApi";
import type { ApiStoryGroup } from "@/lib/storiesApi";

const CAT_AVATAR_DEFAULT = "https://loremflickr.com/300/300/cat?lock=500";

interface Props {
  userId: string;
  username: string;
  avatarUrl?: string | null;
  size?: number;
}

export function ProfileStoryAvatar({
  userId,
  username,
  avatarUrl,
  size = 90,
}: Props) {
  const [storyGroup, setStoryGroup]   = useState<ApiStoryGroup | null>(null);
  const [viewerOpen, setViewerOpen]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const pulseAnim                     = useRef(new Animated.Value(1)).current;
  const pulseRef                      = useRef<Animated.CompositeAnimation | null>(null);

  const hasActiveStories =
    storyGroup !== null && storyGroup.stories.length > 0;

  /* ── Fetch own stories ──────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetchStories(userId)
      .then((groups) => {
        if (cancelled) return;
        const mine = groups.find((g) => g.userId === userId) ?? null;
        setStoryGroup(mine);
      })
      .catch(() => { if (!cancelled) setStoryGroup(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  /* ── Pulse animation when stories exist ────────── */
  useEffect(() => {
    if (hasActiveStories) {
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1400,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1400,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ])
      );
      pulseRef.current.start();
    } else {
      pulseRef.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => { pulseRef.current?.stop(); };
  }, [hasActiveStories, pulseAnim]);

  /* ── Handlers ────────────────────────────────────── */
  const handlePress = () => {
    if (!hasActiveStories) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewerOpen(true);
  };

  const closeViewer = () => setViewerOpen(false);

  /* ── Derived sizes ───────────────────────────────── */
  const ringSize    = size;
  const innerSize   = size - 7;
  const halfRing    = ringSize / 2;
  const halfInner   = innerSize / 2;
  const src         = avatarUrl ?? CAT_AVATAR_DEFAULT;

  return (
    <>
      <Pressable onPress={handlePress} accessibilityLabel="Profil hikayesi">
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          {hasActiveStories ? (
            <LinearGradient
              colors={["#C278F0", "#7B5EA7", "#5B3FD6"]}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={[S.ring, { width: ringSize, height: ringSize, borderRadius: halfRing }]}
            >
              <View
                style={[
                  S.avatarBorder,
                  { width: innerSize, height: innerSize, borderRadius: halfInner },
                ]}
              >
                <Image source={{ uri: src }} style={S.avatarImg} contentFit="cover" />
              </View>
            </LinearGradient>
          ) : (
            <View
              style={[S.plainRing, { width: ringSize, height: ringSize, borderRadius: halfRing }]}
            >
              <View
                style={[
                  S.avatarBorder,
                  S.avatarBorderPlain,
                  { width: innerSize, height: innerSize, borderRadius: halfInner },
                ]}
              >
                <Image source={{ uri: src }} style={S.avatarImg} contentFit="cover" />
              </View>
            </View>
          )}
        </Animated.View>
      </Pressable>

      <StoryViewer
        visible={viewerOpen}
        group={storyGroup}
        viewerId={userId}
        onClose={closeViewer}
        onNextGroup={closeViewer}
        onPrevGroup={closeViewer}
      />
    </>
  );
}

const S = StyleSheet.create({
  ring: {
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  plainRing: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E0DAF0",
  },
  avatarBorder: {
    overflow: "hidden",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },
  avatarBorderPlain: {
    borderWidth: 0,
  },
  avatarImg: { width: "100%", height: "100%" },
});
