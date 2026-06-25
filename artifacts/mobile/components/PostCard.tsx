import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  Animated,
} from "react-native";

const { width: SW } = Dimensions.get("window");
const IMG_H = Math.round(SW * 1.1);

const C = {
  purple:  "#7B5EA7",
  text:    "#111827",
  muted:   "#6B7280",
  border:  "#F0EDF8",
  inputBg: "#F9F8FF",
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
  const [showInput, setShowInput]     = useState(false);
  const [showAll, setShowAll]         = useState(false);
  const heartScale = React.useRef(new Animated.Value(1)).current;

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, useNativeDriver: true, speed: 40 }),
      Animated.spring(heartScale, { toValue: 1,   useNativeDriver: true, speed: 30 }),
    ]).start();
    onLike(post.id);
  };

  const handleDoubleTap = () => {
    if (!post.liked) handleLike();
  };

  const submitComment = () => {
    const t = commentText.trim();
    if (!t) return;
    onComment(post.id, t);
    setCommentText("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const visibleComments = showAll ? post.comments : post.comments.slice(-2);

  return (
    <View style={S.card}>
      {/* ── Header ─────────────────────────────── */}
      <View style={S.header}>
        <View style={S.avatarWrap}>
          <Image source={{ uri: post.user.avatar }} style={S.avatar} contentFit="cover" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.username}>{post.user.name}</Text>
          {post.location ? (
            <Text style={S.location}>
              <Ionicons name="location-outline" size={11} color={C.muted} /> {post.location}
            </Text>
          ) : null}
        </View>
        <Pressable style={S.moreBtn} hitSlop={12}>
          <Feather name="more-horizontal" size={20} color={C.muted} />
        </Pressable>
      </View>

      {/* ── Image ──────────────────────────────── */}
      <Pressable onPress={handleDoubleTap}>
        <Image
          source={{ uri: post.image }}
          style={S.image}
          contentFit="cover"
          transition={200}
        />
      </Pressable>

      {/* ── Actions ────────────────────────────── */}
      <View style={S.actions}>
        <View style={S.leftActions}>
          <Pressable onPress={handleLike} style={S.actionBtn} hitSlop={8}>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={post.liked ? "heart" : "heart-outline"}
                size={26}
                color={post.liked ? "#FF3B6B" : C.text}
              />
            </Animated.View>
          </Pressable>
          <Pressable
            onPress={() => setShowInput((v) => !v)}
            style={S.actionBtn}
            hitSlop={8}
          >
            <Ionicons name="chatbubble-outline" size={24} color={C.text} />
          </Pressable>
          <Pressable style={S.actionBtn} hitSlop={8}>
            <Feather name="send" size={22} color={C.text} />
          </Pressable>
        </View>
        <Pressable hitSlop={8}>
          <Ionicons name="bookmark-outline" size={24} color={C.text} />
        </Pressable>
      </View>

      {/* ── Meta ───────────────────────────────── */}
      <View style={S.meta}>
        <Text style={S.likeCount}>
          {post.likes + (post.liked ? 1 : 0)} beğeni
        </Text>
        {post.caption ? (
          <Text style={S.caption} numberOfLines={2}>
            <Text style={S.captionUser}>{post.user.name} </Text>
            {post.caption}
          </Text>
        ) : null}

        {/* Comments preview */}
        {post.comments.length > 2 && !showAll && (
          <Pressable onPress={() => setShowAll(true)}>
            <Text style={S.viewAllComments}>
              {post.comments.length} yorumun tamamını gör
            </Text>
          </Pressable>
        )}
        {visibleComments.map((c) => (
          <Text key={c.id} style={S.commentRow} numberOfLines={1}>
            <Text style={S.commentUser}>{c.user} </Text>
            {c.text}
          </Text>
        ))}

        <Text style={S.timestamp}>{post.timestamp}</Text>
      </View>

      {/* ── Comment input ──────────────────────── */}
      {showInput && (
        <View style={S.commentInput}>
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
              <Ionicons name="send" size={18} color={C.purple} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: C.purple,
    overflow: "hidden",
  },
  avatar:   { width: "100%", height: "100%" },
  username: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },
  location: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.muted, marginTop: 1 },
  moreBtn:  { padding: 4 },

  /* Image */
  image: { width: SW, height: IMG_H },

  /* Actions */
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  leftActions: { flexDirection: "row", gap: 14 },
  actionBtn:   { padding: 2 },

  /* Meta */
  meta: { paddingHorizontal: 14, paddingBottom: 10, gap: 3 },
  likeCount: { fontSize: 13, fontFamily: "Inter_700Bold", color: C.text },
  caption:   { fontSize: 13, fontFamily: "Inter_400Regular", color: C.text, lineHeight: 19 },
  captionUser: { fontFamily: "Inter_700Bold" },
  viewAllComments: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.muted, marginTop: 2 },
  commentRow:  { fontSize: 13, fontFamily: "Inter_400Regular", color: C.text },
  commentUser: { fontFamily: "Inter_700Bold" },
  timestamp:   { fontSize: 11, fontFamily: "Inter_400Regular", color: C.muted, marginTop: 4 },

  /* Comment input */
  commentInput: {
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
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.text,
  },
  sendBtn: { padding: 2 },
});
