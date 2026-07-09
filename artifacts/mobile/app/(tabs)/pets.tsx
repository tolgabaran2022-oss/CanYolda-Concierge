import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AdoptionListing } from "@/contexts/AdoptionContext";
import { useAdoption } from "@/contexts/AdoptionContext";
import { useBoost } from "@/contexts/BoostContext";

// ── Palette ───────────────────────────────────────────────────────────────────
const P = "#7C4DCC";
const P2 = "#A480D8";
const DARK = "#4B267D";
const BODY = "#6E6290";
const BG = "#F8F4FF";
const WHITE = "#FFFFFF";
const BORDER = "rgba(124,77,204,0.13)";
const SHADOW = { shadowColor: P, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 };

const DOG_IMG = require("@/assets/hero-dog.png");

type Tab     = "create" | "listings";
type Filter  = "all" | "cat" | "dog" | "bird" | "rabbit" | "new" | "other";

const TYPE_NORMALIZE: Record<string, Filter> = {
  Kedi: "cat", kedi: "cat", cat: "cat",
  Köpek: "dog", köpek: "dog", dog: "dog",
  Kuş: "bird", kuş: "bird", bird: "bird",
  Tavşan: "rabbit", tavşan: "rabbit", rabbit: "rabbit",
};

const FILTERS: { key: Filter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all",    label: "Tümü",         icon: "apps-outline" },
  { key: "cat",    label: "Kedi",         icon: "ellipse-outline" },
  { key: "dog",    label: "Köpek",        icon: "paw-outline" },
  { key: "bird",   label: "Kuş",          icon: "leaf-outline" },
  { key: "rabbit", label: "Tavşan",       icon: "heart-outline" },
  { key: "new",    label: "Yeni İlanlar", icon: "time-outline" },
  { key: "other",  label: "Diğer",        icon: "ellipsis-horizontal" },
];

const TIPS = [
  "Hayvanın yaşı, karakteri ve sağlık durumunu belirt",
  "Net ve aydınlık fotoğraflar ekle — ilanını öne çıkarır",
  "Sahiplenecek kişiyle yüz yüze görüşmeyi tercih et",
];

// ── Header ───────────────────────────────────────────────────────────────────
function PetHeader({ topPad }: { topPad: number }) {
  return (
    <View style={[hdr.wrap, { paddingTop: topPad + 2 }]}>
      <View style={hdr.logo}>
        <Ionicons name="heart" size={16} color={P} />
        <Text style={hdr.logoTxt}>canyoldaşı</Text>
      </View>
      <TouchableOpacity style={hdr.bell} activeOpacity={0.7}>
        <Ionicons name="notifications-outline" size={20} color={DARK} />
      </TouchableOpacity>
    </View>
  );
}
const hdr = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 6, backgroundColor: BG },
  logo: { flexDirection: "row", alignItems: "center", gap: 6 },
  logoTxt: { fontSize: 16, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.2 },
  bell: { width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: WHITE, borderRadius: 18, borderWidth: 1, borderColor: BORDER },
});

// ── Tab switcher ──────────────────────────────────────────────────────────────
function TabSwitcher({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <View style={tab.wrap}>
      {(["create", "listings"] as Tab[]).map((t) => {
        const isActive = active === t;
        const label = t === "create" ? "İlan Oluştur" : "Tüm İlanlar";
        return (
          <Pressable
            key={t}
            style={[tab.item, isActive && tab.itemActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(t); }}
          >
            {isActive
              ? <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={tab.grad}><Text style={tab.lblActive}>{label}</Text></LinearGradient>
              : <Text style={tab.lblInactive}>{label}</Text>
            }
          </Pressable>
        );
      })}
    </View>
  );
}
const tab = StyleSheet.create({
  wrap: { flexDirection: "row", marginHorizontal: 20, marginBottom: 14, backgroundColor: WHITE, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: BORDER, ...SHADOW },
  item: { flex: 1, borderRadius: 10, overflow: "hidden" },
  itemActive: {},
  grad: { paddingVertical: 10, alignItems: "center" },
  lblActive: { fontSize: 14, fontFamily: "Inter_700Bold", color: WHITE },
  lblInactive: { fontSize: 14, fontFamily: "Inter_400Regular", color: P, paddingVertical: 10, textAlign: "center" },
});

