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
import { useTranslation } from "react-i18next";

// ── Türkiye'nin 81 ili ───────────────────────────────────────────────────────
export const TURKEY_PROVINCES: string[] = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya",
  "Artvin","Aydın","Balıkesir","Bilecik","Bingöl","Bitlis","Bolu","Burdur",
  "Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Edirne",
  "Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane",
  "Hakkari","Hatay","Isparta","Mersin","İstanbul","İzmir","Kars","Kastamonu",
  "Kayseri","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya",
  "Manisa","Kahramanmaraş","Mardin","Muğla","Muş","Nevşehir","Niğde","Ordu",
  "Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Tekirdağ","Tokat",
  "Trabzon","Tunceli","Şanlıurfa","Uşak","Van","Yozgat","Zonguldak","Aksaray",
  "Bayburt","Karaman","Kırıkkale","Batman","Şırnak","Bartın","Ardahan","Iğdır",
  "Yalova","Karabük","Kilis","Osmaniye","Düzce",
];

// ── Palette ────────────────────────────────────────────────────────────────
const P    = "#7C4DCC";
const P2   = "#A480D8";
const DARK = "#4B267D";
const BODY = "#6E6290";
const BG   = "#F8F4FF";
const WHITE = "#FFFFFF";
const BORDER = "rgba(124,77,204,0.12)";

