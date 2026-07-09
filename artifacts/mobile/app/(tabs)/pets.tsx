import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { useBoost } from "@/contexts/BoostContext";
import { formatTimeAgo } from "@/utils/formatters";

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

const FILTERS: { key: Filter; label: string; emoji: string }[] = [
  { key: "all",    label: "Tümü",   emoji: "✨" },
  { key: "cat",    label: "Kedi",   emoji: "🐱" },
  { key: "dog",    label: "Köpek",  emoji: "🐶" },
  { key: "bird",   label: "Kuş",    emoji: "🐦" },
  { key: "rabbit", label: "Tavşan", emoji: "🐰" },
  { key: "new",    label: "Yeni",   emoji: "🆕" },
  { key: "other",  label: "Diğer",  emoji: "🐾" },
];

const TIPS = [
  "Hayvanın yaşı, karakteri ve sağlık durumunu belirt",
  "Net ve aydınlık fotoğraflar ekle — ilanını öne çıkarır",
  "Sahiplenecek kişiyle yüz yüze görüşmeyi tercih et",
];

// ── Header ────────────────────────────────────────────────────────────────────
function PetHeader({ topPad }: { topPad: number }) {
  return (
    <View style={[hdr.wrap, { paddingTop: topPad + 8 }]}>
      <View style={hdr.logoRow}>
        <LinearGradient colors={[P2, P, DARK]} style={hdr.logoIcon}>
          <Ionicons name="heart" size={14} color={WHITE} />
        </LinearGradient>
        <View>
          <Text style={hdr.logoTxt}>canyoldaşı</Text>
          <Text style={hdr.logoSub}>Sahiplendirme İlanları</Text>
        </View>
      </View>
      <Pressable style={hdr.bell} hitSlop={8}>
        <Ionicons name="notifications-outline" size={19} color={DARK} />
        <View style={hdr.badge} />
      </Pressable>
    </View>
  );
}
const hdr = StyleSheet.create({
  wrap:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, backgroundColor: BG },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoIcon:{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logoTxt: { fontSize: 16, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.3 },
  logoSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: BODY, marginTop: 1 },
  bell:    { width: 40, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: WHITE, borderRadius: 20, borderWidth: 1, borderColor: BORDER, ...IOS_SHADOW },
  badge:   { position: "absolute", top: 7, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF4444", borderWidth: 1.5, borderColor: BG },
});

// ── Tab switcher (3-segment) ──────────────────────────────────────────────────
const TAB_DEFS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "create",     label: "İlan Oluştur", icon: "add-circle-outline" },
  { key: "mylistings", label: "İlanlarım",    icon: "list-outline"       },
  { key: "listings",   label: "Tüm İlanlar",  icon: "heart-outline"      },
];

function TabSwitcher({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <View style={tsw.wrap}>
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
                <Ionicons name={t.icon} size={13} color={WHITE} />
                <Text style={tsw.lblActive} numberOfLines={1}>{t.label}</Text>
              </LinearGradient>
            ) : (
              <View style={tsw.inactiveRow}>
                <Ionicons name={t.icon} size={13} color={P} />
                <Text style={tsw.lblInactive} numberOfLines={1}>{t.label}</Text>
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
function SearchBar({ query, onQuery, onFilter }: { query: string; onQuery: (q: string) => void; onFilter: () => void }) {
  return (
    <View style={sb.wrap}>
      <View style={sb.inputWrap}>
        <Ionicons name="search-outline" size={16} color={`${BODY}90`} />
        <TextInput
          style={sb.input}
          placeholder="Kedi, köpek, kuş ara..."
          placeholderTextColor={`${BODY}70`}
          value={query}
          onChangeText={onQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => onQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={`${BODY}80`} />
          </Pressable>
        )}
      </View>
      <Pressable
        style={sb.filterBtn}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onFilter(); }}
      >
        <LinearGradient colors={[P2, P]} style={sb.filterGrad}>
          <Ionicons name="options-outline" size={17} color={WHITE} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}
const sb = StyleSheet.create({
  wrap:      { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, marginBottom: 12 },
  inputWrap: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: WHITE, borderRadius: 14, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: BORDER, gap: 8, ...IOS_SHADOW },
  input:     { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: DARK, height: 44 },
  filterBtn: { borderRadius: 12, overflow: "hidden" },
  filterGrad:{ width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});

// ── Filter chips (horizontal FlatList, fixed-width, Instagram style) ──────────
const CHIP_W = 86;
const CHIP_H = 40;
const CHIP_GAP = 8;

