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

// ── Design tokens ──────────────────────────────────────────────────────────────
const PURPLE      = "#7C3AED";
const PURPLE2     = "#A480D8";
const PURPLE_DARK = "#3D1C8C";
const PURPLE_BG   = "#F7F2FF";
const WHITE       = "#FFFFFF";
const CARD_BORDER = "rgba(124,58,237,0.12)";

const TAB_FLOAT_H  = 64;
const TAB_BOT_GAP  = Platform.OS === "web" ? 12 : 10;

type Tab      = "create" | "listings";
type PetType  = "all" | "cat" | "dog" | "bird" | "other";

const FILTERS: { key: PetType; label: string; icon: string }[] = [
  { key: "all",   label: "Tümü",  icon: "🐾" },
  { key: "cat",   label: "Kedi",  icon: "🐱" },
  { key: "dog",   label: "Köpek", icon: "🐶" },
  { key: "bird",  label: "Kuş",   icon: "🦜" },
  { key: "other", label: "Diğer", icon: "···" },
];

const TYPE_MAP: Record<string, PetType> = {
  Kedi: "cat", kedi: "cat", cat: "cat",
  Köpek: "dog", köpek: "dog", dog: "dog",
  Kuş: "bird", kuş: "bird", bird: "bird",
};

const DOG_IMG = "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300&q=80";
const TIPS = [
  "Hayvanın yaşı, karakteri ve sağlık durumunu belirt",
  "Net ve aydınlık fotoğraflar ekle — ilanını öne çıkarır",
  "Sahiplenecek kişiyle yüz yüze görüşmeyi tercih et",
];

// ── Header ─────────────────────────────────────────────────────────────────────
function PetHeader({ topPad }: { topPad: number }) {
  return (
    <View style={[H.wrap, { paddingTop: topPad + 4 }]}>
      <View style={H.logo}>
        <Ionicons name="heart" size={18} color={PURPLE} />
        <Text style={H.logoTxt}>canyoldaşı</Text>
      </View>
      <TouchableOpacity style={H.bell}>
        <Ionicons name="notifications-outline" size={22} color={PURPLE_DARK} />
      </TouchableOpacity>
    </View>
  );
}
const H = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 8, backgroundColor: PURPLE_BG },
  logo: { flexDirection: "row", alignItems: "center", gap: 6 },
  logoTxt: { fontSize: 17, fontFamily: "Inter_700Bold", color: PURPLE_DARK, letterSpacing: -0.3 },
  bell: { width: 38, height: 38, alignItems: "center", justifyContent: "center", backgroundColor: WHITE, borderRadius: 19, borderWidth: 1, borderColor: CARD_BORDER },
});

