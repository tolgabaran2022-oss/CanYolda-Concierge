import { Icon } from "@/components/Icon";
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
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  useWindowDimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AdoptionListing } from "@/contexts/AdoptionContext";
import { useAdoption } from "@/contexts/AdoptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBoost, type BoostPackage } from "@/contexts/BoostContext";
import { useTheme } from "@/hooks/useTheme";
import { formatTimeAgo } from "@/utils/formatters";
import { EvcilimTab } from "@/components/EvcilimTab";
import { apiFetchNotifications } from "@/lib/socialApi";
import { PET_DETAIL_OPTIONS, type DetailOption } from "@/lib/petDetailOptions";

// ── Palette ───────────────────────────────────────────────────────────────────
const P      = "#7C4DCC";
const P2     = "#A480D8";
const DARK   = "#4B267D";
const BODY   = "#6E6290";
const BG     = "#F8F4FF";
const WHITE  = "#FFFFFF";
const BORDER = "rgba(124,77,204,0.12)";
const TAB_H  = 68; // must match _layout.tsx

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

type MainTab    = "evcilim" | "adoption";
type Tab        = "create" | "mylistings" | "listings";
type Filter     = "all" | "cat" | "dog" | "bird" | "rabbit" | "new" | "other";
type MyFilter   = "all" | "active" | "passive" | "pending" | "adopted";
type ListStatus = "Aktif" | "Onay Bekliyor" | "Pasif" | "Sahiplendirildi" | "Süresi Doldu";

const TYPE_NORMALIZE: Record<string, Filter> = {
  Kedi: "cat", kedi: "cat", cat: "cat",
  Köpek: "dog", köpek: "dog", dog: "dog",
  Kuş: "bird", kuş: "bird", bird: "bird",
  Tavşan: "rabbit", tavşan: "rabbit", rabbit: "rabbit",
};

const FILTERS: { key: Filter; label: string; icon: string }[] = [
  { key: "all",    label: "Tümü",   icon: "apps-outline"             },
  { key: "cat",    label: "Kedi",   icon: "paw-outline"              },
  { key: "dog",    label: "Köpek",  icon: "paw"                      },
  { key: "bird",   label: "Kuş",    icon: "leaf-outline"             },
  { key: "rabbit", label: "Tavşan", icon: "heart-outline"            },
  { key: "new",    label: "Yeni",   icon: "sparkles-outline"         },
  { key: "other",  label: "Diğer",  icon: "ellipsis-horizontal-circle-outline" },
];

const TIPS = [
  "Hayvanın yaşı, karakteri ve sağlık durumunu belirt",
  "Net ve aydınlık fotoğraflar ekle — ilanını öne çıkarır",
  "Sahiplenecek kişiyle yüz yüze görüşmeyi tercih et",
];

// ── Combined header: tab underlines + notification bell ───────────────────────
const ADOPTION_NOTIF_TYPES = [
  "adoption_request_received",
  "adoption_request_accepted",
  "adoption_request_rejected",
  "adoption_message_received",
  "adoption_listing_updated",
  "adoption_listing_reminder",
];

