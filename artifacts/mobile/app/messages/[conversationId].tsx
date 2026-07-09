import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
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
  apiGetConversations,
  apiGetMessages,
  apiMarkRead,
  apiSendMessage,
  type ApiConversation,
  type ApiMessage,
} from "@/lib/messagesApi";

const P      = "#7B5EA7";
const PDARK  = "#3D2070";
const PLIGHT = "#EDE8F8";
const BG     = "#F9F8FF";
const WHITE  = "#FFFFFF";
const MUTED  = "#9187B0";
const TEXT   = "#1C1033";
const CAT    = "https://loremflickr.com/100/100/cat?lock=500";

const POLL_INTERVAL = 3000;

function timeStr(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function dateSep(isoStr: string): string {
  const d = new Date(isoStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString())     return "Bugün";
  if (d.toDateString() === yesterday.toDateString()) return "Dün";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

type RenderedItem =
  | { kind: "date"; id: string; label: string }
  | { kind: "msg";  id: string; msg: ApiMessage };

function buildItems(msgs: ApiMessage[]): RenderedItem[] {
  const items: RenderedItem[] = [];
  let lastDate = "";
  for (const m of msgs) {
    const d = dateSep(m.createdAt);
    if (d !== lastDate) {
      items.push({ kind: "date", id: `date-${m.createdAt}`, label: d });
      lastDate = d;
    }
    items.push({ kind: "msg", id: m.id, msg: m });
  }
  return items;
}

export default function ChatScreen() {
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const { user } = useAuth();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

  const [conv,     setConv]     = useState<ApiConversation | null>(null);
  const [msgs,     setMsgs]     = useState<ApiMessage[]>([]);
  const [text,     setText]     = useState("");
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);

  const flatRef  = useRef<FlatList>(null);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestAt = useRef<string>("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  /* ── Load conversation metadata ── */
  const loadConv = useCallback(async () => {
    if (!user || !conversationId) return;
    try {
      const all = await apiGetConversations(user.id);
      const c = all.find((c) => c.id === conversationId);
      if (c) setConv(c);
    } catch { /* ignore */ }
  }, [user, conversationId]);

  /* ── Load initial messages ── */
  const loadMsgs = useCallback(async () => {
    if (!user || !conversationId) return;
    try {
      const data = await apiGetMessages(conversationId, user.id);
      setMsgs(data);
      if (data.length) latestAt.current = data[data.length - 1].createdAt;
      await apiMarkRead(conversationId, user.id);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [user, conversationId]);

  /* ── Polling for new messages ── */
  const pollNew = useCallback(async () => {
    if (!user || !conversationId || !latestAt.current) return;
    try {
      const fresh = await apiGetMessages(conversationId, user.id, latestAt.current);
      if (fresh.length) {
        setMsgs((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const added = fresh.filter((m) => !ids.has(m.id));
          return added.length ? [...prev, ...added] : prev;
        });
        latestAt.current = fresh[fresh.length - 1].createdAt;
        await apiMarkRead(conversationId, user.id);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch { /* ignore */ }
  }, [user, conversationId]);

  useEffect(() => {
    loadConv();
    loadMsgs();
  }, [loadConv, loadMsgs]);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 80);
    }
  }, [loading]);

  /* Start / stop polling */
  useLayoutEffect(() => {
    pollRef.current = setInterval(pollNew, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pollNew]);

  /* ── Send message ── */
  const handleSend = async () => {
    if (!user || !conversationId || (!text.trim() && !false)) return;
    if (sending || !text.trim()) return;

    const draft = text.trim();
    setText("");
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const msg = await apiSendMessage(conversationId, user.id, draft);
      setMsgs((p) => [...p, msg]);
      latestAt.current = msg.createdAt;
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
    } catch { /* restore on error */ setText(draft); }
    finally { setSending(false); }
  };

  /* ── Pick image ── */
  const handleImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.7,
      base64: false,
    });
    if (result.canceled || !result.assets[0]) return;
    if (!user || !conversationId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);
    try {
      const msg = await apiSendMessage(conversationId, user.id, "📷 Fotoğraf", result.assets[0].uri);
      setMsgs((p) => [...p, msg]);
      latestAt.current = msg.createdAt;
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  if (loading) {
    return (
      <View style={[S.root, { paddingTop: topPad }]}>
        <ChatHeader conv={null} onBack={() => router.back()} />
        <View style={S.center}><ActivityIndicator size="large" color={P} /></View>
      </View>
    );
  }

  const items = buildItems(msgs);

  return (
    <View style={[S.root, { paddingTop: topPad }]}>
      <ChatHeader conv={conv} onBack={() => router.back()} />

      {/* Listing card if conversation was started from a listing */}
      {conv?.listingId && (
        <View style={S.listingCard}>
          {conv.listingImage ? (
            <Image source={{ uri: conv.listingImage }} style={S.listingImg} contentFit="cover" />
          ) : (
            <View style={[S.listingImg, S.listingImgPlaceholder]}>
              <Ionicons name="paw" size={20} color={MUTED} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={S.listingLabel}>İlan</Text>
            <Text style={S.listingTitle} numberOfLines={1}>{conv.listingTitle ?? "İlan"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={MUTED} />
        </View>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatRef}
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 16, gap: 2 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={S.center}>
              <Text style={S.noMsgs}>Henüz mesaj yok. Merhaba de! 👋</Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.kind === "date") {
              return <DateSeparator label={item.label} />;
            }
            const isMine = item.msg.senderId === user?.id;
            return <MessageBubble msg={item.msg} isMine={isMine} />;
          }}
        />

        {/* Input bar */}
        <View style={[S.inputBar, { paddingBottom: insets.bottom + 6 }]}>
          <Pressable style={S.imgBtn} onPress={handleImage} hitSlop={8}>
            <Ionicons name="image-outline" size={26} color={P} />
          </Pressable>

          <TextInput
            style={S.input}
            value={text}
            onChangeText={setText}
            placeholder="Mesaj yaz…"
            placeholderTextColor={MUTED}
            multiline
            maxLength={1000}
            returnKeyType="default"
          />

          <Pressable
            style={[S.sendBtn, (!text.trim() || sending) && S.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <Ionicons name="send" size={18} color={WHITE} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ── Sub-components ── */

function ChatHeader({ conv, onBack }: { conv: ApiConversation | null; onBack: () => void }) {
  const router = useRouter();
  return (
    <View style={S.header}>
      <Pressable onPress={onBack} hitSlop={14} style={S.backBtn}>
        <Ionicons name="chevron-back" size={26} color={PDARK} />
      </Pressable>

      <Pressable
        style={S.headerUser}
        onPress={() => conv && router.push(`/user-profile/${encodeURIComponent(conv.otherUserId)}`)}
      >
        <Image
          source={{ uri: conv?.otherAvatarUrl || CAT }}
          style={S.headerAvatar}
          contentFit="cover"
        />
        <Text style={S.headerUsername} numberOfLines={1}>
          {conv ? `@${conv.otherUsername}` : "Sohbet"}
        </Text>
      </Pressable>

      <View style={{ width: 40 }} />
    </View>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <View style={S.dateSep}>
      <View style={S.dateLine} />
      <Text style={S.dateLabel}>{label}</Text>
      <View style={S.dateLine} />
    </View>
  );
}

function MessageBubble({ msg, isMine }: { msg: ApiMessage; isMine: boolean }) {
  const hasImg   = !!msg.imageUrl && msg.message !== "📷 Fotoğraf";
  const hasPhoto = !!msg.imageUrl;

  return (
    <View style={[S.bubbleRow, isMine ? S.bubbleRowRight : S.bubbleRowLeft]}>
      <View style={[S.bubbleOuter, isMine ? S.bubbleOuterRight : S.bubbleOuterLeft]}>
        {isMine ? (
          <LinearGradient
            colors={["#9B6FD6", P]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[S.bubble, S.bubbleMine]}
          >
            {hasPhoto && (
              <Image
                source={{ uri: msg.imageUrl }}
                style={S.bubbleImg}
                contentFit="cover"
              />
            )}
            {msg.message && msg.message !== "📷 Fotoğraf" && (
              <Text style={S.bubbleTxtMine}>{msg.message}</Text>
            )}
            <Text style={S.bubbleTimeMine}>{timeStr(msg.createdAt)}{msg.isRead ? " ✓✓" : " ✓"}</Text>
          </LinearGradient>
        ) : (
          <View style={[S.bubble, S.bubbleOther]}>
            {hasPhoto && (
              <Image
                source={{ uri: msg.imageUrl }}
                style={S.bubbleImg}
                contentFit="cover"
              />
            )}
            {msg.message && msg.message !== "📷 Fotoğraf" && (
              <Text style={S.bubbleTxtOther}>{msg.message}</Text>
            )}
            <Text style={S.bubbleTimeOther}>{timeStr(msg.createdAt)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/* ── Styles ── */

const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  noMsgs: { fontSize: 14, color: MUTED, fontFamily: "Inter_400Regular", textAlign: "center" },

  /* Header */
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 6, paddingVertical: 10,
    backgroundColor: WHITE,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(123,94,167,0.12)",
  },
  backBtn:       { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerUser:    { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, justifyContent: "center" },
  headerAvatar:  { width: 36, height: 36, borderRadius: 18, backgroundColor: PLIGHT },
  headerUsername:{ fontSize: 15, fontFamily: "Inter_700Bold", color: PDARK, maxWidth: 200 },

  /* Listing card */
  listingCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    margin: 12, padding: 12, borderRadius: 14,
    backgroundColor: WHITE,
    borderWidth: 1, borderColor: "rgba(123,94,167,0.14)",
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  listingImg:         { width: 48, height: 48, borderRadius: 10, backgroundColor: PLIGHT },
  listingImgPlaceholder: { alignItems: "center", justifyContent: "center" },
  listingLabel:       { fontSize: 10, fontFamily: "Inter_400Regular", color: MUTED, textTransform: "uppercase", letterSpacing: 0.8 },
  listingTitle:       { fontSize: 13, fontFamily: "Inter_700Bold", color: PDARK },

  /* Date separator */
  dateSep:  { flexDirection: "row", alignItems: "center", marginVertical: 12, gap: 10 },
  dateLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "rgba(123,94,167,0.15)" },
  dateLabel:{ fontSize: 11, fontFamily: "Inter_400Regular", color: MUTED },

  /* Bubble row */
  bubbleRow:      { marginVertical: 2 },
  bubbleRowLeft:  { alignItems: "flex-start" },
  bubbleRowRight: { alignItems: "flex-end" },

  bubbleOuter:      { maxWidth: "78%" },
  bubbleOuterLeft:  {},
  bubbleOuterRight: {},

  bubble:      { borderRadius: 18, overflow: "hidden", paddingHorizontal: 14, paddingTop: 10, paddingBottom: 7 },
  bubbleMine:  { borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: WHITE, borderBottomLeftRadius: 4,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
      android: { elevation: 1 },
      default: {},
    }),
  },

  bubbleImg:       { width: "100%", aspectRatio: 1, borderRadius: 10, marginBottom: 6, minWidth: 180 },
  bubbleTxtMine:   { fontSize: 14, fontFamily: "Inter_400Regular", color: WHITE, lineHeight: 20 },
  bubbleTxtOther:  { fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT, lineHeight: 20 },
  bubbleTimeMine:  { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.72)", textAlign: "right", marginTop: 4 },
  bubbleTimeOther: { fontSize: 10, fontFamily: "Inter_400Regular", color: MUTED, textAlign: "right", marginTop: 4 },

  /* Input */
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingTop: 10, paddingHorizontal: 12,
    backgroundColor: WHITE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(123,94,167,0.12)",
  },
  imgBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1, minHeight: 40, maxHeight: 120,
    backgroundColor: PLIGHT, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT,
    borderWidth: 1, borderColor: "rgba(123,94,167,0.18)",
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: P, alignItems: "center", justifyContent: "center",
    ...Platform.select({
      ios:     { shadowColor: P, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  sendBtnDisabled: { backgroundColor: "#C5BAE8", ...Platform.select({ ios: { shadowOpacity: 0 }, android: { elevation: 0 }, default: {} }) },
});
