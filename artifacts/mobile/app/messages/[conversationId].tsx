import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
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
import { useTheme } from "@/hooks/useTheme";
import {
  apiGetConversations,
  apiGetMessages,
  apiMarkRead,
  apiSendMessage,
  type ApiConversation,
  type ApiMessage,
} from "@/lib/messagesApi";

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
  const T        = useTheme();
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

  const loadConv = useCallback(async () => {
    if (!user || !conversationId) return;
    try {
      const all = await apiGetConversations(user.id);
      const c = all.find((c) => c.id === conversationId);
      if (c) setConv(c);
    } catch { /* ignore */ }
  }, [user, conversationId]);

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

  useLayoutEffect(() => {
    pollRef.current = setInterval(pollNew, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pollNew]);

  const handleSend = async () => {
    if (sending || !text.trim()) return;
    const draft = text.trim();
    setText("");
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const msg = await apiSendMessage(conversationId!, user!.id, draft);
      setMsgs((p) => [...p, msg]);
      latestAt.current = msg.createdAt;
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
    } catch { setText(draft); }
    finally { setSending(false); }
  };

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
      <View style={[S.root, { backgroundColor: T.bg, paddingTop: topPad }]}>
        <ChatHeader T={T} conv={null} onBack={() => router.back()} />
        <View style={S.center}>
          <ActivityIndicator size="large" color={T.purple} />
        </View>
      </View>
    );
  }

  const items = buildItems(msgs);

  return (
    <View style={[S.root, { backgroundColor: T.bg, paddingTop: topPad }]}>
      <ChatHeader T={T} conv={conv} onBack={() => router.back()} />

      {/* Listing card */}
      {conv?.listingId && (
        <View style={[S.listingCard, { backgroundColor: T.card, borderColor: T.border }]}>
          {conv.listingImage ? (
            <Image source={{ uri: conv.listingImage }} style={S.listingImg} contentFit="cover" />
          ) : (
            <View style={[S.listingImg, S.listingImgPlaceholder, { backgroundColor: T.input }]}>
              <Ionicons name="paw" size={20} color={T.textMuted} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[S.listingLabel, { color: T.textMuted }]}>İlan</Text>
            <Text style={[S.listingTitle, { color: T.text }]} numberOfLines={1}>
              {conv.listingTitle ?? "İlan"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
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
              <Text style={[S.noMsgs, { color: T.textMuted }]}>
                Henüz mesaj yok. Merhaba de!
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.kind === "date") {
              return <DateSeparator T={T} label={item.label} />;
            }
            const isMine = item.msg.senderId === user?.id;
            return <MessageBubble msg={item.msg} isMine={isMine} />;
          }}
        />

        {/* Input bar */}
        <View style={[
          S.inputBar,
          { paddingBottom: insets.bottom + 6, backgroundColor: T.card, borderTopColor: T.border },
        ]}>
          <Pressable style={S.imgBtn} onPress={handleImage} hitSlop={8}>
            <Ionicons name="image-outline" size={26} color={T.purple} />
          </Pressable>

          <TextInput
            style={[S.input, { backgroundColor: T.input, color: T.text, borderColor: T.inputBorder }]}
            value={text}
            onChangeText={setText}
            placeholder="Mesaj yaz…"
            placeholderTextColor={T.placeholder}
            multiline
            maxLength={1000}
            returnKeyType="default"
          />

          <Pressable
            style={[
              S.sendBtn,
              { backgroundColor: T.purple },
              (!text.trim() || sending) && S.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFF" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ── Sub-components ── */

type ThemeProp = { T: ReturnType<typeof useTheme> };

function ChatHeader({ T, conv, onBack }: ThemeProp & { conv: ApiConversation | null; onBack: () => void }) {
  const router = useRouter();
  const initial = conv?.otherUsername?.charAt(0).toUpperCase() ?? "?";
  return (
    <View style={[S.header, { backgroundColor: T.card, borderBottomColor: T.border }]}>
      <Pressable onPress={onBack} hitSlop={14} style={S.backBtn}>
        <Ionicons name="chevron-back" size={26} color={T.purple} />
      </Pressable>

      <Pressable
        style={S.headerUser}
        onPress={() => conv && router.push(`/user-profile/${encodeURIComponent(conv.otherUserId)}`)}
      >
        {conv?.otherAvatarUrl ? (
          <Image
            source={{ uri: conv.otherAvatarUrl }}
            style={[S.headerAvatar, { backgroundColor: T.input }]}
            contentFit="cover"
          />
        ) : (
          <View style={[S.headerAvatar, S.headerAvatarInitials, { backgroundColor: T.purple + "22" }]}>
            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: T.purple }}>{initial}</Text>
          </View>
        )}
        <Text style={[S.headerUsername, { color: T.text }]} numberOfLines={1}>
          {conv ? `@${conv.otherUsername}` : "Sohbet"}
        </Text>
      </Pressable>

      <View style={{ width: 40 }} />
    </View>
  );
}

function DateSeparator({ T, label }: ThemeProp & { label: string }) {
  return (
    <View style={S.dateSep}>
      <View style={[S.dateLine, { backgroundColor: T.border }]} />
      <Text style={[S.dateLabel, { color: T.textMuted }]}>{label}</Text>
      <View style={[S.dateLine, { backgroundColor: T.border }]} />
    </View>
  );
}

function MessageBubble({ msg, isMine }: { msg: ApiMessage; isMine: boolean }) {
  const T = useTheme();
  const [imgFailed, setImgFailed] = useState(false);
  const hasPhoto = !!msg.imageUrl;
  const showText = !!msg.message && msg.message !== "📷 Fotoğraf";

  const bubbleBg    = isMine ? T.purple : T.card;
  const textColor   = isMine ? "#FFF"   : T.text;
  const timeColor   = isMine ? "rgba(255,255,255,0.72)" : T.textMuted;
  const shadowStyle = isMine ? {} : Platform.select({
    ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
    android: { elevation: 1 },
    default: {},
  });

  return (
    <View style={[S.bubbleRow, isMine ? S.bubbleRowRight : S.bubbleRowLeft]}>
      <View style={S.bubbleOuter}>
        <View
          style={[
            S.bubble,
            { backgroundColor: bubbleBg },
            isMine ? S.bubbleMine : S.bubbleOther,
            shadowStyle,
          ]}
        >
          {hasPhoto && (
            imgFailed ? (
              <View style={[S.imgErrorBox, { backgroundColor: T.bgSecondary }]}>
                <Ionicons name="image-outline" size={28} color={T.textFaint} />
                <Text style={[S.imgErrorTxt, { color: T.textMuted }]}>Görsel yüklenemedi</Text>
              </View>
            ) : (
              <Image
                source={{ uri: msg.imageUrl! }}
                style={S.bubbleImg}
                contentFit="cover"
                onError={() => setImgFailed(true)}
              />
            )
          )}
          {showText && (
            <Text style={[S.bubbleTxt, { color: textColor }]}>{msg.message}</Text>
          )}
          <Text style={[S.bubbleTime, { color: timeColor }]}>
            {timeStr(msg.createdAt)}{isMine ? (msg.isRead ? " ✓✓" : " ✓") : ""}
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ── Styles ── */

const S = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  noMsgs: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 6, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn:              { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerUser:           { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, justifyContent: "center" },
  headerAvatar:         { width: 36, height: 36, borderRadius: 18 },
  headerAvatarInitials: { alignItems: "center", justifyContent: "center" },
  headerUsername:       { fontSize: 15, fontFamily: "Inter_700Bold", maxWidth: 200 },

  listingCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    margin: 12, padding: 12, borderRadius: 14,
    borderWidth: 1,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  listingImg:            { width: 48, height: 48, borderRadius: 10 },
  listingImgPlaceholder: { alignItems: "center", justifyContent: "center" },
  listingLabel:          { fontSize: 10, fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 0.8 },
  listingTitle:          { fontSize: 13, fontFamily: "Inter_700Bold" },

  dateSep:  { flexDirection: "row", alignItems: "center", marginVertical: 12, gap: 10 },
  dateLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dateLabel:{ fontSize: 11, fontFamily: "Inter_400Regular" },

  bubbleRow:      { marginVertical: 2 },
  bubbleRowLeft:  { alignItems: "flex-start" },
  bubbleRowRight: { alignItems: "flex-end" },
  bubbleOuter:    { maxWidth: "78%" },

  bubble:      { borderRadius: 18, overflow: "hidden", paddingHorizontal: 14, paddingTop: 10, paddingBottom: 7 },
  bubbleMine:  { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4 },

  bubbleImg: {
    width: 220,
    aspectRatio: 4 / 3,
    borderRadius: 10,
    marginBottom: 6,
  },
  imgErrorBox: {
    width: 200,
    height: 120,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 6,
  },
  imgErrorTxt: { fontSize: 12, fontFamily: "Inter_400Regular" },

  bubbleTxt:  { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  bubbleTime: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 4 },

  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingTop: 10, paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  imgBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1, minHeight: 40, maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, fontFamily: "Inter_400Regular",
    borderWidth: 1,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
});
