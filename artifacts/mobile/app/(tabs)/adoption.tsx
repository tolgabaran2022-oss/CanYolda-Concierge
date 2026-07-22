import { Icon } from "@/components/Icon";
import BusinessProfilesComingSoonBanner from "@/components/adoption/BusinessProfilesComingSoonBanner";
import {
  AdoptionFilterSheet,
  countActiveFilters,
  DEFAULT_FILTERS,
  extractCity,
  normalizeGender,
  parseAgeMonths,
  type AdoptionFilters,
} from "@/components/AdoptionFilterSheet";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  useWindowDimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { AdoptionListing } from "@/contexts/AdoptionContext";
import { useAdoption } from "@/contexts/AdoptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBoost, type BoostPackage } from "@/contexts/BoostContext";
import { useTheme } from "@/hooks/useTheme";
import { formatTimeAgo } from "@/utils/formatters";
import { isListingPromoted, formatRemainingTime, useNow } from "@/utils/promotionHelpers";
import { apiFetchNotifications } from "@/lib/socialApi";
import { apiGetConversations, type ApiConversation } from "@/lib/messagesApi";

// ── Palette ───────────────────────────────────────────────────────────────────
const P      = "#7C4DCC";
const P2     = "#A480D8";
const DARK   = "#4B267D";
const BODY   = "#6E6290";
const BG     = "#F8F4FF";
const WHITE  = "#FFFFFF";
const BORDER = "rgba(124,77,204,0.12)";
const TAB_H  = 68;

const IOS_SHADOW = Platform.select({
  ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14 },
  android: { elevation: 3 },
  default: {},
});
const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 18 },
  android: { elevation: 4 },
  default: {},
});

const DOG_IMG = require("../../assets/hero-puppy.png");

type Tab        = "create" | "mylistings" | "messages" | "listings";
type Filter     = "all" | "cat" | "dog" | "bird" | "rabbit" | "new" | "other";
type MyFilter   = "all" | "active" | "passive" | "pending" | "adopted";
type ListStatus = "Aktif" | "Onay Bekliyor" | "Pasif" | "Sahiplendirildi" | "Süresi Doldu";

const TYPE_NORMALIZE: Record<string, Filter> = {
  Kedi: "cat", kedi: "cat", cat: "cat",
  Köpek: "dog", köpek: "dog", dog: "dog",
  Kuş: "bird", kuş: "bird", bird: "bird",
  Tavşan: "rabbit", tavşan: "rabbit", rabbit: "rabbit",
};

const FILTER_DEFS: { key: Filter; labelKey: string; icon: string }[] = [
  { key: "all",    labelKey: "adoption.filterChips.all",    icon: "apps-outline"             },
  { key: "cat",    labelKey: "adoption.filterChips.cat",    icon: "paw-outline"              },
  { key: "dog",    labelKey: "adoption.filterChips.dog",    icon: "paw"                      },
  { key: "bird",   labelKey: "adoption.filterChips.bird",   icon: "leaf-outline"             },
  { key: "rabbit", labelKey: "adoption.filterChips.rabbit", icon: "heart-outline"            },
  { key: "new",    labelKey: "adoption.filterChips.new",    icon: "sparkles-outline"         },
  { key: "other",  labelKey: "adoption.filterChips.other",  icon: "ellipsis-horizontal-circle-outline" },
];

const CHIP_W   = 80;
const CHIP_H   = 36;
const CHIP_GAP = 8;

const ADOPTION_NOTIF_TYPES = [
  "adoption_request_received",
  "adoption_request_accepted",
  "adoption_request_rejected",
  "adoption_message_received",
  "adoption_listing_updated",
  "adoption_listing_reminder",
];

// ── Tab defs ──────────────────────────────────────────────────────────────────
const TAB_DEFS: { key: Tab; labelKey: string; icon: string }[] = [
  { key: "create",     labelKey: "adoption.tabs.create",     icon: "add-circle-outline"  },
  { key: "mylistings", labelKey: "adoption.tabs.mylistings", icon: "list-outline"        },
  { key: "messages",   labelKey: "adoption.tabs.messages",   icon: "chatbubbles-outline" },
  { key: "listings",   labelKey: "adoption.tabs.listings",   icon: "heart-outline"       },
];

const MY_FILTER_DEFS: { key: MyFilter; labelKey: string }[] = [
  { key: "all",     labelKey: "adoption.myFilters.all"     },
  { key: "active",  labelKey: "adoption.myFilters.active"  },
  { key: "passive", labelKey: "adoption.myFilters.passive" },
  { key: "pending", labelKey: "adoption.myFilters.pending" },
  { key: "adopted", labelKey: "adoption.myFilters.adopted" },
];

const STATUS_CFG: Record<ListStatus, { color: string; bg: string; icon: string }> = {
  "Aktif":           { color: "#18A558", bg: "#E6F7EE",    icon: "checkmark-circle"     },
  "Onay Bekliyor":   { color: "#D97706", bg: "#FEF3C7",    icon: "time-outline"         },
  "Pasif":           { color: BODY,      bg: `${BODY}14`,  icon: "pause-circle-outline" },
  "Sahiplendirildi": { color: P,         bg: `${P}14`,     icon: "heart-circle"         },
  "Süresi Doldu":    { color: "#DC2626", bg: "#FEE2E2",    icon: "close-circle-outline" },
};

const STATUS_LABEL_KEYS: Record<ListStatus, string> = {
  "Aktif":           "adoption.statusLabels.active",
  "Onay Bekliyor":   "adoption.statusLabels.pending",
  "Pasif":           "adoption.statusLabels.passive",
  "Sahiplendirildi": "adoption.statusLabels.adopted",
  "Süresi Doldu":    "adoption.statusLabels.expired",
};

function pkgFormatPrice(unitAmount: number): string {
  return (unitAmount / 100).toFixed(0);
}

interface MyCard {
  listing: AdoptionListing;
  status:  ListStatus;
}

// ── Msg time label hook ────────────────────────────────────────────────────────
function useMsgTimeLabel() {
  const { t } = useTranslation();
  return useCallback((iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1)  return t("adoption.time.now");
    if (m < 60) return t("adoption.time.minutes", { count: m });
    const h = Math.floor(m / 60);
    if (h < 24) return t("adoption.time.hours", { count: h });
    const d = Math.floor(h / 24);
    if (d < 7)  return t("adoption.time.days", { count: d });
    return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  }, [t]);
}