// ── Types ─────────────────────────────────────────────────────────────────
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
  if (f.ageRange     !== "all")    n++;
  if (f.gender       !== "all")    n++;
  if (f.breed        !== null)     n++;
  if (f.status       !== "all")    n++;
  if (f.sortBy       !== "newest") n++;
  if (f.locationCity !== null)     n++;
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
          <LinearGradient key={o.key} colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={fs.chipActive}>
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
  allLabel,
  onSelect,
}: {
  breeds: string[];
  value: string | null;
  allLabel: string;
  onSelect: (b: string | null) => void;
}) {
  const all = [{ key: null as string | null, label: allLabel }, ...breeds.map((b) => ({ key: b, label: b }))];
  return (
    <View style={fs.chipRow}>
      {all.map((o) => {
        const active = value === o.key;
        return active ? (
          <LinearGradient key={String(o.key)} colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={fs.chipActive}>
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
  allLabel,
  showAllLabel,
  showLessLabel,
  onSelect,
}: {
  cities: string[];
  value: string | null;
  allLabel: string;
  showAllLabel: string;
  showLessLabel: string;
  onSelect: (c: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const provinceList = expanded ? TURKEY_PROVINCES : cities;
  const visibleSet = new Set(provinceList);
  if (value && !visibleSet.has(value)) visibleSet.add(value);
  const visibleCities = Array.from(visibleSet).sort();
  const options: { key: string | null; label: string }[] = [
    { key: null, label: allLabel },
    ...visibleCities.map((c) => ({ key: c, label: c })),
  ];

  return (
    <View style={{ gap: 10 }}>
      <View style={fs.chipRow}>
        {options.map((o) => {
          const active = value === o.key;
          return active ? (
            <LinearGradient key={String(o.key)} colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={fs.chipActive}>
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
      <Pressable
        style={fs.expandBtn}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpanded((v) => !v); }}
      >
        <Icon name={expanded ? "chevron-up-outline" : "chevron-down-outline"} size={13} color={P} />
        <Text style={fs.expandTxt}>{expanded ? showLessLabel : showAllLabel}</Text>
      </Pressable>
    </View>
  );
}

// ── Main sheet ────────────────────────────────────────────────────────────────
interface Props {
  visible:       boolean;
  activeFilters: AdoptionFilters;
  breeds:        string[];
  cities:        string[];
  onApply:       (f: AdoptionFilters) => void;
  onClose:       () => void;
}

export function AdoptionFilterSheet({ visible, activeFilters, breeds, cities, onApply, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const botPad = Platform.OS === "web" ? 24 : insets.bottom + 16;

  const [draft, setDraft] = useState<AdoptionFilters>(activeFilters);
  useEffect(() => { if (visible) setDraft(activeFilters); }, [visible]);

  const update = <K extends keyof AdoptionFilters>(key: K, val: AdoptionFilters[K]) =>
    setDraft((prev) => ({ ...prev, [key]: val }));

  const reset = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setDraft(DEFAULT_FILTERS); };
  const apply = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onApply(draft); onClose(); };

  const activeCount = countActiveFilters(draft);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={fs.overlay} onPress={onClose} />
      <View style={[fs.sheet, { paddingBottom: botPad }]}>
        <View style={fs.handle} />
        <View style={fs.header}>
          <View style={fs.headerLeft}>
            <Text style={fs.headerTitle}>{t("filterSheet.title")}</Text>
            {activeCount > 0 && (
              <View style={fs.activeBadge}><Text style={fs.activeBadgeTxt}>{activeCount}</Text></View>
            )}
          </View>
          <View style={fs.headerRight}>
            {activeCount > 0 && (
              <Pressable onPress={reset} hitSlop={10}>
                <Text style={fs.resetTxt}>{t("filterSheet.reset")}</Text>
              </Pressable>
            )}
            <Pressable style={fs.closeBtn} onPress={onClose} hitSlop={8}>
              <Icon name="close" size={16} color={BODY} />
            </Pressable>
          </View>
        </View>

        <ScrollView style={fs.scroll} contentContainerStyle={fs.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Sıralama */}
          <View style={fs.section}>
            <SectionTitle title={t("filterSheet.sortSection")} />
            <Chips<SortBy>
              value={draft.sortBy}
              onSelect={(v) => update("sortBy", v)}
              options={[
                { key: "newest",   label: t("filterSheet.sortNewest")  },
                { key: "oldest",   label: t("filterSheet.sortOldest")  },
                { key: "age_asc",  label: t("filterSheet.sortAgeAsc")  },
                { key: "age_desc", label: t("filterSheet.sortAgeDesc") },
              ]}
            />
          </View>

          <View style={fs.divider} />

          {/* Yaş */}
          <View style={fs.section}>
            <SectionTitle title={t("filterSheet.ageSection")} />
            <Chips<AgeRange>
              value={draft.ageRange}
              onSelect={(v) => update("ageRange", v)}
              options={[
                { key: "all",     label: t("filterSheet.ageAll")      },
                { key: "0_6m",    label: t("filterSheet.age0to6m")    },
                { key: "6_12m",   label: t("filterSheet.age6to12m")   },
                { key: "1_3y",    label: t("filterSheet.age1to3y")    },
                { key: "3y_plus", label: t("filterSheet.age3yPlus")   },
              ]}
            />
          </View>

          <View style={fs.divider} />

          {/* Cinsiyet */}
          <View style={fs.section}>
            <SectionTitle title={t("filterSheet.genderSection")} />
            <Chips<GenderFilter>
              value={draft.gender}
              onSelect={(v) => update("gender", v)}
              options={[
                { key: "all",     label: t("filterSheet.genderAll")     },
                { key: "female",  label: t("filterSheet.genderFemale")  },
                { key: "male",    label: t("filterSheet.genderMale")    },
                { key: "unknown", label: t("filterSheet.genderUnknown") },
              ]}
            />
          </View>

          <View style={fs.divider} />

          {/* İlan Durumu */}
          <View style={fs.section}>
            <SectionTitle title={t("filterSheet.statusSection")} />
            <Chips<StatusFilter>
              value={draft.status}
              onSelect={(v) => update("status", v)}
              options={[
                { key: "all",     label: t("filterSheet.statusAll")     },
                { key: "active",  label: t("filterSheet.statusActive")  },
                { key: "adopted", label: t("filterSheet.statusAdopted") },
              ]}
            />
          </View>

          <View style={fs.divider} />

          {/* Irk */}
          {breeds.length > 0 && (
            <>
              <View style={fs.section}>
                <SectionTitle title={t("filterSheet.breedSection")} />
                <BreedChips
                  breeds={breeds}
                  value={draft.breed}
                  allLabel={t("filterSheet.breedsAll")}
                  onSelect={(v) => update("breed", v)}
                />
              </View>
              <View style={fs.divider} />
            </>
          )}

          {/* Şehir */}
          {cities.length > 0 && (
            <View style={fs.section}>
              <SectionTitle title={t("filterSheet.citySection")} />
              <CityChips
                cities={cities}
                value={draft.locationCity}
                allLabel={t("filterSheet.cityAll")}
                showAllLabel={t("filterSheet.showAllCities")}
                showLessLabel={t("filterSheet.showLess")}
                onSelect={(v) => update("locationCity", v)}
              />
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={fs.footer}>
          <Pressable style={fs.applyBtn} onPress={apply}>
            <LinearGradient colors={[P2, P]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={fs.applyGrad}>
              <Text style={fs.applyTxt}>
                {activeCount > 0
                  ? t("filterSheet.applyWithCount", { count: activeCount })
                  : t("filterSheet.apply")}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const fs = StyleSheet.create({
  overlay:       { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet:         {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: WHITE,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "88%",
    shadowColor: DARK, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20,
    elevation: 20,
  },
  handle:        { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, marginTop: 10, marginBottom: 4 },
  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerLeft:    { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle:   { fontSize: 18, fontWeight: "700", color: DARK, letterSpacing: -0.3 },
  activeBadge:   { backgroundColor: P, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  activeBadgeTxt:{ color: WHITE, fontSize: 11, fontWeight: "700" },
  headerRight:   { flexDirection: "row", alignItems: "center", gap: 12 },
  resetTxt:      { color: P, fontSize: 14, fontWeight: "600" },
  closeBtn:      { width: 28, height: 28, borderRadius: 14, backgroundColor: BG, alignItems: "center", justifyContent: "center" },
  scroll:        { flexGrow: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  section:       { paddingVertical: 14 },
  sectionTitle:  { fontSize: 13, fontWeight: "700", color: BODY, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 },
  divider:       { height: 1, backgroundColor: BORDER },
  chipRow:       { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipActive:    { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, minHeight: 36, justifyContent: "center" },
  chipInactive:  { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, minHeight: 36, justifyContent: "center", borderWidth: 1, borderColor: BORDER, backgroundColor: BG },
  chipLblActive: { color: WHITE, fontSize: 13, fontWeight: "600" },
  chipLbl:       { color: BODY, fontSize: 13, fontWeight: "500" },
  expandBtn:     { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 4 },
  expandTxt:     { color: P, fontSize: 13, fontWeight: "500" },
  footer:        { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER },
  applyBtn:      { borderRadius: 14, overflow: "hidden" },
  applyGrad:     { height: 48, alignItems: "center", justifyContent: "center" },
  applyTxt:      { color: WHITE, fontSize: 15, fontWeight: "700" },
});
