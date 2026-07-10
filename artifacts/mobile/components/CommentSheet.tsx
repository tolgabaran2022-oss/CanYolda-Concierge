import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import {
  apiFetchComments,
  apiAddComment,
  apiDeleteComment,
  type ApiComment,
} from "@/lib/feedApi";

const PURPLE      = "#7B5EA7";
const PURPLE_DARK = "#3D2070";

function formatAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Az önce";
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa`;
  return `${Math.floor(h / 24)} gün`;
}

interface Props {
  visible:      boolean;
  postId:       string;
  postOwnerId?: string;
  onClose:      () => void;
  onCountChange?: (delta: number) => void;
}

export function CommentSheet({ visible, postId, postOwnerId, onClose, onCountChange }: Props) {
  const T      = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [comments,    setComments]    = useState<ApiComment[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  const inputRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    if (!postId || !visible) return;
    setLoading(true);
    try {
      const c = await apiFetchComments(postId);
      setComments(c);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [postId, visible]);

  useEffect(() => {
    if (visible) load();
    else setComments([]);
  }, [visible, load]);

  const handleSubmit = useCallback(async () => {
    const t = commentText.trim();
    if (!t || !user || submitting) return;
    setSubmitting(true);
    const tempId = `temp-${Date.now()}`;
    const tempC: ApiComment = {
      id: tempId, postId,
      username: user.username ?? user.name,
      text: t, createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...prev, tempC]);
    setCommentText("");
    onCountChange?.(1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const saved = await apiAddComment(postId, user.username ?? user.name, t);
      setComments((prev) => prev.map((c) => c.id === tempId ? saved : c));
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      onCountChange?.(-1);
    } finally {
      setSubmitting(false);
    }
  }, [commentText, user, postId, submitting, onCountChange]);

  const handleDelete = useCallback((c: ApiComment) => {
    if (!user) return;
    const isOwn = c.username === (user.username ?? user.name);
    const isPostOwner = user.id === postOwnerId;
    if (!isOwn && !isPostOwner) return;
    Alert.alert("Yorumu Sil", "Bu yorumu silmek istediğine emin misin?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil", style: "destructive",
        onPress: async () => {
          setComments((prev) => prev.filter((x) => x.id !== c.id));
          onCountChange?.(-1);
          await apiDeleteComment(postId, c.id, user.id).catch(() => {});
        },
      },
    ]);
  }, [user, postId, postOwnerId, onCountChange]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={S.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        style={S.sheetWrap}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={[S.sheet, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: T.card }]}>
          {/* Handle + header */}
          <View style={[S.dragHandle, { backgroundColor: T.divider }]} />
          <View style={S.header}>
            <Text style={[S.headerTitle, { color: T.text }]}>Yorumlar</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={T.text} />
            </Pressable>
          </View>

          {/* Comments list */}
          {loading ? (
            <View style={S.center}><ActivityIndicator size="small" color={PURPLE} /></View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              style={S.list}
              contentContainerStyle={comments.length === 0 ? S.emptyContainer : S.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={[S.emptyText, { color: T.textMuted }]}>Henüz yorum yok. İlk yorumu sen yaz!</Text>
              }
              renderItem={({ item: c }) => {
                const isOwn = c.username === (user?.username ?? user?.name);
                const isPostOwner = user?.id === postOwnerId;
                const canDelete = isOwn || isPostOwner;
                return (
                  <Pressable
                    style={S.commentRow}
                    onLongPress={() => canDelete && handleDelete(c)}
                  >
                    <View style={S.commentAvatar}>
                      <Ionicons name="person-circle" size={34} color={T.purple} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[S.commentText, { color: T.text }]}>
                        <Text style={[S.commentUser, { color: T.text }]}>{c.username} </Text>
                        {c.text}
                      </Text>
                      <Text style={[S.commentTime, { color: T.textMuted }]}>{formatAgo(c.createdAt)}</Text>
                    </View>
                    {canDelete && (
                      <Pressable hitSlop={10} onPress={() => handleDelete(c)}>
                        <Ionicons name="trash-outline" size={14} color={T.textFaint} />
                      </Pressable>
                    )}
                  </Pressable>
                );
              }}
            />
          )}

          {/* Input */}
          <View style={[S.inputBar, { borderTopColor: T.divider }]}>
            <View style={S.avatarSmall}>
              <Ionicons name="person-circle" size={32} color={T.purple} />
            </View>
            <TextInput
              ref={inputRef}
              style={[S.input, { color: T.text, backgroundColor: T.input }]}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Yorum ekle..."
              placeholderTextColor={T.placeholder}
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
              multiline
              maxLength={300}
            />
            <Pressable
              style={({ pressed }) => [S.sendBtn, { opacity: pressed || !commentText.trim() || submitting ? 0.5 : 1 }]}
              onPress={handleSubmit}
              disabled={!commentText.trim() || submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Ionicons name="send" size={15} color="#FFF" />}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const S = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,10,40,0.45)",
  },
  sheetWrap: {
    flex: 1, justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "75%",
    paddingTop: 12,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 20 },
      default: {},
    }),
  },
  dragHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#DDD", alignSelf: "center", marginBottom: 12,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "rgba(123,94,167,0.08)",
  },
  headerTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: PURPLE_DARK },

  center: { height: 120, alignItems: "center", justifyContent: "center" },
  list:   { maxHeight: 380 },
  listContent: { paddingVertical: 8 },
  emptyContainer: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#AAAACC", textAlign: "center" },

  commentRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(123,94,167,0.05)",
  },
  commentAvatar: {},
  commentText:   { fontSize: 13, fontFamily: "Inter_400Regular", color: PURPLE_DARK, lineHeight: 18 },
  commentUser:   { fontFamily: "Inter_700Bold" },
  commentTime:   { fontSize: 11, fontFamily: "Inter_400Regular", color: "#AAAACC", marginTop: 3 },

  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4,
    borderTopWidth: 1, borderTopColor: "rgba(123,94,167,0.10)",
  },
  avatarSmall: {},
  input: {
    flex: 1, maxHeight: 80,
    backgroundColor: "rgba(123,94,167,0.07)",
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9,
    fontSize: 14, fontFamily: "Inter_400Regular", color: PURPLE_DARK,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: PURPLE, alignItems: "center", justifyContent: "center",
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
});
