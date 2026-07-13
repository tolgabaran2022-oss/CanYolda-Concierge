import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  apiViewStory,
  apiToggleStoryLike,
  apiGetStoryViewers,
  apiGetStoryLikers,
  apiReplyToStory,
} from "@/lib/storiesApi";
import type { ApiStoryGroup, StoryLiker, StoryViewer as StoryViewerType } from "@/lib/storiesApi";

const { width: SW, height: SH } = Dimensions.get("window");
const PROGRESS_DURATION = 5000;

const C = {
  purple:     "#7B5EA7",
  purpleDark: "#4A2D8F",
  heart:      "#FF3B5C",
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

  const [idx, setIdx]               = useState(0);
  const [paused, setPaused]         = useState(false);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [liked, setLiked]           = useState<Record<string, boolean>>({});
  const [likeCount, setLikeCount]   = useState<Record<string, number>>({});
  const [replyText, setReplyText]   = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyToast, setReplyToast] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);

  /* owner panel */
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);
  const [viewers, setViewers]   = useState<StoryViewerType[]>([]);
  const [likers, setLikers]     = useState<StoryLiker[]>([]);
  const [ownerTab, setOwnerTab] = useState<"viewers" | "likers">("viewers");

  const animVal  = useRef(new Animated.Value(0)).current;
  const animRef  = useRef<Animated.CompositeAnimation | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<number>(0);
  const remainingRef = useRef<number>(PROGRESS_DURATION);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const stories = group?.stories ?? [];
  const current = stories[idx];
  const isOwn   = group?.userId === viewerId;

  /* ── Timer helpers ──────────────────────────────────── */
  const stopTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    animRef.current?.stop();
    remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startRef.current));
  }, []);

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

  const markViewed = useCallback(async (storyId: string) => {
    try {
      const { viewCount } = await apiViewStory(storyId, viewerId);
      setViewCounts((prev) => ({ ...prev, [storyId]: viewCount }));
    } catch {
      setViewCounts((prev) => ({ ...prev, [storyId]: (prev[storyId] ?? 0) + 1 }));
    }
  }, [viewerId]);

  /* ── On story change ──────────────────────────────── */
  useEffect(() => {
    if (!visible || !current) return;
    remainingRef.current = PROGRESS_DURATION;
    if (!inputFocused && !showOwnerPanel) startTimer();
    markViewed(current.id);

    /* Seed like state from already-loaded data */
    if (current.liked !== undefined) {
      setLiked((prev) => ({ ...prev, [current.id]: current.liked! }));
    }
    if (current.likesCount !== undefined) {
      setLikeCount((prev) => ({ ...prev, [current.id]: current.likesCount! }));
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      animRef.current?.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, current?.id]);

  /* ── Pause when input focused or panel open ──────── */
  useEffect(() => {
    if (inputFocused || showOwnerPanel || paused) {
      stopTimer();
    } else if (visible && current) {
      startTimer();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputFocused, showOwnerPanel, paused]);

  /* ── Tap handling ────────────────────────────────── */
  const handlePause = () => {
    setPaused(true);
    stopTimer();
  };

  const handleResume = () => {
    if (inputFocused || showOwnerPanel) return;
    setPaused(false);
    startTimer();
  };

  const handleTap = (e: { nativeEvent: { pageX: number } }) => {
    if (inputFocused) { Keyboard.dismiss(); return; }
    const x = e.nativeEvent.pageX;
    if (x < SW * 0.25) {
      if (idx > 0) { setIdx((i) => i - 1); remainingRef.current = PROGRESS_DURATION; }
      else { onPrevGroup(); setIdx(0); remainingRef.current = PROGRESS_DURATION; }
    } else if (x > SW * 0.75) {
      if (idx + 1 < stories.length) { setIdx((i) => i + 1); remainingRef.current = PROGRESS_DURATION; }
      else { onNextGroup(); setIdx(0); remainingRef.current = PROGRESS_DURATION; }
    }
  };

  /* ── Like ────────────────────────────────────────── */
  const handleLike = async () => {
    if (!current) return;
    const storyId = current.id;
    const wasLiked = liked[storyId] ?? false;
    setLiked((prev) => ({ ...prev, [storyId]: !wasLiked }));
    setLikeCount((prev) => ({ ...prev, [storyId]: Math.max(0, (prev[storyId] ?? 0) + (wasLiked ? -1 : 1)) }));
    try {
      const { liked: newLiked, likesCount } = await apiToggleStoryLike(storyId, viewerId);
      setLiked((prev) => ({ ...prev, [storyId]: newLiked }));
      setLikeCount((prev) => ({ ...prev, [storyId]: likesCount }));
    } catch {
      setLiked((prev) => ({ ...prev, [storyId]: wasLiked }));
      setLikeCount((prev) => ({ ...prev, [storyId]: prev[storyId] ?? 0 }));
    }
  };

  /* ── Reply ───────────────────────────────────────── */
  const handleReply = async () => {
    if (!current || !replyText.trim() || replySending) return;
    if (!group) return;
    setReplySending(true);
    try {
      await apiReplyToStory(current.id, viewerId, group.userId, replyText.trim());
      setReplyText("");
      Keyboard.dismiss();
      showToast("Mesajın gönderildi");
    } catch {
      showToast("Gönderilemedi, tekrar dene");
    } finally {
      setReplySending(false);
    }
  };

  const showToast = (msg: string) => {
    setReplyToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setReplyToast(null), 2500);
  };

  /* ── Owner panel ──────────────────────────────────── */
  const openOwnerPanel = async () => {
    if (!current) return;
    setShowOwnerPanel(true);
    const [v, l] = await Promise.all([
      apiGetStoryViewers(current.id, viewerId),
      apiGetStoryLikers(current.id, viewerId),
    ]);
    setViewers(v);
    setLikers(l);
  };

  if (!visible || !group || !current) return null;

  const count      = viewCounts[current.id] ?? current.viewCount;
  const isLiked    = liked[current.id] ?? current.liked ?? false;
  const likesTotal = likeCount[current.id] ?? current.likesCount ?? 0;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <KeyboardAvoidingView style={S.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
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
            <LinearGradient colors={["transparent", "rgba(0,0,0,0.65)"]} style={S.captionGrad}>
              <Text style={S.caption}>{current.caption}</Text>
            </LinearGradient>
          </View>
        ) : null}

        {/* Tap zones — only if input not focused */}
        {!inputFocused && !showOwnerPanel && (
          <>
            <Pressable style={S.tapLeft}  onPressIn={handlePause} onPressOut={handleResume} onPress={handleTap} />
            <Pressable style={S.tapRight} onPressIn={handlePause} onPressOut={handleResume} onPress={handleTap} />
          </>
        )}

        {/* ── Bottom bar ───────────────────────────────── */}
        <View style={[S.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          {isOwn ? (
            /* Owner view: show viewers/likers counts */
            <Pressable style={S.ownerRow} onPress={openOwnerPanel}>
              <View style={S.ownerStat}>
                <Ionicons name="eye" size={18} color="rgba(255,255,255,0.85)" />
                <Text style={S.ownerStatText}>{count} görüntüleme</Text>
              </View>
              <View style={S.ownerStat}>
                <Ionicons name="heart" size={18} color={C.heart} />
                <Text style={S.ownerStatText}>{likesTotal} beğeni</Text>
              </View>
              <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>
          ) : (
            /* Viewer: reply input + like button */
            <View style={S.replyRow}>
              <TextInput
                ref={inputRef}
                style={S.replyInput}
                placeholder="Mesaj gönder..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={replyText}
                onChangeText={setReplyText}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                returnKeyType="send"
                onSubmitEditing={handleReply}
                blurOnSubmit={false}
              />
              {replyText.trim().length > 0 ? (
                <Pressable
                  style={[S.iconBtn, replySending && { opacity: 0.5 }]}
                  onPress={handleReply}
                  disabled={replySending}
                >
                  <Ionicons name="send" size={22} color="#FFF" />
                </Pressable>
              ) : (
                <Pressable style={S.iconBtn} onPress={handleLike}>
                  <Ionicons
                    name={isLiked ? "heart" : "heart-outline"}
                    size={26}
                    color={isLiked ? C.heart : "#FFF"}
                  />
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Toast */}
        {replyToast && (
          <View style={S.toast}>
            <Text style={S.toastText}>{replyToast}</Text>
          </View>
        )}

        {/* ── Owner panel (slide up) ───────────────────── */}
        {showOwnerPanel && (
          <Pressable style={S.panelBackdrop} onPress={() => setShowOwnerPanel(false)}>
            <Pressable style={[S.panel, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
              {/* drag handle */}
              <View style={S.panelHandle} />

              {/* tabs */}
              <View style={S.panelTabs}>
                {(["viewers", "likers"] as const).map((tab) => (
                  <Pressable
                    key={tab}
                    style={[S.panelTab, ownerTab === tab && S.panelTabActive]}
                    onPress={() => setOwnerTab(tab)}
                  >
                    <Text style={[S.panelTabText, ownerTab === tab && S.panelTabTextActive]}>
                      {tab === "viewers" ? `${viewers.length} Görüntüleme` : `${likers.length} Beğeni`}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* list */}
              {ownerTab === "viewers" ? (
                viewers.length === 0 ? (
                  <Text style={S.panelEmpty}>Henüz kimse görüntülemedi</Text>
                ) : (
                  viewers.map((v) => (
                    <View key={v.viewerId} style={S.panelRow}>
                      <View style={S.panelAvatarPlaceholder}>
                        <Ionicons name="person" size={16} color="#FFF" />
                      </View>
                      <Text style={S.panelRowText}>{v.viewerId}</Text>
                      <Text style={S.panelRowTime}>{formatAgo(v.viewedAt)}</Text>
                    </View>
                  ))
                )
              ) : (
                likers.length === 0 ? (
                  <Text style={S.panelEmpty}>Henüz kimse beğenmedi</Text>
                ) : (
                  likers.map((l) => (
                    <View key={l.userId} style={S.panelRow}>
                      {l.avatarUrl ? (
                        <Image source={{ uri: l.avatarUrl }} style={S.panelAvatar} contentFit="cover" />
                      ) : (
                        <View style={S.panelAvatarPlaceholder}>
                          <Ionicons name="person" size={16} color="#FFF" />
                        </View>
                      )}
                      <Text style={S.panelRowText}>{l.username || l.userId}</Text>
                      <Ionicons name="heart" size={14} color={C.heart} />
                    </View>
                  ))
                )
              )}
            </Pressable>
          </Pressable>
        )}
      </KeyboardAvoidingView>
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
    position: "absolute", top: 0, left: 8, right: 8,
    flexDirection: "row", gap: 4, zIndex: 10,
  },
  progressBg: {
    flex: 1, height: 2, backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 1, overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#FFF", borderRadius: 1 },

  header: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingBottom: 10, zIndex: 10,
  },
  closeBtn:      { padding: 4 },
  userInfo:      { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, marginLeft: 8 },
  headerAvatar:  { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.5)" },
  headerName:    { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" },
  headerTime:    { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  viewCount:     { flexDirection: "row", alignItems: "center", gap: 4 },
  viewCountText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)" },

  captionWrap: { position: "absolute", bottom: 72, left: 0, right: 0, zIndex: 5 },
  captionGrad: { paddingHorizontal: 18, paddingBottom: 20, paddingTop: 30 },
  caption:     { fontSize: 15, fontFamily: "Inter_500Medium", color: "#FFF", lineHeight: 22 },

  tapLeft:  { position: "absolute", top: 80, left: 0, width: SW * 0.3, height: SH - 160, zIndex: 3 },
  tapRight: { position: "absolute", top: 80, right: 0, width: SW * 0.3, height: SH - 160, zIndex: 3 },

  /* Bottom bar */
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 12, paddingTop: 8, zIndex: 20,
  },
  replyRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  replyInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#FFF",
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },

  ownerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 20, paddingVertical: 8,
  },
  ownerStat: { flexDirection: "row", alignItems: "center", gap: 6 },
  ownerStatText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.85)" },

  /* Toast */
  toast: {
    position: "absolute", bottom: 110, alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.75)", paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, zIndex: 30,
  },
  toastText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#FFF" },

  /* Owner panel */
  panelBackdrop: {
    ...StyleSheet.absoluteFillObject, zIndex: 40,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  panel: {
    backgroundColor: "#1C1C2E",
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingTop: 12,
    maxHeight: SH * 0.55,
  },
  panelHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)", alignSelf: "center", marginBottom: 16,
  },
  panelTabs: { flexDirection: "row", marginBottom: 12, gap: 8 },
  panelTab: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center",
  },
  panelTabActive: { backgroundColor: C.purple },
  panelTabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.6)" },
  panelTabTextActive: { color: "#FFF", fontFamily: "Inter_700Bold" },
  panelEmpty: {
    textAlign: "center", color: "rgba(255,255,255,0.4)",
    fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 20,
  },
  panelRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  panelAvatar: { width: 36, height: 36, borderRadius: 18 },
  panelAvatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center",
  },
  panelRowText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: "#FFF" },
  panelRowTime: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)" },
});
