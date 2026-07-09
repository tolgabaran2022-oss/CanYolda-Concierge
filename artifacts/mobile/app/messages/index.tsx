import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetConversations, type ApiConversation } from "@/lib/messagesApi";

const P      = "#7B5EA7";
const PDARK  = "#3D2070";
const PLIGHT = "#EDE8F8";
const BG     = "#F9F8FF";
const WHITE  = "#FFFFFF";
const MUTED  = "#9187B0";
const TEXT   = "#1C1033";
const CAT    = "https://loremflickr.com/100/100/cat?lock=500";

function timeLabel(isoStr: string): string {
  const now  = Date.now();
  const diff = now - new Date(isoStr).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)   return "şimdi";
  if (m < 60)  return `${m}d`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}s`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}g`;
  return new Date(isoStr).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export default function ConversationsScreen() {
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const { user } = useAuth();

  const [convs,     setConvs]     = useState<ApiConversation[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiGetConversations(user.id);
      setConvs(data);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (!user) {
    return (
      <View style={[S.root, { paddingTop: topPad }]}>
        <Header onBack={() => router.back()} />
        <View style={S.center}>
          <Text style={S.loginHint}>Mesajları görmek için giriş yapın</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[S.root, { paddingTop: topPad }]}>
      <Header onBack={() => router.back()} />

      {loading ? (
        <View style={S.center}><ActivityIndicator size="large" color={P} /></View>
      ) : (
        <FlatList
          data={convs}
          keyExtractor={(c) => c.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={P}
            />
          }
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View style={S.sep} />}
          renderItem={({ item }) => (
            <ConvRow
              conv={item}
              myId={user.id}
              onPress={() => router.push(`/messages/${encodeURIComponent(item.id)}`)}
            />
          )}
        />
      )}
    </View>
  );
}

/* ── Sub-components ── */

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={S.header}>
      <Pressable onPress={onBack} hitSlop={14} style={S.backBtn}>
        <Ionicons name="chevron-back" size={26} color={PDARK} />
      </Pressable>
      <Text style={S.headerTitle}>Mesajlar</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function ConvRow({ conv, myId, onPress }: { conv: ApiConversation; myId: string; onPress: () => void }) {
  const hasUnread = conv.unreadCount > 0;
  return (
    <Pressable
      style={({ pressed }) => [S.row, { backgroundColor: pressed ? "#F2EFF9" : WHITE }]}
      onPress={onPress}
    >
      {/* Avatar with online-style indicator possibility */}
      <View style={S.avatarWrap}>
        <Image
          source={{ uri: conv.otherAvatarUrl || CAT }}
          style={S.avatar}
          contentFit="cover"
        />
        {hasUnread && <View style={S.unreadDot} />}
      </View>

      {/* Content */}
      <View style={S.rowBody}>
        <View style={S.rowTop}>
          <Text style={[S.rowName, hasUnread && S.rowNameBold]} numberOfLines={1}>
            @{conv.otherUsername}
          </Text>
          <Text style={S.rowTime}>{timeLabel(conv.lastMessageAt)}</Text>
        </View>
        <View style={S.rowBottom}>
          <Text
            style={[S.rowPreview, hasUnread && S.rowPreviewBold]}
            numberOfLines={1}
          >
            {conv.lastMessage || "Sohbet başladı"}
          </Text>
          {hasUnread && (
            <View style={S.badge}>
              <Text style={S.badgeTxt}>{conv.unreadCount > 9 ? "9+" : conv.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={S.emptyWrap}>
      <View style={S.emptyCircle}>
        <Ionicons name="chatbubbles-outline" size={40} color={P} />
      </View>
      <Text style={S.emptyTitle}>Henüz mesaj yok</Text>
      <Text style={S.emptySub}>Bir kullanıcı profiline giderek mesaj gönderebilirsin</Text>
    </View>
  );
}

/* ── Styles ── */

const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loginHint: { fontSize: 15, color: MUTED, fontFamily: "Inter_400Regular" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 6, paddingVertical: 12,
    backgroundColor: WHITE,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(123,94,167,0.12)",
  },
  backBtn:     { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: PDARK },

  sep: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(123,94,167,0.08)", marginLeft: 80 },

  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 14,
  },
  avatarWrap: { position: "relative" },
  avatar:     { width: 54, height: 54, borderRadius: 27, backgroundColor: PLIGHT },
  unreadDot:  {
    position: "absolute", bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: P, borderWidth: 2, borderColor: WHITE,
  },

  rowBody:         { flex: 1, gap: 4 },
  rowTop:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowName:         { fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT, flex: 1 },
  rowNameBold:     { fontFamily: "Inter_700Bold" },
  rowTime:         { fontSize: 11, fontFamily: "Inter_400Regular", color: MUTED, marginLeft: 8 },
  rowBottom:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowPreview:      { fontSize: 13, fontFamily: "Inter_400Regular", color: MUTED, flex: 1 },
  rowPreviewBold:  { color: TEXT, fontFamily: "Inter_600SemiBold" },

  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: P, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 5, marginLeft: 6,
  },
  badgeTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: WHITE },

  emptyWrap:   { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 14, paddingHorizontal: 40 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: PLIGHT, alignItems: "center", justifyContent: "center" },
  emptyTitle:  { fontSize: 17, fontFamily: "Inter_700Bold", color: PDARK },
  emptySub:    { fontSize: 13, fontFamily: "Inter_400Regular", color: MUTED, textAlign: "center", lineHeight: 20 },
});