// ── İlan Oluştur ──────────────────────────────────────────────────────────────
function CreateSection({ onPress, botPad }: { onPress: () => void; botPad: number }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: botPad + 16, gap: 10 }}>

      {/* Hero card — shadow and clipping are now on separate layers (Android fix) */}
      <View style={cr.heroCardShadow}>
        <View style={cr.heroCard}>
          <View style={cr.heroLeft}>
            <LinearGradient colors={[`${P}20`, `${P2}12`]} style={cr.heroIconCircle}>
              <Ionicons name="heart" size={28} color={P} />
            </LinearGradient>
            <Text style={cr.heroTitle}>Evcil hayvanını{"\n"}sahiplendirme ilanına ekle</Text>
            <Text style={cr.heroSub}>Fotoğraf, açıklama ve konum{"\n"}ekleyerek ilan oluştur</Text>
            <Pressable
              style={({ pressed }) => [cr.ctaBtn, { opacity: pressed ? 0.88 : 1 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
            >
              <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={cr.ctaGrad}>
                <Ionicons name="add-circle-outline" size={17} color={WHITE} />
                <Text style={cr.ctaTxt}>İlan Oluştur</Text>
              </LinearGradient>
            </Pressable>
          </View>
          <View style={cr.heroRight}>
            <Image source={{ uri: DOG_IMG }} style={cr.dogImg} contentFit="cover" />
          </View>
        </View>
      </View>

      {/* Tips */}
      <View style={cr.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Ionicons name="information-circle-outline" size={17} color={P} />
          <Text style={cr.tipsTitle}>İlan verirken dikkat edilmesi gerekenler</Text>
        </View>
        {TIPS.map((tip, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: i < TIPS.length - 1 ? 8 : 0 }}>
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
        ] as const).map((s) => (
          <View key={s.lbl} style={cr.statCard}>
            <View style={cr.statIconWrap}>
              <Ionicons name={s.icon} size={22} color={P} />
            </View>
            <Text style={cr.statVal}>{s.val}</Text>
            <Text style={cr.statLbl}>{s.lbl}</Text>
          </View>
        ))}
      </View>

      {/* Safety banner */}
      <LinearGradient colors={[P2, P, DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cr.banner}>
        <View style={cr.bannerLeft}>
          <View style={cr.bannerIconWrap}>
            <Ionicons name="shield-checkmark" size={26} color={WHITE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={cr.bannerTitle}>Güvenli Sahiplendirme</Text>
            <Text style={cr.bannerSub}>Doğrulanmış kullanıcılar ve güvenli iletişim ile patili dostlarımızı doğru yuvalara götürüyoruz.</Text>
          </View>
        </View>
        <View style={cr.bannerIllo}>
          <Ionicons name="home" size={32} color="rgba(255,255,255,0.55)" />
          <Ionicons name="paw" size={18} color="rgba(255,255,255,0.4)" style={{ marginTop: -6, marginLeft: 10 }} />
        </View>
      </LinearGradient>

    </ScrollView>
  );
}
const cr = StyleSheet.create({
  card: { backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, ...SHADOW },

  heroCardShadow: { borderRadius: 20, ...SHADOW },
  heroCard: { backgroundColor: WHITE, borderRadius: 20, borderWidth: 1, borderColor: BORDER, flexDirection: "row", overflow: "hidden" },

  heroLeft: { flex: 1, padding: 18, gap: 8, justifyContent: "center" },
  heroIconCircle: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: DARK, lineHeight: 21 },
  heroSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: BODY, lineHeight: 18 },
  ctaBtn: { borderRadius: 50, overflow: "hidden", marginTop: 4 },
  ctaGrad: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 11, paddingHorizontal: 14, justifyContent: "center" },
  ctaTxt: { fontSize: 13, fontFamily: "Inter_700Bold", color: WHITE },

  heroRight: { width: 132 },
  dogImg: { width: "100%", height: 200 },

  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: P, marginTop: 7, flexShrink: 0 },
  tipsTitle: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: DARK },
  tipTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: BODY, lineHeight: 20 },
  statCard: { flex: 1, backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, alignItems: "center", paddingVertical: 16, gap: 5, minHeight: 110, justifyContent: "center", ...SHADOW },
  statIconWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: `${P}12`, alignItems: "center", justifyContent: "center" },
  statVal: { fontSize: 17, fontFamily: "Inter_700Bold", color: DARK },
  statLbl: { fontSize: 10, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center" },
  banner: { borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center" },
  bannerLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 14 },
  bannerIconWrap: { width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  bannerTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE, marginBottom: 4 },
  bannerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)", lineHeight: 17 },
  bannerIllo: { alignItems: "center", paddingLeft: 8 },
});