function PetHeader({ topPad, mainTab, onChange }: { topPad: number; mainTab: MainTab; onChange: (t: MainTab) => void }) {
  const T = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    apiFetchNotifications(user.id).then((notifs) => {
      if (cancelled) return;
      const count = notifs.filter((n) => !n.read && ADOPTION_NOTIF_TYPES.includes(n.type)).length;
      setUnreadCount(count);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const badgeLabel = unreadCount <= 0 ? null : unreadCount > 9 ? "9+" : String(unreadCount);

  /* ── Adoption mode: paw + title + subtitle + bell ─────────────────────────── */
  if (mainTab === "adoption") {
    return (
      <View style={[hdr.adoptionWrap, { paddingTop: topPad + 10, backgroundColor: T.bg }]}>
        <View style={hdr.adoptionLeft}>
          <LinearGradient colors={[P2, P]} style={hdr.pawCircle}>
            <Icon name="paw" size={16} color={WHITE} />
          </LinearGradient>
          <View>
            <Text style={[hdr.adoptionTitle, { color: DARK }]}>Sahiplendirme</Text>
            <Text style={[hdr.adoptionSub, { color: BODY }]}>Bir cana yuva, bir hayata dokun.</Text>
          </View>
        </View>
        <Pressable
          style={hdr.bellBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/adoption-notifications" as any); }}
          hitSlop={10}
        >
          <Icon name="notifications-outline" size={22} color={badgeLabel ? P : BODY} />
          {badgeLabel ? (
            <View style={hdr.bellBadge}>
              <Text style={hdr.bellBadgeTxt}>{badgeLabel}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    );
  }

  /* ── Evcilim mode: Sahiplendirme | Evcilim tab switcher ──────────────────── */
  const TABS: { key: MainTab; label: string }[] = [
    { key: "adoption", label: "Sahiplendirme" },
    { key: "evcilim",  label: "Evcilim"      },
  ];
  return (
    <View style={[hdr.wrap, { paddingTop: topPad + 6, backgroundColor: T.bg }]}>
      <View style={hdr.tabRow}>
        {TABS.map((t) => {
          const isActive = mainTab === t.key;
          return (
            <Pressable key={t.key} style={hdr.tabItem} onPress={() => onChange(t.key)}>
              <Text style={[hdr.tabTxt, isActive ? { color: DARK, fontFamily: "Inter_700Bold" } : { color: BODY, fontFamily: "Inter_500Medium" }]}>
                {t.label}
              </Text>
              {isActive && <View style={hdr.underline} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
const hdr = StyleSheet.create({
  /* Evcilim mode (tab switcher) */
  wrap:          { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 0, backgroundColor: WHITE },
  tabRow:        { flexDirection: "row", alignItems: "flex-end", gap: 24 },
  tabItem:       { alignItems: "center", paddingBottom: 12 },
  tabTxt:        { fontSize: 17, letterSpacing: -0.3 },
  underline:     { position: "absolute", bottom: 0, left: 0, right: 0, height: 3, backgroundColor: P, borderRadius: 2 },
  /* Adoption mode (new header) */
  adoptionWrap:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, backgroundColor: WHITE },
  adoptionLeft:  { flexDirection: "row", alignItems: "center", gap: 10 },
  pawCircle:     { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  adoptionTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.3 },
  adoptionSub:   { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, marginTop: 1 },
  bellBtn:       { position: "relative" },
  bellBadge:     { position: "absolute", top: -3, right: -5, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: "#FF3B30", borderWidth: 1.5, borderColor: WHITE, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  bellBadgeTxt:  { fontSize: 9, fontFamily: "Inter_700Bold", color: WHITE, lineHeight: 11 },
});

// ── Outer tab switcher (kept as thin divider below header) ────────────────────
function OuterTabSwitcher({ active, onChange }: { active: MainTab; onChange: (t: MainTab) => void }) {
  return <View style={ots.divider} />;
}
const ots = StyleSheet.create({
  divider: { height: 1, backgroundColor: BORDER, marginBottom: 0 },
});

// ── Tab switcher (3-segment) ──────────────────────────────────────────────────
const TAB_DEFS: { key: Tab; label: string; icon: string }[] = [
  { key: "create",     label: "İlan Oluştur", icon: "add-circle-outline" },
  { key: "mylistings", label: "İlanlarım",    icon: "list-outline"       },
  { key: "listings",   label: "Tüm İlanlar",  icon: "heart-outline"      },
];

function TabSwitcher({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const T = useTheme();
  return (
    <View style={[tsw.wrap, { backgroundColor: T.card, borderColor: T.border }]}>
      {TAB_DEFS.map((t) => {
        const isActive = active === t.key;
        return (
          <Pressable
            key={t.key}
            style={[tsw.item]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(t.key); }}
          >
            {isActive ? (
              <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={tsw.grad}>
                <Icon name={t.icon} size={13} color={WHITE} />
                <Text style={tsw.lblActive} numberOfLines={1}>{t.label}</Text>
              </LinearGradient>
            ) : (
              <View style={tsw.inactiveRow}>
                <Icon name={t.icon} size={13} color={T.purple} />
                <Text style={[tsw.lblInactive, { color: T.textMuted }]} numberOfLines={1}>{t.label}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
const tsw = StyleSheet.create({
  wrap:        { flexDirection: "row", marginHorizontal: 20, marginBottom: 16, backgroundColor: WHITE, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: BORDER, ...IOS_SHADOW },
  item:        { flex: 1, borderRadius: 12, overflow: "hidden" },
  grad:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10 },
  inactiveRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10 },
  lblActive:   { fontSize: 11, fontFamily: "Inter_700Bold", color: WHITE },
  lblInactive: { fontSize: 11, fontFamily: "Inter_500Medium", color: P },
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
  return (
    <View style={sb.wrap}>
      <View style={[sb.inputWrap, { backgroundColor: T.card, borderColor: T.border }]}>
        <Icon name="search-outline" size={16} color={T.textMuted} />
        <TextInput
          style={[sb.input, { color: T.text }]}
          placeholder="Kedi, köpek, kuş ara..."
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
          <LinearGradient colors={[P2, P]} style={sb.filterGrad}>
            <Icon name="options-outline" size={17} color={WHITE} />
          </LinearGradient>
        </Pressable>
        {activeFilterCount > 0 && (
          <View style={sb.badge}>
            <Text style={sb.badgeTxt}>{activeFilterCount > 9 ? "9+" : String(activeFilterCount)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
const sb = StyleSheet.create({
  wrap:       { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, marginBottom: 12 },
  inputWrap:  { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: WHITE, borderRadius: 14, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: BORDER, gap: 8, ...IOS_SHADOW },
  input:      { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: DARK, height: 44 },
  filterWrap: { position: "relative" },
  filterBtn:  { borderRadius: 12, overflow: "hidden" },
  filterGrad: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute", top: -5, right: -5,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: "#FF3B30", borderWidth: 2, borderColor: WHITE,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  badgeTxt: { fontSize: 9, fontFamily: "Inter_700Bold", color: WHITE, lineHeight: 11 },
});

// ── Filter chips (horizontal FlatList, fixed-width, Instagram style) ──────────
const CHIP_W = 86;
const CHIP_H = 40;
const CHIP_GAP = 8;

function FilterRow({ active, onChange }: { active: Filter; onChange: (f: Filter) => void }) {
  const T = useTheme();
  const filterRef = useRef<FlatList>(null);

  const handlePress = (key: Filter, idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(key);
    filterRef.current?.scrollToIndex({ index: idx, viewPosition: 0.5, animated: true });
  };

  return (
    <FlatList
      ref={filterRef}
      data={FILTERS}
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
                <Text style={fc.lblActive}>{f.label}</Text>
              </LinearGradient>
            ) : (
              <View style={[fc.chip, fc.chipInactive, { backgroundColor: T.card, borderColor: T.border }]}>
                <Icon name={f.icon} size={13} color={P} />
                <Text style={[fc.lbl, { color: T.purple }]}>{f.label}</Text>
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
    paddingBottom: 10,  // enough room for shadow to breathe
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
  emoji:    { fontSize: 13 },
  lbl:      { fontSize: 12, fontFamily: "Inter_600SemiBold", color: P },
  lblActive:{ fontSize: 12, fontFamily: "Inter_700Bold",    color: WHITE },
});

// ── Listing card ──────────────────────────────────────────────────────────────
const IMG_H = 148; // ~40% of card

function ListingCard({ listing, isFeatured, featuredUntil }: { listing: AdoptionListing; isFeatured?: boolean; featuredUntil?: string | null }) {
  const T = useTheme();
  const router = useRouter();
  const { isFollowed, followListing, unfollowListing } = useAdoption();
  const { user } = useAuth();
  const [imgError, setImgError] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const liked = isFollowed(listing.id);

  const handleHeartPress = async (e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    if (!user) {
      Alert.alert("Giriş Yapın", "Takip etmek için giriş yapmanız gerekiyor.");
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

        {/* ── Photo ── */}
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
            <LinearGradient colors={[P2, DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={lc.featuredBadge}>
              <Icon name="star" size={9} color={WHITE} />
              <Text style={lc.featuredTxt}>ÖNE ÇIKAN</Text>
            </LinearGradient>
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

        {/* ── Content ── */}
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
                <Text style={lc.chatTxt}>İletişim</Text>
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

  featuredBadge:{ position: "absolute", top: 9, left: 9, flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4, overflow: "hidden" },
  featuredTxt:  { fontSize: 10, fontFamily: "Inter_700Bold", color: WHITE },

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

// ── Time ago helper ───────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diffMs   = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1)   return "az önce";
  if (diffMins < 60)  return `${diffMins} dk önce`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} saat önce`;
  const diffDays  = Math.floor(diffHours / 24);
  if (diffDays  < 7)  return `${diffDays} gün önce`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5)  return `${diffWeeks} hafta önce`;
  return `${Math.floor(diffDays / 30)} ay önce`;
}

// ── Featured card (portrait, for horizontal rail) ─────────────────────────────
function FeaturedCard({ listing, cardWidth }: { listing: AdoptionListing; cardWidth: number }) {
  const T = useTheme();
  const router = useRouter();
  const { isFollowed, followListing, unfollowListing } = useAdoption();
  const { user } = useAuth();
  const [imgError, setImgError]         = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const liked = isFollowed(listing.id);

  const handleHeart = async (e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    if (!user) { Alert.alert("Giriş Yapın", "Takip etmek için giriş yapın."); return; }
    if (followLoading) return;
    setFollowLoading(true);
    try { if (liked) await unfollowListing(listing.id); else await followListing(listing.id); }
    finally { setFollowLoading(false); }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const breed    = listing.breed?.trim() || listing.petType;
  const gender   = normalizeGender(listing.gender ?? "");
  const metaStr  = [listing.petAge, gender].filter(Boolean).join(" • ");
  const city     = extractCity(listing.location);
  const imgH     = Math.round(cardWidth * 1.05);

  return (
    <Pressable
      style={({ pressed }) => [{ width: cardWidth, opacity: pressed ? 0.92 : 1 }]}
      onPress={() => router.push(`/adoption/${listing.id}`)}
    >
      <View style={[fc2.card, { backgroundColor: T.card, borderColor: T.border }]}>
        <View style={{ height: imgH, overflow: "hidden" }}>
          {listing.photo && !imgError ? (
            <Image source={{ uri: listing.photo }} style={{ width: "100%", height: "100%" }} contentFit="cover" onError={() => setImgError(true)} />
          ) : (
            <LinearGradient colors={[`${P2}40`, `${P}28`]} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Icon name="paw" size={28} color={`${P}60`} />
            </LinearGradient>
          )}
          <View style={fc2.featBadge}><Text style={fc2.featBadgeTxt}>ÖNE ÇIKAN</Text></View>
          <Pressable style={[fc2.heart, followLoading && { opacity: 0.6 }]} onPress={handleHeart} hitSlop={8}>
            <Icon name={liked ? "heart" : "heart-outline"} size={14} color={liked ? "#FF4466" : WHITE} />
          </Pressable>
        </View>
        <View style={fc2.body}>
          <Text style={[fc2.name,  { color: T.text }]} numberOfLines={1}>{listing.petName}</Text>
          <Text style={[fc2.breed, { color: T.textMuted }]} numberOfLines={1}>{breed}</Text>
          {metaStr ? <Text style={[fc2.meta, { color: T.textMuted }]} numberOfLines={1}>{metaStr}</Text> : null}
          {city ? (
            <View style={fc2.locRow}>
              <Icon name="location-sharp" size={10} color={P} />
              <Text style={[fc2.loc, { color: T.textMuted }]} numberOfLines={1}>{city}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
const fc2 = StyleSheet.create({
  card:        { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: BORDER, backgroundColor: WHITE,
    ...Platform.select({ ios: { shadowColor: DARK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 3 }, default: {} }),
  },
  featBadge:   { position: "absolute", top: 8, left: 8, backgroundColor: P, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  featBadgeTxt:{ fontSize: 9, fontFamily: "Inter_700Bold", color: WHITE, letterSpacing: 0.5 },
  heart:       { position: "absolute", top: 7, right: 7, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
  body:        { padding: 10, gap: 2 },
  name:        { fontSize: 14, fontFamily: "Inter_700Bold", color: DARK },
  breed:       { fontSize: 11, fontFamily: "Inter_500Medium", color: BODY },
  meta:        { fontSize: 11, fontFamily: "Inter_400Regular", color: BODY },
  locRow:      { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  loc:         { fontSize: 10, fontFamily: "Inter_400Regular", color: BODY, flex: 1 },
});

// ── Recent card (compact horizontal-image card for vertical list) ──────────────
function RecentCard({ listing }: { listing: AdoptionListing }) {
  const T = useTheme();
  const router = useRouter();
  const { isFollowed, followListing, unfollowListing } = useAdoption();
  const { user } = useAuth();
  const [imgError, setImgError]           = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const liked = isFollowed(listing.id);

  const handleHeart = async (e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    if (!user) { Alert.alert("Giriş Yapın", "Takip etmek için giriş yapın."); return; }
    if (followLoading) return;
    setFollowLoading(true);
    try { if (liked) await unfollowListing(listing.id); else await followListing(listing.id); }
    finally { setFollowLoading(false); }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const breed   = listing.breed?.trim() || listing.petType;
  const gender  = normalizeGender(listing.gender ?? "");
  const metaStr = [listing.petAge, gender].filter(Boolean).join(" • ");
  const city    = extractCity(listing.location);

  return (
    <Pressable
      style={({ pressed }) => [rc.shadow, { opacity: pressed ? 0.94 : 1 }]}
      onPress={() => router.push(`/adoption/${listing.id}`)}
    >
      <View style={[rc.card, { backgroundColor: T.card, borderColor: T.border }]}>
        <View style={rc.imgWrap}>
          {listing.photo && !imgError ? (
            <Image source={{ uri: listing.photo }} style={rc.img} contentFit="cover" onError={() => setImgError(true)} />
          ) : (
            <LinearGradient colors={[`${P2}40`, `${P}28`]} style={rc.imgFallback}>
              <Icon name="paw" size={20} color={`${P}60`} />
            </LinearGradient>
          )}
        </View>
        <View style={rc.body}>
          <View style={rc.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={[rc.name,  { color: T.text }]} numberOfLines={1}>{listing.petName}</Text>
              <Text style={[rc.breed, { color: T.textMuted }]} numberOfLines={1}>{breed}</Text>
              {metaStr ? <Text style={[rc.meta, { color: T.textMuted }]} numberOfLines={1}>{metaStr}</Text> : null}
            </View>
            <Pressable style={[rc.heart, followLoading && { opacity: 0.6 }]} onPress={handleHeart} hitSlop={8}>
              <Icon name={liked ? "heart" : "heart-outline"} size={17} color={liked ? "#FF4466" : BODY} />
            </Pressable>
          </View>
          <View style={rc.footer}>
            {city ? (
              <View style={rc.locRow}>
                <Icon name="location-sharp" size={10} color={P} />
                <Text style={[rc.loc, { color: T.textMuted }]} numberOfLines={1}>{city}</Text>
              </View>
            ) : <View style={{ flex: 1 }} />}
            <Text style={[rc.ago, { color: T.textMuted }]}>{timeAgo(listing.createdAt)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
const rc = StyleSheet.create({
  shadow:     { marginHorizontal: 20, marginBottom: 12, borderRadius: 16,
    ...Platform.select({ ios: { shadowColor: DARK, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 }, android: { elevation: 2 }, default: {} }),
  },
  card:       { backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, flexDirection: "row", overflow: "hidden", height: 90 },
  imgWrap:    { width: 90, height: 90, flexShrink: 0 },
  img:        { width: "100%", height: "100%" },
  imgFallback:{ flex: 1, alignItems: "center", justifyContent: "center" },
  body:       { flex: 1, padding: 11, justifyContent: "space-between" },
  topRow:     { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  name:       { fontSize: 15, fontFamily: "Inter_700Bold", color: DARK, lineHeight: 20 },
  breed:      { fontSize: 12, fontFamily: "Inter_500Medium", color: BODY },
  meta:       { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY },
  heart:      { paddingTop: 1 },
  footer:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  locRow:     { flexDirection: "row", alignItems: "center", gap: 3, flex: 1 },
  loc:        { fontSize: 11, fontFamily: "Inter_400Regular", color: BODY, flex: 1 },
  ago:        { fontSize: 11, fontFamily: "Inter_400Regular", color: `${BODY}90` },
});

// ── Adoption landing section ───────────────────────────────────────────────────
function AdoptionLandingSection({
  listings,
  boostStatuses,
  filter,
  setFilter,
  query,
  setQuery,
  advFilters,
  activeBadgeCount,
  onFilterPress,
  botPad,
}: {
  listings:         AdoptionListing[];
  boostStatuses:    Record<string, { isFeatured?: boolean; expiresAt?: string | null } | undefined>;
  filter:           Filter;
  setFilter:        (f: Filter) => void;
  query:            string;
  setQuery:         (q: string) => void;
  advFilters:       AdoptionFilters;
  activeBadgeCount: number;
  onFilterPress:    () => void;
  botPad:           number;
}) {
  const router = useRouter();
  const T      = useTheme();
  const { width: SW } = useWindowDimensions();
  const CARD_W = Math.round(SW * 0.42);
  const NOW_T  = Date.now() - 24 * 3_600_000;

  const filtered = useMemo(() => {
    let list = listings;
    if (filter === "new")      list = list.filter((l) => new Date(l.createdAt).getTime() > NOW_T);
    else if (filter !== "all") list = list.filter((l) => (TYPE_NORMALIZE[l.petType] ?? "other") === filter);
    if (filter === "other")    list = listings.filter((l) => (TYPE_NORMALIZE[l.petType] ?? "other") === "other");
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
    if (af.gender !== "all")  list = list.filter((l) => normalizeGender(l.gender ?? "") === af.gender);
    if (af.breed !== null)    list = list.filter((l) => (l.breed ?? "").toLowerCase() === af.breed!.toLowerCase());
    if (af.status !== "all")  list = list.filter((l) => {
      const s = (l.status ?? "").toLowerCase();
      if (af.status === "active")  return s === "aktif"          || s === "active";
      if (af.status === "adopted") return s === "sahiplendirildi" || s === "adopted";
      return true;
    });
    if (af.locationCity !== null) {
      const tc = af.locationCity.toLowerCase();
      list = list.filter((l) => (extractCity(l.location) ?? "").toLowerCase() === tc);
    }
    if (af.sortBy === "oldest")   list = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (af.sortBy === "age_asc")  list = [...list].sort((a, b) => (parseAgeMonths(a.petAge ?? "") ?? 999) - (parseAgeMonths(b.petAge ?? "") ?? 999));
    else if (af.sortBy === "age_desc") list = [...list].sort((a, b) => (parseAgeMonths(b.petAge ?? "") ?? -1)  - (parseAgeMonths(a.petAge ?? "") ?? -1));
    return list;
  }, [listings, filter, query, advFilters]);

  const featured = useMemo(() => filtered.filter((l) => boostStatuses[l.id]?.isFeatured), [filtered, boostStatuses]);
  const recent   = useMemo(() => [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [filtered]);

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={al.scrollContent}>
      {/* Search row */}
      <View style={al.searchRow}>
        <View style={[al.inputWrap, { backgroundColor: T.card, borderColor: T.border }]}>
          <Icon name="search-outline" size={16} color={T.textMuted} />
          <TextInput
            style={[al.input, { color: T.text }]}
            placeholder="Kedi, köpek, kuş ara..."
            placeholderTextColor={T.placeholder}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Icon name="close-circle" size={16} color={T.textMuted} />
            </Pressable>
          )}
        </View>
        <View style={{ position: "relative" }}>
          <Pressable style={al.filterBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onFilterPress(); }}>
            <LinearGradient colors={[P2, P]} style={al.filterGrad}>
              <Icon name="options-outline" size={17} color={WHITE} />
            </LinearGradient>
          </Pressable>
          {activeBadgeCount > 0 && (
            <View style={al.filterBadge}>
              <Text style={al.filterBadgeTxt}>{activeBadgeCount > 9 ? "9+" : String(activeBadgeCount)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Category chips */}
      <FilterRow active={filter} onChange={setFilter} />

      {/* ─── Öne Çıkan İlanlar ─── */}
      {featured.length > 0 && (
        <>
          <View style={al.sectionHdr}>
            <Text style={[al.sectionTitle, { color: T.text }]}>Öne Çıkan İlanlar</Text>
            <Text style={al.seeAll}>Tümünü Gör &gt;</Text>
          </View>
          <FlatList
            horizontal
            data={featured}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 6 }}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            renderItem={({ item }) => <FeaturedCard listing={item} cardWidth={CARD_W} />}
            scrollEventThrottle={16}
          />
          <View style={{ height: 4 }} />
        </>
      )}

      {/* ─── Son Eklenen İlanlar ─── */}
      <View style={al.sectionHdr}>
        <Text style={[al.sectionTitle, { color: T.text }]}>Son Eklenen İlanlar</Text>
        <Text style={al.seeAll}>Tümünü Gör &gt;</Text>
      </View>

      {recent.length === 0 ? (
        <View style={al.emptyWrap}>
          <View style={al.emptyIllo}><Icon name="heart-outline" size={34} color={`${P}60`} /></View>
          <Text style={[al.emptyTitle, { color: T.text }]}>{query ? "Sonuç Bulunamadı" : "İlan Bulunamadı"}</Text>
          <Text style={[al.emptySub, { color: T.textMuted }]}>
            {query ? `"${query}" için ilan bulunamadı` : "İlk sahiplendirme ilanını sen oluştur"}
          </Text>
        </View>
      ) : (
        recent.map((item) => <RecentCard key={item.id} listing={item} />)
      )}

      {/* ─── Bottom CTA ─── */}
      <Pressable
        style={({ pressed }) => [al.ctaOuter, { opacity: pressed ? 0.9 : 1 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/add-adoption"); }}
      >
        <LinearGradient colors={[P2, P, DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={al.ctaGrad}>
          <View style={al.ctaIconWrap}><Icon name="paw" size={18} color={WHITE} /></View>
          <View style={{ flex: 1 }}>
            <Text style={al.ctaTitle}>İlan Oluştur</Text>
            <Text style={al.ctaSub}>Evcil hayvan sahiplendirme ilanı ekle</Text>
          </View>
          <Icon name="sparkles-outline" size={18} color="rgba(255,255,255,0.75)" />
        </LinearGradient>
      </Pressable>

      <View style={{ height: botPad + 16 }} />
    </ScrollView>
  );
}
const al = StyleSheet.create({
  scrollContent: { paddingTop: 4 },
  searchRow:  { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, marginBottom: 12 },
  inputWrap:  { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: WHITE, borderRadius: 14, paddingHorizontal: 12, height: 46, borderWidth: 1, borderColor: BORDER, gap: 8,
    ...Platform.select({ ios: { shadowColor: DARK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 1 }, default: {} }),
  },
  input:          { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", height: 46 },
  filterBtn:      { borderRadius: 14, overflow: "hidden" },
  filterGrad:     { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
  filterBadge:    { position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#FF3B30", borderWidth: 2, borderColor: WHITE, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  filterBadgeTxt: { fontSize: 9, fontFamily: "Inter_700Bold", color: WHITE, lineHeight: 11 },
  sectionHdr:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12, marginTop: 8 },
  sectionTitle:   { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK },
  seeAll:         { fontSize: 13, fontFamily: "Inter_600SemiBold", color: P },
  emptyWrap:      { alignItems: "center", paddingTop: 40, paddingHorizontal: 40, gap: 8, marginBottom: 16 },
  emptyIllo:      { width: 68, height: 68, borderRadius: 34, backgroundColor: `${P}12`, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle:     { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK },
  emptySub:       { fontSize: 13, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center", lineHeight: 20 },
  ctaOuter:       { marginHorizontal: 20, marginTop: 8, borderRadius: 20, overflow: "hidden",
    ...Platform.select({ ios: { shadowColor: P, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 16 }, android: { elevation: 6 }, default: {} }),
  },
  ctaGrad:        { flexDirection: "row", alignItems: "center", paddingVertical: 18, paddingHorizontal: 18, gap: 14 },
  ctaIconWrap:    { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  ctaTitle:       { fontSize: 16, fontFamily: "Inter_700Bold", color: WHITE },
  ctaSub:         { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.82)", marginTop: 1 },
});

// ── Success modal styles (must be above MyListingsSection) ───────────────────
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

// ── My Listings Section (Premium Redesign) ────────────────────────────────────
const MY_FILTERS: { key: MyFilter; label: string }[] = [
  { key: "all",     label: "Tümü"          },
  { key: "active",  label: "Aktif"         },
  { key: "passive", label: "Pasif"         },
  { key: "pending", label: "Bekleyen"      },
  { key: "adopted", label: "Sahiplendirilen" },
];

const STATUS_CFG: Record<ListStatus, { color: string; bg: string; icon: string }> = {
  "Aktif":           { color: "#18A558", bg: "#E6F7EE",    icon: "checkmark-circle"     },
  "Onay Bekliyor":   { color: "#D97706", bg: "#FEF3C7",    icon: "time-outline"         },
  "Pasif":           { color: BODY,      bg: `${BODY}14`,  icon: "pause-circle-outline" },
  "Sahiplendirildi": { color: P,         bg: `${P}14`,     icon: "heart-circle"         },
  "Süresi Doldu":    { color: "#DC2626", bg: "#FEE2E2",    icon: "close-circle-outline" },
};

function pkgHoursLabel(hours: number): string {
  if (hours <= 24)  return `${hours} Saat`;
  const days = Math.round(hours / 24);
  return `${days} Gün`;
}
function pkgMultiplierLabel(hours: number): string {
  if (hours <= 24)  return "≈2× görünürlük";
  if (hours <= 168) return "≈5× görünürlük";
  return "≈10× görünürlük";
}
function pkgIsPopular(hours: number): boolean {
  return hours === 168; // 7 gün
}
function pkgFormatPrice(unitAmount: number): string {
  return (unitAmount / 100).toFixed(0);
}

function remainingTime(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Süre doldu";
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}s kaldı`;
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  return remH > 0 ? `${days}g ${remH}s kaldı` : `${days}g kaldı`;
}

function mockViews(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return 12 + Math.abs(h % 289);
}
function mockFavs(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 3) + id.charCodeAt(i)) | 0;
  return 1 + Math.abs(h % 47);
}
function mockMsgs(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 2) ^ id.charCodeAt(i)) | 0;
  return Math.abs(h % 19);
}

interface MyCard {
  listing: AdoptionListing;
  status:  ListStatus;
  views:   number;
  favs:    number;
  msgs:    number;
}

function MyListingCard({
  card,
  onEdit,
  onTogglePassive,
  onAdopted,
  onPreview,
  onDelete,
  packages,
  onBoost,
  isFeatured,
  featuredUntil,
}: {
  card: MyCard;
  packages: BoostPackage[];
  onEdit: () => void;
  onTogglePassive: () => void;
  onAdopted: () => void;
  onPreview: () => void;
  onDelete: () => void;
  onBoost: (pkg: BoostPackage) => Promise<void>;
  isFeatured?: boolean;
  featuredUntil?: string | null;
}) {
  const T = useTheme();
  const { listing, status, views, favs, msgs } = card;
  const cfg = STATUS_CFG[status];
  const [selectedPkg, setSelectedPkg] = useState<BoostPackage | null>(null);
  const [boosting, setBoosting] = useState(false);
  const [perfOpen, setPerfOpen] = useState(false);
  const [boostExpanded, setBoostExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isAdopted = status === "Sahiplendirildi";
  const canBoost  = status === "Aktif" && !isFeatured;
  const canPassive = status === "Aktif" || status === "Pasif";

  const openMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const buttons: Parameters<typeof Alert.alert>[2] = [];
    if (canPassive) {
      buttons.push({
        text: status === "Pasif" ? "Aktif Et" : "Pasife Al",
        onPress: onTogglePassive,
      });
    }
    if (!isAdopted) {
      buttons.push({
        text: "Sahiplendirildi Olarak İşaretle",
        onPress: onAdopted,
      });
    }
    buttons.push({ text: "Sil", style: "destructive", onPress: onDelete });
    buttons.push({ text: "İptal", style: "cancel" });
    Alert.alert("İşlemler", listing.petName, buttons);
  };

  return (
    <View style={ml.cardOuter}>
      <View style={[ml.card, { backgroundColor: T.card }, isFeatured && ml.cardFeatured]}>

        {/* ── Status row — above image ── */}
        <View style={ml.statusRow}>
          {isFeatured ? (
            <LinearGradient colors={[P2, DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ml.featBadge}>
              <Icon name="star" size={10} color={WHITE} />
              <Text style={ml.featBadgeTxt}>ÖNE ÇIKAN</Text>
            </LinearGradient>
          ) : (
            <View style={[ml.statusBadge, { backgroundColor: cfg.bg }]}>
              <Icon name={cfg.icon} size={11} color={cfg.color} />
              <Text style={[ml.statusTxt, { color: cfg.color }]}>{status}</Text>
            </View>
          )}
          <View style={ml.agePill}>
            <Text style={ml.ageTxt}>{listing.petAge ?? "0–3 ay"}</Text>
          </View>
        </View>

        {/* ── Hero photo — 16:9 ── */}
        <View style={ml.heroWrap}>
          {listing.photo && !imgError ? (
            <Image
              source={{ uri: listing.photo }}
              style={ml.heroImg}
              contentFit="cover"
              contentPosition={{ top: 0.3 }}
              onError={() => setImgError(true)}
            />
          ) : (
            <LinearGradient colors={[`${P2}40`, `${P}28`]} style={[ml.heroFallback, { flex: 1 }]}>
              <Icon name="paw" size={34} color={`${P}60`} />
            </LinearGradient>
          )}
          {(!listing.photo || imgError) && (
            <View style={ml.heroNoPhotoOverlay}>
              <Icon name="paw" size={22} color="rgba(255,255,255,0.85)" />
              <Text style={ml.heroNoPhotoTxt}>Fotoğraf eklenmedi</Text>
            </View>
          )}
        </View>

        {/* ── Content ── */}
        <View style={ml.content}>

          {/* Featured active banner */}
          {isFeatured && (
            <View style={ml.featuredBannerInner}>
              <Icon name="star" size={12} color={P} />
              <Text style={ml.featuredBannerTxt}>ÖNE ÇIKAN · Aktif</Text>
              {featuredUntil && (
                <View style={ml.featuredTimeChip}>
                  <Icon name="time-outline" size={10} color={P} />
                  <Text style={ml.featuredTimeTxt}>{remainingTime(featuredUntil)}</Text>
                </View>
              )}
            </View>
          )}

          {/* Title */}
          <Text style={[ml.petName, { color: T.text }]} numberOfLines={2}>{listing.petName}</Text>

          {/* Location + date */}
          <View style={ml.locRow}>
            <Icon name="location-sharp" size={12} color={T.purple} />
            <Text style={[ml.locTxt, { color: T.textMuted }]} numberOfLines={1}>{listing.location}</Text>
            <Text style={[ml.timeTxt, { color: T.textFaint }]}>{formatTimeAgo(listing.createdAt)}</Text>
          </View>

          {/* Stats bar */}
          <View style={ml.statsBar}>
            <View style={ml.statChip}>
              <Icon name="eye-outline" size={12} color={P} />
              <Text style={ml.statChipTxt}>{views}</Text>
            </View>
            <View style={[ml.statChip, ml.statChipHeart]}>
              <Icon name="heart-outline" size={12} color="#DC2626" />
              <Text style={[ml.statChipTxt, { color: "#DC2626" }]}>{favs}</Text>
            </View>
            <View style={[ml.statChip, ml.statChipMsg]}>
              <Icon name="chatbubble-outline" size={12} color="#0070F3" />
              <Text style={[ml.statChipTxt, { color: "#0070F3" }]}>{msgs}</Text>
            </View>
            <Pressable
              style={ml.perfBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPerfOpen((v) => !v); }}
            >
              <Text style={ml.perfBtnTxt}>Performans</Text>
              <Icon name={perfOpen ? "chevron-up" : "chevron-down"} size={10} color={BODY} />
            </Pressable>
          </View>

          {/* Performance panel */}
          {perfOpen && (
            <View style={ml.perfPanel}>
              <Text style={ml.perfPanelTitle}>SON 7 GÜN</Text>
              <View style={ml.perfRow}>
                <View style={ml.perfItem}>
                  <Icon name="eye" size={16} color={P} />
                  <Text style={ml.perfVal}>{views}</Text>
                  <Text style={ml.perfLbl}>Görüntülenme</Text>
                </View>
                <View style={ml.perfDivV} />
                <View style={ml.perfItem}>
                  <Icon name="heart" size={16} color="#DC2626" />
                  <Text style={[ml.perfVal, { color: "#DC2626" }]}>{favs}</Text>
                  <Text style={ml.perfLbl}>Favori</Text>
                </View>
                <View style={ml.perfDivV} />
                <View style={ml.perfItem}>
                  <Icon name="chatbubble" size={16} color="#0070F3" />
                  <Text style={[ml.perfVal, { color: "#0070F3" }]}>{msgs}</Text>
                  <Text style={ml.perfLbl}>Mesaj</Text>
                </View>
              </View>
            </View>
          )}

          {/* Adopted banner */}
          {isAdopted && (
            <View style={ml.adoptedBanner}>
              <Icon name="heart-circle" size={16} color={P} />
              <Text style={ml.adoptedBannerTxt}>Tebrikler! Bu hayvan yeni yuvasını buldu</Text>
            </View>
          )}

          {/* ── Promote banner — inside card ── */}
          {canBoost && (
            <View style={ml.promoteBanner}>
              <View style={ml.promoteLeft}>
                <View style={ml.rocketCircle}>
                  <Icon name="rocket-outline" size={18} color={P} />
                </View>
                <View style={ml.promoteTextWrap}>
                  <Text style={ml.promoteTitle}>İlanını öne çıkar</Text>
                  <Text style={ml.promoteSub}>Daha fazla kişiye ulaş, daha hızlı sat!</Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setBoostExpanded((v) => !v);
                }}
              >
                <LinearGradient
                  colors={[P2, P]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={ml.promoteBtnGrad}
                >
                  <Icon name="sparkles" size={13} color={WHITE} />
                  <Text style={ml.promoteBtnTxt}>Öne Çıkar</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {/* Expanded package selection */}
          {canBoost && boostExpanded && (
            <View style={ml.pkgSection}>
              {packages.length === 0 ? (
                <View style={ml.pkgEmpty}>
                  <Icon name="time-outline" size={22} color={`${P}60`} />
                  <Text style={ml.pkgEmptyTxt}>Paketler yükleniyor…</Text>
                </View>
              ) : (
                <View style={ml.pkgRow}>
                  {packages.map((pkg, idx) => {
                    const isSel = selectedPkg?.priceId === pkg.priceId;
                    const isPopular = pkgIsPopular(pkg.packageHours) || (packages.length === 3 && idx === 1);
                    return (
                      <Pressable
                        key={pkg.priceId}
                        onPress={() => {
                          if (boosting) return;
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedPkg(isSel ? null : pkg);
                        }}
                        style={{ flex: 1 }}
                      >
                        <View style={[ml.pkgCard, isSel ? ml.pkgCardSel : ml.pkgIdle, isPopular && !isSel && ml.pkgPop]}>
                          {isPopular && (
                            <View style={[ml.popBadge, isSel && { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                              <Text style={ml.popBadgeTxt}>En Popüler</Text>
                            </View>
                          )}
                          <Text style={[ml.pkgName, isSel && ml.pkgNameSel]}>{pkg.label}</Text>
                          <Text style={[ml.pkgPrice, isSel && ml.pkgPriceSel]}>₺{pkgFormatPrice(pkg.unitAmount)}</Text>
                          <Text style={[ml.pkgDays, isSel && ml.pkgDaysSel]}>{pkgHoursLabel(pkg.packageHours)}</Text>
                          <Text style={[ml.pkgMult, isSel && ml.pkgMultSel]}>{pkgMultiplierLabel(pkg.packageHours)}</Text>
                          {isSel && <Icon name="checkmark-circle" size={16} color={WHITE} style={{ marginTop: 4 }} />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {selectedPkg && (
                <View style={ml.boostSummary}>
                  <Text style={ml.boostSummaryPkg}>{selectedPkg.label} · {pkgHoursLabel(selectedPkg.packageHours)}</Text>
                  <Text style={ml.boostSummaryPrice}>Toplam: ₺{pkgFormatPrice(selectedPkg.unitAmount)}</Text>
                </View>
              )}

              <Pressable
                onPress={async () => {
                  if (!selectedPkg || boosting) return;
                  setBoosting(true);
                  try {
                    await onBoost(selectedPkg);
                    setBoostExpanded(false);
                  } catch {
                    Alert.alert("Hata", "Ödeme sayfası açılamadı. Lütfen tekrar dene.");
                  } finally {
                    setBoosting(false);
                    setSelectedPkg(null);
                  }
                }}
                disabled={!selectedPkg || boosting}
                style={({ pressed }) => [
                  ml.boostCta,
                  (!selectedPkg || boosting) && ml.boostCtaDisabled,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <Icon
                  name={boosting ? "sync-outline" : "rocket-outline"}
                  size={15}
                  color={selectedPkg && !boosting ? WHITE : `${BODY}90`}
                />
                <Text style={[ml.boostCtaTxt, (!selectedPkg || boosting) && { color: `${BODY}90` }]}>
                  {boosting ? "Ödeme Hazırlanıyor…" : selectedPkg ? `₺${pkgFormatPrice(selectedPkg.unitAmount)} · Ödemeye Geç` : "Bir Paket Seç"}
                </Text>
              </Pressable>
              <Text style={ml.boostNote}>Stripe güvenli ödeme sayfasına yönlendirileceksiniz.</Text>
            </View>
          )}

          <View style={ml.divider} />

          {/* Action buttons: Düzenle | Önizle | ••• */}
          <View style={ml.actions}>
            <Pressable
              style={({ pressed }) => [ml.btn, ml.btnEdit, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onEdit(); }}
            >
              <Icon name="create-outline" size={15} color={P} />
              <Text style={[ml.btnTxt, { color: P }]}>Düzenle</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [ml.btn, ml.btnPreview, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPreview(); }}
            >
              <Icon name="eye-outline" size={15} color={BODY} />
              <Text style={[ml.btnTxt, { color: BODY }]}>Önizle</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [ml.btn, ml.btnDel, { opacity: pressed ? 0.75 : 1 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onDelete(); }}
            >
              <Icon name="trash-outline" size={15} color="#DC2626" />
              <Text style={[ml.btnTxt, { color: "#DC2626" }]}>Sil</Text>
            </Pressable>

          </View>
        </View>
      </View>
    </View>
  );
}

interface EditForm {
  petName: string;
  petType: string;
  petAge: string;
  location: string;
  description: string;
  contactInfo: string;
  healthStatus: string;
  vaccinationStatus: string;
  environmentType: string;
  childCompatibility: string;
  catCompatibility: string;
  dogCompatibility: string;
  toiletTraining: string;
}

function MyListingsSection({
  userId,
  userEmail,
  listings,
  boostStatuses,
  deleteListing,
  botPad,
  onAdd,
}: {
  userId: string;
  userEmail: string;
  listings: AdoptionListing[];
  boostStatuses: Record<string, { isFeatured: boolean; expiresAt?: string | null }>;
  deleteListing: (id: string) => Promise<void>;
  botPad: number;
  onAdd: () => void;
}) {
  const T = useTheme();
  const { createCheckout, packages, fetchBoostStatus } = useBoost();
  const { updateListing } = useAdoption();
  const router = useRouter();

  // ── Boost success modal ──
  const [successModal, setSuccessModal] = useState<{
    petName: string;
    pkgLabel: string;
    expiresAt: string;
  } | null>(null);

  // ── Edit modal ──
  const [editTarget, setEditTarget] = useState<AdoptionListing | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ petName: "", petType: "", petAge: "", location: "", description: "", contactInfo: "", healthStatus: "", vaccinationStatus: "", environmentType: "", childCompatibility: "", catCompatibility: "", dogCompatibility: "", toiletTraining: "" });
  const [saving, setSaving] = useState(false);

  const openEdit = useCallback((listing: AdoptionListing) => {
    setEditForm({
      petName:            listing.petName,
      petType:            listing.petType,
      petAge:             listing.petAge ?? "",
      location:           listing.location,
      description:        listing.description,
      contactInfo:        listing.contactInfo,
      healthStatus:       listing.healthStatus       ?? "",
      vaccinationStatus:  listing.vaccinationStatus  ?? "",
      environmentType:    listing.environmentType    ?? "",
      childCompatibility: listing.childCompatibility ?? "",
      catCompatibility:   listing.catCompatibility   ?? "",
      dogCompatibility:   listing.dogCompatibility   ?? "",
      toiletTraining:     listing.toiletTraining     ?? "",
    });
    setEditTarget(listing);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editTarget || saving) return;
    setSaving(true);
    try {
      await updateListing(editTarget.id, {
        petName:            editForm.petName.trim()     || editTarget.petName,
        petType:            editForm.petType.trim()     || editTarget.petType,
        petAge:             editForm.petAge.trim()      || undefined,
        location:           editForm.location.trim()    || editTarget.location,
        description:        editForm.description.trim() || editTarget.description,
        contactInfo:        editForm.contactInfo.trim() || editTarget.contactInfo,
        healthStatus:       editForm.healthStatus       || undefined,
        vaccinationStatus:  editForm.vaccinationStatus  || undefined,
        environmentType:    editForm.environmentType    || undefined,
        childCompatibility: editForm.childCompatibility || undefined,
        catCompatibility:   editForm.catCompatibility   || undefined,
        dogCompatibility:   editForm.dogCompatibility   || undefined,
        toiletTraining:     editForm.toiletTraining     || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditTarget(null);
    } finally {
      setSaving(false);
    }
  }, [editTarget, editForm, saving, updateListing]);

  // ── Status map (local, not persisted) ──
  const [statusMap, setStatusMap] = useState<Record<string, ListStatus>>({});
  const [myFilter, setMyFilter] = useState<MyFilter>("all");

  const getStatus = useCallback((id: string): ListStatus => statusMap[id] ?? "Aktif", [statusMap]);

  const togglePassive = useCallback((id: string) => {
    setStatusMap((prev) => ({
      ...prev,
      [id]: prev[id] === "Pasif" ? "Aktif" : "Pasif",
    }));
  }, []);

  const handleAdopted = useCallback((id: string, petName: string) => {
    Alert.alert(
      "Sahiplendirildi",
      `"${petName}" artık yeni yuvasında. İlanı sahiplendirildi olarak işaretlensin mi?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Evet, İşaretle",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setStatusMap((prev) => ({ ...prev, [id]: "Sahiplendirildi" }));
          },
        },
      ]
    );
  }, []);

  const handleDelete = useCallback((listing: AdoptionListing) => {
    Alert.alert(
      "İlanı Sil",
      `"${listing.petName}" ilanını kalıcı olarak silmek istiyor musun? Bu işlem geri alınamaz.`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            await deleteListing(listing.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [deleteListing]);

  const handleBoost = useCallback(async (listingId: string, petName: string, pkg: BoostPackage) => {
    const url = await createCheckout({
      listingId,
      userEmail,
      priceId: pkg.priceId,
      packageHours: pkg.packageHours,
      petName,
    });
    await Linking.openURL(url);
    // Webhook activates the boost; poll after a delay to reflect the new status
    setTimeout(() => { fetchBoostStatus([listingId]); }, 5000);
    setTimeout(() => { fetchBoostStatus([listingId]); }, 15000);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [createCheckout, userEmail, fetchBoostStatus]);

  const myListings = useMemo(
    () => listings.filter((l) => l.userId === userId),
    [listings, userId]
  );

  const cards: MyCard[] = useMemo(
    () =>
      myListings.map((l) => ({
        listing: l,
        status: getStatus(l.id),
        views: mockViews(l.id),
        favs: mockFavs(l.id),
        msgs: mockMsgs(l.id),
      })),
    [myListings, statusMap]
  );

  const totalViews    = useMemo(() => cards.reduce((s, c) => s + c.views, 0), [cards]);
  const totalFavs     = useMemo(() => cards.reduce((s, c) => s + c.favs,  0), [cards]);
  const totalMsgs     = useMemo(() => cards.reduce((s, c) => s + c.msgs,  0), [cards]);
  const activeCount   = useMemo(() => cards.filter((c) => c.status === "Aktif").length, [cards]);
  const adoptedCount  = useMemo(() => cards.filter((c) => c.status === "Sahiplendirildi").length, [cards]);

  const FILTER_MAP: Record<MyFilter, (c: MyCard) => boolean> = {
    all:     () => true,
    active:  (c) => c.status === "Aktif",
    passive: (c) => c.status === "Pasif",
    pending: (c) => c.status === "Onay Bekliyor",
    adopted: (c) => c.status === "Sahiplendirildi",
  };
  const visible = cards.filter(FILTER_MAP[myFilter]);

  return (
    <>
    {/* ── Boost success modal ── */}
    <Modal visible={successModal !== null} transparent animationType="fade" onRequestClose={() => setSuccessModal(null)}>
      <Pressable style={sm.overlay} onPress={() => setSuccessModal(null)}>
        <View style={sm.card}>
          <View style={sm.emoji}>
            <Icon name="star" size={40} color="#F5A623" />
          </View>
          <Text style={sm.title}>İlanın Öne Çıkarıldı!</Text>
          <Text style={sm.sub}>İlanın artık daha fazla kullanıcıya gösterilecek</Text>
          {successModal && (
            <View style={sm.infoBox}>
              <View style={sm.infoRow}>
                <LinearGradient colors={[P2, DARK]} style={sm.infoIcon}>
                  <Icon name="cube-outline" size={13} color={WHITE} />
                </LinearGradient>
                <Text style={sm.infoTxt}>{successModal.pkgLabel} Paketi</Text>
              </View>
              <View style={sm.infoRow}>
                <LinearGradient colors={[P2, DARK]} style={sm.infoIcon}>
                  <Icon name="time-outline" size={13} color={WHITE} />
                </LinearGradient>
                <Text style={sm.infoTxt}>
                  {new Date(successModal.expiresAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} · {new Date(successModal.expiresAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} tarihine kadar aktif
                </Text>
              </View>
            </View>
          )}
          <Pressable onPress={() => setSuccessModal(null)} style={sm.btn}>
            <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sm.btnGrad}>
              <Icon name="rocket-outline" size={16} color={WHITE} />
              <Text style={sm.btnTxt}>Harika!</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </Pressable>
    </Modal>

    {/* ── Edit listing modal ── */}
    <Modal visible={editTarget !== null} transparent animationType="slide" onRequestClose={() => setEditTarget(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable style={ed.overlay} onPress={() => setEditTarget(null)}>
          <Pressable style={ed.sheet} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={ed.sheetHeader}>
              <View>
                <Text style={ed.sheetTitle}>İlanı Düzenle</Text>
                <Text style={ed.sheetSub}>{editTarget?.petName}</Text>
              </View>
              <Pressable onPress={() => setEditTarget(null)} style={ed.closeBtn}>
                <Icon name="close" size={20} color={BODY} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {/* Photo hint */}
              {editTarget?.photo && (
                <View style={ed.photoRow}>
                  <Image source={{ uri: editTarget.photo }} style={ed.photoThumb} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={ed.fieldLabel}>Fotoğraf</Text>
                    <Text style={ed.fieldHint}>Fotoğraf değiştirme yeni ilan oluşturarak yapılabilir</Text>
                  </View>
                </View>
              )}

              {([ 
                { label: "Hayvan Adı", key: "petName", placeholder: "örn. Misket", multiline: false },
                { label: "Tür",        key: "petType", placeholder: "örn. Kedi, Köpek, Tavşan", multiline: false },
                { label: "Yaş / Cins", key: "petAge",  placeholder: "örn. Tekir • 3 aylık", multiline: false },
                { label: "Konum",      key: "location", placeholder: "örn. Kadıköy, İstanbul", multiline: false },
              ] as const).map((f) => (
                <View key={f.key} style={ed.fieldWrap}>
                  <Text style={ed.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={ed.input}
                    value={editForm[f.key]}
                    onChangeText={(t) => setEditForm((prev) => ({ ...prev, [f.key]: t }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={`${BODY}60`}
                  />
                </View>
              ))}

              <View style={ed.fieldWrap}>
                <Text style={ed.fieldLabel}>Açıklama</Text>
                <TextInput
                  style={[ed.input, ed.inputMulti]}
                  value={editForm.description}
                  onChangeText={(t) => setEditForm((prev) => ({ ...prev, description: t }))}
                  placeholder="Hayvanınız hakkında bilgi verin..."
                  placeholderTextColor={`${BODY}60`}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={ed.fieldWrap}>
                <Text style={ed.fieldLabel}>İletişim Bilgisi</Text>
                <TextInput
                  style={ed.input}
                  value={editForm.contactInfo}
                  onChangeText={(t) => setEditForm((prev) => ({ ...prev, contactInfo: t }))}
                  placeholder="Email veya telefon"
                  placeholderTextColor={`${BODY}60`}
                  keyboardType="email-address"
                />
              </View>

              {/* ── Detay Bilgiler chips ── */}
              <View style={[ed.fieldWrap, { marginTop: 4 }]}>
                <Text style={[ed.fieldLabel, { fontSize: 14, marginBottom: 12 }]}>Detay Bilgiler</Text>
                {([
                  { key: "healthStatus"       as const, label: "Sağlık Durumu",   opts: PET_DETAIL_OPTIONS.healthStatus       },
                  { key: "vaccinationStatus"  as const, label: "Aşı",             opts: PET_DETAIL_OPTIONS.vaccinationStatus  },
                  { key: "environmentType"    as const, label: "İç/Dış Mekan",    opts: PET_DETAIL_OPTIONS.environmentType    },
                  { key: "childCompatibility" as const, label: "Çocuk Uyumu",     opts: PET_DETAIL_OPTIONS.childCompatibility },
                  { key: "catCompatibility"   as const, label: "Kedi Uyumu",      opts: PET_DETAIL_OPTIONS.catCompatibility   },
                  { key: "dogCompatibility"   as const, label: "Köpek Uyumu",     opts: PET_DETAIL_OPTIONS.dogCompatibility   },
                  { key: "toiletTraining"     as const, label: "Tuvalet Eğitimi", opts: PET_DETAIL_OPTIONS.toiletTraining     },
                ] as const).map(({ key, label, opts }) => (
                  <View key={key} style={{ marginBottom: 12 }}>
                    <Text style={[ed.fieldLabel, { marginBottom: 7, fontSize: 12, color: BODY }]}>{label}</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {(opts as readonly DetailOption[]).map((opt) => {
                        const active = editForm[key] === opt.value;
                        return (
                          <Pressable
                            key={opt.value}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setEditForm((prev) => ({ ...prev, [key]: opt.value }));
                            }}
                            style={({ pressed }) => [{
                              flexDirection: "row" as const,
                              alignItems: "center" as const,
                              gap: 4,
                              borderWidth: 1.5,
                              borderRadius: 50,
                              paddingVertical: 6,
                              paddingHorizontal: 11,
                              borderColor: active ? P : `${BODY}30`,
                              backgroundColor: active ? `${P}14` : "transparent",
                              opacity: pressed ? 0.8 : 1,
                            }]}
                          >
                            {active && <Icon name="checkmark" size={11} color={P} />}
                            <Text style={{ fontSize: 12, fontFamily: active ? "Inter_700Bold" : "Inter_400Regular", color: active ? P : BODY }}>
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={ed.footer}>
              <Pressable
                style={({ pressed }) => [ed.cancelBtn, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => setEditTarget(null)}
              >
                <Text style={ed.cancelTxt}>Vazgeç</Text>
              </Pressable>
              <Pressable
                style={[ed.saveBtn, { flex: 2, opacity: saving ? 0.7 : 1 }]}
                onPress={saveEdit}
                disabled={saving}
              >
                <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ed.saveGrad}>
                  <Icon name={saving ? "sync-outline" : "checkmark-circle-outline"} size={16} color={WHITE} />
                  <Text style={ed.saveTxt}>{saving ? "Kaydediliyor..." : "Kaydet"}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>

    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 24 }}>

      {/* ── Section header ── */}
      <View style={ml.secHeader}>
        <Text style={[ml.secTitle, { color: T.text }]}>İlanlarım</Text>
        <Text style={[ml.secSub, { color: T.textMuted }]}>Verdiğin ilanları yönet, performansını takip et</Text>
      </View>

      {/* ── Filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ml.filterList}
        style={ml.filterScroll}
      >
        {MY_FILTERS.map((f) => {
          const isA = myFilter === f.key;
          return isA ? (
            <LinearGradient key={f.key} colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ml.filterChipActive}>
              <Text style={ml.filterLblActive}>{f.label}</Text>
            </LinearGradient>
          ) : (
            <Pressable
              key={f.key}
              style={[ml.filterChip, { backgroundColor: T.card, borderColor: T.border }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMyFilter(f.key); }}
            >
              <Text style={[ml.filterLbl, { color: T.textMuted }]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── No listings at all ── */}
      {myListings.length === 0 && (
        <View style={ml.emptyWrap}>
          <View style={ml.emptyIllo}>
            <Icon name="list-outline" size={40} color={`${P}70`} />
          </View>
          <Text style={[ml.emptyTitle, { color: T.text }]}>Henüz İlan Yok</Text>
          <Text style={[ml.emptySub, { color: T.textMuted }]}>
            İlk sahiplendirme ilanını oluşturarak{"\n"}patili dostuna yeni bir yuva bul.
          </Text>
          <Pressable
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: 8 }]}
            onPress={onAdd}
          >
            <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ml.addBtn}>
              <Icon name="add-circle-outline" size={15} color={WHITE} />
              <Text style={ml.addBtnTxt}>İlan Oluştur</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {/* ── Filter empty state ── */}
      {myListings.length > 0 && visible.length === 0 && (
        <View style={ml.emptyFilter}>
          <Icon name="filter-outline" size={32} color={`${P}50`} />
          <Text style={ml.emptyFilterTxt}>Bu filtrede ilan yok</Text>
        </View>
      )}

      {/* ── Listing cards ── */}
      {visible.map((c) => (
        <MyListingCard
          key={c.listing.id}
          card={c}
          isFeatured={boostStatuses[c.listing.id]?.isFeatured ?? false}
          featuredUntil={boostStatuses[c.listing.id]?.expiresAt ?? null}
          packages={packages}
          onEdit={() => openEdit(c.listing)}
          onTogglePassive={() => togglePassive(c.listing.id)}
          onAdopted={() => handleAdopted(c.listing.id, c.listing.petName)}
          onPreview={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({ pathname: "/adoption/[id]", params: { id: c.listing.id, preview: "true" } } as any);
          }}
          onDelete={() => handleDelete(c.listing)}
          onBoost={(pkg) => handleBoost(c.listing.id, c.listing.petName, pkg)}
        />
      ))}
    </ScrollView>
    </>
  );
}

const ml = StyleSheet.create({
  // Outer wrapper
  cardOuter: { marginHorizontal: 20, marginBottom: 20 },

  // Main listing card
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    ...CARD_SHADOW,
  },
  cardFeatured: { borderColor: P, borderWidth: 2 },

  // Status row — sits above the hero image
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },

  featBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 10, overflow: "hidden",
    paddingHorizontal: 10, paddingVertical: 6,
  },
  featBadgeTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: WHITE },

  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
  },
  statusTxt: { fontSize: 12, fontFamily: "Inter_700Bold" },

  agePill: {
    backgroundColor: "rgba(100,100,120,0.12)",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
  },
  ageTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: BODY },

  // Hero photo — 16:9, rounded corners inside card
  heroWrap: {
    marginHorizontal: 12,
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: "hidden",
  },
  heroImg:      { width: "100%", height: "100%" },
  heroFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroNoPhotoOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(0,0,0,0.42)", paddingHorizontal: 12, paddingVertical: 7,
  },
  heroNoPhotoTxt: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)" },

  // Content area
  content: { padding: 14, gap: 10 },

  // Featured banner inside content
  featuredBannerInner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: `${P}0A`, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: `${P}20`,
  },
  featuredBannerTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: P, flex: 1 },
  featuredTimeChip:  { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: `${P}14`, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  featuredTimeTxt:   { fontSize: 10, fontFamily: "Inter_600SemiBold", color: P },

  petName: { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.3, lineHeight: 23 },

  locRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: BODY },
  timeTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: `${BODY}80` },

  statsBar:      { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  statChip:      { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${P}0D`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statChipHeart: { backgroundColor: "rgba(220,38,38,0.07)" },
  statChipMsg:   { backgroundColor: "rgba(0,112,243,0.07)" },
  statChipTxt:   { fontSize: 12, fontFamily: "Inter_600SemiBold", color: P },

  perfBtn:    { flexDirection: "row", alignItems: "center", gap: 3, marginLeft: "auto" as any, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: `${BODY}0D`, borderRadius: 20 },
  perfBtnTxt: { fontSize: 11, fontFamily: "Inter_500Medium", color: BODY },

  perfPanel:      { backgroundColor: `${P}07`, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: `${P}12` },
  perfPanelTitle: { fontSize: 10, fontFamily: "Inter_700Bold", color: P, marginBottom: 10, letterSpacing: 0.8 },
  perfRow:        { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  perfItem:       { alignItems: "center", gap: 4 },
  perfDivV:       { width: 1, height: 40, backgroundColor: `${P}18` },
  perfVal:        { fontSize: 18, fontFamily: "Inter_700Bold", color: DARK },
  perfLbl:        { fontSize: 10, fontFamily: "Inter_400Regular", color: BODY },

  divider: { height: 1, backgroundColor: `${P}08` },

  adoptedBanner:    { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: `${P}07`, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: `${P}18` },
  adoptedBannerTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: P, lineHeight: 17 },

  // ── Promote banner — inside card ──
  promoteBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: `${P}08`,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${P}1A`,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
    flexWrap: "wrap",
  },
  promoteLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 160 },
  rocketCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: `${P}12`,
    alignItems: "center", justifyContent: "center",
  },
  promoteTextWrap: { flex: 1 },
  promoteTitle:    { fontSize: 13, fontFamily: "Inter_700Bold", color: DARK },
  promoteSub:      { fontSize: 11, fontFamily: "Inter_400Regular", color: BODY, marginTop: 1, lineHeight: 15 },
  promoteBtnGrad: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 14,
  },
  promoteBtnTxt: { fontSize: 13, fontFamily: "Inter_700Bold", color: WHITE },

  // Expanded package section (inside card)
  pkgSection: { gap: 10 },
  pkgEmpty:    { alignItems: "center", gap: 6, paddingVertical: 20 },
  pkgEmptyTxt: { fontSize: 13, color: `${P}80`, fontStyle: "italic" },

  // Package cards
  pkgRow:     { flexDirection: "row", gap: 8 },
  pkgCard:    { flex: 1, borderRadius: 14, padding: 10, alignItems: "center", gap: 2 },
  pkgCardSel: {
    backgroundColor: P, borderWidth: 2, borderColor: P,
    ...Platform.select({
      ios:     { shadowColor: P, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 10 },
      android: { elevation: 5 },
      default: {},
    }),
  },
  pkgIdle: {
    backgroundColor: WHITE, borderWidth: 1.5, borderColor: `${P}22`,
    ...Platform.select({
      ios:     { shadowColor: P, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  pkgPop: { borderColor: P, borderWidth: 2 },

  popBadge:    { backgroundColor: P, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2 },
  popBadgeTxt: { fontSize: 9, fontFamily: "Inter_700Bold", color: WHITE },

  pkgName:    { fontSize: 11, fontFamily: "Inter_700Bold",    color: DARK },
  pkgPrice:   { fontSize: 17, fontFamily: "Inter_700Bold",    color: DARK },
  pkgDays:    { fontSize: 10, fontFamily: "Inter_400Regular", color: BODY },
  pkgMult:    { fontSize: 9,  fontFamily: "Inter_400Regular", color: BODY, textAlign: "center" },
  pkgNameSel: { color: WHITE },
  pkgPriceSel:{ color: WHITE },
  pkgDaysSel: { color: "rgba(255,255,255,0.80)" },
  pkgMultSel: { color: "rgba(255,255,255,0.70)" },

  // Summary row above CTA
  boostSummary:      { backgroundColor: `${P}08`, borderRadius: 12, padding: 12, gap: 3, borderWidth: 1, borderColor: `${P}18` },
  boostSummaryPkg:   { fontSize: 12, fontFamily: "Inter_600SemiBold", color: P },
  boostSummaryPrice: { fontSize: 14, fontFamily: "Inter_700Bold",    color: DARK },

  // CTA button
  boostCta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    height: 44, borderRadius: 12, backgroundColor: P,
    ...Platform.select({
      ios:     { shadowColor: P, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  boostCtaDisabled: { backgroundColor: `${BODY}30` },
  boostCtaTxt:      { fontSize: 14, fontFamily: "Inter_700Bold", color: WHITE },
  boostNote:        { fontSize: 11, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center", lineHeight: 15 },

  // Action buttons — 44px height
  actions:    { flexDirection: "row", alignItems: "center", gap: 8 },
  btn:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44, borderRadius: 12, borderWidth: 1 },
  btnEdit:    { backgroundColor: `${P}08`,       borderColor: `${P}28`       },
  btnPreview: { backgroundColor: `${BODY}06`,    borderColor: `${BODY}22`    },
  btnDel:     { backgroundColor: "#FEE2E218",    borderColor: "#DC262630"    },
  btnMenu:    { flex: 0, width: 40, borderWidth: 0, backgroundColor: "transparent" },
  btnMenuSep: { width: 1, height: 28, backgroundColor: `${BODY}20` },
  btnTxt:     { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Section header
  secHeader: { paddingHorizontal: 20, marginBottom: 16, paddingTop: 4 },
  secTitle:  { fontSize: 22, fontFamily: "Inter_700Bold",    color: DARK, letterSpacing: -0.4 },
  secSub:    { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, marginTop: 2 },
  addBtn:    { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 50 },
  addBtnTxt: { fontSize: 13, fontFamily: "Inter_700Bold", color: WHITE },

  // Filters
  filterScroll:     { marginBottom: 14 },
  filterList:       { paddingHorizontal: 20, gap: 8, paddingVertical: 4, paddingRight: 24 },
  filterChip:       {
    paddingVertical: 9, paddingHorizontal: 18, borderRadius: 20,
    backgroundColor: WHITE, borderWidth: 1.5, borderColor: `${P}22`,
    ...Platform.select({
      ios:     { shadowColor: P, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  filterChipActive: {
    paddingVertical: 9, paddingHorizontal: 18, borderRadius: 20,
    ...Platform.select({
      ios:     { shadowColor: P, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  filterLbl:       { fontSize: 13, fontFamily: "Inter_600SemiBold", color: BODY  },
  filterLblActive: { fontSize: 13, fontFamily: "Inter_700Bold",    color: WHITE },

  // Empty states
  emptyWrap:      { alignItems: "center", paddingTop: 48, paddingHorizontal: 40, gap: 10 },
  emptyIllo:      { width: 74, height: 74, borderRadius: 37, backgroundColor: `${P}12`, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  emptyTitle:     { fontSize: 18, fontFamily: "Inter_700Bold",    color: DARK },
  emptySub:       { fontSize: 13, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center", lineHeight: 20 },
  emptyFilter:    { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyFilterTxt: { fontSize: 14, fontFamily: "Inter_400Regular", color: BODY },
});

// ── Edit modal styles ─────────────────────────────────────────────────────────
const ed = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: "rgba(20,8,46,0.55)", justifyContent: "flex-end" },
  sheet:      {
    backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 22, paddingBottom: 32, maxHeight: "92%",
    ...Platform.select({
      ios:     { shadowColor: DARK, shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.18, shadowRadius: 24 },
      android: { elevation: 16 },
      default: {},
    }),
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  sheetTitle:  { fontSize: 18, fontFamily: "Inter_700Bold",    color: DARK, letterSpacing: -0.3 },
  sheetSub:    { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, marginTop: 2 },
  closeBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: `${BODY}12`, alignItems: "center", justifyContent: "center" },

  photoRow:   { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: `${P}07`, borderRadius: 14, padding: 12 },
  photoThumb: { width: 52, height: 52, borderRadius: 10 },

  fieldWrap:  { gap: 5 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: 0.3 },
  fieldHint:  { fontSize: 11, fontFamily: "Inter_400Regular", color: BODY, lineHeight: 16 },
  input: {
    backgroundColor: BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontFamily: "Inter_400Regular", color: DARK,
    borderWidth: 1.5, borderColor: `${P}18`,
  },
  inputMulti: { minHeight: 90, textAlignVertical: "top" },

  footer:    { flexDirection: "row", gap: 10, marginTop: 18 },
  cancelBtn: { flex: 1, backgroundColor: `${BODY}10`, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingVertical: 14 },
  cancelTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: BODY },
  saveBtn:   { borderRadius: 16, overflow: "hidden" },
  saveGrad:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 14, paddingHorizontal: 20 },
  saveTxt:   { fontSize: 14, fontFamily: "Inter_700Bold", color: WHITE },
});

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PetsScreen() {
  const T             = useTheme();
  const insets        = useSafeAreaInsets();
  const { width: SW } = useWindowDimensions();
  const { listings } = useAdoption();
  const { boostStatuses }           = useBoost();
  const [mainTab, setMainTab]       = useState<MainTab>("adoption");
  const [filter, setFilter]         = useState<Filter>("all");
  const [query, setQuery]           = useState("");
  const [advFilters, setAdvFilters] = useState<AdoptionFilters>(DEFAULT_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const topPad = Platform.OS === "web" ? (SW < 1024 ? 54 : 16) : insets.top;
  const botPad = Platform.OS === "web" ? (SW < 1024 ? 100 : 24) : (insets.bottom + TAB_H);

  /* Unique breeds & cities extracted from listings for the filter sheet */
  const { availableBreeds, availableCities } = useMemo(() => {
    const breedSet = new Set<string>();
    const citySet  = new Set<string>();
    for (const l of listings) {
      if (l.breed?.trim()) breedSet.add(l.breed.trim());
      const city = extractCity(l.location);
      if (city) citySet.add(city);
    }
    return {
      availableBreeds: Array.from(breedSet).sort(),
      availableCities: Array.from(citySet).sort(),
    };
  }, [listings]);

  const sorted = useMemo(() => {
    return [...listings].sort((a, b) => {
      const af = boostStatuses[a.id]?.isFeatured ? 1 : 0;
      const bf = boostStatuses[b.id]?.isFeatured ? 1 : 0;
      if (bf !== af) return bf - af;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [listings, boostStatuses]);

  const activeBadgeCount = countActiveFilters(advFilters);

  return (
    <View style={[s.root, { backgroundColor: T.bg }]}>
      <View style={[s.stickyTop, { backgroundColor: T.bg }]}>
        <PetHeader
          topPad={topPad}
          mainTab={mainTab}
          onChange={(t) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMainTab(t); }}
        />
        {mainTab === "evcilim" && <OuterTabSwitcher active={mainTab} onChange={() => {}} />}
      </View>

      {mainTab === "evcilim" && <EvcilimTab botPad={botPad} />}

      {mainTab === "adoption" && (
        <AdoptionLandingSection
          listings={sorted}
          boostStatuses={boostStatuses}
          filter={filter}
          setFilter={setFilter}
          query={query}
          setQuery={setQuery}
          advFilters={advFilters}
          activeBadgeCount={activeBadgeCount}
          onFilterPress={() => setFilterSheetOpen(true)}
          botPad={botPad}
        />
      )}

      <AdoptionFilterSheet
        visible={filterSheetOpen}
        activeFilters={advFilters}
        breeds={availableBreeds}
        cities={availableCities}
        onApply={(f) => setAdvFilters(f)}
        onClose={() => setFilterSheetOpen(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: "#F7F7F7" },
  stickyTop:    { backgroundColor: WHITE },
  listingShell: { flex: 1 },
  empty:      { alignItems: "center", paddingTop: 52, paddingHorizontal: 40, gap: 8 },
  emptyIllo:  { width: 74, height: 74, borderRadius: 37, backgroundColor: `${P}12`, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK },
  emptySub:   { fontSize: 13, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center", lineHeight: 20 },
  emptyBtn:   { marginTop: 14, borderRadius: 50, overflow: "hidden" },
  emptyBtnGrad: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 12, paddingHorizontal: 26 },
  emptyBtnTxt:{ fontSize: 13, fontFamily: "Inter_700Bold", color: WHITE },
});
