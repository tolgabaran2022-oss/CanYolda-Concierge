import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useAdoption, type AdoptionListing } from "@/contexts/AdoptionContext";
import {
  apiFetchNotifications,
  apiMarkAllNotificationsRead,
  apiMarkNotificationRead,
  type AppNotification,
} from "@/lib/socialApi";
import { apiGetOrCreateConversation } from "@/lib/messagesApi";

const P    = "#7C4DCC";
const DARK = "#4B267D";
const BODY = "#6E6290";
const BG   = "#F8F4FF";
const WHITE = "#FFFFFF";
const BORDER = "rgba(124,77,204,0.12)";

const ADOPTION_TYPES = [
  "adoption_request_received",
  "adoption_request_accepted",
  "adoption_request_rejected",
  "adoption_message_received",
  "adoption_listing_updated",
  "adoption_listing_reminder",
];

type FilterTab = "all" | "requests" | "mylistings" | "following";

interface NotifConfig {
  icon: string;
  iconColor: string;
  iconBg: string;
  titleKey: string;
  ctaKey: string;
}

function getNotifConfig(type: string): NotifConfig {
  switch (type) {
    case "adoption_request_received":
      return { icon: "paw",             iconColor: P,         iconBg: `${P}18`,   titleKey: "adoptionNotifs.notifTypeRequestReceived",  ctaKey: "adoptionNotifs.ctaRequestReceived"  };
    case "adoption_request_accepted":
      return { icon: "checkmark-circle", iconColor: "#34C759", iconBg: "#E8F8EE",  titleKey: "adoptionNotifs.notifTypeRequestAccepted",   ctaKey: "adoptionNotifs.ctaRequestAccepted"  };
    case "adoption_request_rejected":
      return { icon: "close-circle",     iconColor: "#FF6B6B", iconBg: "#FFF0F0",  titleKey: "adoptionNotifs.notifTypeRequestRejected",   ctaKey: "adoptionNotifs.ctaRequestRejected"  };
    case "adoption_message_received":
      return { icon: "chatbubble",       iconColor: "#5B9BD5", iconBg: "#EBF4FF",  titleKey: "adoptionNotifs.notifTypeMessageReceived",   ctaKey: "adoptionNotifs.ctaMessageReceived"  };
    case "adoption_listing_updated":
      return { icon: "refresh-circle",   iconColor: "#FF9500", iconBg: "#FFF5E6",  titleKey: "adoptionNotifs.notifTypeListingUpdated",    ctaKey: "adoptionNotifs.ctaListingUpdated"   };
    case "adoption_listing_reminder":
      return { icon: "time",             iconColor: "#FF9500", iconBg: "#FFF5E6",  titleKey: "adoptionNotifs.notifTypeListingReminder",   ctaKey: "adoptionNotifs.ctaListingReminder"  };
    default:
      return { icon: "notifications",    iconColor: P,         iconBg: `${P}18`,   titleKey: "adoptionNotifs.notifTypeDefault",           ctaKey: "adoptionNotifs.ctaDefault"          };
  }
}

function filterNotifs(notifs: AppNotification[], filter: FilterTab): AppNotification[] {
  const adoptionOnly = notifs.filter((n) => ADOPTION_TYPES.includes(n.type));
  switch (filter) {
    case "requests":
      return adoptionOnly.filter((n) =>
        n.type === "adoption_request_received" ||
        n.type === "adoption_request_accepted" ||
        n.type === "adoption_request_rejected"
      );
    case "mylistings":
      return adoptionOnly.filter((n) =>
        n.type === "adoption_listing_updated" ||
        n.type === "adoption_listing_reminder"
      );
    case "all":
    default:
      return adoptionOnly;
  }
}