function FilterRow({ active, onChange }: { active: Filter; onChange: (f: Filter) => void }) {
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
                <Text style={fc.emoji}>{f.emoji}</Text>
                <Text style={fc.lblActive}>{f.label}</Text>
              </LinearGradient>
            ) : (
              <View style={[fc.chip, fc.chipInactive]}>
                <Text style={fc.emoji}>{f.emoji}</Text>
                <Text style={fc.lbl}>{f.label}</Text>
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
  const router = useRouter();
  const [liked, setLiked] = useState(false);

  return (
    <Pressable
      style={({ pressed }) => [lc.shadow, { opacity: pressed ? 0.94 : 1 }]}
      onPress={() => router.push(`/adoption/${listing.id}`)}
    >
      <View style={[lc.card, isFeatured && lc.featuredBorder]}>

        {/* ── Photo ── */}
        <View style={lc.imgWrap}>
          {listing.photo ? (
            <Image
              source={{ uri: listing.photo }}
              style={lc.img}
              contentFit="cover"
              contentPosition={{ top: 0.3 }}
            />
          ) : (
            <LinearGradient colors={[`${P2}40`, `${P}28`]} style={lc.imgFallback}>
              <Ionicons name="paw" size={34} color={`${P}60`} />
            </LinearGradient>
          )}

          <LinearGradient
            colors={["transparent", "rgba(26,8,56,0.38)"]}
            style={lc.imgScrim}
            pointerEvents="none"
          />

          {isFeatured && (
            <LinearGradient colors={[P2, DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={lc.featuredBadge}>
              <Ionicons name="star" size={9} color={WHITE} />
              <Text style={lc.featuredTxt}>⭐ ÖNE ÇIKAN</Text>
            </LinearGradient>
          )}

          <View style={lc.typeTag}>
            <Text style={lc.typeTagTxt}>{listing.petType}</Text>
          </View>

          <Pressable
            style={lc.heartBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              setLiked((v) => !v);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            hitSlop={8}
          >
            <Ionicons name={liked ? "heart" : "heart-outline"} size={16} color={liked ? "#FF4466" : WHITE} />
          </Pressable>
        </View>

        {/* ── Content ── */}
        <View style={lc.body}>
          <View style={lc.nameRow}>
            <Text style={lc.name} numberOfLines={1}>{listing.petName}</Text>
            {listing.petAge ? (
              <View style={lc.agePill}>
                <Text style={lc.ageTxt}>{listing.petAge}</Text>
              </View>
            ) : null}
          </View>

          {listing.description ? (
            <Text style={lc.desc} numberOfLines={1}>{listing.description}</Text>
          ) : null}

          <View style={lc.footer}>
            <View style={lc.locRow}>
              <Ionicons name="location-sharp" size={11} color={P} />
              <Text style={lc.loc} numberOfLines={1}>{listing.location}</Text>
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

// ── Listings header ───────────────────────────────────────────────────────────
function ListingsHeader({ count, filter }: { count: number; filter: Filter }) {
  const label = filter === "all" ? "Tüm İlanlar" : FILTERS.find((f) => f.key === filter)?.label ?? "";
  return (
    <View style={lh.wrap}>
      <Text style={lh.title}>{label}</Text>
      <View style={lh.pill}>
        <Text style={lh.count}>{count} ilan</Text>
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
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: botPad + 16, gap: 12 }}
    >
      {/* Hero card */}
      <View style={cr.heroCardShadow}>
        <View style={cr.heroCard}>
          <View style={cr.heroLeft}>
            <LinearGradient colors={[`${P}22`, `${P2}14`]} style={cr.heroIconCircle}>
              <Ionicons name="heart" size={22} color={P} />
            </LinearGradient>
            <Text style={cr.heroTitle}>Evcil hayvanını{"\n"}sahiplendirme ilanına ekle</Text>
            <Text style={cr.heroSub}>Fotoğraf, açıklama ve konum{"\n"}ekleyerek ilan oluştur</Text>
            <Pressable
              style={({ pressed }) => [cr.ctaBtn, { opacity: pressed ? 0.88 : 1 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
            >
              <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={cr.ctaGrad}>
                <Ionicons name="add-circle-outline" size={15} color={WHITE} />
                <Text style={cr.ctaTxt}>İlan Oluştur</Text>
              </LinearGradient>
            </Pressable>
          </View>
          <View style={cr.heroRight}>
            <Image source={DOG_IMG} style={cr.dogImg} contentFit="contain" />
          </View>
        </View>
      </View>

      {/* Tips */}
      <View style={cr.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Ionicons name="information-circle-outline" size={16} color={P} />
          <Text style={cr.tipsTitle}>İlan verirken dikkat et</Text>
        </View>
        {TIPS.map((tip, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: i < TIPS.length - 1 ? 10 : 0 }}>
            <View style={cr.dot} />
            <Text style={cr.tipTxt}>{tip}</Text>
          </View>
        ))}
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {([
          { icon: "paw"    as const, val: "2.4K+", lbl: "Aktif İlan" },
          { icon: "heart"  as const, val: "800+",  lbl: "Sahiplendirilen" },
          { icon: "people" as const, val: "12K+",  lbl: "Hayvan Dostu" },
        ] as const).map((stat) => (
          <View key={stat.lbl} style={cr.statCard}>
            <LinearGradient colors={[`${P}18`, `${P2}10`]} style={cr.statIconWrap}>
              <Ionicons name={stat.icon} size={18} color={P} />
            </LinearGradient>
            <Text style={cr.statVal}>{stat.val}</Text>
            <Text style={cr.statLbl}>{stat.lbl}</Text>
          </View>
        ))}
      </View>

      {/* Safety banner */}
      <LinearGradient
        colors={[P2, P, DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={cr.banner}
      >
        <View style={cr.bannerIconWrap}>
          <Ionicons name="shield-checkmark" size={22} color={WHITE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cr.bannerTitle}>Güvenli Sahiplendirme</Text>
          <Text style={cr.bannerSub}>Doğrulanmış kullanıcılar ve güvenli iletişim ile patili dostlarımızı doğru yuvalara götürüyoruz.</Text>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}
const cr = StyleSheet.create({
  card:           { backgroundColor: WHITE, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 16, ...IOS_SHADOW },
  heroCardShadow: { borderRadius: 20, ...CARD_SHADOW },
  heroCard:       { backgroundColor: WHITE, borderRadius: 20, borderWidth: 1, borderColor: BORDER, flexDirection: "row", overflow: "hidden" },
  heroLeft:       { flex: 1, padding: 16, gap: 8, justifyContent: "center" },
  heroIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  heroTitle:      { fontSize: 14, fontFamily: "Inter_700Bold", color: DARK, lineHeight: 21 },
  heroSub:        { fontSize: 11, fontFamily: "Inter_400Regular", color: BODY, lineHeight: 17 },
  ctaBtn:         { borderRadius: 50, overflow: "hidden", marginTop: 4 },
  ctaGrad:        { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 14, justifyContent: "center" },
  ctaTxt:         { fontSize: 12, fontFamily: "Inter_700Bold", color: WHITE },
  heroRight:      { width: 120 },
  dogImg:         { width: "100%", height: 185 },
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

const STATUS_CFG: Record<ListStatus, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  "Aktif":           { color: "#18A558", bg: "#E6F7EE",    icon: "checkmark-circle"     },
  "Onay Bekliyor":   { color: "#D97706", bg: "#FEF3C7",    icon: "time-outline"         },
  "Pasif":           { color: BODY,      bg: `${BODY}14`,  icon: "pause-circle-outline" },
  "Sahiplendirildi": { color: P,         bg: `${P}14`,     icon: "heart-circle"         },
  "Süresi Doldu":    { color: "#DC2626", bg: "#FEE2E2",    icon: "close-circle-outline" },
};

const BOOST_PKGS = [
  { id: "standart", label: "Standart", price: "49",  daysLabel: "24 saat", popular: false },
  { id: "premium",  label: "Premium",  price: "99",  daysLabel: "7 gün",   popular: true  },
  { id: "vip",      label: "VIP",      price: "199", daysLabel: "30 gün",  popular: false },
] as const;

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
  onBoost,
  isFeatured,
  featuredUntil,
}: {
  card: MyCard;
  onEdit: () => void;
  onTogglePassive: () => void;
  onAdopted: () => void;
  onPreview: () => void;
  onDelete: () => void;
  onBoost: (packageId: string) => Promise<void>;
  isFeatured?: boolean;
  featuredUntil?: string | null;
}) {
  const { listing, status, views, favs, msgs } = card;
  const cfg = STATUS_CFG[status];
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [boosting, setBoosting] = useState(false);
  const [perfOpen, setPerfOpen] = useState(false);

  const isAdopted  = status === "Sahiplendirildi";
  const canBoost   = status === "Aktif" && !isFeatured;
  const canPassive = status === "Aktif" || status === "Pasif";

  return (
    <View style={ml.cardOuter}>

      {/* ── Main card ── */}
      <View style={[ml.card, isFeatured && ml.cardFeatured]}>

        {/* Hero photo */}
        <View style={ml.heroWrap}>
          {listing.photo ? (
            <Image
              source={{ uri: listing.photo }}
              style={ml.heroImg}
              contentFit="cover"
              contentPosition={{ top: 0.3 }}
            />
          ) : (
            <LinearGradient colors={[`${P2}50`, `${P}30`]} style={ml.heroFallback}>
              <Ionicons name="paw" size={48} color={`${P}60`} />
            </LinearGradient>
          )}

          <LinearGradient
            colors={["transparent", "rgba(26,8,56,0.65)"]}
            style={ml.heroScrim}
            pointerEvents="none"
          />

          {isFeatured && (
            <LinearGradient colors={[P2, DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ml.featBadge}>
              <Ionicons name="star" size={10} color={WHITE} />
              <Text style={ml.featBadgeTxt}>⭐ ÖNE ÇIKAN</Text>
            </LinearGradient>
          )}

          <View style={[ml.statusBadge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={11} color={cfg.color} />
            <Text style={[ml.statusTxt, { color: cfg.color }]}>{status}</Text>
          </View>

          <View style={ml.typePill}>
            <Text style={ml.typePillTxt}>{listing.petType}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={ml.content}>

          <View style={ml.nameRow}>
            <Text style={ml.petName} numberOfLines={1}>{listing.petName}</Text>
            {listing.petAge ? (
              <View style={ml.agePill}>
                <Text style={ml.ageTxt}>{listing.petAge}</Text>
              </View>
            ) : null}
          </View>

          <View style={ml.locRow}>
            <Ionicons name="location-sharp" size={12} color={P} />
            <Text style={ml.locTxt} numberOfLines={1}>{listing.location}</Text>
            <Text style={ml.timeTxt}>{formatTimeAgo(listing.createdAt)}</Text>
          </View>

          {/* Stats bar */}
          <View style={ml.statsBar}>
            <View style={ml.statChip}>
              <Ionicons name="eye-outline" size={12} color={P} />
              <Text style={ml.statChipTxt}>{views}</Text>
            </View>
            <View style={[ml.statChip, ml.statChipHeart]}>
              <Ionicons name="heart-outline" size={12} color="#DC2626" />
              <Text style={[ml.statChipTxt, { color: "#DC2626" }]}>{favs}</Text>
            </View>
            <View style={[ml.statChip, ml.statChipMsg]}>
              <Ionicons name="chatbubble-outline" size={12} color="#0070F3" />
              <Text style={[ml.statChipTxt, { color: "#0070F3" }]}>{msgs}</Text>
            </View>
            <Pressable
              style={ml.perfBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPerfOpen((v) => !v); }}
            >
              <Ionicons name={perfOpen ? "chevron-up" : "bar-chart-outline"} size={12} color={BODY} />
              <Text style={ml.perfBtnTxt}>Performans</Text>
            </Pressable>
          </View>

          {/* ── Performance panel ── */}
          {perfOpen && (
            <View style={ml.perfPanel}>
              <Text style={ml.perfPanelTitle}>Son 7 Gün</Text>
              <View style={ml.perfRow}>
                <View style={ml.perfItem}>
                  <Ionicons name="eye" size={16} color={P} />
                  <Text style={ml.perfVal}>{views}</Text>
                  <Text style={ml.perfLbl}>Görüntülenme</Text>
                </View>
                <View style={ml.perfDivV} />
                <View style={ml.perfItem}>
                  <Ionicons name="heart" size={16} color="#DC2626" />
                  <Text style={[ml.perfVal, { color: "#DC2626" }]}>{favs}</Text>
                  <Text style={ml.perfLbl}>Favori</Text>
                </View>
                <View style={ml.perfDivV} />
                <View style={ml.perfItem}>
                  <Ionicons name="chatbubble" size={16} color="#0070F3" />
                  <Text style={[ml.perfVal, { color: "#0070F3" }]}>{msgs}</Text>
                  <Text style={ml.perfLbl}>Mesaj</Text>
                </View>
              </View>
            </View>
          )}

          <View style={ml.divider} />

          {/* ── Action row 1: Düzenle | Önizle | Pasife Al ── */}
          <View style={ml.actions}>
            <Pressable
              style={({ pressed }) => [ml.btn, ml.btnEdit, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onEdit(); }}
            >
              <Ionicons name="create-outline" size={13} color={P} />
              <Text style={[ml.btnTxt, { color: P }]}>Düzenle</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [ml.btn, ml.btnPreview, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPreview(); }}
            >
              <Ionicons name="eye-outline" size={13} color={BODY} />
              <Text style={[ml.btnTxt, { color: BODY }]}>Önizle</Text>
            </Pressable>

            {canPassive && (
              <Pressable
                style={({ pressed }) => [ml.btn, ml.btnPassive, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onTogglePassive(); }}
              >
                <Ionicons
                  name={status === "Pasif" ? "play-circle-outline" : "pause-circle-outline"}
                  size={13}
                  color={BODY}
                />
                <Text style={[ml.btnTxt, { color: BODY }]}>
                  {status === "Pasif" ? "Aktif Et" : "Pasife Al"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* ── Action row 2: Sahiplendirildi + Sil ── */}
          {!isAdopted && (
            <View style={ml.actions}>
              <Pressable
                style={({ pressed }) => [ml.btn, ml.btnAdopted, { flex: 2, opacity: pressed ? 0.8 : 1 }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onAdopted(); }}
              >
                <Ionicons name="heart-circle-outline" size={13} color="#18A558" />
                <Text style={[ml.btnTxt, { color: "#18A558" }]}>Sahiplendirildi 🏠</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [ml.btn, ml.btnDel, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onDelete(); }}
              >
                <Ionicons name="trash-outline" size={13} color="#DC2626" />
                <Text style={[ml.btnTxt, { color: "#DC2626" }]}>Sil</Text>
              </Pressable>
            </View>
          )}

          {isAdopted && (
            <View style={ml.adoptedBanner}>
              <Ionicons name="heart-circle" size={16} color={P} />
              <Text style={ml.adoptedBannerTxt}>Tebrikler! Bu hayvan yeni yuvasını buldu 🏠</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Boost card (active & not featured) ── */}
      {canBoost && (
        <View style={ml.boostCard}>

          <View style={ml.boostHeader}>
            <LinearGradient colors={[P2, DARK]} style={ml.boostIconWrap}>
              <Ionicons name="rocket" size={14} color={WHITE} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={ml.boostTitle}>İlanı Öne Çıkar</Text>
              <Text style={ml.boostSub}>Daha fazla kişiye ulaş, daha hızlı sahiplendir</Text>
            </View>
          </View>

          <View style={ml.pkgRow}>
            {BOOST_PKGS.map((pkg) => {
              const isSel = selectedPkg === pkg.id;
              return (
                <Pressable
                  key={pkg.id}
                  onPress={() => {
                    if (boosting) return;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedPkg(isSel ? null : pkg.id);
                  }}
                  style={{ flex: 1 }}
                >
                  {isSel ? (
                    <LinearGradient
                      colors={[P2, DARK]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={ml.pkgCard}
                    >
                      {pkg.popular && (
                        <View style={ml.popBadge}>
                          <Text style={ml.popBadgeTxt}>Popüler</Text>
                        </View>
                      )}
                      <Text style={ml.pkgNameSel}>{pkg.label}</Text>
                      <Text style={ml.pkgPriceSel}>₺{pkg.price}</Text>
                      <Text style={ml.pkgDaysSel}>{pkg.daysLabel}</Text>
                      <Ionicons name="checkmark-circle" size={16} color={WHITE} style={{ marginTop: 4 }} />
                    </LinearGradient>
                  ) : (
                    <View style={[ml.pkgCard, ml.pkgIdle, pkg.popular && ml.pkgPop]}>
                      {pkg.popular && (
                        <View style={ml.popBadge}>
                          <Text style={ml.popBadgeTxt}>Popüler</Text>
                        </View>
                      )}
                      <Text style={ml.pkgName}>{pkg.label}</Text>
                      <Text style={ml.pkgPrice}>₺{pkg.price}</Text>
                      <Text style={ml.pkgDays}>{pkg.daysLabel}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={async () => {
              if (!selectedPkg || boosting) return;
              setBoosting(true);
              try {
                await onBoost(selectedPkg);
              } catch {
                Alert.alert("Hata", "İlan öne çıkarılamadı. Lütfen tekrar dene.");
              } finally {
                setBoosting(false);
                setSelectedPkg(null);
              }
            }}
            disabled={!selectedPkg || boosting}
            style={ml.boostCta}
          >
            <LinearGradient
              colors={selectedPkg && !boosting ? [P2, DARK] : [`${BODY}50`, `${BODY}70`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={ml.boostCtaGrad}
            >
              <Ionicons name={boosting ? "sync-outline" : "rocket-outline"} size={15} color={WHITE} />
              <Text style={ml.boostCtaTxt}>
                {boosting ? "Aktif Ediliyor..." : selectedPkg ? "Öne Çıkarmaya Başla" : "Paket Seçin"}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {isFeatured && (
        <LinearGradient colors={[`${P}12`, `${P2}08`]} style={ml.featuredBanner}>
          <Ionicons name="star" size={13} color={P} />
          <Text style={ml.featuredBannerTxt}>⭐ ÖNE ÇIKAN · Aktif</Text>
          {featuredUntil && (
            <View style={ml.featuredTimeChip}>
              <Ionicons name="time-outline" size={10} color={P} />
              <Text style={ml.featuredTimeTxt}>{remainingTime(featuredUntil)}</Text>
            </View>
          )}
        </LinearGradient>
      )}
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
  const { activateBoost } = useBoost();
  const { updateListing } = useAdoption();

  // ── Boost success modal ──
  const [successModal, setSuccessModal] = useState<{
    petName: string;
    pkgLabel: string;
    expiresAt: string;
  } | null>(null);

  // ── Edit modal ──
  const [editTarget, setEditTarget] = useState<AdoptionListing | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ petName: "", petType: "", petAge: "", location: "", description: "", contactInfo: "" });
  const [saving, setSaving] = useState(false);

  const openEdit = useCallback((listing: AdoptionListing) => {
    setEditForm({
      petName: listing.petName,
      petType: listing.petType,
      petAge: listing.petAge ?? "",
      location: listing.location,
      description: listing.description,
      contactInfo: listing.contactInfo,
    });
    setEditTarget(listing);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editTarget || saving) return;
    setSaving(true);
    try {
      await updateListing(editTarget.id, {
        petName:     editForm.petName.trim()     || editTarget.petName,
        petType:     editForm.petType.trim()     || editTarget.petType,
        petAge:      editForm.petAge.trim()      || undefined,
        location:    editForm.location.trim()    || editTarget.location,
        description: editForm.description.trim() || editTarget.description,
        contactInfo: editForm.contactInfo.trim() || editTarget.contactInfo,
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
      "Sahiplendirildi 🏠",
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

  const handleBoost = useCallback(async (listingId: string, petName: string, packageId: string) => {
    const pkg = BOOST_PKGS.find((p) => p.id === packageId);
    const result = await activateBoost({ listingId, userEmail, packageId });
    setSuccessModal({ petName, pkgLabel: pkg?.label ?? packageId, expiresAt: result.expiresAt });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [activateBoost, userEmail]);

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
          <Text style={sm.emoji}>🎉</Text>
          <Text style={sm.title}>İlanın Öne Çıkarıldı!</Text>
          <Text style={sm.sub}>İlanın artık daha fazla kullanıcıya gösterilecek</Text>
          {successModal && (
            <View style={sm.infoBox}>
              <View style={sm.infoRow}>
                <LinearGradient colors={[P2, DARK]} style={sm.infoIcon}>
                  <Ionicons name="cube-outline" size={13} color={WHITE} />
                </LinearGradient>
                <Text style={sm.infoTxt}>{successModal.pkgLabel} Paketi · {BOOST_PKGS.find((p) => p.label === successModal.pkgLabel)?.daysLabel ?? ""}</Text>
              </View>
              <View style={sm.infoRow}>
                <LinearGradient colors={[P2, DARK]} style={sm.infoIcon}>
                  <Ionicons name="time-outline" size={13} color={WHITE} />
                </LinearGradient>
                <Text style={sm.infoTxt}>
                  {new Date(successModal.expiresAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} · {new Date(successModal.expiresAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} tarihine kadar aktif
                </Text>
              </View>
            </View>
          )}
          <Pressable onPress={() => setSuccessModal(null)} style={sm.btn}>
            <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sm.btnGrad}>
              <Ionicons name="rocket-outline" size={16} color={WHITE} />
              <Text style={sm.btnTxt}>Harika! 🚀</Text>
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
                <Ionicons name="close" size={20} color={BODY} />
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
                  <Ionicons name={saving ? "sync-outline" : "checkmark-circle-outline"} size={16} color={WHITE} />
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
        <View>
          <Text style={ml.secTitle}>İlanlarım</Text>
          <Text style={ml.secSub}>Verdiğin ilanları yönet, performansını takip et</Text>
        </View>
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onAdd(); }}
        >
          <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ml.addBtn}>
            <Ionicons name="add" size={16} color={WHITE} />
            <Text style={ml.addBtnTxt}>Yeni İlan</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* ── Stat cards — 2 column × 3 row grid ── */}
      <View style={ml.statsGrid}>
        {([
          { label: "Toplam İlan",    val: myListings.length, icon: "list"             as const },
          { label: "Aktif İlan",     val: activeCount,        icon: "checkmark-circle" as const },
          { label: "Görüntülenme",   val: totalViews,         icon: "eye"              as const },
          { label: "Favori",         val: totalFavs,          icon: "heart"            as const },
          { label: "Mesaj",          val: totalMsgs,          icon: "chatbubble"       as const },
          { label: "Sahiplendirilen",val: adoptedCount,       icon: "home"             as const },
        ] as const).map((stat) => (
          <View key={stat.label} style={ml.statCard}>
            <Ionicons name={stat.icon} size={18} color="#333" />
            <View style={{ flex: 1 }}>
              <Text style={ml.statVal}>{stat.val}</Text>
              <Text style={ml.statLbl}>{stat.label}</Text>
            </View>
          </View>
        ))}
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
              style={ml.filterChip}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMyFilter(f.key); }}
            >
              <Text style={ml.filterLbl}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── No listings at all ── */}
      {myListings.length === 0 && (
        <View style={ml.emptyWrap}>
          <View style={ml.emptyIllo}>
            <Ionicons name="list-outline" size={40} color={`${P}70`} />
          </View>
          <Text style={ml.emptyTitle}>Henüz İlan Yok</Text>
          <Text style={ml.emptySub}>
            İlk sahiplendirme ilanını oluşturarak{"\n"}patili dostuna yeni bir yuva bul.
          </Text>
          <Pressable
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: 8 }]}
            onPress={onAdd}
          >
            <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ml.addBtn}>
              <Ionicons name="add-circle-outline" size={15} color={WHITE} />
              <Text style={ml.addBtnTxt}>İlan Oluştur</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {/* ── Filter empty state ── */}
      {myListings.length > 0 && visible.length === 0 && (
        <View style={ml.emptyFilter}>
          <Ionicons name="filter-outline" size={32} color={`${P}50`} />
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
          onEdit={() => openEdit(c.listing)}
          onTogglePassive={() => togglePassive(c.listing.id)}
          onAdopted={() => handleAdopted(c.listing.id, c.listing.petName)}
          onPreview={() => Alert.alert("Önizleme", `"${c.listing.petName}" ilanı kullanıcılara bu şekilde görünüyor.\n\n📍 ${c.listing.location}\n\n${c.listing.description}`)}
          onDelete={() => handleDelete(c.listing)}
          onBoost={(packageId) => handleBoost(c.listing.id, c.listing.petName, packageId)}
        />
      ))}
    </ScrollView>
    </>
  );
}

const ml = StyleSheet.create({
  // Outer wrapper (card + boost card stacked)
  cardOuter: { marginHorizontal: 20, marginBottom: 18 },

  // Main listing card
  card: {
    backgroundColor: WHITE,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    ...CARD_SHADOW,
  },
  cardFeatured: { borderColor: P, borderWidth: 2 },

  // Hero photo
  heroWrap:     { width: "100%", height: 190, position: "relative" },
  heroImg:      { width: "100%", height: "100%" },
  heroFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroScrim:    { position: "absolute", bottom: 0, left: 0, right: 0, height: 90 },

  featBadge: {
    position: "absolute", top: 10, left: 10,
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 9, overflow: "hidden",
    paddingHorizontal: 9, paddingVertical: 5,
  },
  featBadgeTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: WHITE },

  statusBadge: {
    position: "absolute", top: 10, right: 10,
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5,
  },
  statusTxt: { fontSize: 11, fontFamily: "Inter_700Bold" },

  typePill: {
    position: "absolute", bottom: 10, left: 10,
    backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 9,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.30)",
  },
  typePillTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: WHITE },

  // Content
  content: { padding: 14, gap: 9 },

  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  petName: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.3 },
  agePill: { backgroundColor: `${P}12`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  ageTxt:  { fontSize: 11, fontFamily: "Inter_600SemiBold", color: P },

  locRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: BODY },

  statsBar:      { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  statChip:      { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${P}0D`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statChipHeart: { backgroundColor: "rgba(220,38,38,0.07)" },
  statChipMsg:   { backgroundColor: "rgba(0,112,243,0.07)" },
  statChipTxt:   { fontSize: 11, fontFamily: "Inter_600SemiBold", color: P },
  timeTxt:       { fontSize: 11, fontFamily: "Inter_400Regular", color: `${BODY}80`, marginLeft: "auto" as any },

  // Performance button
  perfBtn:    { flexDirection: "row", alignItems: "center", gap: 3, marginLeft: "auto" as any, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: `${BODY}0D`, borderRadius: 8 },
  perfBtnTxt: { fontSize: 10, fontFamily: "Inter_500Medium", color: BODY },

  // Performance panel
  perfPanel:      { backgroundColor: `${P}07`, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: `${P}12` },
  perfPanelTitle: { fontSize: 11, fontFamily: "Inter_700Bold", color: P, marginBottom: 10, letterSpacing: 0.5 },
  perfRow:        { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  perfItem:       { alignItems: "center", gap: 4 },
  perfDivV:       { width: 1, height: 40, backgroundColor: `${P}18` },
  perfVal:        { fontSize: 18, fontFamily: "Inter_700Bold", color: DARK },
  perfLbl:        { fontSize: 10, fontFamily: "Inter_400Regular", color: BODY },

  divider: { height: 1, backgroundColor: `${P}08` },

  // Actions
  actions:    { flexDirection: "row", gap: 7 },
  btn:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  btnEdit:    { backgroundColor: `${P}08`,         borderColor: `${P}28`         },
  btnPreview: { backgroundColor: `${BODY}08`,       borderColor: `${BODY}28`      },
  btnPassive: { backgroundColor: `${BODY}08`,       borderColor: `${BODY}28`      },
  btnAdopted: { backgroundColor: "rgba(24,165,88,0.07)", borderColor: "rgba(24,165,88,0.25)" },
  btnDel:     { backgroundColor: "#FFF5F5",         borderColor: "#FFD5D5"        },
  btnTxt:     { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // Adopted banner
  adoptedBanner:    { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: `${P}07`, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: `${P}18` },
  adoptedBannerTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: P, lineHeight: 17 },

  // Boost card
  boostCard: {
    marginTop: 10,
    backgroundColor: WHITE,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BORDER,
    padding: 14,
    ...Platform.select({
      ios:     { shadowColor: P, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 14 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  boostHeader:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  boostIconWrap:{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  boostTitle:   { fontSize: 14, fontFamily: "Inter_700Bold",    color: DARK },
  boostSub:     { fontSize: 11, fontFamily: "Inter_400Regular", color: BODY, lineHeight: 16, marginTop: 1 },

  // Package cards
  pkgRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  pkgCard:{ flex: 1, borderRadius: 14, padding: 10, alignItems: "center", gap: 3, overflow: "hidden" },
  pkgIdle:{
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: `${P}22`,
    ...Platform.select({
      ios:     { shadowColor: P, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  pkgPop: { borderColor: P, borderWidth: 2 },

  popBadge:   { backgroundColor: P, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2 },
  popBadgeTxt:{ fontSize: 9, fontFamily: "Inter_700Bold", color: WHITE },

  pkgName:    { fontSize: 11, fontFamily: "Inter_700Bold",    color: DARK },
  pkgPrice:   { fontSize: 17, fontFamily: "Inter_700Bold",    color: DARK },
  pkgDays:    { fontSize: 10, fontFamily: "Inter_400Regular", color: BODY },
  pkgNameSel: { fontSize: 11, fontFamily: "Inter_700Bold",    color: WHITE },
  pkgPriceSel:{ fontSize: 17, fontFamily: "Inter_700Bold",    color: WHITE },
  pkgDaysSel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.80)" },

  boostCta:     { borderRadius: 14, overflow: "hidden" },
  boostCtaGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13 },
  boostCtaTxt:  { fontSize: 13, fontFamily: "Inter_700Bold", color: WHITE },

  // Featured active banner
  featuredBanner:    { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 14, borderWidth: 1.5, borderColor: `${P}30`, paddingVertical: 10, paddingHorizontal: 14 },
  featuredBannerTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: P, flex: 1 },
  featuredTimeChip:  { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: `${P}12`, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  featuredTimeTxt:   { fontSize: 10, fontFamily: "Inter_600SemiBold", color: P },

  // Section header
  secHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 16, paddingTop: 4 },
  secTitle:  { fontSize: 22, fontFamily: "Inter_700Bold",    color: DARK, letterSpacing: -0.4 },
  secSub:    { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, marginTop: 2 },
  addBtn:    { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 50 },
  addBtnTxt: { fontSize: 13, fontFamily: "Inter_700Bold", color: WHITE },

  // Stat cards — 2-column grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 20,
    marginBottom: 14,
    gap: 8,
  },
  statCard: {
    width: "47%",
    backgroundColor: "#F2F2F2",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  statVal: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#111" },
  statLbl: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666" },

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
  const insets    = useSafeAreaInsets();
  const router    = useRouter();
  const { listings, deleteListing } = useAdoption();
  const { boostStatuses }           = useBoost();
  const { user }                    = useAuth();
  const [activeTab, setActiveTab]   = useState<Tab>("create");
  const [filter, setFilter]         = useState<Filter>("all");
  const [query, setQuery]           = useState("");

  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const botPad = (Platform.OS === "web" ? 0 : insets.bottom) + TAB_H;

  const NOW_THRESHOLD = Date.now() - 24 * 3_600_000;

  const sorted = useMemo(() => {
    return [...listings].sort((a, b) => {
      const af = boostStatuses[a.id]?.isFeatured ? 1 : 0;
      const bf = boostStatuses[b.id]?.isFeatured ? 1 : 0;
      if (bf !== af) return bf - af;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [listings, boostStatuses]);

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
    return list;
  }, [sorted, filter, query]);

  return (
    <View style={s.root}>
      {/* Sticky header */}
      <View style={s.stickyTop}>
        <PetHeader topPad={topPad} />
        <TabSwitcher active={activeTab} onChange={setActiveTab} />
      </View>

      {activeTab === "create" && (
        <CreateSection onPress={() => router.push("/add-adoption")} botPad={botPad} />
      )}

      {activeTab === "mylistings" && (
        <MyListingsSection
          userId={user?.id ?? ""}
          userEmail={user?.email ?? ""}
          listings={listings}
          boostStatuses={boostStatuses}
          deleteListing={deleteListing}
          botPad={botPad}
          onAdd={() => router.push("/add-adoption")}
        />
      )}

      {activeTab === "listings" && (
        <View style={s.listingShell}>
          <SearchBar query={query} onQuery={setQuery} onFilter={() => {}} />
          <FilterRow active={filter} onChange={setFilter} />
          <ListingsHeader count={filtered.length} filter={filter} />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ListingCard
                listing={item}
                isFeatured={boostStatuses[item.id]?.isFeatured ?? false}
                featuredUntil={boostStatuses[item.id]?.expiresAt ?? null}
              />
            )}
            contentContainerStyle={{ paddingTop: 2, paddingBottom: botPad + 24 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={s.empty}>
                <View style={s.emptyIllo}>
                  <Ionicons name="heart-outline" size={40} color={`${P}70`} />
                </View>
                <Text style={s.emptyTitle}>
                  {query ? "Sonuç Bulunamadı" : "İlan Bulunamadı"}
                </Text>
                <Text style={s.emptySub}>
                  {query
                    ? `"${query}" için eşleşen ilan yok`
                    : filter === "all"
                    ? "İlk sahiplendirme ilanını sen oluştur"
                    : "Bu kategoride henüz ilan yok"}
                </Text>
                {!query && filter === "all" && (
                  <Pressable
                    style={({ pressed }) => [s.emptyBtn, { opacity: pressed ? 0.85 : 1 }]}
                    onPress={() => setActiveTab("create")}
                  >
                    <LinearGradient colors={[P2, P]} style={s.emptyBtnGrad}>
                      <Ionicons name="add-circle-outline" size={15} color={WHITE} />
                      <Text style={s.emptyBtnTxt}>İlan Oluştur</Text>
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            }
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: BG },
  stickyTop:    { backgroundColor: BG },
  listingShell: { flex: 1 },
  empty:      { alignItems: "center", paddingTop: 52, paddingHorizontal: 40, gap: 8 },
  emptyIllo:  { width: 74, height: 74, borderRadius: 37, backgroundColor: `${P}12`, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK },
  emptySub:   { fontSize: 13, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center", lineHeight: 20 },
  emptyBtn:   { marginTop: 14, borderRadius: 50, overflow: "hidden" },
  emptyBtnGrad: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 12, paddingHorizontal: 26 },
  emptyBtnTxt:{ fontSize: 13, fontFamily: "Inter_700Bold", color: WHITE },
});
