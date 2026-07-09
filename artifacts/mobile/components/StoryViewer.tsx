import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiViewStory } from "@/lib/storiesApi";
import type { ApiStoryGroup } from "@/lib/storiesApi";

const { width: SW, height: SH } = Dimensions.get("window");
const PROGRESS_DURATION = 5000;

const C = {
  purple:     "#7B5EA7",
  purpleDark: "#4A2D8F",
};

interface Props {
  visible: boolean;
  group: ApiStoryGroup | null;
  viewerId: string;
  onClose: () => void;
  onNextGroup: () => void;
  onPrevGroup: () => void;
}

export function StoryViewer({ visible, group, viewerId, onClose, onNextGroup, onPrevGroup }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const animVal = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<number>(0);
  const remainingRef = useRef<number>(PROGRESS_DURATION);

  const stories = group?.stories ?? [];
  const current = stories[idx];

  const markViewed = useCallback(async (storyId: string) => {
    try {
      const { viewCount } = await apiViewStory(storyId, viewerId);
      setViewCounts((prev) => ({ ...prev, [storyId]: viewCount }));
    } catch {
      setViewCounts((prev) => ({ ...prev, [storyId]: (prev[storyId] ?? 0) + 1 }));
    }
  }, [viewerId]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    startRef.current = Date.now();
    animVal.setValue(0);
    animRef.current?.stop();
    animRef.current = Animated.timing(animVal, {
      toValue: 1,
      duration: remainingRef.current,
      useNativeDriver: false,
    });
    animRef.current.start();
    timerRef.current = setTimeout(() => {
      if (idx + 1 < stories.length) {
        setIdx((i) => i + 1);
        remainingRef.current = PROGRESS_DURATION;
      } else {
        onNextGroup();
        setIdx(0);
        remainingRef.current = PROGRESS_DURATION;
      }
    }, remainingRef.current);
  }, [animVal, idx, stories.length, onNextGroup]);

  useEffect(() => {
    if (!visible || !current) return;
    setProgress(0);
    remainingRef.current = PROGRESS_DURATION;
    startTimer();
    markViewed(current.id);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      animRef.current?.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, current?.id]);

  const handlePause = () => {
    setPaused(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    animRef.current?.stop();
    remainingRef.current -= Date.now() - startRef.current;
  };

  const handleResume = () => {
    setPaused(false);
    startTimer();
  };

  const handleTap = (e: { nativeEvent: { pageX: number } }) => {
    const x = e.nativeEvent.pageX;
    if (x < SW * 0.25) {
      // tap left → prev story or prev group
      if (idx > 0) {
        setIdx((i) => i - 1);
        remainingRef.current = PROGRESS_DURATION;
      } else {
        onPrevGroup();
        setIdx(0);
        remainingRef.current = PROGRESS_DURATION;
      }
    } else if (x > SW * 0.75) {
      // tap right → next story or next group
      if (idx + 1 < stories.length) {
        setIdx((i) => i + 1);
        remainingRef.current = PROGRESS_DURATION;
      } else {
        onNextGroup();
        setIdx(0);
        remainingRef.current = PROGRESS_DURATION;
      }
    }
  };

  if (!visible || !group || !current) return null;

  const count = viewCounts[current.id] ?? current.viewCount;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={S.root}>
        {/* Story image */}
        <Image source={{ uri: current.imageUrl }} style={S.image} contentFit="cover" />

        {/* Dark overlay */}
        <View style={S.overlay} />

        {/* Progress bars */}
        <View style={[S.progressWrap, { paddingTop: insets.top + 8 }]}>
          {stories.map((s, i) => (
            <View key={s.id} style={S.progressBg}>
              {i < idx && <View style={[S.progressFill, { width: "100%" }]} />}
              {i === idx && (
                <Animated.View
                  style={[
                    S.progressFill,
                    {
                      width: animVal.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", "100%"],
                      }) as unknown as number,
                    },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={[S.header, { paddingTop: insets.top + 14 }]}>
          <Pressable onPress={onClose} style={S.closeBtn}>
            <Ionicons name="close" size={28} color="#FFF" />
          </Pressable>
          <View style={S.userInfo}>
            <Image source={{ uri: group.avatarUrl }} style={S.headerAvatar} contentFit="cover" />
            <View>
              <Text style={S.headerName}>{group.username}</Text>
              <Text style={S.headerTime}>{formatAgo(current.createdAt)}</Text>
            </View>
          </View>
          <View style={S.viewCount}>
            <Ionicons name="eye-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={S.viewCountText}>{count}</Text>
          </View>
        </View>

        {/* Caption */}
        {current.caption ? (
          <View style={S.captionWrap}>
            <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={S.captionGrad}>
              <Text style={S.caption}>{current.caption}</Text>
            </LinearGradient>
          </View>
        ) : null}

        {/* Tap zones */}
        <Pressable style={S.tapLeft}  onPressIn={handlePause} onPressOut={handleResume} onPress={handleTap} />
        <Pressable style={S.tapRight} onPressIn={handlePause} onPressOut={handleResume} onPress={handleTap} />
      </View>
    </Modal>
  );
}

function formatAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Az önce";
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa`;
  return `${Math.floor(h / 24)} gün`;
}

const S = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "#000" },
  image:   { ...StyleSheet.absoluteFillObject, width: SW, height: SH },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.05)" },

  progressWrap: {
    position: "absolute",
    top: 0,
    left: 8,
    right: 8,
    flexDirection: "row",
    gap: 4,
    zIndex: 10,
  },
  progressBg: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 1,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: 1,
  },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 10,
    zIndex: 10,
  },
  closeBtn: { padding: 4 },
  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 8,
  },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.5)" },
  headerName:  { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" },
  headerTime:  { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  viewCount:   { flexDirection: "row", alignItems: "center", gap: 4 },
  viewCountText:{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)" },

  captionWrap: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 5 },
  captionGrad: { paddingHorizontal: 18, paddingBottom: 40, paddingTop: 30 },
  caption:     { fontSize: 15, fontFamily: "Inter_500Medium", color: "#FFF", lineHeight: 22 },

  tapLeft:  { position: "absolute", top: 0, left: 0, width: SW * 0.3, height: SH, zIndex: 3 },
  tapRight: { position: "absolute", top: 0, right: 0, width: SW * 0.3, height: SH, zIndex: 3 },
});
