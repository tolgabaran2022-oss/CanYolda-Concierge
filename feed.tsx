import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostCard, type PostData } from "@/components/PostCard";
import { EditPostModal } from "@/components/EditPostModal";
import { CommentSheet } from "@/components/CommentSheet";
import { StoryBar } from "@/components/StoryBar";
import { StoryViewer } from "@/components/StoryViewer";
import { CreateStoryModal } from "@/components/CreateStoryModal";
import { ShareSelectionSheet } from "@/components/ShareSelectionSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import {
  apiFetchPosts,
  apiFetchFollowingPosts,
  apiToggleLike,
  apiToggleBookmark,
  apiAddComment,
  apiDeletePost,
  apiEditPost,
  apiCreatePost,
  apiFetchUnreadCount,
  apiFetchFollowingCount,
  type ApiPost,
} from "@/lib/feedApi";
import {
  apiFetchStories,
  apiCreateStory,
  type ApiStoryGroup,
} from "@/lib/storiesApi";

const _RAW_FEED_W = Dimensions.get("window").width;
const SW          = Math.min(_RAW_FEED_W, 430);

const C = {
  purple:     "#7B5EA7",
  purpleDark: "#4A2D8F",
  bg:         "#F9F8FF",
  white:      "#FFFFFF",
  text:       "#111827",
  muted:      "#6B7280",
  border:     "#F0EDF8",
};

function apiPostToPostData(p: ApiPost): PostData {
  return {
    id:            p.id,
    userId:        p.userId,
    user:          { name: p.username, avatar: p.avatarUrl },
    image:         p.imageUrl,
    caption:       p.caption,
    location:      p.location,
    likes:         p.likesCount,
    liked:         p.liked,
    bookmarked:    p.bookmarked,
    sharesCount:   p.sharesCount,
    commentsCount: p.commentsCount,
    comments:      [],
    timestamp:     p.timeAgo || "Yeni",
  };
}

/* ── Skeleton card ─────────────────────────────────────────── */
function SkeletonCard() {
  const T       = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });
  const isWebSk = Platform.OS === "web";
  const CARD_W = isWebSk ? Math.min(SW - 24, 420) : SW - 24;
  return (
    <View style={[SK.card, { width: CARD_W, backgroundColor: T.card }]}>
      <View style={SK.header}>
        <Animated.View style={[SK.avatar, { opacity }]} />
        <View style={SK.headerText}>
          <Animated.View style={[SK.line, { width: 120, opacity }]} />
          <Animated.View style={[SK.line, { width: 80, marginTop: 6, opacity }]} />
        </View>
      </View>
      <Animated.View style={[SK.image, { opacity }]} />
      <View style={SK.footer}>
        <Animated.View style={[SK.line, { width: 80, opacity }]} />
        <Animated.View style={[SK.line, { width: "90%", marginTop: 8, opacity }]} />
      </View>
    </View>
  );
}
const SK = StyleSheet.create({
  card:       { alignSelf: "center", backgroundColor: "#FFF", borderRadius: 20, marginBottom: 20, overflow: "hidden" },
  header:     { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  avatar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E5E0F5" },
  headerText: { flex: 1, gap: 6 },
  image:      { width: "100%", height: 280, backgroundColor: "#EDE9F7" },
  footer:     { padding: 14 },
  line:       { height: 12, borderRadius: 6, backgroundColor: "#E5E0F5" },
});

/* ── Loading footer for infinite scroll ───────────────────── */
function LoadingFooter() {
  return (
    <View style={{ alignItems: "center", paddingVertical: 20 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <Animated.View
            key={i}
            style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: C.purple,
              opacity: 0.3 + i * 0.25,
            }}
          />
        ))}
      </View>
    </View>
  );
}

