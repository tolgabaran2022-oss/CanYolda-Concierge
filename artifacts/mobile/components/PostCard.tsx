import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useRef, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const _RAW_W = Dimensions.get("window").width;
const SW     = Math.min(_RAW_W, 430);
const isWeb  = Platform.OS === "web";
const CARD_W = isWeb ? Math.min(SW - 24, 420) : SW - 24;
const IMG_H  = Math.round(CARD_W * (isWeb ? 0.85 : 1.05));

const C = {
  purple:  "#7B5EA7",
  text:    "#111827",
  muted:   "#9CA3AF",
  border:  "#F0EDF8",
  inputBg: "#F9F8FF",
  bg:      "#F7F6FF",
};

export type Comment = { id: string; user: string; text: string };
export type PostData = {
  id:            string;
  userId?:       string;
  user:          { name: string; avatar: string };
  image:         string;
  caption:       string;
  location:      string;
  likes:         number;
  liked:         boolean;
  bookmarked:    boolean;
  sharesCount?:  number;
  commentsCount?: number;
  comments:      Comment[];
  timestamp:     string;
};

interface Props {
  post:            PostData;
  onLike:          (id: string) => void;
  onBookmark:      (id: string) => void;
  onComment:       (id: string, text: string) => void;
  onShare?:        (id: string) => void;
  onPressUser?:    (userId: string) => void;
  onPressPost?:    (id: string) => void;
  onCommentPress?: (id: string) => void;
  isOwn?:          boolean;
  onEdit?:         (id: string) => void;
  onDelete?:       (id: string) => void;
  onReport?:       (id: string) => void;
  onBlock?:        (userId: string) => void;
}