// ── Filter row ────────────────────────────────────────────────────────────────
function FilterRow({ active, onChange }: { active: Filter; onChange: (f: Filter) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingRight: 32, gap: 8, paddingVertical: 2 }}
      style={{ marginBottom: 12 }}
    >
      {FILTERS.map((f) => {
        const isActive = active === f.key;
        return (
          <Pressable
            key={f.key}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(f.key); }}
            style={[fc.chip, isActive && fc.chipActive]}
          >
            <Ionicons name={f.icon} size={13} color={isActive ? WHITE : P} />
            <Text style={[fc.chipTxt, isActive && fc.chipTxtActive]}>{f.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
const fc = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 50, backgroundColor: WHITE, borderWidth: 1.5, borderColor: `${P}28` },
  chipActive: { backgroundColor: P, borderColor: P },
  chipTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: P },
  chipTxtActive: { color: WHITE },
});

// ── Listing card ──────────────────────────────────────────────────────────────
function ListingCard({ listing, isFeatured }: { listing: AdoptionListing; isFeatured?: boolean }) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);

  return (
    <Pressable
      style={({ pressed }) => [lc.cardShadow, { opacity: pressed ? 0.94 : 1 }]}
      onPress={() => router.push(`/adoption/${listing.id}`)}
    >
      <View style={[lc.card, isFeatured && lc.featured]}>
        {isFeatured && (
          <View style={lc.featuredBadge}>
            <Ionicons name="star" size={9} color={WHITE} />
            <Text style={lc.featuredTxt}>Öne Çıkan</Text>
          </View>
        )}

        {/* Photo */}
        <View style={lc.imgWrap}>
          {listing.photo
            ? <Image source={{ uri: listing.photo }} style={lc.img} contentFit="cover" />
            : <View style={lc.imgFallback}><Ionicons name="heart" size={28} color={`${P}60`} /></View>
          }
        </View>

        {/* Content */}
        <View style={lc.body}>
          <View style={lc.typeRow}>
            <View style={lc.typeTag}><Text style={lc.typeTagTxt}>{listing.petType}</Text></View>
          </View>
          <Text style={lc.name} numberOfLines={1}>{listing.petName}</Text>
          {listing.petAge ? <Text style={lc.meta} numberOfLines={1}>{listing.petAge}</Text> : null}
          <Text style={lc.desc} numberOfLines={2}>{listing.description}</Text>
          <View style={lc.locRow}>
            <Ionicons name="location-sharp" size={11} color={P} />
            <Text style={lc.loc} numberOfLines={1}>{listing.location}</Text>
          </View>
        </View>

        {/* Actions column */}
        <View style={lc.actions}>
          <Pressable
            onPress={() => { setLiked((v) => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={lc.actionBtn}
            hitSlop={6}
          >
            <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? "#E53E3E" : "#C0B4D8"} />
          </Pressable>
          <Pressable
            onPress={() => router.push(`/adoption/${listing.id}`)}
            style={[lc.actionBtn, lc.chatBtn]}
            hitSlop={6}
          >
            <Ionicons name="chatbubble-ellipses" size={15} color={WHITE} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
const lc = StyleSheet.create({
  cardShadow: { marginHorizontal: 20, marginBottom: 12, borderRadius: 18, ...SHADOW },
  card: { flexDirection: "row", backgroundColor: WHITE, borderRadius: 18, borderWidth: 1, borderColor: BORDER, overflow: "hidden", minHeight: 120 },
  featured: { borderColor: "#E07A35", borderWidth: 1.5 },
  featuredBadge: { position: "absolute", top: 0, left: 0, zIndex: 2, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#E07A35", borderBottomRightRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  featuredTxt: { fontSize: 10, fontFamily: "Inter_700Bold", color: WHITE },
  imgWrap: { width: 110, height: 120, backgroundColor: `${P}10` },
  img: { width: 110, height: 120 },
  imgFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, paddingVertical: 12, paddingLeft: 12, paddingRight: 6, gap: 3, justifyContent: "center" },
  typeRow: { marginBottom: 1 },
  typeTag: { backgroundColor: `${P}16`, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: "flex-start" },
  typeTagTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: P },
  name: { fontSize: 16, fontFamily: "Inter_700Bold", color: DARK },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular", color: BODY },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#7A7090", lineHeight: 17 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  loc: { fontSize: 11, fontFamily: "Inter_500Medium", color: BODY, flex: 1 },
  actions: { width: 40, paddingVertical: 12, paddingRight: 10, justifyContent: "space-between", alignItems: "flex-end" },
  actionBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  chatBtn: { backgroundColor: P, borderRadius: 15 },
});

// ── Floating filter button ────────────────────────────────────────────────────
function FloatingFilterButton({ bottom, onPress }: { bottom: number; onPress: () => void }) {
  return (
    <Pressable
      style={[ffb.wrapShadow, { bottom }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
    >
      <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ffb.grad}>
        <Ionicons name="filter" size={16} color={WHITE} />
        <Text style={ffb.txt}>Filtrele</Text>
      </LinearGradient>
    </Pressable>
  );
}
const ffb = StyleSheet.create({
  wrapShadow: { position: "absolute", right: 20, borderRadius: 50, ...SHADOW },
  grad: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 50 },
  txt: { fontSize: 13, fontFamily: "Inter_700Bold", color: WHITE },
});

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { listings } = useAdoption();
  const { boostStatuses, fetchBoostStatus } = useBoost();
  const [activeTab, setActiveTab] = useState<Tab>("create");
  const [filter, setFilter]       = useState<Filter>("all");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = insets.bottom + 80;

  const sorted = useMemo(() => {
    return [...listings].sort((a, b) => {
      const af = boostStatuses[a.id]?.isFeatured ? 1 : 0;
      const bf = boostStatuses[b.id]?.isFeatured ? 1 : 0;
      if (bf !== af) return bf - af;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [listings, boostStatuses]);

  const NOW_THRESHOLD = Date.now() - 24 * 3_600_000;
  const filtered = useMemo(() => {
    if (filter === "all")   return sorted;
    if (filter === "new")   return sorted.filter((l) => new Date(l.createdAt).getTime() > NOW_THRESHOLD);
    if (filter === "other") return sorted.filter((l) => (TYPE_NORMALIZE[l.petType] ?? "other") === "other");
    return sorted.filter((l) => (TYPE_NORMALIZE[l.petType] ?? "other") === filter);
  }, [sorted, filter]);

  return (
    <View style={s.root}>
      <PetHeader topPad={topPad} />

      <View style={s.titleBlock}>
        <Text style={s.title}>
          {activeTab === "create" ? "Evcil Hayvan Merkezi" : "Evcil Hayvan İlanları"}
        </Text>
        <Text style={s.subtitle}>
          {activeTab === "create"
            ? "Sahiplendirme ilanları oluştur ve incele"
            : "Patili dostlar için yeni bir yuva bul"}
        </Text>
      </View>

      <TabSwitcher active={activeTab} onChange={setActiveTab} />

      {activeTab === "create" ? (
        <CreateSection onPress={() => router.push("/add-adoption")} botPad={botPad} />
      ) : (
        <View style={{ flex: 1 }}>
          <FilterRow active={filter} onChange={setFilter} />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ListingCard
                listing={item}
                isFeatured={boostStatuses[item.id]?.isFeatured ?? false}
              />
            )}
            contentContainerStyle={{ paddingTop: 2, paddingBottom: botPad + 80 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={s.empty}>
                <Ionicons name="heart-outline" size={52} color={`${P}50`} />
                <Text style={s.emptyTitle}>İlan bulunamadı</Text>
                <Text style={s.emptySub}>
                  {filter === "all" ? "İlk sahiplendirme ilanını sen oluştur" : "Bu kategoride ilan yok"}
                </Text>
                {filter === "all" && (
                  <Pressable
                    style={({ pressed }) => [s.emptyBtn, { opacity: pressed ? 0.85 : 1 }]}
                    onPress={() => setActiveTab("create")}
                  >
                    <Text style={s.emptyBtnTxt}>İlan Oluştur</Text>
                  </Pressable>
                )}
              </View>
            }
          />
          <FloatingFilterButton
            bottom={insets.bottom + 24}
            onPress={() => {}}
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: BG },
  titleBlock: { paddingHorizontal: 20, paddingBottom: 12, alignItems: "center" },
  title:      { fontSize: 21, fontFamily: "Inter_700Bold", color: DARK, textAlign: "center" },
  subtitle:   { fontSize: 13, fontFamily: "Inter_400Regular", color: BODY, marginTop: 3, textAlign: "center" },
  empty:      { alignItems: "center", paddingTop: 60, paddingHorizontal: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: DARK, marginTop: 8 },
  emptySub:   { fontSize: 13, fontFamily: "Inter_400Regular", color: BODY, textAlign: "center" },
  emptyBtn:   { marginTop: 12, backgroundColor: P, borderRadius: 50, paddingVertical: 12, paddingHorizontal: 28 },
  emptyBtnTxt:{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: WHITE },
});