/* ── Notification Card ─────────────────────────────────────────────────── */
function NotifCard({
  notif,
  onPress,
  onRead,
}: {
  notif: AppNotification;
  onPress: () => void;
  onRead: () => void;
}) {
  const { t } = useTranslation();
  const cfg = getNotifConfig(notif.type);
  const fadeAnim = useRef(new Animated.Value(notif.read ? 1 : 0)).current;

  useEffect(() => {
    if (notif.read) Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();
  }, [notif.read]);

  const bgColor = fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [`${P}08`, WHITE] });

  const formatAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return t("adoptionNotifs.timeJustNow");
    if (m < 60) return t("adoptionNotifs.timeMinutes", { count: m });
    const h = Math.floor(m / 60);
    if (h < 24) return t("adoptionNotifs.timeHours", { count: h });
    return t("adoptionNotifs.timeDays", { count: Math.floor(h / 24) });
  };

  return (
    <Animated.View style={[S.notifCard, { backgroundColor: bgColor }]}>
      {!notif.read && <View style={S.unreadDot} />}
      <Pressable
        style={S.notifInner}
        onPress={() => { onRead(); onPress(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      >
        <View style={[S.notifIconWrap, { backgroundColor: cfg.iconBg }]}>
          <Icon name={cfg.icon} size={20} color={cfg.iconColor} />
        </View>

        <View style={S.notifBody}>
          <Text style={S.notifTitle}>{t(cfg.titleKey)}</Text>
          <Text style={S.notifMsg} numberOfLines={2}>{notif.message}</Text>
          <Text style={S.notifTime}>{formatAgo(notif.createdAt)}</Text>
        </View>

        {notif.postImage ? (
          <Image source={{ uri: notif.postImage }} style={S.notifThumb} contentFit="cover" />
        ) : notif.senderAvatar ? (
          <Image source={{ uri: notif.senderAvatar }} style={S.notifThumb} contentFit="cover" />
        ) : (
          <View style={[S.notifThumb, { backgroundColor: `${P}18`, alignItems: "center", justifyContent: "center" }]}>
            <Icon name="paw" size={18} color={`${P}80`} />
          </View>
        )}
      </Pressable>

      <View style={S.notifCta}>
        <Pressable
          style={({ pressed }) => [S.ctaBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => { onRead(); onPress(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Text style={S.ctaBtnTxt}>{t(cfg.ctaKey)}</Text>
          <Icon name="chevron-forward" size={12} color={P} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

/* ── Followed listing card ─────────────────────────────────── */
function statusInfo(status: string | undefined, t: (k: string) => string): { bg: string; text: string; label: string } {
  switch (status) {
    case "Sahiplendirildi": return { bg: "#E8F8EE", text: "#34C759", label: t("adoptionNotifs.statusSahiplendirildi") };
    case "Pasif":           return { bg: "#FFF0F0", text: "#FF6B6B", label: t("adoptionNotifs.statusPasif")           };
    case "Süresi Doldu":    return { bg: "#FFF5E6", text: "#FF9500", label: t("adoptionNotifs.statusSuresiDoldu")     };
    case "Onay Bekliyor":   return { bg: `${P}14`,  text: P,         label: t("adoptionNotifs.statusOnayBekliyor")    };
    default:                return { bg: "#E8F8EE", text: "#34C759", label: t("adoptionNotifs.statusAktif")           };
  }
}

function FollowedCard({
  listing,
  onPress,
  onUnfollow,
}: {
  listing: AdoptionListing;
  onPress: () => void;
  onUnfollow: () => void;
}) {
  const { t } = useTranslation();
  const sc = statusInfo(listing.status, t);
  return (
    <Pressable
      style={({ pressed }) => [S.followCard, { opacity: pressed ? 0.92 : 1 }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
    >
      {listing.photo ? (
        <Image source={{ uri: listing.photo }} style={S.followThumb} contentFit="cover" />
      ) : (
        <View style={[S.followThumb, S.followThumbPlaceholder]}>
          <Icon name="paw" size={22} color={`${P}60`} />
        </View>
      )}

      <View style={S.followBody}>
        <View style={S.followTopRow}>
          <Text style={S.followName} numberOfLines={1}>{listing.petName}</Text>
          <View style={[S.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[S.statusTxt, { color: sc.text }]}>{sc.label}</Text>
          </View>
        </View>

        <Text style={S.followMeta} numberOfLines={1}>
          {[listing.petType, listing.petAge].filter(Boolean).join(" · ")}
        </Text>

        {listing.location ? (
          <View style={S.followLocRow}>
            <Icon name="location-outline" size={11} color={BODY} />
            <Text style={S.followLoc} numberOfLines={1}>{listing.location}</Text>
          </View>
        ) : null}

        <Text style={S.followSub}>{t("adoptionNotifs.followedLabel")}</Text>
      </View>

      <View style={S.followActions}>
        <Pressable
          style={({ pressed }) => [S.followGoBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
          hitSlop={6}
        >
          <Text style={S.followGoBtnTxt}>{t("adoptionNotifs.viewListing")}</Text>
          <Icon name="chevron-forward" size={11} color={P} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [S.unfollowBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onUnfollow(); }}
          hitSlop={6}
        >
          <Icon name="heart-dislike-outline" size={14} color="#FF6B6B" />
        </Pressable>
      </View>
    </Pressable>
  );
}

/* ── Main screen ───────────────────────────────────────────── */
export default function AdoptionNotificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { followedListings, followedLoading, loadFollowed, unfollowListing } = useAdoption();

  const [notifs,     setNotifs]     = useState<AppNotification[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState<FilterTab>("all");

  const topPad = Platform.OS === "web" ? 20 : insets.top + 4;
  const botPad = Platform.OS === "web" ? 24 : insets.bottom + 16;

  const adoptionNotifs = notifs.filter((n) => ADOPTION_TYPES.includes(n.type));
  const unreadCount    = adoptionNotifs.filter((n) => !n.read).length;
  const displayed      = filterNotifs(notifs, filter);

  const FILTERS: { key: FilterTab; labelKey: string }[] = [
    { key: "all",        labelKey: "adoptionNotifs.filterAll"        },
    { key: "requests",   labelKey: "adoptionNotifs.filterRequests"   },
    { key: "mylistings", labelKey: "adoptionNotifs.filterMyListings" },
    { key: "following",  labelKey: "adoptionNotifs.filterFollowing"  },
  ];

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

  const loadAll = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    await Promise.all([
      load(false),
      loadFollowed(),
    ]).catch(() => {});
    if (refresh) setRefreshing(false);
  }, [load, loadFollowed]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleMarkAll = async () => {
    if (!user || unreadCount === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await apiMarkAllNotificationsRead().catch(() => {});
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkOne = async (id: string) => {
    const notif = notifs.find((n) => n.id === id);
    if (!notif || notif.read || !user) return;
    await apiMarkNotificationRead(id).catch(() => {});
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const handleCta = async (notif: AppNotification) => {
    if (notif.type === "adoption_request_received" && notif.postId) {
      router.push(`/adoption/${notif.postId}` as any);
    } else if (notif.type === "adoption_request_accepted" && user && notif.senderId) {
      try {
        const conv = await apiGetOrCreateConversation(user.id, notif.senderId, notif.postId ? { id: notif.postId, title: "", imageUrl: notif.postImage ?? "" } : undefined);
        router.push(`/messages/${encodeURIComponent(conv.id)}` as any);
      } catch {
        if (notif.postId) router.push(`/adoption/${notif.postId}` as any);
      }
    } else if (notif.postId) {
      router.push(`/adoption/${notif.postId}` as any);
    }
  };

  const isFollowingTab = filter === "following";
  const showFollowedLoading = isFollowingTab && followedLoading && followedListings.length === 0;

  return (
    <View style={[S.root, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={S.header}>
        <Pressable style={S.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Icon name="chevron-back" size={22} color={DARK} />
        </Pressable>
        <View style={S.headerCenter}>
          <Text style={S.headerTitle}>{t("adoptionNotifs.headerTitle")}</Text>
          {unreadCount > 0 && (
            <View style={S.unreadBadgeHeader}>
              <Text style={S.unreadBadgeHeaderTxt}>{t("adoptionNotifs.unreadCount", { count: unreadCount > 99 ? "99+" : unreadCount })}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && !isFollowingTab && (
          <Pressable style={S.markAllBtn} onPress={handleMarkAll} hitSlop={8}>
            <Text style={S.markAllTxt}>{t("adoptionNotifs.markAllRead")}</Text>
          </Pressable>
        )}
      </View>

      {/* Filter tabs */}
      <View style={S.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={({ pressed }) => [S.filterTab, filter === f.key && S.filterTabActive, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => { setFilter(f.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Text style={[S.filterTabTxt, filter === f.key && S.filterTabTxtActive]}>{t(f.labelKey)}</Text>
            {f.key === "following" && followedListings.length > 0 && (
              <View style={S.tabBadge}>
                <Text style={S.tabBadgeTxt}>{followedListings.length}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* Followed listings tab */}
      {isFollowingTab ? (
        <FlatList
          data={followedListings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: botPad, gap: 10, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadAll(true)}
              tintColor={P}
              colors={[P]}
            />
          }
          renderItem={({ item }) => (
            <FollowedCard
              listing={item}
              onPress={() => router.push(`/adoption/${item.id}` as any)}
              onUnfollow={() => unfollowListing(item.id)}
            />
          )}
          ListEmptyComponent={
            showFollowedLoading ? null : (
              <View style={S.empty}>
                <View style={S.emptyIllo}>
                  <Icon name="heart-outline" size={36} color={`${P}60`} />
                </View>
                <Text style={S.emptyTitle}>{t("adoptionNotifs.emptyNoFollowing")}</Text>
                <Text style={S.emptySub}>{t("adoptionNotifs.emptyNoFollowingSub")}</Text>
              </View>
            )
          }
        />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: botPad, gap: 10, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadAll(true)}
              tintColor={P}
              colors={[P]}
            />
          }
          renderItem={({ item }) => (
            <NotifCard
              notif={item}
              onRead={() => handleMarkOne(item.id)}
              onPress={() => handleCta(item)}
            />
          )}
          ListEmptyComponent={
            loading ? null : (
              <View style={S.empty}>
                <View style={S.emptyIllo}>
                  <Icon name="notifications-outline" size={36} color={`${P}60`} />
                </View>
                <Text style={S.emptyTitle}>{t("adoptionNotifs.emptyNoNotifs")}</Text>
                <Text style={S.emptySub}>
                  {filter === "all"
                    ? t("adoptionNotifs.emptyNoNotifsAll")
                    : t("adoptionNotifs.emptyNoNotifsCategory")}
                </Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: `${P}10`, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, gap: 3 },
  headerTitle:  { fontSize: 18, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.3 },
  unreadBadgeHeader:    { alignSelf: "flex-start", backgroundColor: "#FF3B6B", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  unreadBadgeHeaderTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: WHITE },
  markAllBtn:   { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: `${P}12` },
  markAllTxt:   { fontSize: 12, fontFamily: "Inter_600SemiBold", color: P },

  filterRow: {
    flexDirection: "row", paddingHorizontal: 16, gap: 8, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  filterTab:       { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: "transparent" },
  filterTabActive: { backgroundColor: `${P}14` },
  filterTabTxt:    { fontSize: 13, fontFamily: "Inter_500Medium", color: BODY },
  filterTabTxtActive: { color: P, fontFamily: "Inter_700Bold" },
  tabBadge:    { backgroundColor: "#FF3B6B", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: "center" },
  tabBadgeTxt: { fontSize: 10, fontFamily: "Inter_700Bold", color: WHITE },

  notifCard: {
    borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    backgroundColor: WHITE, overflow: "hidden",
    ...Platform.select({
      ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  notifInner:   { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
  notifIconWrap:{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  notifBody:    { flex: 1, gap: 3 },
  notifTitle:   { fontSize: 13, fontFamily: "Inter_700Bold", color: DARK },
  notifMsg:     { fontSize: 13, fontFamily: "Inter_400Regular", color: BODY, lineHeight: 19 },
  notifTime:    { fontSize: 11, fontFamily: "Inter_400Regular", color: `${BODY}80`, marginTop: 2 },
  notifThumb:   { width: 52, height: 52, borderRadius: 12, flexShrink: 0 },
  unreadDot:    { position: "absolute", top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF3B6B", zIndex: 1 },

  notifCta: {
    borderTopWidth: 1, borderTopColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 10, alignItems: "flex-end",
  },
  ctaBtn:    { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${P}10`, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  ctaBtnTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: P },

  followCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    backgroundColor: WHITE, padding: 12,
    ...Platform.select({
      ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  followThumb: {
    width: 64, height: 64, borderRadius: 14, flexShrink: 0,
  },
  followThumbPlaceholder: {
    backgroundColor: `${P}14`, alignItems: "center", justifyContent: "center",
  },
  followBody:   { flex: 1, gap: 3 },
  followTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  followName:   { fontSize: 15, fontFamily: "Inter_700Bold", color: DARK, flex: 1 },
  statusBadge:  { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0 },
  statusTxt:    { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  followMeta:   { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY },
  followLocRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  followLoc:    { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, flex: 1 },
  followSub:    { fontSize: 11, fontFamily: "Inter_400Regular", color: `${P}70`, marginTop: 2 },
  followActions:{ gap: 6, alignItems: "flex-end", flexShrink: 0 },
  followGoBtn:  { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: `${P}12`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  followGoBtnTxt:{ fontSize: 12, fontFamily: "Inter_700Bold", color: P },
  unfollowBtn:  { width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFF0F0", alignItems: "center", justifyContent: "center" },

  empty:      { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyIllo:  { width: 80, height: 80, borderRadius: 40, backgroundColor: `${P}10`, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: DARK },
  emptySub:   { fontSize: 14, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center", paddingHorizontal: 40, lineHeight: 22 },
});
