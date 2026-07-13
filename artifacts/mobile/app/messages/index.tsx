import { Icon } from "@/components/Icon";
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
import { useTheme } from "@/hooks/useTheme";
import { apiGetConversations, type ApiConversation } from "@/lib/messagesApi";

const P = "#7B5EA7";

function timeLabel(isoStr: string): string {
  const now  = Date.now();
  const diff = now - new Date(isoStr).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)   return "şimdi";
  if (m < 60)  return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} sa`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d} g`;
  return new Date(isoStr).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export default function ConversationsScreen() {
  const T        = useTheme();
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const { user } = useAuth();

  const [convs,      setConvs]      = useState<ApiConversation[]>([]);
  const [loading,    setLoading]    = useState(true);
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
      <View style={[S.root, { paddingTop: topPad, backgroundColor: T.bg }]}>
        <Header onBack={() => router.back()} />
        <View style={S.center}>
          <Text style={{ color: T.textMuted, fontSize: 15, fontFamily: "Inter_400Regular" }}>
            Mesajları görmek için giriş yapın
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[S.root, { paddingTop: topPad, backgroundColor: T.bg }]}>
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
          ItemSeparatorComponent={() => <View style={[S.sep, { backgroundColor: T.divider }]} />}
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
  const T = useTheme();
  return (
    <View style={[S.header, { backgroundColor: T.card, borderBottomColor: T.border }]}>
      <Pressable onPress={onBack} hitSlop={14} style={S.backBtn}>
        <Icon name="chevron-back" size={26} color={T.text} />
      </Pressable>
      <Text style={[S.headerTitle, { color: T.text }]}>Mesajlar</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function ConvRow({ conv, myId, onPress }: { conv: ApiConversation; myId: string; onPress: () => void }) {
  const T = useTheme();
  const hasUnread = conv.unreadCount > 0;
  const initials = (conv.otherUsername ?? "?").slice(0, 1).toUpperCase();

  return (
    <Pressable
      style={({ pressed }) => [S.row, { backgroundColor: pressed ? T.cardElevated : T.card }]}
      onPress={onPress}
    >
      <View style={S.avatarWrap}>
        {conv.otherAvatarUrl ? (
          <Image
            source={{ uri: conv.otherAvatarUrl }}
            style={S.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={[S.avatarPlaceholder, { backgroundColor: `${T.purple}22` }]}>
            <Text style={[S.avatarInitial, { color: T.purple }]}>{initials}</Text>
          </View>
        )}
        {hasUnread && <View style={[S.unreadDot, { borderColor: T.card }]} />}
      </View>

      <View style={S.rowBody}>
        <View style={S.rowTop}>
          <Text style={[S.rowName, { color: T.text }, hasUnread && S.rowNameBold]} numberOfLines={1}>
            @{conv.otherUsername}
          </Text>
          <Text style={[S.rowTime, { color: T.textMuted }]}>{timeLabel(conv.lastMessageAt)}</Text>
        </View>
        <View style={S.rowBottom}>
          <Text
            style={[S.rowPreview, { color: T.textMuted }, hasUnread && { color: T.text, fontFamily: "Inter_600SemiBold" }]}
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
  const T = useTheme();
  return (
    <View style={S.emptyWrap}>
      <View style={[S.emptyCircle, { backgroundColor: `${T.purple}18` }]}>
        <Icon name="chatbubbles-outline" size={40} color={T.purple} />
      </View>
      <Text style={[S.emptyTitle, { color: T.text }]}>Henüz mesaj yok</Text>
      <Text style={[S.emptySub, { color: T.textMuted }]}>Bir kullanıcı profiline giderek mesaj gönderebilirsin</Text>
    </View>
  );
}

/* ── Styles ── */

const S = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 6, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn:     { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },

  sep: { height: StyleSheet.hairlineWidth, marginLeft: 80 },

  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 14,
  },
  avatarWrap: { position: "relative" },
  avatar:     { width: 54, height: 54, borderRadius: 27 },
  avatarPlaceholder: {
    width: 54, height: 54, borderRadius: 27,
    alignItems: "center", justifyContent: "center",
  },
  avatarInitial: { fontSize: 22, fontFamily: "Inter_700Bold" },
  unreadDot:  {
    position: "absolute", bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: P, borderWidth: 2,
  },

  rowBody:         { flex: 1, gap: 4 },
  rowTop:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowName:         { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  rowNameBold:     { fontFamily: "Inter_700Bold" },
  rowTime:         { fontSize: 11, fontFamily: "Inter_400Regular", marginLeft: 8 },
  rowBottom:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowPreview:      { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },

  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: P, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 5, marginLeft: 6,
  },
  badgeTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#FFF" },

  emptyWrap:   { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 14, paddingHorizontal: 40 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle:  { fontSize: 17, fontFamily: "Inter_700Bold" },
  emptySub:    { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
