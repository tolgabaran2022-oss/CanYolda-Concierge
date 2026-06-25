import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const { width: SW } = Dimensions.get("window");
const CARD_W   = SW - 24;
const IMG_H    = Math.round(CARD_W * 0.65);

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
  id: string;
  user: { name: string; avatar: string };
  image: string;
  caption: string;
  location: string;
  likes: number;
  liked: boolean;
  comments: Comment[];
  timestamp: string;
};

interface Props {
  post: PostData;
  onLike: (id: string) => void;
  onComment: (id: string, text: string) => void;
}

export function PostCard({ post, onLike, onComment }: Props) {
  const [commentText, setCommentText] = useState("");
  const [showInput,   setShowInput]   = useState(false);
  const [showAll,     setShowAll]     = useState(false);
  const heartScale = React.useRef(new Animated.Value(1)).current;

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.45, useNativeDriver: true, speed: 40 }),
      Animated.spring(heartScale, { toValue: 1,    useNativeDriver: true, speed: 30 }),
    ]).start();
    onLike(post.id);
  };

  const handleDoubleTap = () => { if (!post.liked) handleLike(); };

  const submitComment = () => {
    const t = commentText.trim();
    if (!t) return;
    onComment(post.id, t);
    setCommentText("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const visibleComments = showAll ? post.comments : post.comments.slice(-1);
  const likeCount = post.likes + (post.liked ? 1 : 0);

  return (
    <View style={S.card}>
      {/* ── Card header ─────────────────────────── */}
      <View style={S.header}>
        <View style={S.avatarWrap}>
          <Image source={{ uri: post.user.avatar }} style={S.avatar} contentFit="cover" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.username}>{post.user.name}</Text>
          <Text style={S.meta}>
            {post.timestamp}{post.location ? ` · ${post.location}` : ""}
          </Text>
        </View>
        <Pressable hitSlop={12}>
          <Feather name="more-horizontal" size={20} color={C.muted} />
        </Pressable>
      </View>

      {/* ── Image (landscape) ───────────────────── */}
      <Pressable onPress={handleDoubleTap} style={S.imageWrap}>
        <Image
          source={{ uri: post.image }}
          style={S.image}
          contentFit="cover"
          transition={200}
        />
      </Pressable>

      {/* ── Actions ─────────────────────────────── */}
      <View style={S.actions}>
        <View style={S.leftActions}>
          <Pressable onPress={handleLike} style={S.actionBtn} hitSlop={8}>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={post.liked ? "heart" : "heart-outline"}
                size={24}
                color={post.liked ? "#FF3B6B" : C.text}
              />
            </Animated.View>
          </Pressable>
          <Pressable onPress={() => setShowInput((v) => !v)} style={S.actionBtn} hitSlop={8}>
            <Ionicons name="chatbubble-outline" size={22} color={C.text} />
          </Pressable>
          <Pressable style={S.actionBtn} hitSlop={8}>
            <Feather name="send" size={21} color={C.text} />
          </Pressable>
        </View>
        <Pressable hitSlop={8}>
          <Ionicons name="bookmark-outline" size={22} color={C.text} />
        </Pressable>
      </View>

      {/* ── Stats + caption ─────────────────────── */}
      <View style={S.foot}>
        <View style={S.statsRow}>
          <Text style={S.stat}>{likeCount} beğeni</Text>
          {post.comments.length > 0 && (
            <Text style={S.stat}>{post.comments.length} yorum</Text>
          )}
        </View>

        {post.caption ? (
          <Text style={S.caption} numberOfLines={2}>
            <Text style={S.captionUser}>{post.user.name} </Text>
            {post.caption}
          </Text>
        ) : null}

        {post.comments.length > 1 && !showAll && (
          <Pressable onPress={() => setShowAll(true)}>
            <Text style={S.viewAll}>Tüm yorumları gör ({post.comments.length})</Text>
          </Pressable>
        )}
        {visibleComments.map((c) => (
          <Text key={c.id} style={S.commentRow} numberOfLines={1}>
            <Text style={S.commentUser}>{c.user} </Text>
            {c.text}
          </Text>
        ))}
      </View>

      {/* ── Comment input ───────────────────────── */}
      {showInput && (
        <View style={S.commentInputWrap}>
          <View style={S.inputRow}>
            <TextInput
              style={S.input}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Yorum ekle..."
              placeholderTextColor="#ABABBB"
              returnKeyType="send"
              onSubmitEditing={submitComment}
              autoFocus
            />
            <Pressable
              onPress={submitComment}
              style={({ pressed }) => [S.sendBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="send" size={17} color={C.purple} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  card: {
    width: CARD_W,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#7B5EA7",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
      default: {
        shadowColor: "#7B5EA7",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
      },
    }),
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: C.purple,
    overflow: "hidden",
  },
  avatar:   { width: "100%", height: "100%" },
  username: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text },
  meta:     { fontSize: 11, fontFamily: "Inter_400Regular", color: C.muted, marginTop: 1 },

  imageWrap: { width: "100%", height: IMG_H },
  image:     { width: "100%", height: "100%" },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  leftActions: { flexDirection: "row", gap: 16 },
  actionBtn:   { padding: 2 },

  foot: { paddingHorizontal: 14, paddingBottom: 14, gap: 3 },
  statsRow: { flexDirection: "row", gap: 12 },
  stat:     { fontSize: 12, fontFamily: "Inter_700Bold", color: C.text },
  caption:  { fontSize: 13, fontFamily: "Inter_400Regular", color: C.text, lineHeight: 18 },
  captionUser: { fontFamily: "Inter_700Bold" },
  viewAll:     { fontSize: 12, fontFamily: "Inter_400Regular", color: C.muted },
  commentRow:  { fontSize: 12, fontFamily: "Inter_400Regular", color: C.text },
  commentUser: { fontFamily: "Inter_600SemiBold" },

  commentInputWrap: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.inputBg,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.text,
  },
  sendBtn: { padding: 2 },
});