// ── Tab switcher ───────────────────────────────────────────────────────────────
function TabSwitcher({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <View style={T.wrap}>
      {(["create", "listings"] as Tab[]).map((t) => {
        const isActive = active === t;
        const label = t === "create" ? "İlan Oluştur" : "Tüm İlanlar";
        return (
          <Pressable key={t} style={[T.item, isActive && T.itemActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(t); }}>
            {isActive
              ? <LinearGradient colors={[PURPLE2, PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={T.grad}><Text style={T.labelActive}>{label}</Text></LinearGradient>
              : <Text style={T.labelInactive}>{label}</Text>
            }
          </Pressable>
        );
      })}
    </View>
  );
}
const T = StyleSheet.create({
  wrap: { flexDirection: "row", marginHorizontal: 20, marginBottom: 16, backgroundColor: WHITE, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: CARD_BORDER, shadowColor: PURPLE, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  item: { flex: 1, borderRadius: 12, overflow: "hidden" },
  itemActive: {},
  grad: { paddingVertical: 11, alignItems: "center", justifyContent: "center" },
  labelActive: { fontSize: 14, fontFamily: "Inter_700Bold", color: WHITE },
  labelInactive: { fontSize: 14, fontFamily: "Inter_400Regular", color: PURPLE, paddingVertical: 11, textAlign: "center" },
});

// ── İlan Oluştur section ────────────────────────────────────────────────────────
function CreateSection({ onPress }: { onPress: () => void }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, gap: 14 }}>

      {/* Hero card */}
      <View style={C.heroCard}>
        <View style={C.heroLeft}>
          <LinearGradient colors={["rgba(124,58,237,0.15)", "rgba(164,128,216,0.1)"]} style={C.heroIcon}>
            <Ionicons name="heart" size={32} color={PURPLE} />
          </LinearGradient>
          <Text style={C.heroTitle}>Evcil hayvanını sahiplendirme ilanına ekle</Text>
          <Text style={C.heroSub}>Fotoğraf, açıklama ve konum ekleyerek ilan oluştur</Text>
          <Pressable style={({ pressed }) => [C.heroBtn, { opacity: pressed ? 0.88 : 1 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}>
            <LinearGradient colors={[PURPLE2, PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={C.heroBtnGrad}>
              <Ionicons name="add-circle-outline" size={18} color={WHITE} />
              <Text style={C.heroBtnTxt}>İlan Oluştur</Text>
            </LinearGradient>
          </Pressable>
        </View>
        <View style={[C.heroRight, { pointerEvents: "none" }]}>
          <Image source={{ uri: DOG_IMG }} style={C.dogImg} contentFit="cover" />
        </View>
      </View>

      {/* Tips card */}
      <View style={C.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Ionicons name="information-circle-outline" size={18} color={PURPLE} />
          <Text style={C.tipsTitle}>İlan verirken dikkat edilmesi gerekenler</Text>
        </View>
        {TIPS.map((tip, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: i < TIPS.length - 1 ? 8 : 0 }}>
            <View style={C.dot} />
            <Text style={C.tipTxt}>{tip}</Text>
          </View>
        ))}
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[
          { icon: "🐾", val: "2.4K+", label: "Aktif İlan" },
          { icon: "🤍", val: "800+",  label: "Sahiplendirilen" },
          { icon: "👥", val: "12K+",  label: "Hayvan Dostu" },
        ].map((s) => (
          <View key={s.label} style={C.statCard}>
            <Text style={{ fontSize: 20 }}>{s.icon}</Text>
            <Text style={C.statVal}>{s.val}</Text>
            <Text style={C.statLbl}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Safety banner */}
      <LinearGradient colors={[PURPLE2, PURPLE, PURPLE_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={C.banner}>
        <View style={C.bannerIcon}>
          <Ionicons name="shield-checkmark" size={28} color={WHITE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={C.bannerTitle}>Güvenli Sahiplendirme</Text>
          <Text style={C.bannerSub}>Doğrulanmış kullanıcılar ve güvenli iletişim ile patili dostlarımızı doğru yuvalara götürüyoruz.</Text>
        </View>
        <View style={C.bannerIllo}>
          <Text style={{ fontSize: 36 }}>🏠</Text>
          <Text style={{ fontSize: 20, marginTop: -8, alignSelf: "flex-end" }}>🐾</Text>
        </View>
      </LinearGradient>

    </ScrollView>
  );
}
const C = StyleSheet.create({
  heroCard: { backgroundColor: WHITE, borderRadius: 20, borderWidth: 1, borderColor: CARD_BORDER, flexDirection: "row", overflow: "hidden", minHeight: 220, shadowColor: PURPLE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 18, elevation: 4 },
  heroLeft: { flex: 1, padding: 20, gap: 8, justifyContent: "center" },
  heroIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  heroTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: PURPLE_DARK, lineHeight: 22 },
  heroSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8874A8", lineHeight: 18 },
  heroBtn: { marginTop: 6, borderRadius: 50, overflow: "hidden" },
  heroBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 16 },
  heroBtnTxt: { fontSize: 14, fontFamily: "Inter_700Bold", color: WHITE },
  heroRight: { width: 120, justifyContent: "flex-end", alignItems: "flex-end" },
  dogImg: { width: 120, height: 180, borderBottomRightRadius: 20 },
  card: { backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER, padding: 16, shadowColor: PURPLE, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PURPLE, marginTop: 7, flexShrink: 0 },
  tipsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: PURPLE_DARK, flex: 1 },
  tipTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#5C4A7A", lineHeight: 20 },
  statCard: { flex: 1, backgroundColor: WHITE, borderRadius: 14, borderWidth: 1, borderColor: CARD_BORDER, alignItems: "center", paddingVertical: 14, gap: 3, shadowColor: PURPLE, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  statVal: { fontSize: 17, fontFamily: "Inter_700Bold", color: PURPLE_DARK },
  statLbl: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#8874A8", textAlign: "center" },
  banner: { borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", gap: 14 },
  bannerIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  bannerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: WHITE, marginBottom: 4 },
  bannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)", lineHeight: 18 },
  bannerIllo: { alignItems: "flex-end", justifyContent: "flex-end" },
});

// ── Listing Card ────────────────────────────────────────────────────────────────
function ListingCard({ listing, isFeatured }: { listing: AdoptionListing; isFeatured?: boolean }) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const typeLabel = listing.petType;

  return (
    <Pressable
      style={({ pressed }) => [LC.card, isFeatured && LC.featured, { opacity: pressed ? 0.94 : 1 }]}
      onPress={() => router.push(`/adoption/${listing.id}`)}
    >
      {isFeatured && (
        <View style={LC.featuredTag}><Ionicons name="star" size={10} color={WHITE} /><Text style={LC.featuredTxt}>Öne Çıkan</Text></View>
      )}

      {/* Photo */}
      <View style={LC.imgWrap}>
        {listing.photo
          ? <Image source={{ uri: listing.photo }} style={LC.img} contentFit="cover" />
          : <View style={LC.imgPlaceholder}><Ionicons name="heart" size={28} color={PURPLE} /></View>
        }
      </View>

      {/* Content */}
      <View style={LC.body}>
        {/* Type tag */}
        <View style={LC.typeTag}>
          <Text style={LC.typeTagTxt}>{typeLabel}</Text>
        </View>

        {/* Name */}
        <Text style={LC.name} numberOfLines={1}>{listing.petName}</Text>

        {/* Breed + age */}
        {listing.petAge ? (
          <Text style={LC.meta} numberOfLines={1}>{listing.petAge}</Text>
        ) : null}

        {/* Description */}
        <Text style={LC.desc} numberOfLines={2}>{listing.description}</Text>

        {/* Location */}
        <View style={LC.locRow}>
          <Ionicons name="location-sharp" size={12} color={PURPLE} />
          <Text style={LC.loc} numberOfLines={1}>{listing.location}</Text>
        </View>
      </View>

      {/* Right actions */}
      <View style={LC.actions}>
        <Pressable onPress={() => { setLiked((v) => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={LC.actionBtn}>
          <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? "#E53E3E" : "#AAA"} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => router.push(`/adoption/${listing.id}`)} style={[LC.actionBtn, LC.chatBtn]}>
          <Ionicons name="chatbubble-ellipses" size={16} color={WHITE} />
        </Pressable>
      </View>
    </Pressable>
  );
}
const LC = StyleSheet.create({
  card: { flexDirection: "row", backgroundColor: WHITE, borderRadius: 16, marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderColor: CARD_BORDER, overflow: "hidden", minHeight: 120, shadowColor: PURPLE, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  featured: { borderColor: "#E07A35", borderWidth: 1.5 },
  featuredTag: { position: "absolute", top: 0, left: 0, backgroundColor: "#E07A35", borderBottomRightRadius: 10, flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4, zIndex: 2 },
  featuredTxt: { fontSize: 10, fontFamily: "Inter_700Bold", color: WHITE },
  imgWrap: { width: 110, backgroundColor: "#F0EBF8" },
  img: { width: "100%", height: "100%" },
  imgPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, padding: 12, gap: 3, justifyContent: "center" },
  typeTag: { backgroundColor: `${PURPLE}18`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start", marginBottom: 2 },
  typeTagTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: PURPLE },
  name: { fontSize: 16, fontFamily: "Inter_700Bold", color: PURPLE_DARK },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8874A8" },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", lineHeight: 17 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  loc: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#888", flex: 1 },
  actions: { width: 38, paddingVertical: 10, paddingRight: 10, justifyContent: "space-between", alignItems: "flex-end" },
  actionBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  chatBtn: { backgroundColor: PURPLE, borderRadius: 16 },
});

// ── Filter chips ────────────────────────────────────────────────────────────────
function FilterChips({ active, onChange }: { active: PetType; onChange: (t: PetType) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 4 }} style={{ marginBottom: 14 }}>
      {FILTERS.map((f) => {
        const isActive = active === f.key;
        return (
          <Pressable
            key={f.key}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(f.key); }}
            style={[FC.chip, isActive && FC.chipActive]}
          >
            {f.icon !== "···" ? <Text style={{ fontSize: 14 }}>{f.icon}</Text> : <Ionicons name="ellipsis-horizontal" size={14} color={isActive ? WHITE : PURPLE} />}
            <Text style={[FC.chipTxt, isActive && FC.chipTxtActive]}>{f.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
const FC = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 50, backgroundColor: WHITE, borderWidth: 1.5, borderColor: `${PURPLE}30` },
  chipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  chipTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: PURPLE },
  chipTxtActive: { color: WHITE },
});

// ── Main screen ─────────────────────────────────────────────────────────────────
export default function PetsScreen() {
  const insets       = useSafeAreaInsets();
  const router       = useRouter();
  const { listings } = useAdoption();
  const { boostStatuses, fetchBoostStatus } = useBoost();
  const [tab,    setTab]    = useState<Tab>("create");
  const [filter, setFilter] = useState<PetType>("all");

  const topPad      = Platform.OS === "web" ? 67 : insets.top;
  const tabClearance = insets.bottom + TAB_BOT_GAP + TAB_FLOAT_H;

  const filtered = useMemo(() => {
    let list = [...listings].sort((a, b) => {
      const af = boostStatuses[a.id]?.isFeatured ? 1 : 0;
      const bf = boostStatuses[b.id]?.isFeatured ? 1 : 0;
      if (bf !== af) return bf - af;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    if (filter === "all") return list;
    return list.filter((l) => (TYPE_MAP[l.petType] ?? "other") === filter);
  }, [listings, boostStatuses, filter]);

  return (
    <View style={S.root}>
      <PetHeader topPad={topPad} />

      {/* Title block */}
      <View style={S.titleBlock}>
        <Text style={S.title}>
          {tab === "create" ? "Evcil Hayvan Merkezi" : "Evcil Hayvan İlanları"}
        </Text>
        <Text style={S.subtitle}>
          {tab === "create" ? "Sahiplendirme ilanları oluştur ve incele" : "Patili dostlar için yeni bir yuva bul"}
        </Text>
      </View>

      <TabSwitcher active={tab} onChange={setTab} />

      {tab === "create" ? (
        <CreateSection onPress={() => router.push("/add-adoption")} />
      ) : (
        <View style={{ flex: 1 }}>
          <FilterChips active={filter} onChange={setFilter} />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ListingCard
                listing={item}
                isFeatured={boostStatuses[item.id]?.isFeatured ?? false}
              />
            )}
            contentContainerStyle={{ paddingTop: 2, paddingBottom: tabClearance + 80 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={S.empty}>
                <Ionicons name="heart-outline" size={52} color={`${PURPLE}50`} />
                <Text style={S.emptyTitle}>İlan bulunamadı</Text>
                <Text style={S.emptySub}>
                  {filter === "all" ? "İlk sahiplendirme ilanını sen oluştur" : "Bu kategoride ilan yok"}
                </Text>
                {filter === "all" && (
                  <Pressable style={({ pressed }) => [S.emptyBtn, { opacity: pressed ? 0.85 : 1 }]} onPress={() => { setTab("create"); }}>
                    <Text style={S.emptyBtnTxt}>İlan Oluştur</Text>
                  </Pressable>
                )}
              </View>
            }
          />

          {/* Floating filter button */}
          <Pressable
            style={({ pressed }) => [S.filterFab, { opacity: pressed ? 0.88 : 1, bottom: tabClearance + 12 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <LinearGradient colors={[PURPLE2, PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.filterFabGrad}>
              <Ionicons name="options" size={16} color={WHITE} />
              <Text style={S.filterFabTxt}>Filtrele</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root:      { flex: 1, backgroundColor: PURPLE_BG },
  titleBlock:{ paddingHorizontal: 20, paddingBottom: 14, alignItems: "center" },
  title:     { fontSize: 22, fontFamily: "Inter_700Bold", color: PURPLE_DARK, textAlign: "center" },
  subtitle:  { fontSize: 13, fontFamily: "Inter_400Regular", color: "#8874A8", marginTop: 3, textAlign: "center" },

  empty:     { alignItems: "center", paddingTop: 60, paddingHorizontal: 40, gap: 8 },
  emptyTitle:{ fontSize: 18, fontFamily: "Inter_600SemiBold", color: PURPLE_DARK, marginTop: 8 },
  emptySub:  { fontSize: 13, fontFamily: "Inter_400Regular", color: "#8874A8", textAlign: "center" },
  emptyBtn:  { marginTop: 12, backgroundColor: PURPLE, borderRadius: 50, paddingVertical: 12, paddingHorizontal: 28 },
  emptyBtnTxt:{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: WHITE },

  filterFab: { position: "absolute", alignSelf: "center", borderRadius: 50, overflow: "hidden" },
  filterFabGrad: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 12, paddingHorizontal: 24 },
  filterFabTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: WHITE },
});
