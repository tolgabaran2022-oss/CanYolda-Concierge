import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  FlatList,
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
import { useBoost } from "@/contexts/BoostContext";

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

type Tab    = "create" | "listings";
type Filter = "all" | "cat" | "dog" | "bird" | "rabbit" | "new" | "other";

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

// ── Tab switcher ──────────────────────────────────────────────────────────────
function TabSwitcher({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <View style={tsw.wrap}>
      {(["create", "listings"] as Tab[]).map((t) => {
        const isActive = active === t;
        const label = t === "create" ? "İlan Oluştur" : "Tüm İlanlar";
        const icon: keyof typeof Ionicons.glyphMap = t === "create" ? "add-circle-outline" : "heart-outline";
        return (
          <Pressable
            key={t}
            style={[tsw.item, isActive && tsw.itemActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(t); }}
          >
            {isActive ? (
              <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={tsw.grad}>
                <Ionicons name={icon} size={15} color={WHITE} />
                <Text style={tsw.lblActive}>{label}</Text>
              </LinearGradient>
            ) : (
              <View style={tsw.inactiveRow}>
                <Ionicons name={icon} size={15} color={P} />
                <Text style={tsw.lblInactive}>{label}</Text>
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
  itemActive:  {},
  grad:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11 },
  inactiveRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11 },
  lblActive:   { fontSize: 14, fontFamily: "Inter_700Bold", color: WHITE },
  lblInactive: { fontSize: 14, fontFamily: "Inter_500Medium", color: P },
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

function ListingCard({ listing, isFeatured }: { listing: AdoptionListing; isFeatured?: boolean }) {
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
            <View style={lc.featuredBadge}>
              <Ionicons name="star" size={9} color={WHITE} />
              <Text style={lc.featuredTxt}>Öne Çıkan</Text>
            </View>
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
  featuredBorder:{ borderColor: "#E07A35", borderWidth: 1.5 },

  imgWrap:      { width: "100%", height: IMG_H, position: "relative" },
  img:          { width: "100%", height: "100%" },
  imgFallback:  { flex: 1, alignItems: "center", justifyContent: "center" },
  imgScrim:     { position: "absolute", bottom: 0, left: 0, right: 0, height: 56 },

  featuredBadge:{ position: "absolute", top: 9, left: 9, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#E07A35", borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { listings } = useAdoption();
  const { boostStatuses } = useBoost();
  const [activeTab, setActiveTab] = useState<Tab>("create");
  const [filter, setFilter]       = useState<Filter>("all");
  const [query, setQuery]         = useState("");

  // topPad: safe area top. On web use fixed offset.
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  // botPad: safe area bottom + tab bar height so content never hides behind tabs
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
    if (filter === "new")       list = list.filter((l) => new Date(l.createdAt).getTime() > NOW_THRESHOLD);
    else if (filter !== "all")  list = list.filter((l) => (TYPE_NORMALIZE[l.petType] ?? "other") === filter);
    if (filter === "other")     list = sorted.filter((l) => (TYPE_NORMALIZE[l.petType] ?? "other") === "other");
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
      {/* Sticky header block */}
      <View style={s.stickyTop}>
        <PetHeader topPad={topPad} />
        <TabSwitcher active={activeTab} onChange={setActiveTab} />
      </View>

      {activeTab === "create" ? (
        <CreateSection onPress={() => router.push("/add-adoption")} botPad={botPad} />
      ) : (
        <View style={s.listingShell}>
          {/* Search bar */}
          <SearchBar query={query} onQuery={setQuery} onFilter={() => {}} />

          {/* Category chips — FlatList, no clipping */}
          <FilterRow active={filter} onChange={setFilter} />

          {/* Count row */}
          <ListingsHeader count={filtered.length} filter={filter} />

          {/* Cards */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ListingCard
                listing={item}
                isFeatured={boostStatuses[item.id]?.isFeatured ?? false}
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