// ── Adoption header ───────────────────────────────────────────────────────────
function AdoptionHeader({ topPad }: { topPad: number }) {
  const T = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    apiFetchNotifications().then((notifs) => {
      if (cancelled) return;
      const count = notifs.filter((n) => !n.read && ADOPTION_NOTIF_TYPES.includes(n.type)).length;
      setUnreadCount(count);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const badgeLabel = unreadCount <= 0 ? null : unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <View style={[ah.wrap, { paddingTop: topPad + 6, backgroundColor: T.bg }]}>
      <View style={ah.titleRow}>
        <Text style={[ah.title, { color: DARK }]}>{t("adoption.title")}</Text>
        <View style={ah.underline} />
      </View>
      <Pressable
        style={ah.bellBtn}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/adoption-notifications" as any); }}
        hitSlop={10}
      >
        <Icon name="notifications-outline" size={22} color={badgeLabel ? P : BODY} />
        {badgeLabel ? (
          <View style={ah.bellBadge}>
            <Text style={ah.bellBadgeTxt}>{badgeLabel}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}
const ah = StyleSheet.create({
  wrap:      { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, backgroundColor: WHITE },
  titleRow:  { alignItems: "flex-start", paddingBottom: 0 },
  title:     { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.3 },
  underline: { height: 3, backgroundColor: P, borderRadius: 2, marginTop: 4, width: "100%" },
  bellBtn:   { paddingBottom: 4, position: "relative" },
  bellBadge: { position: "absolute", top: 0, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: "#FF3B30", borderWidth: 1.5, borderColor: WHITE, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  bellBadgeTxt: { fontSize: 9, fontFamily: "Inter_700Bold", color: WHITE, lineHeight: 11 },
});

const dividerStyle = StyleSheet.create({
  divider: { height: 1, backgroundColor: BORDER },
});

// ── Tab switcher (4-segment) ──────────────────────────────────────────────────
function TabSwitcher({
  active,
  onChange,
  unreadMessages = 0,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  unreadMessages?: number;
}) {
  const T = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[tsw.wrap, { backgroundColor: T.card, borderColor: T.border }]}>
      {TAB_DEFS.map((tab) => {
        const isActive   = active === tab.key;
        const showBadge  = tab.key === "messages" && unreadMessages > 0;
        return (
          <Pressable
            key={tab.key}
            style={tsw.item}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(tab.key); }}
          >
            {isActive ? (
              <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={tsw.grad}>
                <Icon name={tab.icon} size={12} color={WHITE} />
                <Text style={tsw.lblActive} numberOfLines={1}>{t(tab.labelKey)}</Text>
                {showBadge && (
                  <View style={tsw.badge}>
                    <Text style={tsw.badgeTxt}>{unreadMessages > 9 ? "9+" : String(unreadMessages)}</Text>
                  </View>
                )}
              </LinearGradient>
            ) : (
              <View style={tsw.inactiveRow}>
                <Icon name={tab.icon} size={12} color={T.purple} />
                <Text style={[tsw.lblInactive, { color: T.textMuted }]} numberOfLines={1}>{t(tab.labelKey)}</Text>
                {showBadge && (
                  <View style={tsw.badge}>
                    <Text style={tsw.badgeTxt}>{unreadMessages > 9 ? "9+" : String(unreadMessages)}</Text>
                  </View>
                )}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
const tsw = StyleSheet.create({
  wrap:        { flexDirection: "row", marginHorizontal: 7, marginTop: 12, marginBottom: 16, backgroundColor: WHITE, borderRadius: 18, padding: 5, borderWidth: 1, borderColor: BORDER, ...IOS_SHADOW },
  item:        { flex: 1, borderRadius: 14, overflow: "hidden" },
  grad:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 13, paddingHorizontal: 2 },
  inactiveRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 13, paddingHorizontal: 2 },
  lblActive:   { fontSize: 12, fontFamily: "Inter_700Bold",   color: WHITE, flexShrink: 1 },
  lblInactive: { fontSize: 12, fontFamily: "Inter_500Medium", color: P,     flexShrink: 1 },
  badge:       { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: "#FF3B30", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeTxt:    { fontSize: 9, fontFamily: "Inter_700Bold", color: WHITE, lineHeight: 11 },
});

// ── Search bar ────────────────────────────────────────────────────────────────
function SearchBar({
  query,
  onQuery,
  onFilter,
  activeFilterCount = 0,
}: {
  query: string;
  onQuery: (q: string) => void;
  onFilter: () => void;
  activeFilterCount?: number;
}) {
  const T = useTheme();
  const { t } = useTranslation();
  return (
    <View style={sb.wrap}>
      <View style={[sb.inputWrap, { backgroundColor: T.card, borderColor: T.border }]}>
        <Icon name="search-outline" size={16} color={T.textMuted} />
        <TextInput
          style={[sb.input, { color: T.text }]}
          placeholder={t("adoption.searchPlaceholder")}
          placeholderTextColor={T.placeholder}
          value={query}
          onChangeText={onQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => onQuery("")} hitSlop={8}>
            <Icon name="close-circle" size={16} color={T.textMuted} />
          </Pressable>
        )}
      </View>
      <View style={sb.filterWrap}>
        <Pressable
          style={sb.filterBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onFilter(); }}
        >
          <LinearGradient
            colors={activeFilterCount > 0 ? [P2, P] : ["transparent", "transparent"]}
            style={[sb.filterGrad, activeFilterCount === 0 && { backgroundColor: T.card, borderColor: T.border, borderWidth: 1 }]}
          >
            <Icon name="options-outline" size={16} color={activeFilterCount > 0 ? WHITE : T.textMuted} />
            {activeFilterCount > 0 && (
              <View style={sb.filterBadge}>
                <Text style={sb.filterBadgeTxt}>{activeFilterCount}</Text>
              </View>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}
const sb = StyleSheet.create({
  wrap:        { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, marginBottom: 10 },
  inputWrap:   { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  input:       { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
  filterWrap:  {},
  filterBtn:   { borderRadius: 14, overflow: "hidden" },
  filterGrad:  { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  filterBadge: { position: "absolute", top: 6, right: 6, width: 14, height: 14, borderRadius: 7, backgroundColor: WHITE, alignItems: "center", justifyContent: "center" },
  filterBadgeTxt: { fontSize: 8, fontFamily: "Inter_700Bold", color: P },
});

// ── Filter row ────────────────────────────────────────────────────────────────
function FilterRow({ active, onChange }: { active: Filter; onChange: (f: Filter) => void }) {
  const T = useTheme();
  const { t } = useTranslation();
  const filterRef = useRef<FlatList>(null);

  const handlePress = (key: Filter, idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(key);
    filterRef.current?.scrollToIndex({ index: idx, viewPosition: 0.5, animated: true });
  };

  return (
    <FlatList
      ref={filterRef}
      data={FILTER_DEFS}
      horizontal
      keyExtractor={(item) => item.key}
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      onScrollToIndexFailed={() => {}}
      style={fc.root}
      contentContainerStyle={fc.list}
      ItemSeparatorComponent={() => <View style={{ width: CHIP_GAP }} />}
      renderItem={({ item: f, index }) => {
        const isActive = active === f.key;
        return (
          <Pressable
            key={f.key}
            onPress={() => handlePress(f.key, index)}
            style={fc.chipWrap}
          >
            {isActive ? (
              <LinearGradient
                colors={[P2, P]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[fc.chip, fc.chipActiveShadow]}
              >
                <Icon name={f.icon} size={13} color="#FFF" />
                <Text style={fc.lblActive}>{t(f.labelKey)}</Text>
              </LinearGradient>
            ) : (
              <View style={[fc.chip, fc.chipInactive, { backgroundColor: T.card, borderColor: T.border }]}>
                <Icon name={f.icon} size={13} color={P} />
                <Text style={[fc.lbl, { color: T.purple }]}>{t(f.labelKey)}</Text>
              </View>
            )}
          </Pressable>
        );
      }}
    />
  );
}
const fc = StyleSheet.create({
  root: { marginBottom: 12, overflow: "visible" },
  list: {
    paddingLeft: 20,
    paddingRight: 28,
    paddingTop: 6,
    paddingBottom: 10,
  },
  chipWrap: { width: CHIP_W, overflow: "visible" },
  chip: {
    width: CHIP_W,
    height: CHIP_H,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    overflow: "visible",
  },
  chipInactive: {
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: `${P}30`,
    ...Platform.select({
      ios:     { shadowColor: "#4B267D", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.09, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  chipActiveShadow: {
    ...Platform.select({
      ios:     { shadowColor: P, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 10 },
      android: { elevation: 5 },
      default: {},
    }),
  },
  lbl:      { fontSize: 12, fontFamily: "Inter_600SemiBold", color: P },
  lblActive:{ fontSize: 12, fontFamily: "Inter_700Bold",    color: WHITE },
});

// ── Listing card ──────────────────────────────────────────────────────────────
const IMG_H = 148;

function ListingCard({ listing }: { listing: AdoptionListing }) {
  const T = useTheme();
  const router = useRouter();
  const { isFollowed, followListing, unfollowListing } = useAdoption();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isFeatured = isListingPromoted(listing.promotedUntil);
  const liked = isFollowed(listing.id);

  const handleHeartPress = async (e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    if (!user) {
      Alert.alert(t("adoption.loginToFavoriteTitle"), t("adoption.loginToFavoriteMsg"));
      return;
    }
    if (followLoading) return;
    setFollowLoading(true);
    try {
      if (liked) await unfollowListing(listing.id);
      else await followListing(listing.id);
    } finally {
      setFollowLoading(false);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Pressable
      style={({ pressed }) => [lc.shadow, { opacity: pressed ? 0.94 : 1 }]}
      onPress={() => router.push(`/adoption/${listing.id}`)}
    >
      <View style={[lc.card, { backgroundColor: T.card, borderColor: isFeatured ? P : T.border }, isFeatured && lc.featuredBorder]}>

        <View style={lc.imgWrap}>
          {listing.photo && !imgError ? (
            <Image
              source={{ uri: listing.photo }}
              style={lc.img}
              contentFit="cover"
              contentPosition={{ top: 0.3 }}
              onError={() => setImgError(true)}
            />
          ) : (
            <LinearGradient colors={[`${P2}40`, `${P}28`]} style={lc.imgFallback}>
              <Icon name="paw" size={34} color={`${P}60`} />
            </LinearGradient>
          )}

          <LinearGradient
            colors={["transparent", "rgba(26,8,56,0.38)"]}
            style={lc.imgScrim}
            pointerEvents="none"
          />

          {isFeatured && (
            <View style={lc.featuredBadge}>
              <Icon name="star" size={9} color="#7C3AED" />
              <Text style={lc.featuredTxt}>{t("adoption.featuredLabel")}</Text>
            </View>
          )}

          <View style={lc.typeTag}>
            <Text style={lc.typeTagTxt}>{listing.petType}</Text>
          </View>

          <Pressable
            style={[lc.heartBtn, followLoading && { opacity: 0.6 }]}
            onPress={handleHeartPress}
            hitSlop={8}
          >
            <Icon name={liked ? "heart" : "heart-outline"} size={16} color={liked ? "#FF4466" : WHITE} />
          </Pressable>
        </View>

        <View style={lc.body}>
          <View style={lc.nameRow}>
            <Text style={[lc.name, { color: T.text }]} numberOfLines={1}>{listing.petName}</Text>
            {listing.petAge ? (
              <View style={lc.agePill}>
                <Text style={lc.ageTxt}>{listing.petAge}</Text>
              </View>
            ) : null}
          </View>

          {listing.description ? (
            <Text style={[lc.desc, { color: T.textMuted }]} numberOfLines={1}>{listing.description}</Text>
          ) : null}

          <View style={lc.footer}>
            <View style={lc.locRow}>
              <Icon name="location-sharp" size={11} color={T.purple} />
              <Text style={[lc.loc, { color: T.textMuted }]} numberOfLines={1}>{listing.location}</Text>
            </View>
            <Pressable
              style={lc.chatBtn}
              onPress={() => router.push(`/adoption/${listing.id}`)}
            >
              <LinearGradient colors={[P2, P]} style={lc.chatGrad}>
                <Text style={lc.chatTxt}>{t("adoption.contact")}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

      </View>
    </Pressable>
  );
}
const lc = StyleSheet.create({
  shadow:        { marginHorizontal: 20, marginBottom: 14, borderRadius: 20, ...CARD_SHADOW },
  card:          { backgroundColor: WHITE, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: BORDER },
  featuredBorder:{ borderColor: P, borderWidth: 2 },

  imgWrap:      { width: "100%", height: IMG_H, position: "relative" },
  img:          { width: "100%", height: "100%" },
  imgFallback:  { flex: 1, alignItems: "center", justifyContent: "center" },
  imgScrim:     { position: "absolute", bottom: 0, left: 0, right: 0, height: 56 },

  featuredBadge:{ position: "absolute", top: 9, left: 9, flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#F1E9FF" },
  featuredTxt:  { fontSize: 10, fontFamily: "Inter_700Bold", color: "#6D28D9" },

  typeTag:    { position: "absolute", bottom: 8, left: 9, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(255,255,255,0.32)" },
  typeTagTxt: { fontSize: 10, fontFamily: "Inter_700Bold", color: WHITE },

  heartBtn:   { position: "absolute", top: 9, right: 9, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.26)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },

  body:    { padding: 12, gap: 5 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name:    { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold", color: DARK },
  agePill: { backgroundColor: `${P}14`, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  ageTxt:  { fontSize: 10, fontFamily: "Inter_600SemiBold", color: P },
  desc:    { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, lineHeight: 17 },

  footer:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  locRow:  { flexDirection: "row", alignItems: "center", gap: 3, flex: 1 },
  loc:     { fontSize: 11, fontFamily: "Inter_500Medium", color: BODY, flex: 1 },
  chatBtn: { borderRadius: 9, overflow: "hidden" },
  chatGrad:{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 7, paddingHorizontal: 12 },
  chatTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: WHITE },
});

// ── Listings header ───────────────────────────────────────────────────────────
function ListingsHeader({ count, filter }: { count: number; filter: Filter }) {
  const T = useTheme();
  const { t } = useTranslation();
  const label = filter === "all"
    ? t("adoption.tabs.listings")
    : t(`adoption.filterChips.${filter}`);
  return (
    <View style={lh.wrap}>
      <Text style={[lh.title, { color: T.text }]}>{label}</Text>
      <View style={lh.pill}>
        <Text style={lh.count}>{t("adoption.listingCount", { count })}</Text>
      </View>
    </View>
  );
}
const lh = StyleSheet.create({
  wrap:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 10 },
  title: { fontSize: 15, fontFamily: "Inter_700Bold", color: DARK },
  pill:  { backgroundColor: `${P}14`, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  count: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: P },
});

// ── Create section ────────────────────────────────────────────────────────────
function CreateSection({ onPress, botPad }: { onPress: () => void; botPad: number }) {
  const T = useTheme();
  const { t } = useTranslation();
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: botPad + 16, gap: 12 }}
    >
      <View style={cr.heroCardShadow}>
        <View style={[cr.heroCard, { backgroundColor: T.card, borderColor: T.border }]}>
          <View style={cr.heroLeft}>
            <LinearGradient colors={[`${P}22`, `${P2}14`]} style={cr.heroIconCircle}>
              <Icon name="heart" size={22} color={P} />
            </LinearGradient>
            <Text style={[cr.heroTitle, { color: T.text }]}>{t("adoption.hero.title")}</Text>
            <Text style={[cr.heroSub, { color: T.textMuted }]}>{t("adoption.hero.subtitle")}</Text>
            <Pressable
              style={({ pressed }) => [cr.ctaBtn, { opacity: pressed ? 0.88 : 1 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
            >
              <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={cr.ctaGrad}>
                <Icon name="add-circle-outline" size={15} color={WHITE} />
                <Text style={cr.ctaTxt}>{t("adoption.tabs.create")}</Text>
              </LinearGradient>
            </Pressable>
          </View>
          <View style={cr.heroRight}>
            <Image source={DOG_IMG} style={cr.dogImg} contentFit="contain" />
          </View>
        </View>
      </View>

      <BusinessProfilesComingSoonBanner />

      <View style={{ flexDirection: "row", gap: 10 }}>
        {([
          { icon: "paw"    as const, val: "2.4K+", lblKey: "adoption.stats.activeListings" },
          { icon: "heart"  as const, val: "800+",  lblKey: "adoption.stats.adopted"        },
          { icon: "people" as const, val: "12K+",  lblKey: "adoption.stats.animalFriends"  },
        ] as const).map((stat) => (
          <View key={stat.lblKey} style={[cr.statCard, { backgroundColor: T.card, borderColor: T.border }]}>
            <LinearGradient colors={[`${P}18`, `${P2}10`]} style={cr.statIconWrap}>
              <Icon name={stat.icon} size={18} color={P} />
            </LinearGradient>
            <Text style={[cr.statVal, { color: T.text }]}>{stat.val}</Text>
            <Text style={[cr.statLbl, { color: T.textMuted }]}>{t(stat.lblKey)}</Text>
          </View>
        ))}
      </View>

      <LinearGradient
        colors={[P2, P, DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={cr.banner}
      >
        <View style={cr.bannerIconWrap}>
          <Icon name="shield-checkmark" size={22} color={WHITE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cr.bannerTitle}>{t("adoption.banner.title")}</Text>
          <Text style={cr.bannerSub}>{t("adoption.banner.subtitle")}</Text>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}
const cr = StyleSheet.create({
  card:           { backgroundColor: WHITE, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 16, ...IOS_SHADOW },
  heroCardShadow: { borderRadius: 24, ...CARD_SHADOW },
  heroCard:       { backgroundColor: WHITE, borderRadius: 24, borderWidth: 1, borderColor: BORDER, flexDirection: "row", overflow: "hidden", minHeight: 200 },
  heroLeft:       { flex: 1, padding: 16, gap: 8, justifyContent: "center" },
  heroIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  heroTitle:      { fontSize: 14, fontFamily: "Inter_700Bold", color: DARK, lineHeight: 21 },
  heroSub:        { fontSize: 11, fontFamily: "Inter_400Regular", color: BODY, lineHeight: 17 },
  ctaBtn:         { borderRadius: 50, overflow: "hidden", marginTop: 4 },
  ctaGrad:        { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 14, justifyContent: "center" },
  ctaTxt:         { fontSize: 12, fontFamily: "Inter_700Bold", color: WHITE },
  heroRight:      { width: 160 },
  dogImg:         { width: "100%", height: 260, marginBottom: -20 },
  dot:            { width: 5, height: 5, borderRadius: 2.5, backgroundColor: P, marginTop: 7, flexShrink: 0 },
  tipsTitle:      { flex: 1, fontSize: 12, fontFamily: "Inter_600SemiBold", color: DARK },
  tipTxt:         { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, lineHeight: 19 },
  statCard:       { flex: 1, backgroundColor: WHITE, borderRadius: 18, borderWidth: 1, borderColor: BORDER, alignItems: "center", paddingVertical: 16, gap: 5, ...IOS_SHADOW },
  statIconWrap:   { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  statVal:        { fontSize: 16, fontFamily: "Inter_700Bold", color: DARK },
  statLbl:        { fontSize: 9, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center" },
  banner:         { borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 },
  bannerIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bannerTitle:    { fontSize: 14, fontFamily: "Inter_700Bold", color: WHITE, marginBottom: 4 },
  bannerSub:      { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.88)", lineHeight: 16 },
});

// ── Messaging helpers ─────────────────────────────────────────────────────────
function AdoptionConvCard({ conv, onPress }: { conv: ApiConversation; onPress: () => void }) {
  const T         = useTheme();
  const { t }     = useTranslation();
  const timeLabel = useMsgTimeLabel();
  const hasUnread = conv.unreadCount > 0;
  const initial   = (conv.otherUsername ?? "?").slice(0, 1).toUpperCase();

  return (
    <Pressable
      style={({ pressed }) => [
        acc.card,
        { backgroundColor: pressed ? `${P}08` : T.card, borderColor: hasUnread ? `${P}30` : T.border },
      ]}
      onPress={onPress}
    >
      <View style={acc.imgBox}>
        <View style={acc.thumb}>
          {conv.listingImage ? (
            <Image source={{ uri: conv.listingImage }} style={acc.thumbImg} contentFit="cover" />
          ) : (
            <LinearGradient colors={[`${P2}50`, `${P}30`]} style={[acc.thumbImg, acc.thumbFallback]}>
              <Icon name="paw" size={22} color={`${P}80`} />
            </LinearGradient>
          )}
        </View>
        <View style={acc.avatarBadge}>
          {conv.otherAvatarUrl ? (
            <Image source={{ uri: conv.otherAvatarUrl }} style={acc.avatarImg} contentFit="cover" />
          ) : (
            <View style={[acc.avatarImg, acc.avatarFallback]}>
              <Text style={acc.avatarInitial}>{initial}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={acc.content}>
        <View style={acc.row1}>
          <Text style={[acc.username, { color: T.text }, hasUnread && acc.usernameBold]} numberOfLines={1}>
            {conv.otherUsername}
          </Text>
          <Text style={[acc.time, { color: T.textMuted }]}>{timeLabel(conv.lastMessageAt)}</Text>
        </View>
        <Text style={[acc.context, { color: T.purple }]} numberOfLines={1}>
          {conv.listingTitle ? `${conv.listingTitle} · ` : ""}{t("adoption.msgSection.adoptionContext")}
        </Text>
        <View style={acc.row3}>
          <Text style={[acc.preview, { color: hasUnread ? T.text : T.textMuted }, hasUnread && acc.previewBold]} numberOfLines={1}>
            {conv.lastMessage || t("adoption.msgSection.chatStarted")}
          </Text>
          {hasUnread && (
            <View style={acc.badge}>
              <Text style={acc.badgeTxt}>{conv.unreadCount > 99 ? "99+" : String(conv.unreadCount)}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
const acc = StyleSheet.create({
  card: {
    flexDirection: "row", gap: 12, padding: 14,
    borderRadius: 20, borderWidth: 1.5,
    ...Platform.select({
      ios:     { shadowColor: DARK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  imgBox:        { width: 68, height: 62, position: "relative", flexShrink: 0 },
  thumb:         { width: 60, height: 60, borderRadius: 14, overflow: "hidden" },
  thumbImg:      { width: 60, height: 60 },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  avatarBadge:   { position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: WHITE, overflow: "hidden" },
  avatarImg:     { width: 24, height: 24 },
  avatarFallback:{ backgroundColor: P, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 10, fontFamily: "Inter_700Bold", color: WHITE },
  content:       { flex: 1, gap: 4, justifyContent: "center" },
  row1:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  username:      { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  usernameBold:  { fontFamily: "Inter_700Bold" },
  time:          { fontSize: 11, fontFamily: "Inter_400Regular", marginLeft: 6 },
  context:       { fontSize: 11, fontFamily: "Inter_500Medium" },
  row3:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  preview:       { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  previewBold:   { fontFamily: "Inter_600SemiBold" },
  badge:         { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: P, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, marginLeft: 6 },
  badgeTxt:      { fontSize: 11, fontFamily: "Inter_700Bold", color: WHITE },
});

function MessagesSection({ botPad }: { botPad: number }) {
  const T                        = useTheme();
  const router                   = useRouter();
  const { user, token }          = useAuth();
  const { t }                    = useTranslation();
  const [convs,      setConvs]   = useState<ApiConversation[]>([]);
  const [loading,    setLoading] = useState(true);
  const [refreshing, setRef]     = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const all = await apiGetConversations(token ?? "");
      setConvs(all.filter((c) => !!c.listingId));
    } catch { /* ignore */ }
    finally { setLoading(false); setRef(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  if (!user) {
    return (
      <View style={ms.center}>
        <Icon name="lock-closed-outline" size={34} color={`${P}60`} />
        <Text style={ms.loginTxt}>{t("adoption.msgSection.loginRequired")}</Text>
      </View>
    );
  }
  if (loading) {
    return <View style={ms.center}><ActivityIndicator size="large" color={P} /></View>;
  }
  return (
    <FlatList
      data={convs}
      keyExtractor={(c) => c.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRef(true); load(); }} tintColor={P} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: botPad + 24, flexGrow: 1 }}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListEmptyComponent={
        <View style={ms.empty}>
          <View style={ms.emptyIllo}>
            <Icon name="chatbubbles-outline" size={38} color={`${P}70`} />
          </View>
          <Text style={ms.emptyTitle}>{t("adoption.msgSection.empty")}</Text>
          <Text style={ms.emptySub}>{t("adoption.msgSection.emptySubtitle")}</Text>
        </View>
      }
      renderItem={({ item: conv }) => (
        <AdoptionConvCard conv={conv} onPress={() => router.push(`/messages/${encodeURIComponent(conv.id)}` as any)} />
      )}
    />
  );
}
const ms = StyleSheet.create({
  center:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 60 },
  loginTxt:  { fontSize: 14, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center" },
  empty:     { flex: 1, alignItems: "center", paddingTop: 52, paddingHorizontal: 40, gap: 8 },
  emptyIllo: { width: 74, height: 74, borderRadius: 37, backgroundColor: `${P}12`, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  emptyTitle:{ fontSize: 17, fontFamily: "Inter_700Bold", color: DARK },
  emptySub:  { fontSize: 13, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center", lineHeight: 20 },
});

// ── Success modal styles ──────────────────────────────────────────────────────
const sm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(20,8,46,0.65)", alignItems: "center", justifyContent: "center", padding: 24 },
  card:    { backgroundColor: WHITE, borderRadius: 28, padding: 28, alignItems: "center", width: "100%", gap: 10,
    ...Platform.select({
      ios:     { shadowColor: DARK, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.24, shadowRadius: 32 },
      android: { elevation: 12 },
      default: {},
    }),
  },
  emoji:   { fontSize: 52, marginBottom: 4 },
  title:   { fontSize: 22, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.4, textAlign: "center" },
  sub:     { fontSize: 13, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center", lineHeight: 20, marginBottom: 4 },
  infoBox: { width: "100%", gap: 10, backgroundColor: `${P}07`, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: `${P}14` },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoIcon:{ width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: BODY, lineHeight: 17 },
  btn:     { width: "100%", borderRadius: 16, overflow: "hidden", marginTop: 6 },
  btnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  btnTxt:  { fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE },
});

// ── My Listings Section ───────────────────────────────────────────────────────

function MyListingCard({
  card, onEdit, onTogglePassive, onAdopted, onPreview, onDelete,
  onBoost, now,
}: {
  card: MyCard;
  onEdit: () => void;
  onTogglePassive: () => void;
  onAdopted: () => void;
  onPreview: () => void;
  onDelete: () => void;
  onBoost: () => void;
  now: Date;
}) {
  const T = useTheme();
  const { t } = useTranslation();
  const { listing, status } = card;
  const views = listing.viewsCount ?? 0;
  const favs  = listing.favoriteCount ?? 0;
  const cfg = STATUS_CFG[status];
  const [perfOpen, setPerfOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isAdopted  = status === "Sahiplendirildi";
  const canBoost   = status === "Aktif";
  const isFeatured = isListingPromoted(listing.promotedUntil, now);
  const remainingLabel = isFeatured ? formatRemainingTime(listing.promotedUntil, now) : null;

  return (
    <View style={ml.cardOuter}>
      <View style={[ml.card, { backgroundColor: T.card }, isFeatured && ml.cardFeatured]}>

        <View style={ml.statusRow}>
          {isFeatured ? (
            <View style={ml.featBadge}>
              <Icon name="star" size={10} color="#7C3AED" />
              <Text style={ml.featBadgeTxt}>{t("adoption.featuredLabel")}</Text>
            </View>
          ) : (
            <View style={[ml.statusBadge, { backgroundColor: cfg.bg }]}>
              <Icon name={cfg.icon} size={11} color={cfg.color} />
              <Text style={[ml.statusTxt, { color: cfg.color }]}>{t(STATUS_LABEL_KEYS[status])}</Text>
            </View>
          )}
          <View style={ml.agePill}>
            <Text style={ml.ageTxt}>{listing.petAge ?? "0–3 ay"}</Text>
          </View>
        </View>

        <View style={ml.heroWrap}>
          {listing.photo && !imgError ? (
            <Image source={{ uri: listing.photo }} style={ml.heroImg} contentFit="cover" contentPosition={{ top: 0.3 }} onError={() => setImgError(true)} />
          ) : (
            <LinearGradient colors={[`${P2}40`, `${P}28`]} style={[ml.heroFallback, { flex: 1 }]}>
              <Icon name="paw" size={34} color={`${P}60`} />
            </LinearGradient>
          )}
          {(!listing.photo || imgError) && (
            <View style={ml.heroNoPhotoOverlay}>
              <Icon name="paw" size={22} color="rgba(255,255,255,0.85)" />
              <Text style={ml.heroNoPhotoTxt}>{t("adoption.card.noPhoto")}</Text>
            </View>
          )}
        </View>

        <View style={ml.content}>
          {isFeatured && (
            <View
              style={ml.featuredBannerInner}
              accessibilityLabel={
                remainingLabel
                  ? t("adoption.card.featAccessExtend") + ` — ${remainingLabel}`
                  : t("adoption.card.featAccessBoost")
              }
            >
              <Icon name="star" size={12} color="#7C3AED" />
              <Text style={ml.featuredBannerTxt}>{t("adoption.featuredLabel")}</Text>
              {remainingLabel && (
                <View style={ml.featuredTimeChip}>
                  <Icon name="time-outline" size={10} color={P} />
                  <Text style={ml.featuredTimeTxt}>{remainingLabel}</Text>
                </View>
              )}
            </View>
          )}

          <Text style={[ml.petName, { color: T.text }]} numberOfLines={2}>{listing.petName}</Text>

          <View style={ml.locRow}>
            <Icon name="location-sharp" size={12} color={T.purple} />
            <Text style={[ml.locTxt, { color: T.textMuted }]} numberOfLines={1}>{listing.location}</Text>
            <Text style={[ml.timeTxt, { color: T.textFaint }]}>{formatTimeAgo(listing.createdAt)}</Text>
          </View>

          <View style={ml.statsBar}>
            <View style={ml.statChip}>
              <Icon name="eye-outline" size={12} color={P} />
              <Text style={ml.statChipTxt}>{views}</Text>
            </View>
            <View style={[ml.statChip, ml.statChipHeart]}>
              <Icon name="heart-outline" size={12} color="#DC2626" />
              <Text style={[ml.statChipTxt, { color: "#DC2626" }]}>{favs}</Text>
            </View>
            <Pressable
              style={ml.perfBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPerfOpen((v) => !v); }}
            >
              <Text style={ml.perfBtnTxt}>{t("adoption.card.performance")}</Text>
              <Icon name={perfOpen ? "chevron-up" : "chevron-down"} size={10} color={BODY} />
            </Pressable>
          </View>

          {perfOpen && (
            <View style={ml.perfPanel}>
              <Text style={ml.perfPanelTitle}>{t("adoption.card.last7days")}</Text>
              <View style={ml.perfRow}>
                <View style={ml.perfItem}>
                  <Icon name="eye" size={16} color={P} />
                  <Text style={ml.perfVal}>{views}</Text>
                  <Text style={ml.perfLbl}>{t("adoption.card.views")}</Text>
                </View>
                <View style={ml.perfDivV} />
                <View style={ml.perfItem}>
                  <Icon name="heart" size={16} color="#DC2626" />
                  <Text style={[ml.perfVal, { color: "#DC2626" }]}>{favs}</Text>
                  <Text style={ml.perfLbl}>{t("adoption.card.favorites")}</Text>
                </View>
              </View>
            </View>
          )}

          {isAdopted && (
            <View style={ml.adoptedBanner}>
              <Icon name="heart-circle" size={16} color={P} />
              <Text style={ml.adoptedBannerTxt}>{t("adoption.card.adoptedCongrats")}</Text>
            </View>
          )}

          {canBoost && !isFeatured && (
            <View style={ml.promoteBanner}>
              <View style={ml.promoteLeft}>
                <View style={ml.rocketCircle}>
                  <Icon name="rocket-outline" size={18} color={P} />
                </View>
                <View style={ml.promoteTextWrap}>
                  {isFeatured ? (
                    <>
                      <Text style={ml.promoteTitle}>{t("adoption.card.extendTitle")}</Text>
                      <Text style={ml.promoteSub}>{t("adoption.card.extendSub")}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={ml.promoteTitle}>{t("adoption.card.featureTitle")}</Text>
                      <Text style={ml.promoteSub}>{t("adoption.card.featureSub")}</Text>
                    </>
                  )}
                </View>
              </View>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onBoost(); }}
                accessibilityRole="button"
                accessibilityLabel={isFeatured ? t("adoption.card.featAccessExtend") : t("adoption.card.featAccessBoost")}
              >
                <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ml.promoteBtnGrad}>
                  <Icon name="sparkles" size={13} color={WHITE} />
                  <Text style={ml.promoteBtnTxt}>
                    {isFeatured ? t("adoption.card.extendBtn") : t("adoption.card.featureBtn")}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}

          <View style={ml.divider} />

          <View style={ml.actions}>
            <Pressable style={({ pressed }) => [ml.btn, ml.btnEdit, { opacity: pressed ? 0.8 : 1 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onEdit(); }}>
              <Icon name="create-outline" size={15} color={P} />
              <Text style={[ml.btnTxt, { color: P }]}>{t("adoption.card.editBtn")}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [ml.btn, ml.btnPreview, { opacity: pressed ? 0.8 : 1 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPreview(); }}>
              <Icon name="eye-outline" size={15} color={BODY} />
              <Text style={[ml.btnTxt, { color: BODY }]}>{t("adoption.card.previewBtn")}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [ml.btn, ml.btnDel, { opacity: pressed ? 0.75 : 1 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onDelete(); }}>
              <Icon name="trash-outline" size={15} color="#DC2626" />
              <Text style={[ml.btnTxt, { color: "#DC2626" }]}>{t("adoption.card.deleteBtn")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function MyListingsSection({
  userId, userEmail, listings, boostStatuses, deleteListing, botPad, onAdd,
}: {
  userId: string; userEmail: string; listings: AdoptionListing[];
  boostStatuses: Record<string, { isFeatured: boolean; expiresAt?: string | null; packageName?: string | null }>;
  deleteListing: (id: string) => Promise<void>; botPad: number; onAdd: () => void;
}) {
  const T = useTheme();
  const { fetchBoostStatus } = useBoost();
  const { t } = useTranslation();
  const router = useRouter();
  const now = useNow(60_000);

  const [successModal, setSuccessModal] = useState<{ petName: string; pkgLabel: string; expiresAt: string } | null>(null);

  const [statusMap, setStatusMap] = useState<Record<string, ListStatus>>({});
  const [myFilter, setMyFilter] = useState<MyFilter>("all");
  const getStatus = useCallback((id: string): ListStatus => statusMap[id] ?? "Aktif", [statusMap]);

  const togglePassive = useCallback((id: string) => {
    setStatusMap((prev) => ({ ...prev, [id]: prev[id] === "Pasif" ? "Aktif" : "Pasif" }));
  }, []);

  const handleAdopted = useCallback((id: string, petName: string) => {
    Alert.alert(
      t("adoption.myListingsSection.adoptedTitle"),
      t("adoption.myListingsSection.adoptedMsg", { petName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("adoption.myListingsSection.adoptedYes"),
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setStatusMap((prev) => ({ ...prev, [id]: "Sahiplendirildi" }));
          },
        },
      ]
    );
  }, [t]);

  const handleDelete = useCallback((listing: AdoptionListing) => {
    Alert.alert(
      t("adoption.myListingsSection.deleteTitle"),
      t("adoption.myListingsSection.deleteMsg", { petName: listing.petName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("adoption.card.deleteBtn"),
          style: "destructive",
          onPress: async () => {
            await deleteListing(listing.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [deleteListing, t]);

  const handleBoost = useCallback((listingId: string, petName: string) => {
    router.push({ pathname: "/boost-packages", params: { listingId, petName } });
  }, [router]);

  const myListings = useMemo(() => listings.filter((l) => l.userId === userId), [listings, userId]);
  const cards: MyCard[] = useMemo(() => myListings.map((l) => ({ listing: l, status: getStatus(l.id) })), [myListings, statusMap]);

  const FILTER_MAP: Record<MyFilter, (c: MyCard) => boolean> = {
    all: () => true, active: (c) => c.status === "Aktif", passive: (c) => c.status === "Pasif",
    pending: (c) => c.status === "Onay Bekliyor", adopted: (c) => c.status === "Sahiplendirildi",
  };
  const visible = cards.filter(FILTER_MAP[myFilter]);

  return (
    <>
    <Modal visible={successModal !== null} transparent animationType="fade" onRequestClose={() => setSuccessModal(null)}>
      <Pressable style={sm.overlay} onPress={() => setSuccessModal(null)}>
        <View style={sm.card}>
          <View style={sm.emoji}><Icon name="star" size={40} color="#F5A623" /></View>
          <Text style={sm.title}>{t("adoption.boost.successTitle")}</Text>
          <Text style={sm.sub}>{t("adoption.boost.successSub")}</Text>
          {successModal && (
            <View style={sm.infoBox}>
              <View style={sm.infoRow}>
                <LinearGradient colors={[P2, DARK]} style={sm.infoIcon}><Icon name="cube-outline" size={13} color={WHITE} /></LinearGradient>
                <Text style={sm.infoTxt}>{successModal.pkgLabel} {t("adoption.boost.package")}</Text>
              </View>
              <View style={sm.infoRow}>
                <LinearGradient colors={[P2, DARK]} style={sm.infoIcon}><Icon name="time-outline" size={13} color={WHITE} /></LinearGradient>
                <Text style={sm.infoTxt}>
                  {t("adoption.boost.activeUntilFull", {
                    date: new Date(successModal.expiresAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long" }),
                    time: new Date(successModal.expiresAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
                  })}
                </Text>
              </View>
            </View>
          )}
          <Pressable onPress={() => setSuccessModal(null)} style={sm.btn}>
            <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sm.btnGrad}>
              <Icon name="rocket-outline" size={16} color={WHITE} />
              <Text style={sm.btnTxt}>{t("adoption.boost.great")}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </Pressable>
    </Modal>

    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 24 }}>
      <View style={ml.secHeader}>
        <Text style={[ml.secTitle, { color: T.text }]}>{t("adoption.myListingsSection.sectionTitle")}</Text>
        <Text style={[ml.secSub, { color: T.textMuted }]}>{t("adoption.myListingsSection.sectionSubtitle")}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ml.filterList} style={ml.filterScroll}>
        {MY_FILTER_DEFS.map((f) => {
          const isA = myFilter === f.key;
          return isA ? (
            <LinearGradient key={f.key} colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ml.filterChipActive}>
              <Text style={ml.filterLblActive}>{t(f.labelKey)}</Text>
            </LinearGradient>
          ) : (
            <Pressable key={f.key} style={[ml.filterChip, { backgroundColor: T.card, borderColor: T.border }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMyFilter(f.key); }}>
              <Text style={[ml.filterLbl, { color: T.textMuted }]}>{t(f.labelKey)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {myListings.length === 0 && (
        <View style={ml.emptyWrap}>
          <View style={ml.emptyIllo}><Icon name="list-outline" size={40} color={`${P}70`} /></View>
          <Text style={[ml.emptyTitle, { color: T.text }]}>{t("adoption.myListingsSection.emptyTitle")}</Text>
          <Text style={[ml.emptySub, { color: T.textMuted }]}>{t("adoption.myListingsSection.emptySubtitle")}</Text>
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: 8 }]} onPress={onAdd}>
            <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ml.addBtn}>
              <Icon name="add-circle-outline" size={15} color={WHITE} />
              <Text style={ml.addBtnTxt}>{t("adoption.tabs.create")}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {myListings.length > 0 && visible.length === 0 && (
        <View style={ml.emptyFilter}>
          <Icon name="filter-outline" size={32} color={`${P}50`} />
          <Text style={ml.emptyFilterTxt}>{t("adoption.myListingsSection.filterEmpty")}</Text>
        </View>
      )}

      {visible.map((c) => (
        <MyListingCard
          key={c.listing.id}
          card={c}
          now={now}
          onEdit={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/adoption/edit/${c.listing.id}` as any); }}
          onTogglePassive={() => togglePassive(c.listing.id)}
          onAdopted={() => handleAdopted(c.listing.id, c.listing.petName)}
          onPreview={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: "/adoption/[id]", params: { id: c.listing.id, preview: "true" } } as any); }}
          onDelete={() => handleDelete(c.listing)}
          onBoost={() => handleBoost(c.listing.id, c.listing.petName)}
        />
      ))}
    </ScrollView>
    </>
  );
}

const ml = StyleSheet.create({
  cardOuter: { marginHorizontal: 20, marginBottom: 20 },
  card: { backgroundColor: WHITE, borderRadius: 20, borderWidth: 1, borderColor: BORDER, ...CARD_SHADOW },
  cardFeatured: { borderColor: P, borderWidth: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 },
  featBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#F1E9FF" },
  featBadgeTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#6D28D9" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  statusTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  agePill: { backgroundColor: "rgba(100,100,120,0.12)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  ageTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: BODY },
  heroWrap: { marginHorizontal: 12, aspectRatio: 16 / 9, borderRadius: 14, overflow: "hidden" },
  heroImg: { width: "100%", height: "100%" },
  heroFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroNoPhotoOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.42)", paddingHorizontal: 12, paddingVertical: 7 },
  heroNoPhotoTxt: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)" },
  content: { padding: 14, gap: 10 },
  featuredBannerInner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: `${P}0A`, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: `${P}20` },
  featuredBannerTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: P, flex: 1 },
  featuredTimeChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: `${P}14`, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  featuredTimeTxt: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: P },
  petName: { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.3, lineHeight: 23 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: BODY },
  timeTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: `${BODY}80` },
  statsBar: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  statChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${P}0D`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statChipHeart: { backgroundColor: "rgba(220,38,38,0.07)" },
  statChipMsg: { backgroundColor: "rgba(0,112,243,0.07)" },
  statChipTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: P },
  perfBtn: { flexDirection: "row", alignItems: "center", gap: 3, marginLeft: "auto" as any, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: `${BODY}0D`, borderRadius: 20 },
  perfBtnTxt: { fontSize: 11, fontFamily: "Inter_500Medium", color: BODY },
  perfPanel: { backgroundColor: `${P}07`, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: `${P}12` },
  perfPanelTitle: { fontSize: 10, fontFamily: "Inter_700Bold", color: P, marginBottom: 10, letterSpacing: 0.8 },
  perfRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  perfItem: { alignItems: "center", gap: 4 },
  perfDivV: { width: 1, height: 40, backgroundColor: `${P}18` },
  perfVal: { fontSize: 18, fontFamily: "Inter_700Bold", color: DARK },
  perfLbl: { fontSize: 10, fontFamily: "Inter_400Regular", color: BODY },
  divider: { height: 1, backgroundColor: `${P}08` },
  adoptedBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: `${P}07`, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: `${P}18` },
  adoptedBannerTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: P, lineHeight: 17 },
  promoteBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: `${P}08`, borderRadius: 14, borderWidth: 1, borderColor: `${P}1A`, paddingVertical: 14, paddingHorizontal: 14, gap: 10, flexWrap: "wrap" },
  promoteLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 160 },
  rocketCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${P}12`, alignItems: "center", justifyContent: "center" },
  promoteTextWrap: { flex: 1 },
  promoteTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: DARK },
  promoteSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: BODY, marginTop: 1, lineHeight: 15 },
  promoteBtnGrad: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  promoteBtnTxt: { fontSize: 13, fontFamily: "Inter_700Bold", color: WHITE },
  pkgSection: { gap: 10 },
  pkgEmpty: { alignItems: "center", gap: 6, paddingVertical: 20 },
  pkgEmptyTxt: { fontSize: 13, color: `${P}80`, fontStyle: "italic" },
  pkgRow: { flexDirection: "row", gap: 8 },
  pkgCard: { flex: 1, borderRadius: 14, padding: 10, alignItems: "center", gap: 2 },
  pkgCardSel: { backgroundColor: P, borderWidth: 2, borderColor: P, ...Platform.select({ ios: { shadowColor: P, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 10 }, android: { elevation: 5 }, default: {} }) },
  pkgIdle: { backgroundColor: WHITE, borderWidth: 1.5, borderColor: `${P}22`, ...Platform.select({ ios: { shadowColor: P, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 }, android: { elevation: 1 }, default: {} }) },
  pkgPop: { borderColor: P, borderWidth: 2 },
  popBadge: { backgroundColor: P, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2 },
  popBadgeTxt: { fontSize: 9, fontFamily: "Inter_700Bold", color: WHITE },
  pkgName: { fontSize: 11, fontFamily: "Inter_700Bold", color: DARK },
  pkgPrice: { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK },
  pkgDays: { fontSize: 10, fontFamily: "Inter_400Regular", color: BODY },
  pkgMult: { fontSize: 9, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center" },
  pkgNameSel: { color: WHITE }, pkgPriceSel: { color: WHITE }, pkgDaysSel: { color: "rgba(255,255,255,0.80)" }, pkgMultSel: { color: "rgba(255,255,255,0.70)" },
  boostSummary: { backgroundColor: `${P}08`, borderRadius: 12, padding: 12, gap: 3, borderWidth: 1, borderColor: `${P}18` },
  boostSummaryPkg: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: P },
  boostSummaryPrice: { fontSize: 14, fontFamily: "Inter_700Bold", color: DARK },
  boostCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, height: 44, borderRadius: 12, backgroundColor: P, ...Platform.select({ ios: { shadowColor: P, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10 }, android: { elevation: 4 }, default: {} }) },
  boostCtaDisabled: { backgroundColor: `${BODY}30` },
  boostCtaTxt: { fontSize: 14, fontFamily: "Inter_700Bold", color: WHITE },
  boostNote: { fontSize: 11, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center", lineHeight: 15 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44, borderRadius: 12, borderWidth: 1 },
  btnEdit: { backgroundColor: `${P}08`, borderColor: `${P}28` },
  btnPreview: { backgroundColor: `${BODY}06`, borderColor: `${BODY}22` },
  btnDel: { backgroundColor: "#FEE2E218", borderColor: "#DC262630" },
  btnTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  secHeader: { paddingHorizontal: 20, marginBottom: 16, paddingTop: 4 },
  secTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.4 },
  secSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 50 },
  addBtnTxt: { fontSize: 13, fontFamily: "Inter_700Bold", color: WHITE },
  filterScroll: { marginBottom: 14 },
  filterList: { paddingHorizontal: 20, gap: 8, paddingVertical: 4, paddingRight: 24 },
  filterChip: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 20, backgroundColor: WHITE, borderWidth: 1.5, borderColor: `${P}22`, ...Platform.select({ ios: { shadowColor: P, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 }, android: { elevation: 1 }, default: {} }) },
  filterChipActive: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 20, ...Platform.select({ ios: { shadowColor: P, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10 }, android: { elevation: 4 }, default: {} }) },
  filterLbl: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: BODY },
  filterLblActive: { fontSize: 13, fontFamily: "Inter_700Bold", color: WHITE },
  emptyWrap: { alignItems: "center", paddingTop: 48, paddingHorizontal: 40, gap: 10 },
  emptyIllo: { width: 74, height: 74, borderRadius: 37, backgroundColor: `${P}12`, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: DARK },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center", lineHeight: 20 },
  emptyFilter: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyFilterTxt: { fontSize: 14, fontFamily: "Inter_400Regular", color: BODY },
});

// ── Main Adoption Screen ──────────────────────────────────────────────────────
export default function AdoptionScreen() {
  const T             = useTheme();
  const insets        = useSafeAreaInsets();
  const { width: SW } = useWindowDimensions();
  const router        = useRouter();
  const { listings, deleteListing } = useAdoption();
  const { boostStatuses }           = useBoost();
  const { user, token }             = useAuth();
  const { tab: tabParam }           = useLocalSearchParams<{ tab?: string }>();
  const validTabs: Tab[]            = ["create", "mylistings", "messages", "listings"];
  const [activeTab, setActiveTab]   = useState<Tab>(
    validTabs.includes(tabParam as Tab) ? (tabParam as Tab) : "create"
  );
  const [filter, setFilter]                = useState<Filter>("all");
  const [query, setQuery]                  = useState("");
  const [advFilters, setAdvFilters]        = useState<AdoptionFilters>(DEFAULT_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [unreadAdoptionCount, setUnreadAdoptionCount] = useState(0);

  /* Switch to the tab requested via route param (e.g. from success screen) */
  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam as Tab)) {
      setActiveTab(tabParam as Tab);
    }
  }, [tabParam]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const all = await apiGetConversations(token ?? "");
        const count = all.filter((c) => !!c.listingId && c.unreadCount > 0).reduce((sum, c) => sum + c.unreadCount, 0);
        if (!cancelled) setUnreadAdoptionCount(count);
      } catch { /* ignore */ }
    };
    poll();
    const t = setInterval(poll, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [user]);

  const topPad = Platform.OS === "web" ? (SW < 1024 ? 54 : 16) : insets.top;
  const botPad = Platform.OS === "web" ? (SW < 1024 ? 100 : 24) : (insets.bottom + TAB_H);

  const NOW_THRESHOLD = Date.now() - 24 * 3_600_000;

  const { availableBreeds, availableCities } = useMemo(() => {
    const breedSet = new Set<string>();
    const citySet  = new Set<string>();
    for (const l of listings) {
      if (l.breed?.trim()) breedSet.add(l.breed.trim());
      const city = extractCity(l.location);
      if (city) citySet.add(city);
    }
    return { availableBreeds: Array.from(breedSet).sort(), availableCities: Array.from(citySet).sort() };
  }, [listings]);

  const sorted = useMemo(() => {
    return [...listings].sort((a, b) => {
      const ap = isListingPromoted(a.promotedUntil) ? 0 : 1;
      const bp = isListingPromoted(b.promotedUntil) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      if (ap === 0) {
        const ae = new Date(a.promotedUntil!).getTime();
        const be = new Date(b.promotedUntil!).getTime();
        if (ae !== be) return be - ae;
      }
      const ad = new Date(a.createdAt).getTime();
      const bd = new Date(b.createdAt).getTime();
      if (ad !== bd) return bd - ad;
      return a.id < b.id ? 1 : -1;
    });
  }, [listings]);

  const filtered = useMemo(() => {
    let list = sorted;
    if (filter === "new")      list = list.filter((l) => new Date(l.createdAt).getTime() > NOW_THRESHOLD);
    else if (filter !== "all") list = list.filter((l) => (TYPE_NORMALIZE[l.petType] ?? "other") === filter);
    if (filter === "other")    list = sorted.filter((l) => (TYPE_NORMALIZE[l.petType] ?? "other") === "other");

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((l) =>
        l.petName.toLowerCase().includes(q) ||
        l.petType.toLowerCase().includes(q) ||
        (l.description?.toLowerCase() ?? "").includes(q) ||
        l.location.toLowerCase().includes(q)
      );
    }

    const af = advFilters;
    if (af.ageRange !== "all") {
      list = list.filter((l) => {
        const months = parseAgeMonths(l.petAge ?? "");
        if (months === null) return false;
        if (af.ageRange === "0_6m")    return months < 6;
        if (af.ageRange === "6_12m")   return months >= 6  && months < 12;
        if (af.ageRange === "1_3y")    return months >= 12 && months < 36;
        if (af.ageRange === "3y_plus") return months >= 36;
        return true;
      });
    }
    if (af.gender !== "all")      list = list.filter((l) => normalizeGender(l.gender ?? "") === af.gender);
    if (af.breed !== null)        list = list.filter((l) => (l.breed ?? "").toLowerCase() === af.breed!.toLowerCase());
    if (af.status !== "all") {
      list = list.filter((l) => {
        const s = (l.status ?? "").toLowerCase();
        if (af.status === "active")  return s === "active"  || s === "aktif";
        if (af.status === "adopted") return s === "adopted" || s === "sahiplendirildi";
        return true;
      });
    }
    if (af.locationCity !== null) {
      list = list.filter((l) => extractCity(l.location)?.toLowerCase() === af.locationCity?.toLowerCase());
    }
    return list;
  }, [sorted, filter, query, advFilters]);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const goToCreate = useCallback(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    router.push("/add-adoption" as any);
  }, [user, router]);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <AdoptionHeader topPad={topPad} />
      <View style={dividerStyle.divider} />

      <TabSwitcher active={activeTab} onChange={handleTabChange} unreadMessages={unreadAdoptionCount} />

      <View style={{ flex: 1 }}>
        {activeTab === "create" && (
          <CreateSection onPress={goToCreate} botPad={botPad} />
        )}

        {activeTab === "mylistings" && user && (
          <MyListingsSection
            userId={user.id}
            userEmail={user.email}
            listings={listings}
            boostStatuses={boostStatuses}
            deleteListing={deleteListing}
            botPad={botPad}
            onAdd={goToCreate}
          />
        )}

        {activeTab === "messages" && (
          <MessagesSection botPad={botPad} />
        )}

        {activeTab === "listings" && (
          <>
            <SearchBar
              query={query}
              onQuery={setQuery}
              onFilter={() => setFilterSheetOpen(true)}
              activeFilterCount={countActiveFilters(advFilters)}
            />
            <FilterRow active={filter} onChange={setFilter} />
            <ListingsHeader count={filtered.length} filter={filter} />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ListingCard listing={item} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: botPad + 16 }}
              ListEmptyComponent={
                <View style={{ alignItems: "center", paddingTop: 48, paddingHorizontal: 40, gap: 10 }}>
                  <Icon name="paw-outline" size={36} color={`${P}50`} />
                  <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: BODY, textAlign: "center" }}>
                    {listings.length === 0 ? "" : query.trim() ? "" : ""}
                  </Text>
                </View>
              }
            />
          </>
        )}
      </View>

      <AdoptionFilterSheet
        visible={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        activeFilters={advFilters}
        onApply={(f) => { setAdvFilters(f); setFilterSheetOpen(false); }}
        breeds={availableBreeds}
        cities={availableCities}
      />
    </View>
  );
}