export function PostCard({
  post,
  onLike,
  onBookmark,
  onComment,
  onShare,
  onPressUser,
  onPressPost,
  onCommentPress,
  isOwn,
  onEdit,
  onDelete,
  onReport,
  onBlock,
}: Props) {
  const T = useTheme();
  const [commentText, setCommentText] = useState("");
  const [showInput,   setShowInput]   = useState(false);
  const [showAll,     setShowAll]     = useState(false);
  const [imgError,    setImgError]    = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;
  const toastAnim  = useRef(new Animated.Value(0)).current;

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.45, useNativeDriver: true, speed: 40 }),
      Animated.spring(heartScale, { toValue: 1,    useNativeDriver: true, speed: 30 }),
    ]).start();
    onLike(post.id);
  };

  const handleDoubleTap = () => { if (!post.liked) handleLike(); };

  const handleBookmark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBookmark(post.id);
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShare?.(post.id);
    const caption = post.caption ? `"${post.caption.slice(0, 80)}"` : "";
    Share.share({
      title: `CanYoldaşı — ${post.user.name}`,
      message: `CanYoldaşı'nda ${post.user.name}'in paylaşımı${caption ? `: ${caption}` : ""}`,
    }).catch(() => {
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  };

  const submitComment = () => {
    const t = commentText.trim();
    if (!t) return;
    onComment(post.id, t);
    setCommentText("");
    setShowInput(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleMorePress = () => {
    if (isOwn) {
      /* Own post: edit / delete */
      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          { options: ["İptal", "Düzenle", "Sil"], cancelButtonIndex: 0, destructiveButtonIndex: 2, title: "Gönderi" },
          (idx) => {
            if (idx === 1) onEdit?.(post.id);
            if (idx === 2) confirmDelete();
          }
        );
      } else {
        Alert.alert("Gönderi", "Ne yapmak istersin?", [
          { text: "İptal", style: "cancel" },
          { text: "Düzenle", onPress: () => onEdit?.(post.id) },
          { text: "Sil", style: "destructive", onPress: confirmDelete },
        ]);
      }
    } else {
      /* Other's post: report / block / share */
      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          { options: ["İptal", "Paylaş", "Şikayet et", "Kullanıcıyı engelle"], cancelButtonIndex: 0, destructiveButtonIndex: 3, title: post.user.name },
          (idx) => {
            if (idx === 1) handleShare();
            if (idx === 2) onReport?.(post.id);
            if (idx === 3) confirmBlock();
          }
        );
      } else {
        Alert.alert(post.user.name, "Ne yapmak istersin?", [
          { text: "İptal", style: "cancel" },
          { text: "Paylaş", onPress: handleShare },
          { text: "Şikayet et", onPress: () => onReport?.(post.id) },
          { text: "Engelle", style: "destructive", onPress: confirmBlock },
        ]);
      }
    }
  };

  const confirmDelete = () => {
    Alert.alert("Gönderiyi Sil", "Bu gönderiyi silmek istediğine emin misin?", [
      { text: "İptal", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => onDelete?.(post.id) },
    ]);
  };

  const confirmBlock = () => {
    Alert.alert("Kullanıcıyı Engelle", `${post.user.name} adlı kullanıcıyı engellemek istiyor musun?`, [
      { text: "İptal", style: "cancel" },
      { text: "Engelle", style: "destructive", onPress: () => onBlock?.(post.userId || post.user.name) },
    ]);
  };

  const displayCommentCount = post.commentsCount ?? post.comments.length;
  const visibleComments     = showAll ? post.comments : post.comments.slice(-1);
  const likeCount           = post.likes;
  const shareCount          = post.sharesCount ?? 0;

  return (
    <View style={[S.card, { backgroundColor: T.card }]}>
      {/* ── Card header ─────────────────────────── */}
      <View style={[S.header, { backgroundColor: T.card }]}>
        {/* Avatar + name + meta — entire left area is one tap target (Instagram-style) */}
        <Pressable
          style={S.headerLeft}
          onPress={() => {
            const uid = post.userId || post.user.name;
            if (uid) onPressUser?.(uid);
          }}
          hitSlop={4}
        >
          <View style={[S.avatarWrap, { borderColor: T.purple }]}>
            <Image source={{ uri: post.user.avatar }} style={S.avatar} contentFit="cover" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[S.username, { color: T.text }]}>{post.user.name}</Text>
            <Text style={[S.meta, { color: T.textMuted }]}>
              {post.timestamp}{post.location ? ` · ${post.location}` : ""}
            </Text>
          </View>
        </Pressable>
        <Pressable hitSlop={12} onPress={handleMorePress}>
          <Feather name="more-horizontal" size={20} color={T.text} />
        </Pressable>
      </View>

      {/* ── Image ───────────────────────────────── */}
      {post.image && !imgError ? (
        <Pressable
          onPress={() => onPressPost ? onPressPost(post.id) : handleDoubleTap()}
          onLongPress={handleDoubleTap}
          delayLongPress={300}
          style={S.imageWrap}
        >
          <Image
            source={{ uri: post.image }}
            style={S.image}
            contentFit="cover"
            transition={200}
            onError={() => setImgError(true)}
          />
        </Pressable>
      ) : null}

      {/* ── Actions ─────────────────────────────── */}
      <View style={S.actions}>
        <View style={S.leftActions}>
          <Pressable onPress={handleLike} style={S.actionBtn} hitSlop={8}>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={post.liked ? "heart" : "heart-outline"}
                size={24}
                color={post.liked ? "#FF3B6B" : T.text}
              />
            </Animated.View>
          </Pressable>
          <Pressable
            onPress={() => {
              if (onCommentPress) onCommentPress(post.id);
              else if (onPressPost) onPressPost(post.id);
              else setShowInput((v) => !v);
            }}
            style={S.actionBtn} hitSlop={8}
          >
            <Ionicons name="chatbubble-outline" size={22} color={T.text} />
          </Pressable>
          <Pressable onPress={handleShare} style={S.actionBtn} hitSlop={8}>
            <Feather name="send" size={21} color={T.text} />
          </Pressable>
        </View>
        <Pressable onPress={handleBookmark} hitSlop={8}>
          <Ionicons
            name={post.bookmarked ? "bookmark" : "bookmark-outline"}
            size={22}
            color={post.bookmarked ? T.purple : T.text}
          />
        </Pressable>
      </View>

      {/* ── Stats + caption ─────────────────────── */}
      <Pressable style={S.foot} onPress={() => onPressPost?.(post.id)}>
        <View style={S.statsRow}>
          <Text style={[S.stat, { color: T.text }]}>{likeCount} beğeni</Text>
          {displayCommentCount > 0 && (
            <Text style={[S.stat, { color: T.text }]}>{displayCommentCount} yorum</Text>
          )}
          {shareCount > 0 && (
            <Text style={[S.stat, { color: T.text }]}>{shareCount} paylaşım</Text>
          )}
        </View>

        {post.caption ? (
          <Text style={[S.caption, { color: T.textMuted }]} numberOfLines={2}>
            <Text style={[S.captionUser, { color: T.text }]}>{post.user.name} </Text>
            {post.caption}
          </Text>
        ) : null}

        {displayCommentCount > 1 && !showAll && (
          <Pressable onPress={() => onPressPost ? onPressPost(post.id) : setShowAll(true)}>
            <Text style={[S.viewAll, { color: T.textMuted }]}>Tüm yorumları gör ({displayCommentCount})</Text>
          </Pressable>
        )}
        {!onPressPost && visibleComments.map((c) => (
          <Text key={c.id} style={[S.commentRow, { color: T.text }]} numberOfLines={1}>
            <Text style={[S.commentUser, { color: T.text }]}>{c.user} </Text>
            {c.text}
          </Text>
        ))}
      </Pressable>

      {/* ── Comment input (only when no post-detail nav) ── */}
      {!onPressPost && showInput && (
        <View style={[S.commentInputWrap, { borderTopColor: T.divider }]}>
          <View style={[S.inputRow, { backgroundColor: T.input, borderColor: T.inputBorder, borderWidth: 1 }]}>
            <TextInput
              style={[S.input, { color: T.text, backgroundColor: T.input }]}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Yorum ekle..."
              placeholderTextColor={T.placeholder}
              returnKeyType="send"
              onSubmitEditing={submitComment}
              autoFocus
            />
            <Pressable
              onPress={submitComment}
              style={({ pressed }) => [S.sendBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="send" size={17} color={T.purple} />
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Share toast ──────────────────────────── */}
      <Animated.View pointerEvents="none" style={[S.toast, { opacity: toastAnim }]}>
        <Text style={S.toastText}>🔗 Bağlantı kopyalandı!</Text>
      </Animated.View>
    </View>
  );
}

const S = StyleSheet.create({
  card: {
    width: CARD_W,
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    ...Platform.select({
      ios:     { shadowColor: "#7B5EA7", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 20 },
      android: { elevation: 5 },
      default: { shadowColor: "#7B5EA7", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 20 },
    }),
  },
  header:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  headerLeft:  { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  avatarWrap:  { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: C.purple, overflow: "hidden" },
  avatar:      { width: "100%", height: "100%" },
  username:    { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },
  meta:        { fontSize: 11, fontFamily: "Inter_400Regular", color: C.muted, marginTop: 1 },
  imageWrap:   {
    width: "100%",
    ...Platform.select({
      web:     { aspectRatio: 4 / 5 },
      default: { height: IMG_H },
    }),
  },
  image:       { width: "100%", height: "100%", ...Platform.select({ web: { aspectRatio: 4 / 5 }, default: {} }) },
  actions:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  leftActions: { flexDirection: "row", gap: 16 },
  actionBtn:   { padding: 2 },
  foot:        { paddingHorizontal: 14, paddingBottom: 14, gap: 3 },
  statsRow:    { flexDirection: "row", gap: 12 },
  stat:        { fontSize: 12, fontFamily: "Inter_700Bold", color: C.text },
  caption:     { fontSize: 13, fontFamily: "Inter_400Regular", color: C.text, lineHeight: 18 },
  captionUser: { fontFamily: "Inter_700Bold" },
  viewAll:     { fontSize: 12, fontFamily: "Inter_400Regular", color: C.muted },
  commentRow:  { fontSize: 12, fontFamily: "Inter_400Regular", color: C.text },
  commentUser: { fontFamily: "Inter_600SemiBold" },
  commentInputWrap: { borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 14, paddingVertical: 8 },
  inputRow:    { flexDirection: "row", alignItems: "center", backgroundColor: C.inputBg, borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  input:       { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: C.text },
  sendBtn:     { padding: 2 },
  toast:       { position: "absolute", bottom: 60, alignSelf: "center", backgroundColor: "rgba(59,36,110,0.88)", paddingHorizontal: 18, paddingVertical: 9, borderRadius: 24 },
  toastText:   { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
