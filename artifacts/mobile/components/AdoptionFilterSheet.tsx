import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Palette (matches app) ────────────────────────────────────────────────────
const P    = "#7C4DCC";
const P2   = "#A480D8";
const DARK = "#4B267D";
const BODY = "#6E6290";
const BG   = "#F8F4FF";
const WHITE = "#FFFFFF";
const BORDER = "rgba(124,77,204,0.12)";

// ── Types ────────────────────────────────────────────────────────────────────
export type AgeRange     = "all" | "0_6m" | "6_12m" | "1_3y" | "3y_plus";
export type GenderFilter = "all" | "female" | "male" | "unknown";
export type SortBy       = "newest" | "oldest" | "age_asc" | "age_desc";
export type StatusFilter = "all" | "active" | "adopted";

export interface AdoptionFilters {
  ageRange:     AgeRange;
  gender:       GenderFilter;
  breed:        string | null;
  status:       StatusFilter;
  sortBy:       SortBy;
  locationCity: string | null;
}

export const DEFAULT_FILTERS: AdoptionFilters = {
  ageRange:     "all",
  gender:       "all",
  breed:        null,
  status:       "all",
  sortBy:       "newest",
  locationCity: null,
};

export function countActiveFilters(f: AdoptionFilters): number {
  let n = 0;
  if (f.ageRange     !== "all")   n++;
  if (f.gender       !== "all")   n++;
  if (f.breed        !== null)    n++;
  if (f.status       !== "all")   n++;
  if (f.sortBy       !== "newest") n++;
  if (f.locationCity !== null)    n++;
  return n;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export function parseAgeMonths(petAge?: string): number | null {
  if (!petAge) return null;
  const agePart = petAge.includes("•") ? petAge.split("•").pop()!.trim() : petAge.trim();
  const yearMatch = agePart.match(/(\d+(?:[.,]\d+)?)\s*ya[şs]/i);
  if (yearMatch) return Math.round(parseFloat(yearMatch[1].replace(",", ".")) * 12);
  const monthMatch = agePart.match(/(\d+)\s*ay/i);
  if (monthMatch) return parseInt(monthMatch[1]);
  const rangeMonthMatch = agePart.match(/(\d+)\s*[–\-]\s*(\d+)\s*ay/i);
  if (rangeMonthMatch) return Math.round((parseInt(rangeMonthMatch[1]) + parseInt(rangeMonthMatch[2])) / 2);
  const rangeYearMatch = agePart.match(/(\d+)\s*[–\-]\s*(\d+)\s*ya[şs]/i);
  if (rangeYearMatch) return Math.round((parseInt(rangeYearMatch[1]) + parseInt(rangeYearMatch[2])) / 2) * 12;
  return null;
}

export function normalizeGender(gender?: string): "female" | "male" | "unknown" {
  if (!gender) return "unknown";
  const g = gender.toLowerCase().trim();
  if (g === "dişi"  || g === "female" || g === "f") return "female";
  if (g === "erkek" || g === "male"   || g === "m") return "male";
  return "unknown";
}

export function extractCity(location?: string): string | null {
  if (!location) return null;
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return parts[parts.length - 1];
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionTitle({ title }: { title: string }) {
  return <Text style={fs.sectionTitle}>{title}</Text>;
}

function Chips<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { key: T; label: string }[];
  value: T;
  onSelect: (k: T) => void;
}) {
  return (
    <View style={fs.chipRow}>
      {options.map((o) => {
        const active = value === o.key;
        return active ? (
          <LinearGradient
            key={o.key}
            colors={[P2, P]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={fs.chipActive}
          >
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(o.key); }}
              style={{ alignItems: "center", justifyContent: "center" }}
            >
              <Text style={fs.chipLblActive}>{o.label}</Text>
            </Pressable>
          </LinearGradient>
        ) : (
          <Pressable
            key={o.key}
            style={fs.chipInactive}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(o.key); }}
          >
            <Text style={fs.chipLbl}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function BreedChips({
  breeds,
  value,
  onSelect,
}: {
  breeds: string[];
  value: string | null;
  onSelect: (b: string | null) => void;
}) {
  const all = [{ key: null as string | null, label: "Tümü" }, ...breeds.map((b) => ({ key: b, label: b }))];
  return (
    <View style={fs.chipRow}>
      {all.map((o) => {
        const active = value === o.key;
        return active ? (
          <LinearGradient
            key={String(o.key)}
            colors={[P2, P]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={fs.chipActive}
          >
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(o.key); }}
              style={{ alignItems: "center", justifyContent: "center" }}
            >
              <Text style={fs.chipLblActive}>{o.label}</Text>
            </Pressable>
          </LinearGradient>
        ) : (
          <Pressable
            key={String(o.key)}
            style={fs.chipInactive}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(o.key); }}
          >
            <Text style={fs.chipLbl}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CityChips({
  cities,
  value,
  onSelect,
}: {
  cities: string[];
  value: string | null;
  onSelect: (c: string | null) => void;
}) {
  const all = [{ key: null as string | null, label: "Tümü" }, ...cities.map((c) => ({ key: c, label: c }))];
  return (
    <View style={fs.chipRow}>
      {all.map((o) => {
        const active = value === o.key;
        return active ? (
          <LinearGradient
            key={String(o.key)}
            colors={[P2, P]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={fs.chipActive}
          >
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(o.key); }}
              style={{ alignItems: "center", justifyContent: "center" }}
            >
              <Text style={fs.chipLblActive}>{o.label}</Text>
            </Pressable>
          </LinearGradient>
        ) : (
          <Pressable
            key={String(o.key)}
            style={fs.chipInactive}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(o.key); }}
          >
            <Text style={fs.chipLbl}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Main sheet component ──────────────────────────────────────────────────────
interface Props {
  visible:        boolean;
  activeFilters:  AdoptionFilters;
  breeds:         string[];
  cities:         string[];
  onApply:        (f: AdoptionFilters) => void;
  onClose:        () => void;
}

export function AdoptionFilterSheet({
  visible,
  activeFilters,
  breeds,
  cities,
  onApply,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const botPad = Platform.OS === "web" ? 24 : insets.bottom + 16;

  /* Draft state — committed only on "Uygula" */
  const [draft, setDraft] = useState<AdoptionFilters>(activeFilters);

  useEffect(() => {
    if (visible) setDraft(activeFilters);
  }, [visible]);

  const update = <K extends keyof AdoptionFilters>(key: K, val: AdoptionFilters[K]) =>
    setDraft((prev) => ({ ...prev, [key]: val }));

  const reset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDraft(DEFAULT_FILTERS);
  };

  const apply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onApply(draft);
    onClose();
  };

  const activeCount = countActiveFilters(draft);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Overlay */}
      <Pressable style={fs.overlay} onPress={onClose} />

      {/* Sheet */}
      <View style={[fs.sheet, { paddingBottom: botPad }]}>
        {/* Handle bar */}
        <View style={fs.handle} />

        {/* Header */}
        <View style={fs.header}>
          <View style={fs.headerLeft}>
            <Text style={fs.headerTitle}>Filtrele</Text>
            {activeCount > 0 && (
              <View style={fs.activeBadge}>
                <Text style={fs.activeBadgeTxt}>{activeCount}</Text>
              </View>
            )}
          </View>
          <View style={fs.headerRight}>
            {activeCount > 0 && (
              <Pressable onPress={reset} hitSlop={10}>
                <Text style={fs.resetTxt}>Sıfırla</Text>
              </Pressable>
            )}
            <Pressable
              style={fs.closeBtn}
              onPress={onClose}
              hitSlop={8}
            >
              <Icon name="close" size={16} color={BODY} />
            </Pressable>
          </View>
        </View>

        {/* Scrollable filter content */}
        <ScrollView
          style={fs.scroll}
          contentContainerStyle={fs.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Sıralama */}
          <View style={fs.section}>
            <SectionTitle title="Sıralama" />
            <Chips<SortBy>
              value={draft.sortBy}
              onSelect={(v) => update("sortBy", v)}
              options={[
                { key: "newest",   label: "En Yeni"              },
                { key: "oldest",   label: "En Eski"              },
                { key: "age_asc",  label: "Yaş: Küçük → Büyük"  },
                { key: "age_desc", label: "Yaş: Büyük → Küçük"  },
              ]}
            />
          </View>

          <View style={fs.divider} />

          {/* Yaş */}
          <View style={fs.section}>
            <SectionTitle title="Yaş" />
            <Chips<AgeRange>
              value={draft.ageRange}
              onSelect={(v) => update("ageRange", v)}
              options={[
                { key: "all",     label: "Tümü"       },
                { key: "0_6m",    label: "0–6 ay"     },
                { key: "6_12m",   label: "6–12 ay"    },
                { key: "1_3y",    label: "1–3 yaş"    },
                { key: "3y_plus", label: "3 yaş+"     },
              ]}
            />
          </View>

          <View style={fs.divider} />

          {/* Cinsiyet */}
          <View style={fs.section}>
            <SectionTitle title="Cinsiyet" />
            <Chips<GenderFilter>
              value={draft.gender}
              onSelect={(v) => update("gender", v)}
              options={[
                { key: "all",     label: "Tümü"       },
                { key: "female",  label: "Dişi"       },
                { key: "male",    label: "Erkek"      },
                { key: "unknown", label: "Bilinmiyor" },
              ]}
            />
          </View>

          <View style={fs.divider} />

          {/* İlan Durumu */}
          <View style={fs.section}>
            <SectionTitle title="İlan Durumu" />
            <Chips<StatusFilter>
              value={draft.status}
              onSelect={(v) => update("status", v)}
              options={[
                { key: "all",     label: "Tümü"          },
                { key: "active",  label: "Aktif"         },
                { key: "adopted", label: "Sahiplendirildi" },
              ]}
            />
          </View>

          {/* Irk — only if breeds exist */}
          {breeds.length > 0 && (
            <>
              <View style={fs.divider} />
              <View style={fs.section}>
                <SectionTitle title="Irk" />
                <BreedChips
                  breeds={breeds}
                  value={draft.breed}
                  onSelect={(v) => update("breed", v)}
                />
              </View>
            </>
          )}

          {/* Konum — only if cities exist */}
          {cities.length > 0 && (
            <>
              <View style={fs.divider} />
              <View style={fs.section}>
                <SectionTitle title="Şehir" />
                <CityChips
                  cities={cities}
                  value={draft.locationCity}
                  onSelect={(v) => update("locationCity", v)}
                />
              </View>
            </>
          )}

          {/* bottom spacing so CTA doesn't overlap last section */}
          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Sticky CTA */}
        <View style={[fs.cta, { borderTopColor: BORDER }]}>
          <Pressable
            style={({ pressed }) => [fs.applyBtn, { opacity: pressed ? 0.88 : 1 }]}
            onPress={apply}
          >
            <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={fs.applyGrad}>
              <Icon name="checkmark-circle-outline" size={17} color={WHITE} />
              <Text style={fs.applyTxt}>
                {activeCount > 0 ? `Filtreleri Uygula (${activeCount})` : "Filtreleri Uygula"}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const fs = StyleSheet.create({
  overlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(20,8,46,0.55)",
  },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: WHITE,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: "88%",
    ...Platform.select({
      ios:     { shadowColor: DARK, shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.18, shadowRadius: 24 },
      android: { elevation: 24 },
      default: {},
    }),
  },
  handle: {
    alignSelf: "center", width: 40, height: 4, borderRadius: 2,
    backgroundColor: `${BODY}30`, marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 8 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: -0.3 },
  activeBadge: { backgroundColor: P, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 22, alignItems: "center" },
  activeBadgeTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: WHITE },
  resetTxt:    { fontSize: 13, fontFamily: "Inter_600SemiBold", color: P },
  closeBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: `${BODY}12`, alignItems: "center", justifyContent: "center" },

  scroll:        { flexGrow: 0 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },

  section: { gap: 12, paddingVertical: 4 },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 16 },

  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: DARK, letterSpacing: 0.2, textTransform: "uppercase" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  chipActive: {
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16,
    ...Platform.select({
      ios:     { shadowColor: P, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 8 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  chipInactive: {
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: BG, borderWidth: 1.5, borderColor: `${P}25`,
  },
  chipLbl:       { fontSize: 13, fontFamily: "Inter_500Medium", color: BODY },
  chipLblActive: { fontSize: 13, fontFamily: "Inter_700Bold",   color: WHITE },

  cta:     { borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 14 },
  applyBtn:{ borderRadius: 16, overflow: "hidden" },
  applyGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 15,
  },
  applyTxt: { fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE },
});
