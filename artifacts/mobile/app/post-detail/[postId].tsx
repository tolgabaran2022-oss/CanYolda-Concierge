import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import {
  apiFetchPost,
  apiFetchComments,
  apiAddComment,
  apiToggleLike,
  apiToggleBookmark,
  apiDeleteComment,
  type ApiPost,
  type ApiComment,
} from "@/lib/feedApi";

const { width: SW } = Dimensions.get("window");
const PURPLE      = "#7B5EA7";
const PURPLE_DARK = "#3D2070";
const BG          = "#F9F8FF";
const CAT_DEFAULT = "https://loremflickr.com/300/300/cat?lock=500";

function formatAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Az önce";
  if (m < 60) return `${m} dakika önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

export default function PostDetailScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { user } = useAuth();
  const { postId } = useLocalSearchParams<{ postId: string }>();

  const [post,      setPost]      = useState<ApiPost | null>(null);
  const [comments,  setComments]  = useState<ApiComment[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  const heartScale = useRef(new Animated.Value(1)).current;
  const inputRef   = useRef<TextInput>(null);

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const isOwn     = !!post && (post.userId === user?.id);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        apiFetchPost(postId, user?.id),
        apiFetchComments(postId),
      ]);
      setPost(p);
      setComments(c);
    } catch {
      Alert.alert("Hata", "Gönderi yüklenemedi.");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [postId, user?.id, router]);

  useEffect(() => { load(); }, [load]);

  const handleLike = useCallback(async () => {
    if (!post || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, useNativeDriver: true, speed: 40 }),
      Animated.spring(heartScale, { toValue: 1,   useNativeDriver: true, speed: 30 }),
    ]).start();
    const newLiked = !post.liked;
    setPost((p) => p ? { ...p, liked: newLiked, likesCount: p.likesCount + (newLiked ? 1 : -1) } : p);
    try {
      const r = await apiToggleLike(post.id, user.id);
      setPost((p) => p ? { ...p, liked: r.liked, likesCount: r.likesCount } : p);
    } catch {
      setPost((p) => p ? { ...p, liked: !newLiked, likesCount: p.likesCount + (newLiked ? -1 : 1) } : p);
    }
  }, [post, user, heartScale]);

  const handleBookmark = useCallback(async () => {
    if (!post || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPost((p) => p ? { ...p, bookmarked: !p.bookmarked } : p);
    try {
      const r = await apiToggleBookmark(post.id, user.id);
      setPost((p) => p ? { ...p, bookmarked: r.bookmarked } : p);
    } catch {
      setPost((p) => p ? { ...p, bookmarked: !p.bookmarked } : p);
    }
  }, [post, user]);

  const handleSubmitComment = useCallback(async () => {
    const t = commentText.trim();
    if (!t || !post || !user) return;
    setSubmitting(true);
    const tempId = `temp-${Date.now()}`;
    const tempComment: ApiComment = {
      id: tempId, postId: post.id,
      username: user.username ?? user.name,
      text: t, createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...prev, tempComment]);
    setCommentText("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const saved = await apiAddComment(post.id, user.username ?? user.name, t);
      setComments((prev) => prev.map((c) => c.id === tempId ? saved : c));
      setPost((p) => p ? { ...p, commentsCount: p.commentsCount + 1 } : p);
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
    } finally {
      setSubmitting(false);
    }
  }, [commentText, post, user]);

  const handleDeleteComment = useCallback((comment: ApiComment) => {
    if (!post || !user) return;
    Alert.alert("Yorumu Sil", "Bu yorumu silmek istediğine emin misin?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil", style: "destructive",
        onPress: async () => {
          setComments((prev) => prev.filter((c) => c.id !== comment.id));
          setPost((p) => p ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) } : p);
          await apiDeleteComment(post.id, comment.id, user.id).catch(() => {});
        },
      },
    ]);
  }, [post, user]);

  if (loading || !post) {
    return (
      <View style={[S.root, { paddingTop: topPad }]}>
        <View style={S.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={PURPLE_DARK} />
          </Pressable>
          <Text style={S.headerTitle}>Gönderi</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={S.center}><ActivityIndicator size="large" color={PURPLE} /></View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[S.root, { paddingTop: topPad }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={topPad}
    >
      {/* Header */}
      <View style={S.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={PURPLE_DARK} />
        </Pressable>
        <Text style={S.headerTitle}>Gönderi</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[S.list, { paddingBottom: insets.bottom + 80 }]}
        ListHeaderComponent={
          <>
            {/* User info row */}
            <View style={S.userRow}>
              <Pressable
                style={S.avatarWrap}
                onPress={() => router.push(`/user-profile/${encodeURIComponent(post.userId || post.username)}`)}
              >
                <Image source={{ uri: post.avatarUrl || CAT_DEFAULT }} style={S.avatar} contentFit="cover" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Pressable onPress={() => router.push(`/user-profile/${encodeURIComponent(post.userId || post.username)}`)}>
                  <Text style={S.postUsername}>{post.username}</Text>
                </Pressable>
                {post.location ? <Text style={S.postLocation}>{post.location}</Text> : null}
              </View>
              <Text style={S.timeAgo}>{formatAgo(post.createdAt)}</Text>
            </View>

            {/* Post image */}
            <View style={S.imageWrap}>
              <Pressable onPress={handleLike}>
                <Image source={{ uri: post.imageUrl }} style={S.image} contentFit="cover" />
              </Pressable>
            </View>

            {/* Actions */}
            <View style={S.actionsRow}>
              <View style={S.leftActions}>
                <Pressable onPress={handleLike} hitSlop={8} style={S.actionBtn}>
                  <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                    <Ionicons
                      name={post.liked ? "heart" : "heart-outline"}
                      size={26}
                      color={post.liked ? "#FF3B6B" : PURPLE_DARK}
                    />
                  </Animated.View>
                </Pressable>
                <Pressable
                  hitSlop={8} style={S.actionBtn}
                  onPress={() => inputRef.current?.focus()}
                >
                  <Ionicons name="chatbubble-outline" size={24} color={PURPLE_DARK} />
                </Pressable>
                <Pressable hitSlop={8} style={S.actionBtn}>
                  <Feather name="send" size={22} color={PURPLE_DARK} />
                </Pressable>
              </View>
              <Pressable onPress={handleBookmark} hitSlop={8}>
                <Ionicons
                  name={post.bookmarked ? "bookmark" : "bookmark-outline"}
                  size={24}
                  color={post.bookmarked ? PURPLE : PURPLE_DARK}
                />
              </Pressable>
            </View>

            {/* Stats */}
            <View style={S.statsRow}>
              <Text style={S.likesText}>{post.likesCount} beğeni</Text>
            </View>

            {/* Caption */}
            {post.caption ? (
              <View style={S.captionRow}>
                <Text style={S.captionUsername}>{post.username} </Text>
                <Text style={S.captionText}>{post.caption}</Text>
              </View>
            ) : null}

            {/* Comments header */}
            {comments.length > 0 && (
              <Text style={S.commentsHeader}>{comments.length} yorum</Text>
            )}
          </>
        }
        renderItem={({ item: c }) => {
          const canDelete = user && (c.username === (user.username ?? user.name) || isOwn);
          return (
            <Pressable
              style={S.commentRow}
              onLongPress={() => canDelete && handleDeleteComment(c)}
            >
              <View style={S.commentAvatar}>
                <Ionicons name="person-circle" size={32} color={PURPLE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.commentText}>
                  <Text style={S.commentUser}>{c.username} </Text>
                  {c.text}
                </Text>
                <Text style={S.commentTime}>{formatAgo(c.createdAt)}</Text>
              </View>
              {canDelete && (
                <Pressable hitSlop={8} onPress={() => handleDeleteComment(c)}>
                  <Ionicons name="trash-outline" size={14} color="#CCBBDD" />
                </Pressable>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={S.noComments}>Henüz yorum yok. İlk yorumu sen yaz!</Text>
        }
      />

      {/* Comment input */}
      <View style={[S.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          ref={inputRef}
          style={S.commentInput}
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Yorum ekle..."
          placeholderTextColor="#ABABCC"
          returnKeyType="send"
          onSubmitEditing={handleSubmitComment}
          multiline
          maxLength={300}
        />
        <Pressable
          style={({ pressed }) => [S.sendBtn, { opacity: pressed || !commentText.trim() || submitting ? 0.5 : 1 }]}
          onPress={handleSubmitComment}
          disabled={!commentText.trim() || submitting}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Ionicons name="send" size={16} color="#FFF" />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1, borderBottomColor: "rgba(123,94,167,0.10)",
  },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: PURPLE_DARK },

  list: { paddingTop: 0 },

  userRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#FFF",
  },
  avatarWrap: { width: 40, height: 40, borderRadius: 20, overflow: "hidden", borderWidth: 2, borderColor: PURPLE },
  avatar:     { width: "100%", height: "100%" },
  postUsername: { fontSize: 14, fontFamily: "Inter_700Bold", color: PURPLE_DARK },
  postLocation: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#9080BB", marginTop: 1 },
  timeAgo:      { fontSize: 11, fontFamily: "Inter_400Regular", color: "#AAAACC" },

  imageWrap: { width: SW, aspectRatio: 1 },
  image:     { width: "100%", height: "100%" },

  actionsRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: "#FFF",
  },
  leftActions: { flexDirection: "row", gap: 16 },
  actionBtn:   { padding: 2 },

  statsRow:     { paddingHorizontal: 16, paddingBottom: 4, backgroundColor: "#FFF" },
  likesText:    { fontSize: 14, fontFamily: "Inter_700Bold", color: PURPLE_DARK },

  captionRow:  {
    flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "rgba(123,94,167,0.06)",
  },
  captionUsername: { fontSize: 13, fontFamily: "Inter_700Bold", color: PURPLE_DARK },
  captionText:     { fontSize: 13, fontFamily: "Inter_400Regular", color: PURPLE_DARK },

  commentsHeader: {
    fontSize: 12, fontFamily: "Inter_700Bold", color: "#8888AA",
    textTransform: "uppercase", letterSpacing: 0.6,
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: BG,
  },

  commentRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#FFF",
    borderBottomWidth: 1, borderBottomColor: "rgba(123,94,167,0.05)",
  },
  commentAvatar: {},
  commentText:   { fontSize: 13, fontFamily: "Inter_400Regular", color: PURPLE_DARK, lineHeight: 18 },
  commentUser:   { fontFamily: "Inter_700Bold" },
  commentTime:   { fontSize: 11, fontFamily: "Inter_400Regular", color: "#AAAACC", marginTop: 3 },

  noComments: {
    textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular",
    color: "#AAAACC", paddingVertical: 32,
  },

  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 14, paddingTop: 10,
    backgroundColor: "#FFF",
    borderTopWidth: 1, borderTopColor: "rgba(123,94,167,0.10)",
  },
  commentInput: {
    flex: 1, maxHeight: 100,
    backgroundColor: "rgba(123,94,167,0.07)",
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, fontFamily: "Inter_400Regular", color: PURPLE_DARK,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: PURPLE, alignItems: "center", justifyContent: "center",
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
});
