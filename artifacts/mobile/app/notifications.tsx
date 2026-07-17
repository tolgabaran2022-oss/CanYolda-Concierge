import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
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
import {
  apiFetchNotifications,
  apiMarkAllNotificationsRead,
  apiMarkNotificationRead,
  type AppNotification,
} from "@/lib/socialApi";

const PURPLE      = "#7B5EA7";
const PURPLE_DARK = "#3D2070";
const BG          = "#F9F8FF";
const CAT_DEFAULT = "https://loremflickr.com/300/300/cat?lock=500";

const TYPE_ICONS: Record<string, { name: string; color: string }> = {
  follow:     { name: "person-add",   color: PURPLE },
  like:       { name: "heart",        color: "#FF3B6B" },
  comment:    { name: "chatbubble",   color: "#5B9BD5" },
  story_view: { name: "eye",          color: "#34C759" },
};

function formatAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Az önce";
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa`;
  return `${Math.floor(h / 24)} gün`;
}

export default function NotificationsScreen() {
  const T      = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [notifs,      setNotifs]      = useState<AppNotification[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const load = useCallback(async (refresh = false) => {
    if (!user) return;
    if (refresh) setRefreshing(true);
    try {
      const data = await apiFetchNotifications();
      setNotifs(data);
    } catch {
      setNotifs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleMarkAll = async () => {
    if (!user || unreadCount === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await apiMarkAllNotificationsRead().catch(() => {});
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleTap = async (n: AppNotification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!n.read && user) {
      apiMarkNotificationRead(n.id).catch(() => {});
      setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    }
    if (n.senderId) router.push(`/user-profile/${encodeURIComponent(n.senderId)}`);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[S.root, { paddingTop: topPad, backgroundColor: T.bg }]}>
      {/* Header */}
      <View style={[S.header, { backgroundColor: T.card, borderBottomColor: T.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Icon name="chevron-back" size={24} color={T.text} />
        </Pressable>
        <Text style={[S.headerTitle, { color: T.text }]}>Bildirimler</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={handleMarkAll} hitSlop={8}>
            <Text style={S.markAll}>Tümünü okundu işaretle</Text>
          </Pressable>
        ) : <View style={{ width: 90 }} />}
      </View>

      {loading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={(n) => n.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={PURPLE}
            />
          }
          contentContainerStyle={[
            S.list,
            { paddingBottom: insets.bottom + 24 },
            notifs.length === 0 && S.emptyContainer,
          ]}
          ListEmptyComponent={
            <View style={S.empty}>
              <Icon name="notifications-off-outline" size={64} color="#C5BAE8" />
              <Text style={S.emptyTitle}>Henüz bildirim yok</Text>
              <Text style={S.emptySub}>Takip edilince veya beğeni aldığında buraya gelir</Text>
            </View>
          }
          renderItem={({ item: n }) => {
            const icon = TYPE_ICONS[n.type] ?? TYPE_ICONS.follow;
            return (
              <Pressable
                style={({ pressed }) => [S.row, !n.read && S.rowUnread, { opacity: pressed ? 0.85 : 1 }]}
                onPress={() => handleTap(n)}
              >
                {/* Avatar */}
                <View style={S.avatarWrap}>
                  <Image
                    source={{ uri: n.senderAvatar || CAT_DEFAULT }}
                    style={S.avatar}
                    contentFit="cover"
                  />
                  <View style={[S.iconBadge, { backgroundColor: icon.color }]}>
                    <Icon name={icon.name} size={10} color="#FFF" />
                  </View>
                </View>

                {/* Text */}
                <View style={S.rowText}>
                  <Text style={S.rowMsg} numberOfLines={2}>
                    <Text style={S.rowSender}>{n.senderName} </Text>
                    {n.message}
                  </Text>
                  <Text style={S.rowTime}>{formatAgo(n.createdAt)}</Text>
                </View>

                {/* Post thumbnail */}
                {n.postImage ? (
                  <Image source={{ uri: n.postImage }} style={S.postThumb} contentFit="cover" />
                ) : null}

                {/* Unread dot */}
                {!n.read && <View style={S.unreadDot} />}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1, borderBottomColor: "rgba(123,94,167,0.10)",
  },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: PURPLE_DARK },
  markAll:     { fontSize: 12, fontFamily: "Inter_500Medium", color: PURPLE },

  center:         { flex: 1, alignItems: "center", justifyContent: "center" },
  list:           { paddingTop: 8 },
  emptyContainer: { flex: 1 },

  empty:      { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40, paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: PURPLE_DARK, textAlign: "center" },
  emptySub:   { fontSize: 14, fontFamily: "Inter_400Regular", color: "#8888AA", textAlign: "center" },

  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1, borderBottomColor: "rgba(123,94,167,0.06)",
  },
  rowUnread: { backgroundColor: "rgba(123,94,167,0.04)" },

  avatarWrap: { position: "relative" },
  avatar:     { width: 46, height: 46, borderRadius: 23 },
  iconBadge:  {
    position: "absolute", bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#FFF",
  },

  rowText:   { flex: 1, gap: 3 },
  rowMsg:    { fontSize: 13, fontFamily: "Inter_400Regular", color: PURPLE_DARK, lineHeight: 18 },
  rowSender: { fontFamily: "Inter_700Bold" },
  rowTime:   { fontSize: 11, fontFamily: "Inter_400Regular", color: "#AAAACC" },

  postThumb: { width: 44, height: 44, borderRadius: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PURPLE },
});