/* ── Create post modal ─────────────────────────────────────── */
function CreatePostModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { imageUri: string; caption: string; location: string }) => Promise<void>;
}) {
  const T = useTheme();
  const [image,    setImage]    = useState<string | null>(null);
  const [caption,  setCaption]  = useState("");
  const [loc,      setLoc]      = useState("");
  const [loading,  setLoading]  = useState(false);
  const insets = useSafeAreaInsets();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        const mime = asset.mimeType ?? "image/jpeg";
        setImage(`data:${mime};base64,${asset.base64}`);
      } else {
        setImage(asset.uri);
      }
    }
  };

  const reset = () => { setImage(null); setCaption(""); setLoc(""); setLoading(false); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!image) { Alert.alert("Fotoğraf gerekli", "Lütfen bir fotoğraf seçin."); return; }
    setLoading(true);
    try {
      await onSubmit({ imageUri: image, caption: caption.trim(), location: loc.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      reset();
      onClose();
    } catch {
      Alert.alert("Hata", "Gönderi paylaşılamadı. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[M.root, { paddingTop: insets.top + 8, backgroundColor: T.bg }]}>
          <View style={[M.header, { borderBottomColor: T.border }]}>
            <Pressable onPress={handleClose} hitSlop={12} disabled={loading}>
              <Text style={[M.cancel, { color: T.textMuted }]}>İptal</Text>
            </Pressable>
            <Text style={[M.title, { color: T.text }]}>Yeni Gönderi</Text>
            <Pressable onPress={() => { void handleSubmit(); }} hitSlop={12} disabled={loading || !image}>
              <Text style={[M.share, { color: T.purple }, (!image || loading) && { opacity: 0.35 }]}>{loading ? "Paylaşılıyor..." : "Paylaş"}</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={M.content}>
            <Pressable onPress={pickImage} style={M.imagePicker}>
              {image ? (
                <Image source={{ uri: image }} style={M.imagePreview} contentFit="cover" />
              ) : (
                <LinearGradient colors={["rgba(164,140,220,0.10)", "rgba(124,92,255,0.06)"]} style={M.imagePlaceholder}>
                  <View style={M.cameraCircle}><Icon name="camera-outline" size={30} color={T.purple} /></View>
                  <Text style={[M.imageHint, { color: T.purple }]}>Fotoğraf seç</Text>
                </LinearGradient>
              )}
            </Pressable>

            <View style={M.field}>
              <Text style={[M.label, { color: T.text }]}>Açıklama</Text>
              <TextInput
                style={[M.textArea, { color: T.text, backgroundColor: T.input, borderColor: T.inputBorder }]}
                value={caption}
                onChangeText={setCaption}
                placeholder="Bir şeyler yaz..."
                placeholderTextColor={T.placeholder}
                multiline
                textAlignVertical="top"
                maxLength={300}
              />
              <Text style={[M.charCount, { color: T.textMuted }]}>{caption.length}/300</Text>
            </View>

            <View style={M.field}>
              <Text style={[M.label, { color: T.text }]}>Konum</Text>
              <View style={[M.locationRow, { backgroundColor: T.input, borderColor: T.inputBorder }]}>
                <Icon name="location-outline" size={18} color={T.purple} />
                <TextInput
                  style={[M.locationInput, { color: T.text }]}
                  value={loc}
                  onChangeText={setLoc}
                  placeholder="Konum ekle..."
                  placeholderTextColor={T.placeholder}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const M = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.white },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  cancel:  { fontSize: 15, fontFamily: "Inter_400Regular", color: C.muted },
  title:   { fontSize: 16, fontFamily: "Inter_700Bold",   color: C.text },
  share:   { fontSize: 15, fontFamily: "Inter_700Bold",   color: C.purple },
  content: { padding: 18, gap: 20 },
  imagePicker:      { borderRadius: 16, overflow: "hidden" },
  imagePreview:     { width: "100%", height: 320, borderRadius: 16 },
  imagePlaceholder: { height: 220, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1.5, borderColor: "rgba(124,92,255,0.18)", borderStyle: "dashed" },
  cameraCircle:     { width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(124,92,255,0.10)", alignItems: "center", justifyContent: "center" },
  imageHint:  { fontSize: 14, fontFamily: "Inter_500Medium", color: C.purple },
  field:      { gap: 8 },
  label:      { fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.text, textTransform: "uppercase", letterSpacing: 0.4 },
  textArea:   { borderWidth: 1, borderColor: "#EAEAEA", borderRadius: 14, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: C.text, minHeight: 100, backgroundColor: "#FAFAFA" },
  charCount:  { fontSize: 11, color: C.muted, textAlign: "right", fontFamily: "Inter_400Regular" },
  locationRow:   { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#EAEAEA", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: "#FAFAFA" },
  locationInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: C.text },
});

/* ── Feed header ──────────────────────────────────────────── */
function FeedHeader({
  onNotify,
  onSearch,
  onNewPost,
  avatarUrl,
  onAvatarPress,
  unreadCount,
}: {
  onNotify:      () => void;
  onSearch:      () => void;
  onNewPost:     () => void;
  avatarUrl?:    string;
  onAvatarPress: () => void;
  unreadCount:   number;
}) {
  const T = useTheme();
  return (
    <View style={[H.root, { backgroundColor: T.bg }]}>
      <View style={H.left}>
        <Icon name="heart" size={15} color={T.purple} />
        <Text style={[H.logo, { color: T.text }]}>canyoldaşı</Text>
      </View>
      <View style={H.right}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSearch(); }} hitSlop={10}>
          <Icon name="search-outline" size={23} color={T.purple} />
        </Pressable>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNewPost(); }} hitSlop={10} style={H.newPostBtn}>
          <LinearGradient colors={["#9478D8", "#5B3FD6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={H.newPostGradient}>
            <Icon name="add" size={18} color="#FFF" />
          </LinearGradient>
        </Pressable>
        <Pressable onPress={onNotify} style={H.bellWrap} hitSlop={10}>
          <Icon name="notifications-outline" size={24} color={T.purple} />
          {unreadCount > 0 && <View style={[H.badge, { borderColor: T.bg }]} />}
        </Pressable>
        <Pressable onPress={onAvatarPress} hitSlop={6}>
          <LinearGradient colors={["#C278F0", "#7B5EA7"]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={H.avatarRing}>
            <View style={[H.avatarInner, { borderColor: T.bg }]}>
              <Image source={{ uri: avatarUrl ?? "https://loremflickr.com/100/100/cat?lock=500" }} style={H.avatar} contentFit="cover" />
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const H = StyleSheet.create({
  root:     {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Platform.OS === "web" ? 20 : 18,
    paddingTop: Platform.OS === "web" ? 14 : 10,
    paddingBottom: Platform.OS === "web" ? 12 : 8,
    minHeight: Platform.OS === "web" ? 64 : undefined,
  },
  left:     { flexDirection: "row", alignItems: "center", gap: 6 },
  logo:     { fontSize: 20, fontFamily: "Inter_700Bold", color: "#3D2080", letterSpacing: -0.5 },
  right:    { flexDirection: "row", alignItems: "center", gap: 12 },
  bellWrap: { position: "relative" },
  badge:    { position: "absolute", top: 1, right: 1, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF3B6B", borderWidth: 1.5, borderColor: C.white },
  newPostBtn:      {},
  newPostGradient: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", shadowColor: "#5B3FD6", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5 },
  avatarRing:  { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", padding: 2 },
  avatarInner: { width: 34, height: 34, borderRadius: 17, overflow: "hidden", borderWidth: 1.5, borderColor: "#FFFFFF" },
  avatar:      { width: "100%", height: "100%" },
});

/* ── Main screen ──────────────────────────────────────────── */
export default function FeedScreen() {
  const T            = useTheme();
  const insets       = useSafeAreaInsets();
  const { width: SW } = useWindowDimensions();
  const router       = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? user?.email ?? "anonymous";

  const [feedTab,            setFeedTab]            = useState<"discover" | "following">("discover");
  const [posts,              setPosts]              = useState<PostData[]>([]);
  const [followingPosts,     setFollowingPosts]     = useState<PostData[]>([]);
  const [followingCount,     setFollowingCount]     = useState<number | null>(null);
  const [stories,            setStories]            = useState<ApiStoryGroup[]>([]);
  const [storyViewerOpen,    setStoryViewerOpen]    = useState(false);
  const [selectedGroup,      setSelectedGroup]      = useState<ApiStoryGroup | null>(null);
  const [shareSheetOpen,     setShareSheetOpen]     = useState(false);
  const [createVisible,      setCreateVisible]      = useState(false);
  const [createStoryOpen,    setCreateStoryOpen]    = useState(false);
  const [editTarget,         setEditTarget]         = useState<PostData | null>(null);
  const [commentSheetPostId, setCommentSheetPostId] = useState<string | null>(null);
  const [unreadCount,        setUnreadCount]        = useState(0);

  /* Loading states */
  const [loadingDiscover,  setLoadingDiscover]  = useState(true);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [loadingMore,      setLoadingMore]      = useState(false);
  const [refreshing,       setRefreshing]       = useState(false);
  const [errorDiscover,    setErrorDiscover]    = useState(false);
  const [errorFollowing,   setErrorFollowing]   = useState(false);

  /* Pagination */
  const [discoverOffset,   setDiscoverOffset]   = useState(0);
  const [discoverHasMore,  setDiscoverHasMore]  = useState(true);
  const [followingOffset,  setFollowingOffset]  = useState(0);
  const [followingHasMore, setFollowingHasMore] = useState(true);

  /* ── Fetch discover posts ─────────────────────────────── */
  const fetchDiscover = useCallback(async (isRefresh = false, pageOffset = 0) => {
    const isLoadMore = !isRefresh && pageOffset > 0;
    if (isRefresh) { setRefreshing(true); setDiscoverOffset(0); setDiscoverHasMore(true); }
    else if (isLoadMore) setLoadingMore(true);
    else setLoadingDiscover(true);
    setErrorDiscover(false);
    try {
      const { posts: apiPosts, hasMore } = await apiFetchPosts(userId, pageOffset);
      const mapped = apiPosts.map(apiPostToPostData);
      if (isRefresh || pageOffset === 0) {
        setPosts(mapped);
      } else {
        setPosts((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...mapped.filter((p) => !ids.has(p.id))];
        });
      }
      setDiscoverHasMore(hasMore);
      setDiscoverOffset(pageOffset + apiPosts.length);
    } catch {
      setErrorDiscover(true);
    } finally {
      setLoadingDiscover(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [userId]);

  /* ── Fetch following posts ─────────────────────────────── */
  const fetchFollowing = useCallback(async (isRefresh = false, pageOffset = 0) => {
    if (!user?.id) return;
    const isLoadMore = !isRefresh && pageOffset > 0;
    if (isRefresh) { setRefreshing(true); setFollowingOffset(0); setFollowingHasMore(true); }
    else if (isLoadMore) setLoadingMore(true);
    else setLoadingFollowing(true);
    setErrorFollowing(false);
    try {
      const [{ posts: apiPosts, hasMore }, count] = await Promise.all([
        apiFetchFollowingPosts(user.id, pageOffset),
        pageOffset === 0 ? apiFetchFollowingCount(user.id) : Promise.resolve(null),
      ]);
      const mapped = apiPosts.map(apiPostToPostData);
      if (isRefresh || pageOffset === 0) {
        setFollowingPosts(mapped);
      } else {
        setFollowingPosts((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...mapped.filter((p) => !ids.has(p.id))];
        });
      }
      setFollowingHasMore(hasMore);
      setFollowingOffset(pageOffset + apiPosts.length);
      if (count !== null) setFollowingCount(count);
    } catch {
      setErrorFollowing(true);
    } finally {
      setLoadingFollowing(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [user?.id]);

  /* ── Initial loads ──────────────────────────────────────── */
  useEffect(() => { void fetchDiscover(); }, [fetchDiscover]);

  useEffect(() => {
    if (user?.id) void fetchFollowing();
  }, [user?.id, fetchFollowing]);

  useEffect(() => {
    let cancelled = false;
    apiFetchStories(userId)
      .then((data) => { if (!cancelled) setStories(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!user?.id) return;
    apiFetchUnreadCount(user.id).then(setUnreadCount).catch(() => {});
  }, [user?.id]);

  /* ── Pull-to-refresh ────────────────────────────────────── */
  const handleRefresh = useCallback(() => {
    if (feedTab === "discover") void fetchDiscover(true);
    else void fetchFollowing(true);
    /* Also refresh stories */
    apiFetchStories(userId).then(setStories).catch(() => {});
  }, [feedTab, fetchDiscover, fetchFollowing, userId]);

  /* ── Tab switch: always full-refresh following on switch ── */
  const handleTabChange = (tab: "discover" | "following") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFeedTab(tab);
    if (tab === "following" && !loadingFollowing) {
      void fetchFollowing(true); /* reset to page 0 */
    }
  };

  /* ── Load more (infinite scroll) ───────────────────────── */
  const handleLoadMore = useCallback(() => {
    if (feedTab === "discover") {
      if (!discoverHasMore || loadingMore || loadingDiscover) return;
      void fetchDiscover(false, discoverOffset);
    } else {
      if (!followingHasMore || loadingMore || loadingFollowing) return;
      void fetchFollowing(false, followingOffset);
    }
  }, [
    feedTab,
    discoverHasMore, discoverOffset, loadingDiscover,
    followingHasMore, followingOffset, loadingFollowing,
    loadingMore, fetchDiscover, fetchFollowing,
  ]);

  /* ── Like (optimistic + API) ─────────────────────────── */
  const handleLike = useCallback((id: string) => {
    const updateList = (prev: PostData[]) =>
      prev.map((p) => p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p);
    setPosts(updateList);
    setFollowingPosts(updateList);

    apiToggleLike(id, userId)
      .then(({ liked, likesCount }) => {
        const patch = (prev: PostData[]) => prev.map((p) => p.id === id ? { ...p, liked, likes: likesCount } : p);
        setPosts(patch);
        setFollowingPosts(patch);
      })
      .catch(() => {
        const revert = (prev: PostData[]) => prev.map((p) => p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? 1 : -1) } : p);
        setPosts(revert);
        setFollowingPosts(revert);
      });
  }, [userId]);

  /* ── Bookmark (optimistic + API) ─────────────────────── */
  const handleBookmark = useCallback((id: string) => {
    const updateList = (prev: PostData[]) => prev.map((p) => p.id === id ? { ...p, bookmarked: !p.bookmarked } : p);
    setPosts(updateList);
    setFollowingPosts(updateList);

    apiToggleBookmark(id, userId)
      .then(({ bookmarked }) => {
        const patch = (prev: PostData[]) => prev.map((p) => p.id === id ? { ...p, bookmarked } : p);
        setPosts(patch);
        setFollowingPosts(patch);
      })
      .catch(() => {
        const revert = (prev: PostData[]) => prev.map((p) => p.id === id ? { ...p, bookmarked: !p.bookmarked } : p);
        setPosts(revert);
        setFollowingPosts(revert);
        Alert.alert("Hata", "Gönderi kaydedilemedi.");
      });
  }, [userId]);

  /* ── Comment ─────────────────────────────────────────── */
  const handleComment = useCallback((id: string, text: string) => {
    const localComment = { id: `c${Date.now()}`, user: user?.name ?? "Sen", text };
    const updateList = (prev: PostData[]) =>
      prev.map((p) => p.id === id ? {
        ...p,
        comments: [...p.comments, localComment],
        commentsCount: (p.commentsCount ?? p.comments.length) + 1,
      } : p);
    setPosts(updateList);
    setFollowingPosts(updateList);
    apiAddComment(id, user?.name ?? "Sen", text).catch(() => {});
  }, [user?.name]);

  /* ── Delete post ─────────────────────────────────────── */
  const handleDeletePost = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setFollowingPosts((prev) => prev.filter((p) => p.id !== id));
    apiDeletePost(id, userId).catch(() => {});
  }, [userId]);

  /* ── Edit post ────────────────────────────────────────── */
  const handleEditPost = useCallback((id: string) => {
    const post = posts.find((p) => p.id === id) ?? followingPosts.find((p) => p.id === id);
    if (post) setEditTarget(post);
  }, [posts, followingPosts]);

  const handleSaveEdit = useCallback(async (data: { caption: string; location: string }) => {
    if (!editTarget) return;
    const patch = (prev: PostData[]) =>
      prev.map((p) => p.id === editTarget.id ? { ...p, ...data } : p);
    setPosts(patch);
    setFollowingPosts(patch);
    await apiEditPost(editTarget.id, userId, data).catch(() => {});
  }, [editTarget, userId]);

  /* ── Create post (API) ────────────────────────────────── */
  const handleCreate = useCallback(async (data: { imageUri: string; caption: string; location: string }) => {
    const apiPost = await apiCreatePost({
      userId,
      username:  user?.name ?? "Ben",
      avatarUrl: user?.avatar ?? "",
      imageUrl:  data.imageUri,
      caption:   data.caption,
      location:  data.location,
    });
    const newPost = apiPostToPostData(apiPost);
    setPosts((prev) => [newPost, ...prev]);
    setFollowingPosts((prev) => [newPost, ...prev]);
  }, [userId, user?.name, user?.avatar]);

  /* ── Report post ──────────────────────────────────────── */
  const handleReport = useCallback((id: string) => {
    Alert.alert("Şikayet Gönderildi", "Bildiriminiz alındı. En kısa sürede incelenecek.", [{ text: "Tamam" }]);
    void id;
  }, []);

  /* ── Block user ──────────────────────────────────────── */
  const handleBlock = useCallback((blockedUserId: string) => {
    setPosts((prev) => prev.filter((p) => p.userId !== blockedUserId));
    setFollowingPosts((prev) => prev.filter((p) => p.userId !== blockedUserId));
    Alert.alert("Kullanıcı Engellendi", "Bu kullanıcının gönderilerini artık göremezsin.");
  }, []);

  /* ── Navigate to profile ──────────────────────────────── */
  const handlePressUser = useCallback((pressedUserId: string) => {
    if (!pressedUserId) return;
    if (pressedUserId === userId || pressedUserId === user?.id) {
      router.push("/(tabs)/profile");
    } else {
      router.push(`/user-profile/${encodeURIComponent(pressedUserId)}`);
    }
  }, [userId, user?.id, router]);

  /* ── Story viewer navigation ───────────────────────────── */
  const handleStoryGroupPress = (group: ApiStoryGroup) => {
    setSelectedGroup(group);
    setStoryViewerOpen(true);
  };

  const handleNextGroup = () => {
    if (!selectedGroup) return;
    const idx = stories.findIndex((g) => g.userId === selectedGroup.userId);
    const next = stories[idx + 1];
    if (next) setSelectedGroup(next);
    else { setStoryViewerOpen(false); setSelectedGroup(null); }
  };

  const handlePrevGroup = () => {
    if (!selectedGroup) return;
    const idx = stories.findIndex((g) => g.userId === selectedGroup.userId);
    const prev = stories[idx - 1];
    if (prev) setSelectedGroup(prev);
    else { setStoryViewerOpen(false); setSelectedGroup(null); }
  };

  /* ── Create story ──────────────────────────────────────── */
  const handleCreateStory = async (imageUri: string, caption: string) => {
    try {
      const group = await apiCreateStory(
        userId,
        user?.name ?? "Ben",
        user?.avatar ?? "",
        imageUri,
        caption
      );
      setStories((prev) => [group, ...prev.filter((g) => g.userId !== group.userId)]);
    } catch {
      Alert.alert("Hata", "Hikaye paylaşılamadı. Lütfen tekrar deneyin.");
    }
  };

  const BOTTOM_NAV_H = Platform.OS === "web" ? 100 : 68 + insets.bottom + 10;
  const activePosts  = feedTab === "following" ? followingPosts : posts;
  const isLoading    = feedTab === "discover" ? loadingDiscover : loadingFollowing;
  const hasError     = feedTab === "discover" ? errorDiscover   : errorFollowing;

  /* ── List empty/error/loading states ──────────────────── */
  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={F.centeredState}>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </View>
      );
    }
    if (hasError) {
      return (
        <View style={[F.centeredState, { backgroundColor: T.bg }]}>
          <Icon name="cloud-offline-outline" size={48} color={T.textMuted} />
          <Text style={[F.emptyTitle, { color: T.text }]}>Akış yüklenemedi</Text>
          <Text style={[F.emptySubtitle, { color: T.textMuted }]}>Lütfen tekrar deneyin.</Text>
          <Pressable
            style={F.retryBtn}
            onPress={() => feedTab === "discover" ? fetchDiscover() : fetchFollowing()}
          >
            <Text style={F.retryText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      );
    }
    if (feedTab === "following") {
      /* Still loading follow count — avoid premature empty state */
      if (followingCount === null) {
        return (
          <View style={[F.centeredState, { backgroundColor: T.bg }]}>
            {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
          </View>
        );
      }
      /* User follows nobody */
      if (followingCount === 0) {
        return (
          <View style={[F.centeredState, { backgroundColor: T.bg }]}>
            <Icon name="people-outline" size={52} color="#C4B8E8" />
            <Text style={[F.emptyTitle, { color: T.text }]}>Henüz kimseyi takip etmiyorsun</Text>
            <Text style={[F.emptySubtitle, { color: T.textMuted }]}>Keşfet'ten yeni dostlar bulabilirsin.</Text>
            <Pressable style={F.retryBtn} onPress={() => handleTabChange("discover")}>
              <Text style={F.retryText}>Keşfet'e Bak</Text>
            </Pressable>
          </View>
        );
      }
      /* Follows people but no posts yet */
      return (
        <View style={[F.centeredState, { backgroundColor: T.bg }]}>
          <Icon name="newspaper-outline" size={52} color="#C4B8E8" />
          <Text style={[F.emptyTitle, { color: T.text }]}>Henüz yeni gönderi yok</Text>
          <Text style={[F.emptySubtitle, { color: T.textMuted }]}>
            Takip ettiğin kişiler paylaşım yaptığında burada göreceksin.
          </Text>
        </View>
      );
    }
    return (
      <View style={[F.centeredState, { backgroundColor: T.bg }]}>
        <Icon name="camera-outline" size={52} color="#C4B8E8" />
        <Text style={[F.emptyTitle, { color: T.text }]}>Henüz gönderi yok</Text>
        <Text style={[F.emptySubtitle, { color: T.textMuted }]}>İlk gönderiyi sen paylaş!</Text>
      </View>
    );
  };

  const renderHeader = useCallback(
    () => (
      <>
        <FeedHeader
          onNotify={() => router.push("/notifications")}
          onSearch={() => router.push("/search")}
          onNewPost={() => setShareSheetOpen(true)}
          onAvatarPress={() => router.push("/(tabs)/profile")}
          avatarUrl={user?.avatar ?? undefined}
          unreadCount={unreadCount}
        />
        <StoryBar
          stories={stories}
          currentUserId={userId}
          currentUserAvatar={user?.avatar ?? undefined}
          currentUserName={user?.name ?? undefined}
          onPressGroup={handleStoryGroupPress}
          onAddStory={() => setShareSheetOpen(true)}
        />
        <View style={[F.tabBar, { backgroundColor: T.tabBar, borderBottomColor: T.tabBarBorder }]}>
          <Pressable
            style={[F.tabBtn, feedTab === "discover" && { borderBottomColor: T.purple }]}
            onPress={() => handleTabChange("discover")}
          >
            <Text style={[F.tabTxt, feedTab === "discover" && F.tabTxtActive, { color: feedTab === "discover" ? T.purple : T.textMuted }]}>Keşfet</Text>
          </Pressable>
          <Pressable
            style={[F.tabBtn, feedTab === "following" && { borderBottomColor: T.purple }]}
            onPress={() => handleTabChange("following")}
          >
            <Text style={[F.tabTxt, feedTab === "following" && F.tabTxtActive, { color: feedTab === "following" ? T.purple : T.textMuted }]}>Takip Ettiklerin</Text>
          </Pressable>
        </View>
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stories, userId, router, feedTab, user?.avatar, unreadCount, T.isDark]
  );

  return (
    <View style={[F.root, { paddingTop: Platform.OS === "web" ? (SW < 1024 ? 54 : 16) : insets.top, backgroundColor: T.bg }]}>
      <FlatList
        data={isLoading ? [] : activePosts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onComment={handleComment}
            onPressUser={handlePressUser}
            onPressPost={(id) => router.push(`/post-detail/${encodeURIComponent(id)}`)}
            onCommentPress={(id) => setCommentSheetPostId(id)}
            isOwn={!!item.userId && item.userId === userId}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            onReport={handleReport}
            onBlock={handleBlock}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={loadingMore ? <LoadingFooter /> : null}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={[F.listContent, { paddingBottom: BOTTOM_NAV_H + 16 }]}
        showsVerticalScrollIndicator={false}
        style={[F.list, { backgroundColor: T.bg }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={C.purple}
            colors={[C.purple]}
          />
        }
      />

      <CreatePostModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onSubmit={handleCreate}
      />

      <EditPostModal
        visible={editTarget !== null}
        initialCaption={editTarget?.caption ?? ""}
        initialLocation={editTarget?.location ?? ""}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
      />

      <CommentSheet
        visible={commentSheetPostId !== null}
        postId={commentSheetPostId ?? ""}
        postOwnerId={
          posts.find((p) => p.id === commentSheetPostId)?.userId ??
          followingPosts.find((p) => p.id === commentSheetPostId)?.userId
        }
        onClose={() => setCommentSheetPostId(null)}
        onCountChange={(delta) => {
          if (!commentSheetPostId) return;
          const patch = (prev: PostData[]) =>
            prev.map((p) =>
              p.id === commentSheetPostId
                ? { ...p, commentsCount: Math.max(0, (p.commentsCount ?? p.comments.length) + delta) }
                : p
            );
          setPosts(patch);
          setFollowingPosts(patch);
        }}
      />

      <StoryViewer
        visible={storyViewerOpen}
        group={selectedGroup}
        viewerId={userId}
        onClose={() => { setStoryViewerOpen(false); setSelectedGroup(null); }}
        onNextGroup={handleNextGroup}
        onPrevGroup={handlePrevGroup}
      />

      <CreateStoryModal
        visible={createStoryOpen}
        onClose={() => setCreateStoryOpen(false)}
        onSubmit={handleCreateStory}
      />

      <ShareSelectionSheet
        visible={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        onSelectStory={() => setCreateStoryOpen(true)}
        onSelectPost={() => setCreateVisible(true)}
      />
    </View>
  );
}

const F = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  list:        { flex: 1, backgroundColor: C.bg },
  listContent: { paddingTop: 0 },

  tabBar: {
    flexDirection: "row",
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(123,94,167,0.10)",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: { borderBottomColor: C.purple },
  tabTxt:       { fontSize: 14, fontFamily: "Inter_500Medium", color: C.muted },
  tabTxtActive: { fontSize: 14, fontFamily: "Inter_700Bold",   color: C.purple },

  centeredState: { alignItems: "center", paddingTop: 40, paddingHorizontal: 24, gap: 12 },
  emptyTitle:    { fontSize: 16, fontFamily: "Inter_700Bold",   textAlign: "center", marginTop: 8 },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  retryBtn:      { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: C.purple, borderRadius: 20 },
  retryText:     { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFF" },
});
